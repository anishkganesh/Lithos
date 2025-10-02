#!/usr/bin/env node

/**
 * Direct crawler for ex961.htm documents
 * Uses the pattern from known documents to find more
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

// Known working documents
const CONFIRMED_EX961 = [
  {
    url: 'https://www.sec.gov/Archives/edgar/data/1966983/000119312525002534/d909276dex961.htm',
    cik: '1966983',
    accession: '0001193125-25-002534',
    filename: 'd909276dex961.htm'
  },
  {
    url: 'https://www.sec.gov/Archives/edgar/data/1375205/000165495424002673/urg_ex961.htm',
    cik: '1375205',
    accession: '0001654954-24-002673',
    filename: 'urg_ex961.htm'
  }
]

// Extract patterns from known URLs
// Pattern 1: /data/{CIK}/{ACCESSION_NO_DASHES}/{FILENAME}ex961.htm
// Pattern 2: /data/{CIK}/{ACCESSION_NO_DASHES}/{TICKER}_ex961.htm

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function parseExhibit96Document(url: string) {
  try {
    console.log(`   📄 Parsing: ${url}`)
    
    const response = await axios.get(url, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 20000,
      maxContentLength: 50 * 1024 * 1024
    })
    
    const $ = cheerio.load(response.data)
    const text = $.text()
    
    // Extract key information
    const info: any = {
      url,
      has_content: text.length > 1000
    }
    
    // Company name - look for common patterns
    const companyPatterns = [
      /(?:Registrant|Company|Issuer)[\s:]+([A-Z][A-Za-z\s&,\.]+(?:Inc|Corp|Ltd|LLC|Company|Limited))/,
      /^([A-Z][A-Za-z\s&,\.]+(?:Inc|Corp|Ltd|LLC|Company|Limited))/m
    ]
    
    for (const pattern of companyPatterns) {
      const match = text.match(pattern)
      if (match) {
        info.company_name = match[1].trim()
        break
      }
    }
    
    // Project/Property name
    const projectPatterns = [
      /(?:Property|Project|Mine)[\s:]+([A-Za-z\s]+?)(?:Property|Project|Mine|Technical)/i,
      /([A-Za-z\s]+?)(?:Property|Project|Mine)\s+Technical\s+Report/i
    ]
    
    for (const pattern of projectPatterns) {
      const match = text.match(pattern)
      if (match) {
        info.project_name = match[1].trim()
        break
      }
    }
    
    // Commodities
    const commodities = new Set<string>()
    const commodityList = [
      'lithium', 'copper', 'gold', 'silver', 'uranium', 'nickel', 
      'cobalt', 'rare earth', 'graphite', 'zinc', 'lead', 'iron',
      'platinum', 'palladium', 'molybdenum', 'tungsten', 'tin'
    ]
    
    const lowerText = text.toLowerCase()
    for (const commodity of commodityList) {
      if (lowerText.includes(commodity)) {
        commodities.add(commodity)
      }
    }
    info.commodities = Array.from(commodities)
    
    // Financial metrics
    info.has_npv = /NPV.*?\$[\d,]+/i.test(text)
    info.has_irr = /IRR.*?[\d\.]+%/i.test(text)
    info.has_capex = /(?:CAPEX|Capital Expenditure).*?\$[\d,]+/i.test(text)
    info.has_opex = /(?:OPEX|Operating Cost).*?\$[\d,]+/i.test(text)
    info.has_reserves = /(?:Proven|Probable|Measured|Indicated)\s+(?:Reserve|Resource)/i.test(text)
    
    console.log(`      ✅ Company: ${info.company_name || 'Unknown'}`)
    console.log(`      ✅ Project: ${info.project_name || 'Unknown'}`)
    console.log(`      ✅ Commodities: ${info.commodities.join(', ') || 'Unknown'}`)
    console.log(`      ✅ Has Financials: NPV=${info.has_npv}, IRR=${info.has_irr}, CAPEX=${info.has_capex}`)
    
    return info
  } catch (error: any) {
    console.log(`      ⚠️  Error: ${error.message}`)
    return null
  }
}

async function findMoreEx961Documents() {
  console.log('\n🔍 Searching for more Exhibit 96.1 documents')
  console.log('=' .repeat(50))
  
  const foundDocuments = []
  
  // Start with companies from the known documents
  const companyCiks = ['1966983', '1375205']
  
  // Add more mining company CIKs
  const additionalCiks = [
    '1376793', // Uranium Energy Corp
    '1709164', // Ur-Energy Inc
    '1589526', // Piedmont Lithium
    '1841890', // Ioneer Ltd
    '1590955', // MP Materials
    '1651625', // Lithium Americas
    '1798562', // Sigma Lithium
    '1633917', // American Lithium
    '1849796', // Century Lithium
    '1866757', // Lithium Ionic
    '1910918', // Atlas Lithium
    '1807846', // Patriot Battery Metals
    '1720014', // Talon Metals
    '1859690', // NioCorp
    '1704287', // American Rare Earths
  ]
  
  companyCiks.push(...additionalCiks)
  
  for (const cik of companyCiks) {
    const paddedCik = cik.padStart(10, '0')
    console.log(`\n   Checking CIK ${cik}...`)
    
    try {
      // Get recent filings
      const response = await axios.get(
        `https://data.sec.gov/submissions/CIK${paddedCik}.json`,
        {
          headers: { 'User-Agent': USER_AGENT },
          timeout: 10000
        }
      )
      
      if (response.data.filings?.recent) {
        const recent = response.data.filings.recent
        const companyName = response.data.name
        const ticker = response.data.tickers?.[0]
        
        // Check recent filings
        for (let i = 0; i < Math.min(recent.form.length, 30); i++) {
          const formType = recent.form[i]
          const filingDate = recent.filingDate[i]
          const accessionNumber = recent.accessionNumber[i]
          
          // Skip if not a relevant form type
          if (!['10-K', '10-K/A', 'S-1', 'S-1/A', 'F-1', 'F-1/A', '8-K', 'DEF 14A'].includes(formType)) {
            continue
          }
          
          // Skip if too old
          if (new Date(filingDate) < new Date('2021-01-01')) {
            continue
          }
          
          const formattedAccession = accessionNumber.replace(/-/g, '')
          
          // Try different URL patterns
          const urlPatterns = [
            `https://www.sec.gov/Archives/edgar/data/${paddedCik}/${formattedAccession}/ex961.htm`,
            `https://www.sec.gov/Archives/edgar/data/${paddedCik}/${formattedAccession}/ex96-1.htm`,
            `https://www.sec.gov/Archives/edgar/data/${paddedCik}/${formattedAccession}/${ticker?.toLowerCase()}_ex961.htm`,
            `https://www.sec.gov/Archives/edgar/data/${paddedCik}/${formattedAccession}/d909276dex961.htm`,
            `https://www.sec.gov/Archives/edgar/data/${paddedCik}/${formattedAccession}/exhibit961.htm`,
            `https://www.sec.gov/Archives/edgar/data/${paddedCik}/${formattedAccession}/${ticker?.toLowerCase()}ex961.htm`
          ]
          
          if (ticker) {
            urlPatterns.push(
              `https://www.sec.gov/Archives/edgar/data/${paddedCik}/${formattedAccession}/${ticker.toLowerCase()}_ex961.htm`
            )
          }
          
          for (const url of urlPatterns) {
            try {
              const checkResponse = await axios.head(url, {
                headers: { 'User-Agent': USER_AGENT },
                timeout: 5000
              })
              
              if (checkResponse.status === 200) {
                console.log(`      ✅ Found: ${url}`)
                foundDocuments.push({
                  url,
                  cik,
                  company_name: companyName,
                  ticker,
                  form_type: formType,
                  filing_date: filingDate,
                  accession_number: accessionNumber
                })
                break // Found one for this filing
              }
            } catch {
              // URL doesn't exist, try next pattern
            }
            
            await delay(50)
          }
        }
      }
      
      await delay(500) // Rate limiting between companies
    } catch (error) {
      console.log(`      ⚠️  Error checking CIK ${cik}`)
    }
  }
  
  return foundDocuments
}

async function main() {
  console.log('='.repeat(70))
  console.log('DIRECT EXHIBIT 96.1 DOCUMENT CRAWLER')
  console.log('='.repeat(70))
  console.log('Finding and parsing all ex961.htm documents')
  console.log('='.repeat(70))
  
  // Clear existing data
  console.log('\n🗑️  Clearing old data...')
  await supabase.from('sec_technical_reports').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  
  // First, parse and save the known documents
  console.log('\n📌 Processing known Exhibit 96.1 documents')
  console.log('=' .repeat(50))
  
  for (const doc of CONFIRMED_EX961) {
    const info = await parseExhibit96Document(doc.url)
    
    if (info) {
      await supabase.from('sec_technical_reports').insert({
        cik: doc.cik,
        company_name: info.company_name || 'Mining Company',
        form_type: 'Exhibit 96.1',
        filing_date: new Date().toISOString().split('T')[0],
        accession_number: doc.accession,
        document_url: doc.url,
        exhibit_number: '96.1',
        document_description: 'Technical Report Summary (SK-1300)',
        primary_commodity: info.commodities?.[0] || 'Various',
        commodities: info.commodities || [],
        status: info.has_npv || info.has_irr || info.has_capex ? 'has_financials' : 'pending_parse',
        raw_metadata: info
      })
      
      console.log(`      💾 Saved to database`)
    }
    
    await delay(1000)
  }
  
  // Search for more documents
  const moreDocuments = await findMoreEx961Documents()
  
  console.log(`\n📊 Found ${moreDocuments.length} additional Exhibit 96.1 documents`)
  
  // Parse and save additional documents
  for (const doc of moreDocuments) {
    const info = await parseExhibit96Document(doc.url)
    
    if (info) {
      await supabase.from('sec_technical_reports').insert({
        cik: doc.cik,
        company_name: doc.company_name || info.company_name || 'Mining Company',
        form_type: doc.form_type,
        filing_date: doc.filing_date,
        accession_number: doc.accession_number,
        document_url: doc.url,
        exhibit_number: '96.1',
        document_description: 'Technical Report Summary (SK-1300)',
        primary_commodity: info.commodities?.[0] || 'Various',
        commodities: info.commodities || [],
        status: info.has_npv || info.has_irr || info.has_capex ? 'has_financials' : 'pending_parse',
        raw_metadata: info
      })
      
      console.log(`      💾 Saved to database`)
    }
    
    await delay(1000)
  }
  
  // Show final results
  const { count, data: samples } = await supabase
    .from('sec_technical_reports')
    .select('*', { count: 'exact' })
    .order('filing_date', { ascending: false })
    .limit(20)
  
  console.log('\n' + '='.repeat(70))
  console.log('CRAWLING COMPLETE')
  console.log('='.repeat(70))
  console.log(`Total Exhibit 96.1 documents in database: ${count}`)
  
  if (samples && samples.length > 0) {
    console.log('\n📋 Exhibit 96.1 Documents Found:')
    samples.forEach(s => {
      console.log(`\n   ${s.company_name} (${s.filing_date})`)
      console.log(`   ${s.document_url}`)
      console.log(`   Commodities: ${s.commodities?.join(', ')}`)
      
      if (s.raw_metadata) {
        const metrics = []
        if (s.raw_metadata.has_npv) metrics.push('NPV')
        if (s.raw_metadata.has_irr) metrics.push('IRR')
        if (s.raw_metadata.has_capex) metrics.push('CAPEX')
        if (s.raw_metadata.has_opex) metrics.push('OPEX')
        if (s.raw_metadata.has_reserves) metrics.push('Reserves')
        
        if (metrics.length > 0) {
          console.log(`   Contains: ${metrics.join(', ')}`)
        }
      }
    })
  }
  
  console.log('\n✅ Documents are ready for detailed parsing!')
  console.log('='.repeat(70))
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
