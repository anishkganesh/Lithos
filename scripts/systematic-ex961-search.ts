#!/usr/bin/env node

/**
 * Systematic search for ALL Exhibit 96.1 documents
 * Uses multiple strategies to ensure exhaustive coverage
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

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'

// Comprehensive list of mining companies that might have Exhibit 96.1
const MINING_COMPANIES = [
  // Lithium companies
  { cik: '1966983', name: 'Lithium Americas Corp' },
  { cik: '1589526', name: 'Piedmont Lithium Inc' },
  { cik: '1841890', name: 'Ioneer Ltd' },
  { cik: '1651625', name: 'Lithium Americas (Argentina) Corp' },
  { cik: '1798562', name: 'Sigma Lithium Corp' },
  { cik: '1633917', name: 'American Lithium Corp' },
  { cik: '1849796', name: 'Century Lithium Corp' },
  { cik: '1866757', name: 'Lithium Ionic Corp' },
  { cik: '1910918', name: 'Atlas Lithium Corp' },
  { cik: '1807846', name: 'Patriot Battery Metals Inc' },
  
  // Uranium companies
  { cik: '1375205', name: 'Ur-Energy Inc' },
  { cik: '1376793', name: 'Uranium Energy Corp' },
  { cik: '1709164', name: 'Ur-Energy Inc' },
  { cik: '1385849', name: 'Energy Fuels Inc' },
  { cik: '1649336', name: 'Peninsula Energy Ltd' },
  
  // Rare Earth companies
  { cik: '1590955', name: 'MP Materials Corp' },
  { cik: '1704287', name: 'American Rare Earths Ltd' },
  { cik: '1859690', name: 'NioCorp Developments Ltd' },
  { cik: '1801450', name: 'USA Rare Earth LLC' },
  
  // Copper companies
  { cik: '0000027419', name: 'Freeport-McMoRan Inc' },
  { cik: '0000315293', name: 'Southern Copper Corp' },
  { cik: '1720014', name: 'Talon Metals Corp' },
  { cik: '1282648', name: 'Taseko Mines Ltd' },
  { cik: '1415889', name: 'Nevada Copper Corp' },
  
  // Gold/Silver companies
  { cik: '0000764065', name: 'Newmont Corp' },
  { cik: '0001164727', name: 'Hecla Mining Co' },
  { cik: '0000861878', name: 'Coeur Mining Inc' },
  { cik: '1203464', name: 'Paramount Gold Nevada Corp' },
  
  // Other critical minerals
  { cik: '1022671', name: 'Cleveland-Cliffs Inc' },
  { cik: '0000008063', name: 'Alcoa Corp' },
  { cik: '1866976', name: 'Graphite One Inc' },
  { cik: '1273441', name: 'Northern Graphite Corp' }
]

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function checkExhibit96URL(url: string): Promise<boolean> {
  try {
    const response = await axios.head(url, {
      headers: { 
        'User-Agent': USER_AGENT,
        'Accept': '*/*'
      },
      timeout: 5000,
      maxRedirects: 0
    })
    return response.status === 200
  } catch (error: any) {
    // Check if it's a 200 in the error response (sometimes head requests fail but get works)
    if (error.response?.status === 200) {
      return true
    }
    return false
  }
}

async function tryGetRequest(url: string): Promise<boolean> {
  try {
    const response = await axios.get(url, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 5000,
      maxContentLength: 1024 // Just check if it exists, don't download all
    })
    return response.status === 200
  } catch (error: any) {
    return error.response?.status === 200
  }
}

