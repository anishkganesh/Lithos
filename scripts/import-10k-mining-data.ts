#!/usr/bin/env node

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import axios from 'axios'
import path from 'path'

config({ path: path.join(__dirname, '..', '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const USER_AGENT = 'Lithos Mining Analytics contact@lithos.ai'

// Get actual 10-K filings with financial data
const MINING_COMPANIES = [
  { cik: '0001590955', name: 'MP Materials Corp', commodity: 'Rare Earth' },
  { cik: '0000027419', name: 'Freeport-McMoRan Inc', commodity: 'Copper' },
  { cik: '0001164727', name: 'Hecla Mining Co', commodity: 'Silver' },
  { cik: '0000861878', name: 'Coeur Mining Inc', commodity: 'Gold/Silver' },
  { cik: '0001376793', name: 'Uranium Energy Corp', commodity: 'Uranium' },
  { cik: '0001587466', name: 'Energy Fuels Inc', commodity: 'Uranium' },
  { cik: '0001560046', name: 'Lithium Americas Corp', commodity: 'Lithium' },
  { cik: '0001589526', name: 'Piedmont Lithium Inc', commodity: 'Lithium' },
  { cik: '0000764065', name: 'Newmont Corp', commodity: 'Gold' },
  { cik: '0001022671', name: 'Cleveland-Cliffs Inc', commodity: 'Iron' },
  { cik: '0000008063', name: 'Alcoa Corp', commodity: 'Aluminum' },
  { cik: '0000315293', name: 'Southern Copper Corp', commodity: 'Copper' }
]

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function import10KFilings(cik: string, companyName: string, commodity: string) {
  console.log(`\n📄 ${companyName} (${commodity})`)
  
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
    let imported = 0
    
    if (!data.filings || !data.filings.recent) {
      console.log(`  ❌ No filings found`)
      return 0
    }
    
    const recent = data.filings.recent
    
    // Get 10-K filings from 2021 onwards
    for (let i = 0; i < recent.form.length; i++) {
      const formType = recent.form[i]
      const filingDate = recent.filingDate[i]
      const accessionNumber = recent.accessionNumber[i]
      const primaryDocument = recent.primaryDocument[i]
      
      const date = new Date(filingDate)
      if (date < new Date('2021-01-01')) continue
      
      // Only 10-K annual reports
      if (formType !== '10-K' && formType !== '10-K/A') continue
      
      const formattedAccession = accessionNumber.replace(/-/g, '')
      const documentUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${formattedAccession}/${primaryDocument}`
      const filingUrl = `https://www.sec.gov/cgi-bin/viewer?action=view&cik=${cik}&accession_number=${accessionNumber}&xbrl_type=v`
      
      console.log(`  ✅ ${formType} filed ${filingDate}`)
      console.log(`     ${documentUrl}`)
      
      // Save to database
      const { error } = await supabase.from('sec_technical_reports').insert({
        cik: cik,
        company_name: companyName,
        form_type: formType,
        filing_date: filingDate,
        accession_number: accessionNumber,
        document_url: documentUrl,
        exhibit_number: 'Main Filing',
        document_description: `Annual Report (${formType}) - Contains financial statements, reserves data, production info`,
        primary_commodity: commodity,
        commodities: [commodity],
        status: 'pending_parse',
        sic_code: data.sicCode || null,
        sic_description: data.sicDescription || null
      })
      
      if (!error) {
        imported++
      }
      
      await delay(100)
    }
    
    console.log(`  📊 Imported: ${imported} 10-K filings`)
    return imported
    
  } catch (error: any) {
    console.error(`  ❌ Error: ${error.message}`)
    return 0
  }
}

async function main() {
  console.log('=' .repeat(70))
  console.log('SEC 10-K MINING FILINGS IMPORT')
  console.log('=' .repeat(70))
  console.log('Importing actual 10-K annual reports with financial data')
  console.log(`Companies: ${MINING_COMPANIES.length}`)
  console.log(`Date range: 2021-2025\n`)
  
  let totalImported = 0
  
  for (let i = 0; i < MINING_COMPANIES.length; i++) {
    const company = MINING_COMPANIES[i]
    console.log(`[${i + 1}/${MINING_COMPANIES.length}]`)
    
    const imported = await import10KFilings(company.cik, company.name, company.commodity)
    totalImported += imported
    
    await delay(500)
  }
  
  console.log('\n' + '=' .repeat(70))
  console.log('IMPORT COMPLETE')
  console.log('=' .repeat(70))
  console.log(`Total 10-K filings imported: ${totalImported}`)
  
  // Show summary
  const { data: summary } = await supabase
    .from('sec_technical_reports')
    .select('primary_commodity, filing_date, company_name')
    .order('filing_date', { ascending: false })
    .limit(10)
  
  if (summary && summary.length > 0) {
    console.log('\n📋 Recent filings imported:')
    summary.forEach(s => {
      console.log(`  ${s.filing_date} - ${s.company_name} (${s.primary_commodity})`)
    })
  }
  
  console.log('\n💡 Next step: Parse these 10-K filings to extract:')
  console.log('   • Financial statements (revenue, costs, capex)')
  console.log('   • Reserve and resource data')
  console.log('   • Production volumes')
  console.log('   • Project-specific information')
  console.log('=' .repeat(70))
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
