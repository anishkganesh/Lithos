#!/usr/bin/env node

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import axios from 'axios'
import * as cheerio from 'cheerio'
import path from 'path'

config({ path: path.join(__dirname, '..', '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const USER_AGENT = 'Lithos Mining Analytics contact@lithos.ai'

// Critical minerals mining companies that file with SEC
const TARGET_COMPANIES = [
  // Lithium
  { cik: '0001560046', name: 'Lithium Americas Corp', commodity: 'Lithium' },
  { cik: '0001589526', name: 'Piedmont Lithium Inc', commodity: 'Lithium' },
  { cik: '0001841890', name: 'Ioneer Ltd', commodity: 'Lithium' },
  
  // Rare Earth / Critical Minerals
  { cik: '0001590955', name: 'MP Materials Corp', commodity: 'Rare Earth' },
  { cik: '0001828281', name: 'USA Rare Earth LLC', commodity: 'Rare Earth' },
  
  // Copper
  { cik: '0000027419', name: 'Freeport-McMoRan Inc', commodity: 'Copper' },
  { cik: '0000315293', name: 'Southern Copper Corp', commodity: 'Copper' },
  { cik: '0001722438', name: 'Trilogy Metals Inc', commodity: 'Copper' },
  
  // Uranium
  { cik: '0001376793', name: 'Uranium Energy Corp', commodity: 'Uranium' },
  { cik: '0001587466', name: 'Energy Fuels Inc', commodity: 'Uranium' },
  { cik: '0001709164', name: 'Ur-Energy Inc', commodity: 'Uranium' },
  
  // Gold/Silver
  { cik: '0001164727', name: 'Hecla Mining Co', commodity: 'Silver' },
  { cik: '0000861878', name: 'Coeur Mining Inc', commodity: 'Silver' },
  { cik: '0001306830', name: 'First Majestic Silver Corp', commodity: 'Silver' },
  { cik: '0000764065', name: 'Newmont Corp', commodity: 'Gold' },
  
  // Nickel/Cobalt
  { cik: '0001720014', name: 'Talon Metals Corp', commodity: 'Nickel' },
  
  // Graphite
  { cik: '0001534992', name: 'Northern Graphite Corp', commodity: 'Graphite' },
  
  // Zinc/Lead
  { cik: '0001780232', name: 'Glencore PLC', commodity: 'Zinc' },
  
  // Iron/Steel
  { cik: '0001022671', name: 'Cleveland-Cliffs Inc', commodity: 'Iron' },
  
  // Aluminum
  { cik: '0000008063', name: 'Alcoa Corp', commodity: 'Aluminum' }
]

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function findExhibit96Documents(cik: string, companyName: string, commodity: string) {
  console.log(`\n🔍 Processing ${companyName} (${commodity})...`)
  
  try {
    const paddedCik = cik.padStart(10, '0')
    const response = await axios.get(
      `https://data.sec.gov/submissions/CIK${paddedCik}.json`,
      {
        headers: { 'User-Agent': USER_AGENT },
        timeout: 10000
      }
    )
    
    const data = response.data
    let documentsFound = 0
    
    if (!data.filings || !data.filings.recent) {
      console.log(`  No filings found`)
      return 0
    }
    
    const recent = data.filings.recent
    
    // Look through filings from 2021 onwards
    for (let i = 0; i < recent.form.length; i++) {
      const formType = recent.form[i]
      const filingDate = recent.filingDate[i]
      const accessionNumber = recent.accessionNumber[i]
      
      // Only process filings from 2021 onwards
      const date = new Date(filingDate)
      if (date < new Date('2021-01-01')) continue
      
      // Focus on forms that might have Exhibit 96.1
      if (!['10-K', '10-K/A', 'S-1', 'S-1/A', 'S-3', 'S-3/A', 'F-1', 'F-1/A'].includes(formType)) continue
      
      // Get the filing details
      const formattedAccession = accessionNumber.replace(/-/g, '')
      const filingIndexUrl = `https://www.sec.gov/cgi-bin/viewer?action=view&cik=${cik}&accession_number=${accessionNumber}&xbrl_type=v`
      
      try {
        // Check for exhibit files
        const exhibitUrls = [
          `https://www.sec.gov/Archives/edgar/data/${cik}/${formattedAccession}/ex96-1.htm`,
          `https://www.sec.gov/Archives/edgar/data/${cik}/${formattedAccession}/ex961.htm`,
          `https://www.sec.gov/Archives/edgar/data/${cik}/${formattedAccession}/ex96_1.htm`,
          `https://www.sec.gov/Archives/edgar/data/${cik}/${formattedAccession}/ex-961.htm`,
          `https://www.sec.gov/Archives/edgar/data/${cik}/${formattedAccession}/d-ex961.htm`,
          `https://www.sec.gov/Archives/edgar/data/${cik}/${formattedAccession}/dex961.htm`
        ]
        
        for (const url of exhibitUrls) {
          try {
            const checkResponse = await axios.head(url, {
              headers: { 'User-Agent': USER_AGENT },
              timeout: 3000,
              validateStatus: (status) => status < 500
            })
            
            if (checkResponse.status === 200) {
              console.log(`  ✅ FOUND: ${formType} (${filingDate})`)
              console.log(`     URL: ${url}`)
              
              // Save to database
              await supabase.from('sec_technical_reports').insert({
                cik: cik,
                company_name: companyName,
                form_type: formType,
                filing_date: filingDate,
                accession_number: accessionNumber,
                document_url: url,
                exhibit_number: '96.1',
                document_description: `Technical Report Summary - ${formType}`,
                primary_commodity: commodity,
                commodities: [commodity],
                status: 'pending_parse'
              })
              
              documentsFound++
              break // Found one for this filing, move to next filing
            }
          } catch (err) {
            // Continue to next URL
          }
        }
        
        await delay(100) // Rate limiting
        
      } catch (err) {
        // Continue to next filing
      }
    }
    
    if (documentsFound > 0) {
      console.log(`  📊 Total Exhibit 96.1 found: ${documentsFound}`)
    } else {
      console.log(`  ❌ No Exhibit 96.1 documents found`)
    }
    
    return documentsFound
    
  } catch (error: any) {
    console.error(`  Error: ${error.message}`)
    return 0
  }
}

async function main() {
  console.log('=' .repeat(70))
  console.log('CRITICAL MINERALS SEC EXHIBIT 96.1 BULK IMPORT')
  console.log('=' .repeat(70))
  console.log(`Companies to process: ${TARGET_COMPANIES.length}`)
  console.log(`Date range: 2021-01-01 to present`)
  console.log(`Focus: 10-K, S-1, S-3, F-1 forms with Exhibit 96.1\n`)
  
  let totalFound = 0
  let processedCount = 0
  
  for (const company of TARGET_COMPANIES) {
    processedCount++
    console.log(`\n[${processedCount}/${TARGET_COMPANIES.length}]`)
    
    const found = await findExhibit96Documents(company.cik, company.name, company.commodity)
    totalFound += found
    
    // Rate limiting between companies
    await delay(500)
  }
  
  console.log('\n' + '=' .repeat(70))
  console.log('IMPORT COMPLETE')
  console.log('=' .repeat(70))
  console.log(`Companies processed: ${TARGET_COMPANIES.length}`)
  console.log(`Total Exhibit 96.1 documents found: ${totalFound}`)
  console.log('=' .repeat(70))
  
  // Show summary by commodity
  const { data: summary } = await supabase
    .from('sec_technical_reports')
    .select('primary_commodity')
    .not('primary_commodity', 'is', null)
  
  if (summary) {
    const commodityCounts: Record<string, number> = {}
    summary.forEach(s => {
      if (s.primary_commodity) {
        commodityCounts[s.primary_commodity] = (commodityCounts[s.primary_commodity] || 0) + 1
      }
    })
    
    console.log('\n📊 Documents by Commodity:')
    Object.entries(commodityCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([commodity, count]) => {
        console.log(`  ${commodity}: ${count}`)
      })
  }
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