async function searchCompanyFilings(cik: string, companyName: string) {
  const paddedCik = cik.padStart(10, '0')
  console.log(`\n   🏢 ${companyName} (CIK: ${cik})`)
  
  const foundUrls: string[] = []
  
  try {
    // Get company submissions
    const response = await axios.get(
      `https://data.sec.gov/submissions/CIK${paddedCik}.json`,
      {
        headers: { 
          'User-Agent': USER_AGENT,
          'Accept': 'application/json'
        },
        timeout: 10000
      }
    )
    
    if (!response.data.filings?.recent) {
      console.log(`      ❌ No filings found`)
      return foundUrls
    }
    
    const recent = response.data.filings.recent
    const ticker = response.data.tickers?.[0]?.toLowerCase() || ''
    
    // Check recent filings (last 5 years)
    let checked = 0
    for (let i = 0; i < recent.form.length && checked < 20; i++) {
      const formType = recent.form[i]
      const filingDate = recent.filingDate[i]
      const accessionNumber = recent.accessionNumber[i]
      
      // Skip old filings
      if (new Date(filingDate) < new Date('2020-01-01')) continue
      
      // Focus on forms that might have Exhibit 96.1
      if (!['10-K', '10-K/A', 'S-1', 'S-1/A', 'F-1', 'F-1/A', '8-K', 'DEF 14A', '20-F'].includes(formType)) {
        continue
      }
      
      checked++
      
      const formattedAccession = accessionNumber.replace(/-/g, '')
      
      // Try various URL patterns
      const urlPatterns = [
        // Pattern from your examples
        `https://www.sec.gov/Archives/edgar/data/${paddedCik}/${formattedAccession}/d909276dex961.htm`,
        `https://www.sec.gov/Archives/edgar/data/${paddedCik}/${formattedAccession}/${ticker}_ex961.htm`,
        `https://www.sec.gov/Archives/edgar/data/${paddedCik}/${formattedAccession}/${ticker}ex961.htm`,
        
        // Common patterns
        `https://www.sec.gov/Archives/edgar/data/${paddedCik}/${formattedAccession}/ex961.htm`,
        `https://www.sec.gov/Archives/edgar/data/${paddedCik}/${formattedAccession}/ex96-1.htm`,
        `https://www.sec.gov/Archives/edgar/data/${paddedCik}/${formattedAccession}/exhibit961.htm`,
        `https://www.sec.gov/Archives/edgar/data/${paddedCik}/${formattedAccession}/ex961.html`,
        
        // With company ticker
        `https://www.sec.gov/Archives/edgar/data/${paddedCik}/${formattedAccession}/${ticker.toLowerCase()}_ex96-1.htm`,
        `https://www.sec.gov/Archives/edgar/data/${paddedCik}/${formattedAccession}/${ticker.toUpperCase()}_ex961.htm`,
        
        // Numbered patterns
        `https://www.sec.gov/Archives/edgar/data/${paddedCik}/${formattedAccession}/d${formattedAccession.slice(-6)}ex961.htm`,
        `https://www.sec.gov/Archives/edgar/data/${paddedCik}/${formattedAccession}/d${cik}ex961.htm`
      ]
      
      // Remove duplicates
      const uniquePatterns = [...new Set(urlPatterns)]
      
      for (const url of uniquePatterns) {
        const exists = await checkExhibit96URL(url)
        
        if (!exists && url.includes('ex961.htm')) {
          // Try GET request as backup
          const existsGet = await tryGetRequest(url)
          if (existsGet) {
            console.log(`      ✅ Found (GET): ${url}`)
            foundUrls.push(url)
            break
          }
        } else if (exists) {
          console.log(`      ✅ Found: ${url}`)
          foundUrls.push(url)
          break // Found one for this filing
        }
        
        await delay(50) // Small delay to be respectful
      }
    }
    
    if (foundUrls.length === 0) {
      console.log(`      ❌ No Exhibit 96.1 found`)
    }
    
  } catch (error: any) {
    console.log(`      ⚠️  Error: ${error.message}`)
  }
  
  return foundUrls
}

