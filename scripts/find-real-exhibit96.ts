#!/usr/bin/env node

/**
 * Find ACTUAL Exhibit 96.1 Technical Report Summaries
 * These contain the specific financial metrics we need:
 * - NPV, IRR, Payback
 * - CAPEX, OPEX, AISC
 * - Reserves, Resources, Grade
 * - Mine Life, Production
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

// Companies known to have filed SK-1300 compliant Exhibit 96.1
// These are NEW mining companies or companies with new material properties
const SK1300_COMPANIES = [
  // Recent IPOs and new registrations (most likely to have Exhibit 96.1)
  { cik: '0001590955', name: 'MP Materials Corp', year: 2020, forms: ['S-1', 'F-1'] },
  { cik: '0001841890', name: 'Ioneer Ltd', year: 2021, forms: ['F-1'] },
  { cik: '0001589526', name: 'Piedmont Lithium Inc', year: 2020, forms: ['S-1'] },
  { cik: '0001841281', name: 'Lithium Americas (Argentina) Corp', year: 2021, forms: ['F-1'] },
  { cik: '0001828281', name: 'USA Rare Earth LLC', year: 2021, forms: ['S-1'] },
  { cik: '0001722438', name: 'Trilogy Metals Inc', year: 2022, forms: ['S-1'] },
  { cik: '0001534992', name: 'Northern Graphite Corp', year: 2021, forms: ['F-1'] },
  { cik: '0001720014', name: 'Talon Metals Corp', year: 2022, forms: ['F-1'] }
]

async function searchForExhibit96(cik: string, companyName: string, year: number, formTypes: string[]) {
  console.log(`\n🔍 ${companyName}`)
  console.log(`   Looking for ${formTypes.join('/')} filings from ${year} onwards...`)
  
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
    if (!data.filings?.recent) {
      console.log(`   ❌ No filings found`)
      return []
    }
    
    const found = []
    const recent = data.filings.recent
    
    // Look for registration statements (S-1, F-1) from the IPO year
    for (let i = 0; i < recent.form.length; i++) {
      const formType = recent.form[i]
      const filingDate = recent.filingDate[i]
      const accessionNumber = recent.accessionNumber[i]
      
      const fileDate = new Date(filingDate)
      if (fileDate.getFullYear() < year) continue
      
      // Only S-1, F-1 forms (these MUST have Exhibit 96.1 for mining companies)
      if (!formTypes.includes(formType) && !formTypes.includes(formType.split('/')[0])) continue
      
      console.log(`   📄 Checking ${formType} filed ${filingDate}...`)
      
      // Get the filing index page
      const formattedAccession = accessionNumber.replace(/-/g, '')
      const indexUrl = `https://www.sec.gov/cgi-bin/viewer?action=view&cik=${cik}&accession_number=${accessionNumber}&xbrl_type=v`
      
      try {
        // Try to get the filing index HTML
        const indexResponse = await axios.get(indexUrl, {
          headers: { 'User-Agent': USER_AGENT },
          timeout: 5000
        })
        
        const $ = cheerio.load(indexResponse.data)
        
        // Look for Exhibit 96 references
        const exhibit96Links: string[] = []
        $('a').each((_, elem) => {
          const href = $(elem).attr('href')
          const text = $(elem).text().toLowerCase()
          
          if (href && (
            text.includes('exhibit 96') ||
            text.includes('ex-96') ||
            text.includes('technical report summary') ||
            href.includes('ex96') ||
            href.includes('ex-96')
          )) {
            let fullUrl = href
            if (!href.startsWith('http')) {
              fullUrl = `https://www.sec.gov${href.startsWith('/') ? href : '/' + href}`
            }
            exhibit96Links.push(fullUrl)
          }
        })
        
        if (exhibit96Links.length > 0) {
          console.log(`   ✅ FOUND Exhibit 96.1!`)
          exhibit96Links.forEach(url => {
            console.log(`      ${url}`)
            found.push({
              cik,
              companyName,
              formType,
              filingDate,
              accessionNumber,
              documentUrl: url
            })
          })
        } else {
          // Try direct URL patterns
          const patterns = [
            `https://www.sec.gov/Archives/edgar/data/${cik}/${formattedAccession}/ex96-1.htm`,
            `https://www.sec.gov/Archives/edgar/data/${cik}/${formattedAccession}/ex961.htm`,
            `https://www.sec.gov/Archives/edgar/data/${cik}/${formattedAccession}/ex96_1.htm`,
            `https://www.sec.gov/Archives/edgar/data/${cik}/${formattedAccession}/exhibit961.htm`,
            `https://www.sec.gov/Archives/edgar/data/${cik}/${formattedAccession}/d-ex961.htm`
          ]
          
          for (const url of patterns) {
            try {
              const checkResp = await axios.head(url, {
                headers: { 'User-Agent': USER_AGENT },
                timeout: 2000,
                validateStatus: status => status < 500
              })
              
              if (checkResp.status === 200) {
                console.log(`   ✅ FOUND Exhibit 96.1!`)
                console.log(`      ${url}`)
                found.push({
                  cik,
                  companyName,
                  formType,
                  filingDate,
                  accessionNumber,
                  documentUrl: url
                })
                break
              }
            } catch {}
          }
        }
        
      } catch (err) {
        console.log(`      Could not access filing`)
      }
      
      await new Promise(r => setTimeout(r, 200))
    }
    
    if (found.length === 0) {
      console.log(`   ❌ No Exhibit 96.1 found`)
    }
    
    return found
    
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`)
    return []
  }
}

async function main() {
  console.log('='.repeat(70))
  console.log('FINDING ACTUAL EXHIBIT 96.1 TECHNICAL REPORT SUMMARIES')
  console.log('='.repeat(70))
  console.log('Searching SK-1300 compliant filings with financial data:\n')
  console.log('Required data: NPV, IRR, CAPEX, OPEX, AISC, Reserves, Resources')
  console.log('='.repeat(70))
  
  // First, clear existing data
  console.log('\n🗑️  Clearing old data...')
  await supabase.from('sec_technical_reports').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  
  let totalFound = 0
  const allDocuments = []
  
  for (const company of SK1300_COMPANIES) {
    const found = await searchForExhibit96(company.cik, company.name, company.year, company.forms)
    allDocuments.push(...found)
    totalFound += found.length
    
    await new Promise(r => setTimeout(r, 500))
  }
  
  console.log('\n' + '='.repeat(70))
  console.log(`TOTAL EXHIBIT 96.1 DOCUMENTS FOUND: ${totalFound}`)
  console.log('='.repeat(70))
  
  // Save to database
  if (allDocuments.length > 0) {
    console.log('\n💾 Saving to database...')
    
    for (const doc of allDocuments) {
      const { error } = await supabase.from('sec_technical_reports').insert({
        cik: doc.cik,
        company_name: doc.companyName,
        form_type: doc.formType,
        filing_date: doc.filingDate,
        accession_number: doc.accessionNumber,
        document_url: doc.documentUrl,
        exhibit_number: '96.1',
        document_description: 'Technical Report Summary - SK-1300 Compliant',
        status: 'pending_parse'
      })
      
      if (!error) {
        console.log(`   ✅ Saved: ${doc.companyName} - ${doc.formType} (${doc.filingDate})`)
      }
    }
    
    console.log(`\n✅ Imported ${allDocuments.length} Exhibit 96.1 documents`)
    console.log('\n💡 These documents contain:')
    console.log('   • NPV (post-tax and pre-tax)')
    console.log('   • IRR and payback period')
    console.log('   • CAPEX and sustaining CAPEX')
    console.log('   • OPEX and AISC')
    console.log('   • Proven & probable reserves')
    console.log('   • Measured, indicated & inferred resources')
    console.log('   • Grade, recovery rates, strip ratios')
    console.log('   • Mine life and annual production')
  }
}

main().catch(console.error)
