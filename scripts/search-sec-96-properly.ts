#!/usr/bin/env node

import { config } from 'dotenv'
import axios from 'axios'
import path from 'path'

// Load environment variables
config({ path: path.join(__dirname, '..', '.env.local') })

const USER_AGENT = 'Lithos Mining Analytics contact@lithos.ai'

// Search for actual filings with Exhibit 96
async function searchSECFullText() {
  console.log('Searching SEC EDGAR full-text for Exhibit 96.1 references...\n')
  
  // Use SEC's full-text search API
  const searchUrl = 'https://efts.sec.gov/LATEST/search-index'
  
  const searchQueries = [
    '"Exhibit 96.1" AND "technical report summary"',
    '"EX-96.1" AND mining',
    '"technical report summary" AND "mineral resources"',
    '"SK-1300" AND "technical report"'
  ]
  
  const allResults: any[] = []
  
  for (const query of searchQueries) {
    console.log(`🔍 Searching for: ${query}`)
    
    try {
      const response = await axios.post(
        searchUrl,
        {
          q: query,
          dateRange: 'custom',
          startdt: '2020-01-01',
          enddt: '2025-10-01',
          category: 'custom',
          forms: ['10-K', '10-Q', '8-K', '20-F', '40-F', 'S-1', 'S-3', 'F-1'],
          page: '1',
          from: '0'
        },
        {
          headers: {
            'User-Agent': USER_AGENT,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      )
      
      if (response.data && response.data.hits) {
        const hits = response.data.hits.hits
        console.log(`  Found ${hits.length} results`)
        
        for (const hit of hits.slice(0, 5)) {
          const filing = hit._source
          if (filing) {
            console.log(`\n  ✅ ${filing.display_names?.[0] || 'Unknown Company'}`)
            console.log(`     Form: ${filing.form} | Date: ${filing.file_date}`)
            console.log(`     CIK: ${filing.ciks?.[0]} | Accession: ${filing.adsh}`)
            
            // Construct the filing URL
            const cik = String(filing.ciks?.[0]).padStart(10, '0')
            const accession = filing.adsh?.replace(/-/g, '')
            const filingUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accession}/${filing.adsh}-index.html`
            console.log(`     Filing URL: ${filingUrl}`)
            
            allResults.push({
              company: filing.display_names?.[0],
              cik: filing.ciks?.[0],
              form: filing.form,
              date: filing.file_date,
              accession: filing.adsh,
              url: filingUrl
            })
          }
        }
      }
    } catch (error: any) {
      console.error(`  Error: ${error.message}`)
    }
    
    // Small delay between searches
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  return allResults
}

// Alternative: Search using SEC's submissions endpoint
async function searchRecentSK1300Filings() {
  console.log('\n🔍 Searching for recent SK-1300 compliant filings...\n')
  
  // These companies are known to file SK-1300 compliant reports
  const sk1300Companies = [
    { cik: '0001164727', name: 'Hecla Mining Co' },
    { cik: '0000861878', name: 'Coeur Mining Inc' },
    { cik: '0001022671', name: 'Cleveland-Cliffs Inc' },
    { cik: '0000027419', name: 'Freeport-McMoRan Inc' },
    { cik: '0001590955', name: 'MP Materials Corp' },
    { cik: '0000008063', name: 'Alcoa Corp' },
    { cik: '0000315293', name: 'Southern Copper Corp' }
  ]
  
  const results: any[] = []
  
  for (const company of sk1300Companies) {
    console.log(`Checking ${company.name}...`)
    
    try {
      const paddedCik = company.cik.padStart(10, '0')
      const response = await axios.get(
        `https://data.sec.gov/submissions/CIK${paddedCik}.json`,
        {
          headers: { 'User-Agent': USER_AGENT },
          timeout: 5000
        }
      )
      
      const data = response.data
      
      if (data.filings && data.filings.recent) {
        const recent = data.filings.recent
        
        // Look through recent filings
        for (let i = 0; i < Math.min(recent.form.length, 20); i++) {
          const formType = recent.form[i]
          const filingDate = recent.filingDate[i]
          const accessionNumber = recent.accessionNumber[i]
          const primaryDocument = recent.primaryDocument[i]
          
          // Check if this is a relevant form from recent years
          const date = new Date(filingDate)
          if (date >= new Date('2021-01-01')) {
            if (['10-K', '10-Q', '8-K', 'S-1', 'S-1/A'].includes(formType)) {
              const formattedAccession = accessionNumber.replace(/-/g, '')
              const exhibitUrl = `https://www.sec.gov/Archives/edgar/data/${paddedCik}/${formattedAccession}/`
              
              console.log(`  📄 ${formType} filed ${filingDate}`)
              console.log(`     Base URL: ${exhibitUrl}`)
              console.log(`     Check for: ${exhibitUrl}ex96-1.htm or ${exhibitUrl}ex961.htm`)
              
              results.push({
                company: company.name,
                cik: company.cik,
                form: formType,
                date: filingDate,
                accession: accessionNumber,
                baseUrl: exhibitUrl,
                possibleExhibits: [
                  `${exhibitUrl}ex96-1.htm`,
                  `${exhibitUrl}ex961.htm`,
                  `${exhibitUrl}ex96_1.htm`
                ]
              })
            }
          }
        }
      }
    } catch (error: any) {
      console.error(`  Error: ${error.message}`)
    }
    
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  return results
}

async function main() {
  console.log('=' .repeat(60))
  console.log('SEC EXHIBIT 96.1 PROPER SEARCH')
  console.log('=' .repeat(60))
  
  // Try full-text search
  const fullTextResults = await searchSECFullText()
  
  // Try known SK-1300 companies
  const sk1300Results = await searchRecentSK1300Filings()
  
  console.log('\n' + '=' .repeat(60))
  console.log('SUMMARY')
  console.log('=' .repeat(60))
  console.log(`Full-text search results: ${fullTextResults.length}`)
  console.log(`SK-1300 company filings found: ${sk1300Results.length}`)
  
  if (sk1300Results.length > 0) {
    console.log('\n📌 Sample Exhibit 96.1 URLs to check:')
    sk1300Results.slice(0, 5).forEach(r => {
      console.log(`\n${r.company} - ${r.form} (${r.date})`)
      r.possibleExhibits.forEach((url: string) => console.log(`  ${url}`))
    })
  }
  
  console.log('\n💡 Note: SK-1300 rules require mining companies to file')
  console.log('   technical report summaries as Exhibit 96.1 starting from 2021')
}

main().catch(console.error)