async function parseAndSaveDocument(url: string, companyName: string, cik: string) {
  try {
    console.log(`\n   📄 Processing: ${url}`)
    
    // Extract metadata from URL
    const urlMatch = url.match(/data\/(\d+)\/(\d+)/)
    const accessionFormatted = urlMatch?.[2] || ''
    
    // Convert to standard accession number format
    const accession = accessionFormatted.match(/(\d{10})(\d{2})(\d{6})/)
    const accessionNumber = accession 
      ? `${accession[1]}-${accession[2]}-${accession[3]}`
      : accessionFormatted
    
    // Try to get basic info from the document
    let projectName = ''
    let commodities: string[] = []
    let hasFinancials = false
    
    try {
      const response = await axios.get(url, {
        headers: { 'User-Agent': USER_AGENT },
        timeout: 15000,
        maxContentLength: 10 * 1024 * 1024
      })
      
      const text = response.data.toLowerCase()
      
      // Check for commodities
      const commodityList = ['lithium', 'copper', 'gold', 'silver', 'uranium', 'nickel', 'cobalt', 'rare earth']
      commodities = commodityList.filter(c => text.includes(c))
      
      // Check for financial metrics
      hasFinancials = text.includes('npv') || text.includes('irr') || text.includes('capex')
      
      console.log(`      📊 Commodities: ${commodities.join(', ') || 'Various'}`)
      console.log(`      💰 Has Financials: ${hasFinancials}`)
      
    } catch (error) {
      console.log(`      ⚠️  Could not parse document`)
    }
    
    // Save to database
    const { error } = await supabase.from('sec_technical_reports').insert({
      cik: cik,
      company_name: companyName,
      form_type: 'Exhibit 96.1',
      filing_date: new Date().toISOString().split('T')[0],
      accession_number: accessionNumber,
      document_url: url,
      exhibit_number: '96.1',
      document_description: 'Technical Report Summary (SK-1300)',
      primary_commodity: commodities[0] || 'Various',
      commodities: commodities.length > 0 ? commodities : ['Various'],
      status: hasFinancials ? 'has_financials' : 'pending_parse'
    })
    
    if (error) {
      console.log(`      ⚠️  Database error: ${error.message}`)
      return false
    } else {
      console.log(`      ✅ Saved to database`)
      return true
    }
    
  } catch (error: any) {
    console.log(`      ⚠️  Error: ${error.message}`)
    return false
  }
}

async function main() {
  console.log('='.repeat(70))
  console.log('SYSTEMATIC EXHIBIT 96.1 SEARCH')
  console.log('='.repeat(70))
  console.log(`Searching ${MINING_COMPANIES.length} mining companies for Exhibit 96.1`)
  console.log('='.repeat(70))
  
  // Don't clear - we want to keep accumulating
  console.log('\n📊 Starting search...')
  
  const allFoundUrls: Array<{url: string, company: string, cik: string}> = []
  
  // Search each company
  for (let i = 0; i < MINING_COMPANIES.length; i++) {
    const company = MINING_COMPANIES[i]
    console.log(`\n[${i + 1}/${MINING_COMPANIES.length}]`)
    
    const urls = await searchCompanyFilings(company.cik, company.name)
    
    for (const url of urls) {
      allFoundUrls.push({ url, company: company.name, cik: company.cik })
    }
    
    await delay(1000) // Rate limiting
  }
  
  console.log('\n' + '=' .repeat(70))
  console.log(`FOUND ${allFoundUrls.length} EXHIBIT 96.1 DOCUMENTS`)
  console.log('=' .repeat(70))
  
  if (allFoundUrls.length > 0) {
    console.log('\n💾 Saving to database...')
    
    let savedCount = 0
    for (const doc of allFoundUrls) {
      const saved = await parseAndSaveDocument(doc.url, doc.company, doc.cik)
      if (saved) savedCount++
      await delay(500)
    }
    
    console.log(`\n✅ Saved ${savedCount} documents`)
  }
  
  // Show final database contents
  const { count, data } = await supabase
    .from('sec_technical_reports')
    .select('*', { count: 'exact' })
    .order('company_name')
  
  console.log('\n' + '='.repeat(70))
  console.log('DATABASE CONTENTS')
  console.log('='.repeat(70))
  console.log(`Total Exhibit 96.1 documents: ${count}`)
  
  if (data && data.length > 0) {
    console.log('\n📋 Documents:')
    data.forEach(d => {
      console.log(`\n   ${d.company_name}`)
      console.log(`   ${d.document_url}`)
      console.log(`   Commodities: ${d.commodities?.join(', ')}`)
      console.log(`   Status: ${d.status}`)
    })
  }
  
  console.log('\n✅ Search complete! Ready for financial data extraction.')
  console.log('='.repeat(70))
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
