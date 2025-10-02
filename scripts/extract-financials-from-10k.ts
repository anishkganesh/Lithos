#!/usr/bin/env node

/**
 * Extract financial metrics directly from 10-K HTML documents
 * Look for key financial terms and tables in the main 10-K body
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

// Critical minerals companies with substantial operations
const TARGET_COMPANIES = [
  // Major producers with detailed financial disclosures
  { cik: '0000027419', name: 'Freeport-McMoRan Inc', commodity: 'Copper', ticker: 'FCX' },
  { cik: '0000764065', name: 'Newmont Corp', commodity: 'Gold', ticker: 'NEM' },
  { cik: '0001164727', name: 'Hecla Mining Co', commodity: 'Silver', ticker: 'HL' },
  { cik: '0000861878', name: 'Coeur Mining Inc', commodity: 'Silver', ticker: 'CDE' },
  { cik: '0001022671', name: 'Cleveland-Cliffs Inc', commodity: 'Iron', ticker: 'CLF' },
  { cik: '0000315293', name: 'Southern Copper Corp', commodity: 'Copper', ticker: 'SCCO' },
  { cik: '0001590955', name: 'MP Materials Corp', commodity: 'Rare Earth', ticker: 'MP' },
  { cik: '0000008063', name: 'Alcoa Corp', commodity: 'Aluminum', ticker: 'AA' }
]

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function extract10KFinancials(
  cik: string,
  accessionNumber: string,
  filingDate: string,
  companyName: string,
  commodity: string
) {
  const formattedAccession = accessionNumber.replace(/-/g, '')
  const paddedCik = cik.padStart(10, '0')
  
  // Get the main 10-K document (usually the first .htm file)
  const baseUrl = `https://www.sec.gov/Archives/edgar/data/${paddedCik}/${formattedAccession}/`
  
  try {
    // First, get the filing index to find the main document
    const indexUrl = `${baseUrl}${accessionNumber}-index.html`
    const indexResponse = await axios.get(indexUrl, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 10000
    })
    
    const $ = cheerio.load(indexResponse.data)
    
    // Find the main 10-K document link
    let mainDocUrl = ''
    $('table.tableFile tr').each((_, row) => {
      const type = $(row).find('td:nth-child(4)').text().trim()
      if (type === '10-K' || type === '10-K/A') {
        const href = $(row).find('a').attr('href')
        if (href) {
          mainDocUrl = href.startsWith('http') ? href : `https://www.sec.gov${href}`
        }
      }
    })
    
    if (!mainDocUrl) {
      // Try common patterns
      mainDocUrl = `${baseUrl}${accessionNumber.substring(accessionNumber.lastIndexOf('-') + 1)}-10k.htm`
    }
    
    console.log(`      📄 Fetching main 10-K document...`)
    const docResponse = await axios.get(mainDocUrl, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 15000,
      maxContentLength: 50 * 1024 * 1024 // 50MB max
    })
    
    const docHtml = docResponse.data
    const $doc = cheerio.load(docHtml)
    
    // Extract key financial metrics using patterns
    const metrics: any = {
      document_url: mainDocUrl,
      company_name: companyName,
      filing_date: filingDate,
      commodity: commodity
    }
    
    // Look for key financial terms in the text
    const text = $doc.text().toLowerCase()
    
    // Capital expenditures
    const capexMatch = text.match(/capital expenditure[s]?.*?\$[\d,]+(\.\d+)?\s*(million|billion)/i)
    if (capexMatch) {
      console.log(`         💰 Found CAPEX reference`)
      metrics.has_capex = true
    }
    
    // Operating costs
    const opexMatch = text.match(/operating (cost|expense)[s]?.*?\$[\d,]+(\.\d+)?\s*(million|billion)/i)
    if (opexMatch) {
      console.log(`         💰 Found OPEX reference`)
      metrics.has_opex = true
    }
    
    // Production data
    const productionMatch = text.match(/annual production.*?[\d,]+\s*(ton|ounce|pound|kilogram)/i)
    if (productionMatch) {
      console.log(`         ⛏️  Found production data`)
      metrics.has_production = true
    }
    
    // Reserves
    const reservesMatch = text.match(/(proven|probable|measured|indicated) reserve[s]?/i)
    if (reservesMatch) {
      console.log(`         📊 Found reserves data`)
      metrics.has_reserves = true
    }
    
    // Mine life
    const mineLifeMatch = text.match(/mine life.*?(\d+)\s*year/i)
    if (mineLifeMatch) {
      console.log(`         ⏱️  Found mine life data`)
      metrics.has_mine_life = true
    }
    
    // Check if this document has substantial financial content
    const hasFinancials = metrics.has_capex || metrics.has_opex || 
                         metrics.has_production || metrics.has_reserves
    
    if (hasFinancials) {
      console.log(`      ✅ Document contains financial metrics!`)
      
      // Save to database
      await supabase.from('sec_technical_reports').insert({
        cik: cik,
        company_name: companyName,
        form_type: '10-K',
        filing_date: filingDate,
        accession_number: accessionNumber,
        document_url: mainDocUrl,
        exhibit_number: 'Main Filing',
        document_description: `10-K Annual Report with financial metrics`,
        primary_commodity: commodity,
        commodities: [commodity],
        status: 'has_financials',
        raw_metadata: metrics
      })
      
      return true
    } else {
      console.log(`      ❌ No key financial metrics found`)
      return false
    }
    
  } catch (error: any) {
    console.log(`      ⚠️  Error: ${error.message}`)
    return false
  }
}

async function processCompany(cik: string, name: string, commodity: string) {
  console.log(`\n🏢 ${name} (${commodity})`)
  
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
    let documentsWithFinancials = 0
    
    if (!data.filings || !data.filings.recent) {
      console.log(`   ❌ No filings found`)
      return 0
    }
    
    const recent = data.filings.recent
    
    // Process recent 10-K filings
    let processed = 0
    for (let i = 0; i < recent.form.length && processed < 3; i++) {
      const formType = recent.form[i]
      const filingDate = recent.filingDate[i]
      const accessionNumber = recent.accessionNumber[i]
      
      // Only 10-K filings
      if (formType !== '10-K' && formType !== '10-K/A') continue
      
      // Only recent filings
      const date = new Date(filingDate)
      if (date < new Date('2022-01-01')) continue
      
      console.log(`   📋 Checking ${formType} from ${filingDate}`)
      
      const hasFinancials = await extract10KFinancials(
        cik,
        accessionNumber,
        filingDate,
        name,
        commodity
      )
      
      if (hasFinancials) {
        documentsWithFinancials++
      }
      
      processed++
      await delay(1000) // Rate limiting
    }
    
    if (documentsWithFinancials > 0) {
      console.log(`   ✅ Found ${documentsWithFinancials} documents with financial data`)
    }
    
    return documentsWithFinancials
    
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`)
    return 0
  }
}

async function main() {
  console.log('='.repeat(70))
  console.log('EXTRACTING FINANCIAL DATA FROM 10-K FILINGS')
  console.log('='.repeat(70))
  console.log('Looking for:')
  console.log('• Capital Expenditures (CAPEX)')
  console.log('• Operating Costs (OPEX)')
  console.log('• Production Data')
  console.log('• Reserves & Resources')
  console.log('• Mine Life')
  console.log('='.repeat(70))
  
  // Clear old data
  console.log('\n🗑️  Clearing old data...')
  await supabase
    .from('sec_technical_reports')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
  
  let totalDocuments = 0
  
  for (let i = 0; i < TARGET_COMPANIES.length; i++) {
    const company = TARGET_COMPANIES[i]
    console.log(`\n[${i + 1}/${TARGET_COMPANIES.length}]`)
    
    const found = await processCompany(company.cik, company.name, company.commodity)
    totalDocuments += found
    
    await delay(1500) // Rate limiting
  }
  
  console.log('\n' + '='.repeat(70))
  console.log('EXTRACTION COMPLETE')
  console.log('='.repeat(70))
  console.log(`Companies processed: ${TARGET_COMPANIES.length}`)
  console.log(`Documents with financial data: ${totalDocuments}`)
  
  // Show database contents
  const { count, data: samples } = await supabase
    .from('sec_technical_reports')
    .select('*', { count: 'exact' })
    .order('filing_date', { ascending: false })
    .limit(10)
  
  console.log(`\n📊 Database contains: ${count} documents`)
  
  if (samples && samples.length > 0) {
    console.log('\n📋 Recent filings with financial data:')
    samples.forEach(s => {
      console.log(`\n   ${s.company_name} - ${s.form_type} (${s.filing_date})`)
      console.log(`   ${s.document_url}`)
      
      if (s.raw_metadata) {
        const metrics = []
        if (s.raw_metadata.has_capex) metrics.push('CAPEX')
        if (s.raw_metadata.has_opex) metrics.push('OPEX')
        if (s.raw_metadata.has_production) metrics.push('Production')
        if (s.raw_metadata.has_reserves) metrics.push('Reserves')
        if (s.raw_metadata.has_mine_life) metrics.push('Mine Life')
        
        if (metrics.length > 0) {
          console.log(`   Contains: ${metrics.join(', ')}`)
        }
      }
    })
  }
  
  console.log('\n' + '='.repeat(70))
  console.log('✅ Next step: Parse these HTML documents to extract actual values')
  console.log('='.repeat(70))
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
