#!/usr/bin/env node

/**
 * Comprehensive crawler to find ALL ex961.htm documents across the web
 * Uses multiple approaches:
 * 1. Direct SEC EDGAR search
 * 2. Google-style web search via Firecrawl
 * 3. Known company CIK scanning
 * 4. Pattern matching for document URLs
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import FirecrawlApp from '@mendable/firecrawl-js'
import axios from 'axios'
import * as cheerio from 'cheerio'
import path from 'path'

config({ path: path.join(__dirname, '..', '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
const firecrawl = new FirecrawlApp({ apiKey: FIRECRAWL_API_KEY })

const USER_AGENT = 'Lithos Mining Analytics contact@lithos.ai'

// Known documents you provided
const KNOWN_EX961_DOCS = [
  'https://www.sec.gov/Archives/edgar/data/1966983/000119312525002534/d909276dex961.htm',
  'https://www.sec.gov/Archives/edgar/data/1375205/000165495424002673/urg_ex961.htm'
]

// Mining companies likely to have Exhibit 96.1
const MINING_CIKS = [
  '0001966983', // From your example
  '0001375205', // URG from your example
  '0001589526', // Piedmont Lithium
  '0001841890', // Ioneer
  '0001590955', // MP Materials
  '0000027419', // Freeport-McMoRan
  '0000764065', // Newmont
  '0001164727', // Hecla Mining
  '0000861878', // Coeur Mining
  '0001376793', // Uranium Energy
  '0001709164', // Ur-Energy
  '0001720014', // Talon Metals
  '0001022671', // Cleveland-Cliffs
  '0000315293', // Southern Copper
  '0001651625', // Lithium Americas
  '0001798562', // Sigma Lithium
  '0001633917', // American Lithium
  '0001849796', // Century Lithium
  '0001866757', // Lithium Ionic
  '0001910918', // Atlas Lithium
  '0001807846', // Patriot Battery Metals
]

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Approach 1: Web search using Firecrawl
async function searchWebForEx961() {
  console.log('\n🔍 APPROACH 1: Web Search via Firecrawl')
  console.log('=' .repeat(50))
  
  const searchQueries = [
    'site:sec.gov "ex961.htm"',
    'site:sec.gov "ex96-1.htm"',
    'site:sec.gov "exhibit 96.1" filetype:htm',
    '"ex961.htm" mining technical report',
    '"exhibit 96.1" "technical report summary" filetype:htm',
    'inurl:ex961.htm site:sec.gov',
    'inurl:ex96-1.htm site:sec.gov'
  ]
  
  const foundUrls = new Set<string>()
  
  for (const query of searchQueries) {
    console.log(`\n   Searching: "${query}"`)
    
    try {
      // Use Firecrawl to search
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=100`
      const result = await firecrawl.scrapeUrl(searchUrl, {
        formats: ['links', 'html'],
        onlyMainContent: false
      })
      
      if (result.success && result.links) {
        const ex961Links = result.links.filter(link => 
          link.includes('ex961.htm') || 
          link.includes('ex96-1.htm') ||
          link.includes('ex961.html')
        )
        
        for (const link of ex961Links) {
          if (link.includes('sec.gov') && !foundUrls.has(link)) {
            foundUrls.add(link)
            console.log(`      ✅ Found: ${link}`)
          }
        }
      }
      
      await delay(2000) // Rate limiting
    } catch (error) {
      console.log(`      ⚠️  Error: ${error}`)
    }
  }
  
  return Array.from(foundUrls)
}

// Approach 2: Direct SEC EDGAR scanning
async function scanSECFilings() {
  console.log('\n🔍 APPROACH 2: Direct SEC EDGAR Scanning')
  console.log('=' .repeat(50))
  
  const foundUrls = new Set<string>()
  
  for (const cik of MINING_CIKS) {
    const paddedCik = cik.padStart(10, '0')
    console.log(`\n   Checking CIK ${paddedCik}...`)
    
    try {
      // Get company submissions
      const response = await axios.get(
        `https://data.sec.gov/submissions/CIK${paddedCik}.json`,
        {
          headers: { 'User-Agent': USER_AGENT },
          timeout: 10000
        }
      )
      
      if (response.data.filings?.recent) {
        const recent = response.data.filings.recent
        
        // Check each filing for Exhibit 96.1
        for (let i = 0; i < Math.min(recent.form.length, 50); i++) {
          const accessionNumber = recent.accessionNumber[i]
          const formType = recent.form[i]
          
          // Only check relevant form types
          if (!['10-K', '10-K/A', 'S-1', 'S-1/A', 'F-1', 'F-1/A', '8-K'].includes(formType)) {
            continue
          }
          
          const formattedAccession = accessionNumber.replace(/-/g, '')
          
          // Try common Exhibit 96.1 URL patterns
          const possibleUrls = [
            `https://www.sec.gov/Archives/edgar/data/${paddedCik}/${formattedAccession}/d909276dex961.htm`,
            `https://www.sec.gov/Archives/edgar/data/${paddedCik}/${formattedAccession}/${cik.replace(/^0+/, '')}_ex961.htm`,
            `https://www.sec.gov/Archives/edgar/data/${paddedCik}/${formattedAccession}/ex961.htm`,
            `https://www.sec.gov/Archives/edgar/data/${paddedCik}/${formattedAccession}/ex96-1.htm`,
            `https://www.sec.gov/Archives/edgar/data/${paddedCik}/${formattedAccession}/exhibit961.htm`
          ]
          
          for (const url of possibleUrls) {
            try {
              const checkResponse = await axios.head(url, {
                headers: { 'User-Agent': USER_AGENT },
                timeout: 5000
              })
              
              if (checkResponse.status === 200) {
                foundUrls.add(url)
                console.log(`      ✅ Found: ${url}`)
                break // Found one for this filing
              }
            } catch {
              // URL doesn't exist, continue
            }
          }
          
          await delay(100) // Rate limiting
        }
      }
      
      await delay(500) // Rate limiting between companies
    } catch (error) {
      console.log(`      ⚠️  Error checking CIK ${cik}`)
    }
  }
  
  return Array.from(foundUrls)
}

// Approach 3: Parse known documents to extract company info
async function parseKnownDocuments() {
  console.log('\n🔍 APPROACH 3: Parsing Known Documents')
  console.log('=' .repeat(50))
  
  const documentInfo = []
  
  for (const url of KNOWN_EX961_DOCS) {
    console.log(`\n   Parsing: ${url}`)
    
    try {
      const response = await axios.get(url, {
        headers: { 'User-Agent': USER_AGENT },
        timeout: 15000
      })
      
      const $ = cheerio.load(response.data)
      const text = $.text()
      
      // Extract company name
      const companyMatch = text.match(/([A-Z][A-Za-z\s&,\.]+(?:Inc|Corp|Ltd|LLC|Company))/)?.[1]
      
      // Extract project name
      const projectMatch = text.match(/(?:Project|Property|Mine)[\s:]+([A-Za-z\s]+)(?:Project|Property|Mine)?/i)?.[1]
      
      // Extract commodities
      const commodities = []
      const commodityKeywords = ['lithium', 'copper', 'gold', 'silver', 'uranium', 'nickel', 'cobalt', 'rare earth', 'graphite', 'zinc', 'lead']
      for (const commodity of commodityKeywords) {
        if (text.toLowerCase().includes(commodity)) {
          commodities.push(commodity)
        }
      }
      
      // Extract financial metrics
      const npvMatch = text.match(/NPV[^\$]*\$?([\d,]+(?:\.\d+)?)\s*(million|billion)/i)
      const irrMatch = text.match(/IRR[^\d]*([\d\.]+)%/i)
      const capexMatch = text.match(/CAPEX[^\$]*\$?([\d,]+(?:\.\d+)?)\s*(million|billion)/i)
      
      const info = {
        url,
        company_name: companyMatch || 'Unknown',
        project_name: projectMatch?.trim() || 'Unknown',
        commodities,
        has_npv: !!npvMatch,
        has_irr: !!irrMatch,
        has_capex: !!capexMatch
      }
      
      console.log(`      Company: ${info.company_name}`)
      console.log(`      Project: ${info.project_name}`)
      console.log(`      Commodities: ${info.commodities.join(', ')}`)
      console.log(`      Metrics: NPV=${info.has_npv}, IRR=${info.has_irr}, CAPEX=${info.has_capex}`)
      
      documentInfo.push(info)
      
      await delay(1000)
    } catch (error) {
      console.log(`      ⚠️  Error parsing: ${error}`)
    }
  }
  
  return documentInfo
}

// Approach 4: Use SEC full-text search
async function searchSECFullText() {
  console.log('\n🔍 APPROACH 4: SEC Full-Text Search')
  console.log('=' .repeat(50))
  
  const foundUrls = new Set<string>()
  
  const searchTerms = [
    'exhibit 96.1',
    'technical report summary',
    'SK-1300',
    'ex961.htm'
  ]
  
  for (const term of searchTerms) {
    console.log(`\n   Searching for: "${term}"`)
    
    try {
      // SEC search API endpoint
      const searchUrl = `https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent(term)}&dateRange=all&category=custom&forms=10-K,10-K/A,S-1,S-1/A,8-K`
      
      const response = await axios.get(searchUrl, {
        headers: { 
          'User-Agent': USER_AGENT,
          'Accept': 'application/json'
        },
        timeout: 10000
      })
      
      if (response.data?.hits?.hits) {
        for (const hit of response.data.hits.hits) {
          const filing = hit._source
          if (filing?.file_num) {
            // Build potential exhibit URLs
            const cik = filing.ciks?.[0]
            const accession = filing.adsh
            
            if (cik && accession) {
              const paddedCik = String(cik).padStart(10, '0')
              const formattedAccession = accession.replace(/-/g, '')
              
              const potentialUrl = `https://www.sec.gov/Archives/edgar/data/${paddedCik}/${formattedAccession}/ex961.htm`
              
              // Check if URL exists
              try {
                const checkResponse = await axios.head(potentialUrl, {
                  headers: { 'User-Agent': USER_AGENT },
                  timeout: 5000
                })
                
                if (checkResponse.status === 200) {
                  foundUrls.add(potentialUrl)
                  console.log(`      ✅ Found: ${potentialUrl}`)
                }
              } catch {
                // URL doesn't exist
              }
            }
          }
        }
      }
      
      await delay(2000)
    } catch (error) {
      console.log(`      ⚠️  Search error: ${error}`)
    }
  }
  
  return Array.from(foundUrls)
}

async function saveToDatabase(urls: string[], documentInfo: any[]) {
  console.log('\n💾 Saving to Database')
  console.log('=' .repeat(50))
  
  let saved = 0
  
  // First, add known documents
  for (const url of KNOWN_EX961_DOCS) {
    if (!urls.includes(url)) {
      urls.push(url)
    }
  }
  
  for (const url of urls) {
    try {
      // Extract metadata from URL
      const urlParts = url.match(/data\/(\d+)\/(\d+)\/(.*\.htm)/)
      const cik = urlParts?.[1]
      const accessionFormatted = urlParts?.[2]
      
      // Find document info if available
      const info = documentInfo.find(d => d.url === url) || {}
      
      await supabase.from('sec_technical_reports').insert({
        cik: cik || 'unknown',
        company_name: info.company_name || 'Mining Company',
        form_type: 'Exhibit 96.1',
        filing_date: new Date().toISOString().split('T')[0],
        accession_number: accessionFormatted || 'unknown',
        document_url: url,
        exhibit_number: '96.1',
        document_description: 'Technical Report Summary (SK-1300)',
        primary_commodity: info.commodities?.[0] || 'Various',
        commodities: info.commodities || ['Various'],
        status: 'pending_parse',
        raw_metadata: info
      })
      
      saved++
      console.log(`   ✅ Saved: ${url}`)
    } catch (error) {
      console.log(`   ⚠️  Error saving ${url}: ${error}`)
    }
  }
  
  return saved
}

async function main() {
  console.log('='.repeat(70))
  console.log('COMPREHENSIVE EXHIBIT 96.1 DOCUMENT CRAWLER')
  console.log('='.repeat(70))
  console.log('Finding ALL ex961.htm documents across the web')
  console.log('Using multiple approaches for exhaustive coverage')
  console.log('='.repeat(70))
  
  // Clear existing data
  console.log('\n🗑️  Clearing old data...')
  await supabase.from('sec_technical_reports').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  
  const allUrls = new Set<string>()
  
  // Add known documents
  KNOWN_EX961_DOCS.forEach(url => allUrls.add(url))
  console.log(`\n📌 Starting with ${KNOWN_EX961_DOCS.length} known documents`)
  
  // Parse known documents for info
  const documentInfo = await parseKnownDocuments()
  
  // Approach 1: Web search
  const webSearchUrls = await searchWebForEx961()
  webSearchUrls.forEach(url => allUrls.add(url))
  console.log(`\n   Found ${webSearchUrls.length} via web search`)
  
  // Approach 2: Direct SEC scanning
  const secScanUrls = await scanSECFilings()
  secScanUrls.forEach(url => allUrls.add(url))
  console.log(`\n   Found ${secScanUrls.length} via SEC scanning`)
  
  // Approach 3: SEC full-text search
  const fullTextUrls = await searchSECFullText()
  fullTextUrls.forEach(url => allUrls.add(url))
  console.log(`\n   Found ${fullTextUrls.length} via full-text search`)
  
  // Save all found URLs to database
  const allUrlsArray = Array.from(allUrls)
  const savedCount = await saveToDatabase(allUrlsArray, documentInfo)
  
  console.log('\n' + '='.repeat(70))
  console.log('CRAWLING COMPLETE')
  console.log('='.repeat(70))
  console.log(`Total unique Exhibit 96.1 documents found: ${allUrls.size}`)
  console.log(`Successfully saved to database: ${savedCount}`)
  
  // Show database contents
  const { count, data: samples } = await supabase
    .from('sec_technical_reports')
    .select('*', { count: 'exact' })
    .limit(10)
  
  console.log(`\n📊 Database now contains: ${count} documents`)
  
  if (samples && samples.length > 0) {
    console.log('\n📋 Sample Exhibit 96.1 documents:')
    samples.forEach(s => {
      console.log(`\n   ${s.company_name}`)
      console.log(`   ${s.document_url}`)
      console.log(`   Commodities: ${s.commodities?.join(', ')}`)
    })
  }
  
  console.log('\n✅ Ready for parsing to extract:')
  console.log('   • NPV, IRR, Payback Period')
  console.log('   • CAPEX, OPEX, AISC')
  console.log('   • Reserves & Resources')
  console.log('   • Mine Life, Production Rates')
  console.log('='.repeat(70))
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
