#!/usr/bin/env node

/**
 * Use Google search to find ALL ex961.htm documents
 * Then validate and save them to database
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import axios from 'axios'
import * as cheerio from 'cheerio'
import path from 'path'

config({ path: path.join(__dirname, '..', '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'

// Known working documents to start with
const KNOWN_DOCUMENTS = [
  'https://www.sec.gov/Archives/edgar/data/1966983/000119312525002534/d909276dex961.htm',
  'https://www.sec.gov/Archives/edgar/data/1375205/000165495424002673/urg_ex961.htm'
]

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function searchGoogle(query: string): Promise<string[]> {
  console.log(`   🔍 Searching: "${query}"`)
  
  const urls: string[] = []
  
  try {
    // Use Google search programmatically
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=100`
    
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 10000
    })
    
    const $ = cheerio.load(response.data)
    
    // Extract URLs from search results
    $('a').each((_, elem) => {
      const href = $(elem).attr('href')
      if (href && href.includes('sec.gov') && href.includes('ex961.htm')) {
        // Clean up Google redirect URLs
        const match = href.match(/url\?q=(https[^&]+)/)
        if (match) {
          urls.push(decodeURIComponent(match[1]))
        } else if (href.startsWith('http')) {
          urls.push(href)
        }
      }
    })
    
    console.log(`      Found ${urls.length} potential URLs`)
  } catch (error) {
    console.log(`      ⚠️  Search error: ${error}`)
  }
  
  return urls
}

async function validateUrl(url: string): Promise<boolean> {
  try {
    const response = await axios.head(url, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 5000
    })
    return response.status === 200
  } catch {
    return false
  }
}

async function parseDocument(url: string): Promise<any> {
  try {
    const response = await axios.get(url, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 20000,
      maxContentLength: 50 * 1024 * 1024
    })
    
    const $ = cheerio.load(response.data)
    const text = $.text()
    
    // Extract metadata from URL
    const urlMatch = url.match(/data\/(\d+)\/(\d+)\/(.+)$/)
    const cik = urlMatch?.[1] || 'unknown'
    const accessionFormatted = urlMatch?.[2] || 'unknown'
    const filename = urlMatch?.[3] || 'unknown'
    
    // Convert accession format
    const accession = accessionFormatted.match(/(\d{10})(\d{2})(\d{6})/)
    const accessionNumber = accession 
      ? `${accession[1]}-${accession[2]}-${accession[3]}`
      : accessionFormatted
    
    // Extract company name
    let companyName = 'Unknown'
    const companyPatterns = [
      /Technical Report Summary[\s\S]{0,200}?([A-Z][A-Za-z\s&,\.]+(?:Inc|Corp|Ltd|LLC|Company|Limited))/,
      /(?:Registrant|Company|Issuer)[\s:]+([A-Z][A-Za-z\s&,\.]+(?:Inc|Corp|Ltd|LLC|Company|Limited))/,
      /([A-Z][A-Za-z\s&,\.]+(?:Inc|Corp|Ltd|LLC|Company|Limited))[\s\S]{0,100}Technical Report/
    ]
    
    for (const pattern of companyPatterns) {
      const match = text.match(pattern)
      if (match) {
        companyName = match[1].trim().replace(/\s+/g, ' ')
        break
      }
    }
    
    // Extract project name
    let projectName = ''
    const projectPatterns = [
      /(?:The\s+)?([A-Za-z\s]+?)(?:\s+Property|\s+Project|\s+Mine)[\s\S]{0,50}Technical/i,
      /Technical Report[\s\S]{0,100}?(?:on|for)[\s\S]{0,50}?([A-Za-z\s]+?)(?:\s+Property|\s+Project|\s+Mine)/i
    ]
    
    for (const pattern of projectPatterns) {
      const match = text.match(pattern)
      if (match) {
        projectName = match[1].trim()
        break
      }
    }
    
    // Extract commodities
    const commodities: string[] = []
    const commodityList = [
      'lithium', 'copper', 'gold', 'silver', 'uranium', 'nickel', 
      'cobalt', 'rare earth', 'graphite', 'zinc', 'lead', 'iron',
      'platinum', 'palladium', 'molybdenum', 'tungsten', 'tin',
      'vanadium', 'manganese', 'chromium', 'titanium'
    ]
    
    const lowerText = text.toLowerCase()
    for (const commodity of commodityList) {
      if (lowerText.includes(commodity)) {
        commodities.push(commodity)
      }
    }
    
    // Check for financial metrics
    const hasNPV = /NPV.*?\$[\d,]+/i.test(text)
    const hasIRR = /IRR.*?[\d\.]+%/i.test(text)
    const hasCAPEX = /(?:CAPEX|Capital Expenditure).*?\$[\d,]+/i.test(text)
    const hasOPEX = /(?:OPEX|Operating Cost).*?\$[\d,]+/i.test(text)
    
    return {
      cik,
      accession_number: accessionNumber,
      company_name: companyName,
      project_name: projectName,
      commodities,
      has_financials: hasNPV || hasIRR || hasCAPEX || hasOPEX,
      has_npv: hasNPV,
      has_irr: hasIRR,
      has_capex: hasCAPEX,
      has_opex: hasOPEX
    }
  } catch (error) {
    console.log(`      ⚠️  Parse error: ${error}`)
    return null
  }
}

async function main() {
  console.log('='.repeat(70))
  console.log('GOOGLE SEARCH FOR ALL EXHIBIT 96.1 DOCUMENTS')
  console.log('='.repeat(70))
  
  // Clear existing data first
  console.log('\n🗑️  Clearing old data...')
  const deleteResult = await supabase
    .from('sec_technical_reports')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
  
  console.log('Delete result:', deleteResult.error || 'Success')
  
  const allUrls = new Set<string>()
  
  // Add known documents
  KNOWN_DOCUMENTS.forEach(url => allUrls.add(url))
  
  // Search queries to find all ex961.htm documents
  const searchQueries = [
    'site:sec.gov/Archives/edgar/data ex961.htm',
    'site:sec.gov "ex961.htm"',
    'site:sec.gov/Archives/edgar/data "ex96-1.htm"',
    'site:sec.gov inurl:ex961.htm',
    '"Technical Report Summary" site:sec.gov ex961.htm',
    'SK-1300 site:sec.gov ex961.htm',
    'mining "exhibit 96.1" site:sec.gov filetype:htm',
    'lithium site:sec.gov ex961.htm',
    'copper site:sec.gov ex961.htm',
    'uranium site:sec.gov ex961.htm',
    'rare earth site:sec.gov ex961.htm'
  ]
  
  console.log('\n🔍 Searching for Exhibit 96.1 documents...')
  console.log('=' .repeat(50))
  
  for (const query of searchQueries) {
    const results = await searchGoogle(query)
    results.forEach(url => {
      if (url.includes('ex961.htm') || url.includes('ex96-1.htm')) {
        allUrls.add(url)
      }
    })
    await delay(2000) // Be respectful to Google
  }
  
  console.log(`\n📊 Found ${allUrls.size} unique URLs to validate`)
  
  // Validate and parse documents
  console.log('\n✅ Validating and parsing documents...')
  console.log('=' .repeat(50))
  
  const validDocuments = []
  
  for (const url of allUrls) {
    console.log(`\n   Checking: ${url}`)
    
    const isValid = await validateUrl(url)
    if (isValid) {
      console.log(`      ✅ Valid URL`)
      
      const docInfo = await parseDocument(url)
      if (docInfo) {
        console.log(`      📄 Company: ${docInfo.company_name}`)
        console.log(`      📄 Project: ${docInfo.project_name || 'N/A'}`)
        console.log(`      📄 Commodities: ${docInfo.commodities.join(', ') || 'N/A'}`)
        console.log(`      📄 Has Financials: ${docInfo.has_financials}`)
        
        validDocuments.push({ url, ...docInfo })
      }
    } else {
      console.log(`      ❌ Invalid URL`)
    }
    
    await delay(1000)
  }
  
  console.log(`\n💾 Saving ${validDocuments.length} documents to database...`)
  console.log('=' .repeat(50))
  
  // Save to database
  for (const doc of validDocuments) {
    try {
      const insertData = {
        cik: doc.cik,
        company_name: doc.company_name,
        form_type: 'Exhibit 96.1',
        filing_date: new Date().toISOString().split('T')[0],
        accession_number: doc.accession_number,
        document_url: doc.url,
        exhibit_number: '96.1',
        document_description: `Technical Report Summary - ${doc.project_name || 'Mining Project'}`,
        primary_commodity: doc.commodities[0] || 'Various',
        commodities: doc.commodities,
        status: doc.has_financials ? 'has_financials' : 'pending_parse',
        raw_metadata: {
          project_name: doc.project_name,
          has_npv: doc.has_npv,
          has_irr: doc.has_irr,
          has_capex: doc.has_capex,
          has_opex: doc.has_opex
        }
      }
      
      const { error } = await supabase
        .from('sec_technical_reports')
        .insert(insertData)
      
      if (error) {
        console.log(`      ⚠️  Error saving ${doc.company_name}: ${error.message}`)
      } else {
        console.log(`      ✅ Saved: ${doc.company_name}`)
      }
    } catch (error) {
      console.log(`      ⚠️  Error: ${error}`)
    }
  }
  
  // Final check
  const { count, data } = await supabase
    .from('sec_technical_reports')
    .select('*', { count: 'exact' })
    .order('company_name')
  
  console.log('\n' + '='.repeat(70))
  console.log('SEARCH COMPLETE')
  console.log('='.repeat(70))
  console.log(`Documents in database: ${count}`)
  
  if (data && data.length > 0) {
    console.log('\n📋 Exhibit 96.1 Documents:')
    data.forEach(d => {
      console.log(`\n   ${d.company_name}`)
      console.log(`   ${d.document_url}`)
      console.log(`   Commodities: ${d.commodities?.join(', ')}`)
      console.log(`   Status: ${d.status}`)
    })
  }
  
  console.log('\n✅ Ready for detailed financial data extraction!')
  console.log('='.repeat(70))
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
