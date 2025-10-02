#!/usr/bin/env node

/**
 * Extract Exhibit 96.1 links from INSIDE 10-K filings
 * 1. Get 10-K filings for critical minerals companies
 * 2. Parse the filing index/table of contents
 * 3. Find and extract Exhibit 96.1 HTML links
 * 4. Store links in database
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

const USER_AGENT = 'Lithos Mining Analytics contact@lithos.ai'

// Critical minerals companies with 10-K filings
const CRITICAL_MINERALS_COMPANIES = [
  // Lithium
  { cik: '0001589526', name: 'Piedmont Lithium Inc', commodity: 'Lithium' },
  { cik: '0001841890', name: 'Ioneer Ltd', commodity: 'Lithium' },
  
  // Rare Earth
  { cik: '0001590955', name: 'MP Materials Corp', commodity: 'Rare Earth' },
  
  // Copper
  { cik: '0000027419', name: 'Freeport-McMoRan Inc', commodity: 'Copper' },
  { cik: '0000315293', name: 'Southern Copper Corp', commodity: 'Copper' },
  
  // Uranium
  { cik: '0001376793', name: 'Uranium Energy Corp', commodity: 'Uranium' },
  { cik: '0001709164', name: 'Ur-Energy Inc', commodity: 'Uranium' },
  
  // Silver/Gold
  { cik: '0001164727', name: 'Hecla Mining Co', commodity: 'Silver' },
  { cik: '0000861878', name: 'Coeur Mining Inc', commodity: 'Silver' },
  { cik: '0000764065', name: 'Newmont Corp', commodity: 'Gold' },
  
  // Nickel/Cobalt
  { cik: '0001720014', name: 'Talon Metals Corp', commodity: 'Nickel' },
  
  // Iron
  { cik: '0001022671', name: 'Cleveland-Cliffs Inc', commodity: 'Iron' },
  
  // Aluminum
  { cik: '0000008063', name: 'Alcoa Corp', commodity: 'Aluminum' }
]

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function findExhibit96InFiling(
  cik: string,
  accessionNumber: string,
  formType: string,
  filingDate: string,
  companyName: string,
  commodity: string
) {
  const formattedAccession = accessionNumber.replace(/-/g, '')
  const paddedCik = cik.padStart(10, '0')
  
  // Get the filing index page
  const indexUrl = `https://www.sec.gov/Archives/edgar/data/${paddedCik}/${formattedAccession}/${accessionNumber}-index.html`
  
  console.log(`   📄 Checking ${formType} (${filingDate})`)
  console.log(`      ${indexUrl}`)
  
  try {
    const response = await axios.get(indexUrl, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 10000
    })
    
    const $ = cheerio.load(response.data)
    const exhibit96Links: any[] = []
    
    // Look for Exhibit 96 in the table of documents
    $('table').each((_, table) => {
      $(table).find('tr').each((_, row) => {
        const text = $(row).text().toLowerCase()
        
        // Check if this row mentions Exhibit 96
        if (text.includes('exhibit 96') || 
            text.includes('ex-96') || 
            text.includes('technical report summary') ||
            text.includes('sk-1300')) {
          
          // Find the link in this row
          $(row).find('a').each((_, link) => {
            const href = $(link).attr('href')
            const linkText = $(link).text()
            
            if (href && (
              href.includes('ex96') ||
              href.includes('ex-96') ||
              linkText.toLowerCase().includes('96')
            )) {
              let fullUrl = href
              
              // Build full URL if relative
              if (!href.startsWith('http')) {
                if (href.startsWith('/')) {
                  fullUrl = `https://www.sec.gov${href}`
                } else {
                  fullUrl = `https://www.sec.gov/Archives/edgar/data/${paddedCik}/${formattedAccession}/${href}`
                }
              }
              
              // Only add if it's an HTML/HTM file
              if (fullUrl.match(/\.(htm|html)$/i)) {
                exhibit96Links.push({
                  url: fullUrl,
                  text: linkText.trim(),
                  description: $(row).text().trim().substring(0, 200)
                })
              }
            }
          })
        }
      })
    })
    
    // Also check for direct links with exhibit 96 patterns
    $('a').each((_, elem) => {
      const href = $(elem).attr('href')
      const text = $(elem).text()
      
      if (href && (
        href.includes('ex96') ||
        href.includes('ex-96') ||
        href.includes('exhibit96') ||
        text.toLowerCase().includes('exhibit 96') ||
        text.toLowerCase().includes('technical report')
      )) {
        let fullUrl = href
        
        if (!href.startsWith('http')) {
          if (href.startsWith('/')) {
            fullUrl = `https://www.sec.gov${href}`
          } else {
            fullUrl = `https://www.sec.gov/Archives/edgar/data/${paddedCik}/${formattedAccession}/${href}`
          }
        }
        
        // Check if we already have this link
        const exists = exhibit96Links.some(l => l.url === fullUrl)
        
        if (!exists && fullUrl.match(/\.(htm|html)$/i)) {
          exhibit96Links.push({
            url: fullUrl,
            text: text.trim(),
            description: 'Direct link from filing'
          })
        }
      }
    })
    
    if (exhibit96Links.length > 0) {
      console.log(`      ✅ Found ${exhibit96Links.length} Exhibit 96.1 links!`)
      
      // Save each link to database
      for (const link of exhibit96Links) {
        console.log(`         ${link.url}`)
        
        await supabase.from('sec_technical_reports').insert({
          cik: cik,
          company_name: companyName,
          form_type: formType,
          filing_date: filingDate,
          accession_number: accessionNumber,
          document_url: link.url,
          exhibit_number: '96.1',
          document_description: link.description,
          primary_commodity: commodity,
          commodities: [commodity],
          status: 'pending_parse'
        })
      }
      
      return exhibit96Links.length
    } else {
      console.log(`      ❌ No Exhibit 96.1 found`)
      return 0
    }
    
  } catch (error: any) {
    console.log(`      ⚠️  Error accessing filing: ${error.message}`)
    return 0
  }
}

async function processCompany(cik: string, companyName: string, commodity: string) {
  console.log(`\n🏢 ${companyName} (${commodity})`)
  console.log(`   CIK: ${cik}`)
  
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
    let totalFound = 0
    
    if (!data.filings || !data.filings.recent) {
      console.log(`   ❌ No filings found`)
      return 0
    }
    
    const recent = data.filings.recent
    
    // Look for 10-K filings from 2021 onwards
    for (let i = 0; i < recent.form.length && i < 50; i++) {
      const formType = recent.form[i]
      const filingDate = recent.filingDate[i]
      const accessionNumber = recent.accessionNumber[i]
      
      // Only process 10-K and 10-K/A
      if (formType !== '10-K' && formType !== '10-K/A') continue
      
      // Only from 2021 onwards
      const date = new Date(filingDate)
      if (date < new Date('2021-01-01')) continue
      
      // Search inside this filing for Exhibit 96.1
      const found = await findExhibit96InFiling(
        cik,
        accessionNumber,
        formType,
        filingDate,
        companyName,
        commodity
      )
      
      totalFound += found
      
      await delay(500) // Rate limiting
    }
    
    if (totalFound > 0) {
      console.log(`   ✅ Total Exhibit 96.1 links found: ${totalFound}`)
    } else {
      console.log(`   ❌ No Exhibit 96.1 documents in any 10-K filings`)
    }
    
    return totalFound
    
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`)
    return 0
  }
}

async function main() {
  console.log('='.repeat(70))
  console.log('EXTRACTING EXHIBIT 96.1 LINKS FROM 10-K FILINGS')
  console.log('='.repeat(70))
  console.log('Process:')
  console.log('1. Get 10-K filings for critical minerals companies')
  console.log('2. Open each filing index page')
  console.log('3. Extract Exhibit 96.1 HTML links')
  console.log('4. Store links in database')
  console.log('='.repeat(70))
  
  // Clear existing data
  console.log('\n🗑️  Clearing old data...')
  await supabase.from('sec_technical_reports').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  
  let totalLinksFound = 0
  let companiesWithExhibits = 0
  
  for (let i = 0; i < CRITICAL_MINERALS_COMPANIES.length; i++) {
    const company = CRITICAL_MINERALS_COMPANIES[i]
    console.log(`\n[${i + 1}/${CRITICAL_MINERALS_COMPANIES.length}]`)
    
    const found = await processCompany(company.cik, company.name, company.commodity)
    totalLinksFound += found
    
    if (found > 0) {
      companiesWithExhibits++
    }
    
    await delay(1000) // Rate limiting between companies
  }
  
  console.log('\n' + '='.repeat(70))
  console.log('EXTRACTION COMPLETE')
  console.log('='.repeat(70))
  console.log(`Companies processed: ${CRITICAL_MINERALS_COMPANIES.length}`)
  console.log(`Companies with Exhibit 96.1: ${companiesWithExhibits}`)
  console.log(`Total Exhibit 96.1 links extracted: ${totalLinksFound}`)
  
  // Show what's in the database
  const { count } = await supabase
    .from('sec_technical_reports')
    .select('*', { count: 'exact', head: true })
  
  console.log(`\n📊 Database now contains: ${count} Exhibit 96.1 links`)
  
  if (count && count > 0) {
    const { data: samples } = await supabase
      .from('sec_technical_reports')
      .select('company_name, filing_date, document_url')
      .limit(5)
    
    console.log('\n📋 Sample links:')
    samples?.forEach(s => {
      console.log(`   ${s.company_name} (${s.filing_date})`)
      console.log(`   ${s.document_url}`)
    })
    
    console.log('\n✅ Ready for parsing! These HTML documents contain:')
    console.log('   • NPV, IRR, Payback')
    console.log('   • CAPEX, OPEX, AISC')
    console.log('   • Reserves & Resources')
    console.log('   • Mine life, production rates')
  }
  
  console.log('='.repeat(70))
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
