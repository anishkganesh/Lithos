#!/usr/bin/env node

import { config } from 'dotenv'
import axios from 'axios'
import path from 'path'

// Load environment variables
config({ path: path.join(__dirname, '..', '.env.local') })

const USER_AGENT = 'Lithos Mining Analytics contact@lithos.ai'

// Known mining companies with Exhibit 96.1 filings
const KNOWN_MINING_COMPANIES = [
  { cik: '0001164727', name: 'Hecla Mining' },
  { cik: '0000764065', name: 'Newmont Corporation' },
  { cik: '0000756894', name: 'Barrick Gold' },
  { cik: '0001051514', name: 'Kinross Gold' },
  { cik: '0000861878', name: 'Coeur Mining' },
  { cik: '0001306830', name: 'First Majestic Silver' },
  { cik: '0001173420', name: 'Pan American Silver' },
  { cik: '0001203464', name: 'Teck Resources' },
  { cik: '0001640147', name: 'SSR Mining' },
  { cik: '0001023514', name: 'Royal Gold' }
]

async function findExhibit96InFiling(accessionNumber: string, cik: string, formType: string, filingDate: string, companyName: string) {
  const formattedAccession = accessionNumber.replace(/-/g, '')
  const paddedCik = cik.padStart(10, '0')
  
  // Get the filing details page
  const filingUrl = `https://www.sec.gov/Archives/edgar/data/${paddedCik}/${formattedAccession}/${accessionNumber}-index.html`
  const filingJsonUrl = `https://data.sec.gov/submissions/CIK${paddedCik}.json`
  
  try {
    // Try to get the filing index
    const indexResponse = await axios.get(
      `https://www.sec.gov/Archives/edgar/data/${paddedCik}/${formattedAccession}/${accessionNumber}-index-headers.html`,
      {
        headers: { 'User-Agent': USER_AGENT },
        timeout: 5000
      }
    )
    
    const indexHtml = indexResponse.data
    
    // Look for Exhibit 96 references in the HTML
    const exhibit96Pattern = /href="([^"]+)"[^>]*>.*?(EX-96|Exhibit 96|Technical Report Summary)/gi
    const matches = [...indexHtml.matchAll(exhibit96Pattern)]
    
    if (matches.length > 0) {
      console.log(`\n✅ FOUND Exhibit 96.1 in ${formType} for ${companyName} (${filingDate})`)
      console.log(`   Accession: ${accessionNumber}`)
      
      matches.forEach(match => {
        const docPath = match[1]
        let fullUrl = ''
        
        if (docPath.startsWith('http')) {
          fullUrl = docPath
        } else if (docPath.startsWith('/')) {
          fullUrl = `https://www.sec.gov${docPath}`
        } else {
          fullUrl = `https://www.sec.gov/Archives/edgar/data/${paddedCik}/${formattedAccession}/${docPath}`
        }
        
        console.log(`   📄 Document URL: ${fullUrl}`)
      })
      
      return matches.length
    }
  } catch (error: any) {
    // Try alternate approach - look for exhibit files directly
    const exhibitUrls = [
      `https://www.sec.gov/Archives/edgar/data/${paddedCik}/${formattedAccession}/ex96-1.htm`,
      `https://www.sec.gov/Archives/edgar/data/${paddedCik}/${formattedAccession}/ex961.htm`,
      `https://www.sec.gov/Archives/edgar/data/${paddedCik}/${formattedAccession}/ex96_1.htm`,
      `https://www.sec.gov/Archives/edgar/data/${paddedCik}/${formattedAccession}/exhibit961.htm`,
      `https://www.sec.gov/Archives/edgar/data/${paddedCik}/${formattedAccession}/exhibit96-1.htm`,
      `https://www.sec.gov/Archives/edgar/data/${paddedCik}/${formattedAccession}/ex96.htm`
    ]
    
    for (const url of exhibitUrls) {
      try {
        const response = await axios.head(url, {
          headers: { 'User-Agent': USER_AGENT },
          timeout: 2000
        })
        
        if (response.status === 200) {
          console.log(`\n✅ FOUND Exhibit 96.1 in ${formType} for ${companyName} (${filingDate})`)
          console.log(`   Accession: ${accessionNumber}`)
          console.log(`   📄 Document URL: ${url}`)
          return 1
        }
      } catch {
        // Continue checking other URLs
      }
    }
  }
  
  return 0
}

async function searchCompanyFilings(company: any) {
  console.log(`\n🔍 Searching ${company.name} (CIK: ${company.cik})...`)
  
  try {
    // Get company submissions
    const response = await axios.get(
      `https://data.sec.gov/submissions/CIK${company.cik.padStart(10, '0')}.json`,
      {
        headers: { 'User-Agent': USER_AGENT }
      }
    )
    
    const data = response.data
    let foundCount = 0
    
    if (data.filings && data.filings.recent) {
      const recent = data.filings.recent
      
      // Look for relevant form types
      for (let i = 0; i < Math.min(recent.form.length, 100); i++) {
        const formType = recent.form[i]
        const filingDate = recent.filingDate[i]
        const accessionNumber = recent.accessionNumber[i]
        
        // Check if filing is from last 5 years
        const date = new Date(filingDate)
        const cutoffDate = new Date('2020-01-01')
        
        if (date >= cutoffDate) {
          // Check for 10-K, 10-Q, 8-K, 20-F forms which might contain Exhibit 96.1
          if (['10-K', '10-Q', '8-K', '20-F', '40-F', '10-K/A', '10-Q/A'].includes(formType)) {
            const found = await findExhibit96InFiling(
              accessionNumber,
              company.cik,
              formType,
              filingDate,
              company.name
            )
            
            foundCount += found
            
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100))
          }
        }
      }
    }
    
    if (foundCount > 0) {
      console.log(`   ✅ Total Exhibit 96.1 documents found: ${foundCount}`)
    } else {
      console.log(`   ❌ No Exhibit 96.1 documents found`)
    }
    
    return foundCount
  } catch (error: any) {
    console.error(`   Error: ${error.message}`)
    return 0
  }
}

async function main() {
  console.log('=' .repeat(60))
  console.log('DIRECT EXHIBIT 96.1 SEARCH')
  console.log('=' .repeat(60))
  console.log('Searching known mining companies for Exhibit 96.1 documents...\n')
  
  let totalFound = 0
  
  for (const company of KNOWN_MINING_COMPANIES) {
    const found = await searchCompanyFilings(company)
    totalFound += found
    
    // Small delay between companies
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  console.log('\n' + '=' .repeat(60))
  console.log(`TOTAL EXHIBIT 96.1 DOCUMENTS FOUND: ${totalFound}`)
  console.log('=' .repeat(60))
}

main().catch(console.error)
