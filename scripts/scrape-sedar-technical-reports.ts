#!/usr/bin/env node

/**
 * Scrape SEDAR+ for NI 43-101 Technical Reports
 * These contain the actual financial metrics we need:
 * NPV, IRR, CAPEX, OPEX, mine life, reserves, etc.
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { chromium } from 'playwright'
import path from 'path'

config({ path: path.join(__dirname, '..', '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Critical minerals companies on SEDAR+
const SEDAR_COMPANIES = [
  // Canadian companies with NI 43-101 reports
  { name: 'First Quantum Minerals', ticker: 'FM', commodity: 'Copper' },
  { name: 'Teck Resources', ticker: 'TECK', commodity: 'Copper' },
  { name: 'Lundin Mining', ticker: 'LUN', commodity: 'Copper' },
  { name: 'Hudbay Minerals', ticker: 'HBM', commodity: 'Copper' },
  { name: 'Capstone Copper', ticker: 'CS', commodity: 'Copper' },
  
  { name: 'Lithium Americas', ticker: 'LAC', commodity: 'Lithium' },
  { name: 'Sigma Lithium', ticker: 'SGML', commodity: 'Lithium' },
  { name: 'Rock Tech Lithium', ticker: 'RCK', commodity: 'Lithium' },
  
  { name: 'Neo Performance Materials', ticker: 'NEO', commodity: 'Rare Earth' },
  { name: 'Avalon Advanced Materials', ticker: 'AVL', commodity: 'Rare Earth' },
  
  { name: 'Cameco', ticker: 'CCO', commodity: 'Uranium' },
  { name: 'Denison Mines', ticker: 'DML', commodity: 'Uranium' },
  { name: 'NexGen Energy', ticker: 'NXE', commodity: 'Uranium' },
  
  { name: 'Pan American Silver', ticker: 'PAAS', commodity: 'Silver' },
  { name: 'First Majestic Silver', ticker: 'AG', commodity: 'Silver' },
  
  { name: 'Barrick Gold', ticker: 'ABX', commodity: 'Gold' },
  { name: 'Agnico Eagle', ticker: 'AEM', commodity: 'Gold' },
  { name: 'Kinross Gold', ticker: 'K', commodity: 'Gold' }
]

async function scrapeSedarReports() {
  console.log('='.repeat(70))
  console.log('SCRAPING SEDAR+ FOR NI 43-101 TECHNICAL REPORTS')
  console.log('='.repeat(70))
  console.log('These reports contain:')
  console.log('• NPV, IRR, Payback Period')
  console.log('• CAPEX, OPEX, AISC')
  console.log('• Reserves & Resources')
  console.log('• Mine Life, Production Rates')
  console.log('='.repeat(70))
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--disable-blink-features=AutomationControlled']
  })
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  })
  
  const page = await context.newPage()
  
  let totalReports = 0
  
  for (let i = 0; i < SEDAR_COMPANIES.length; i++) {
    const company = SEDAR_COMPANIES[i]
    console.log(`\n[${i + 1}/${SEDAR_COMPANIES.length}] ${company.name} (${company.ticker})`)
    
    try {
      // Navigate to SEDAR+ search
      await page.goto('https://www.sedarplus.ca/landingpage/', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      })
      
      // Search for company
      console.log('   🔍 Searching for company...')
      await page.fill('input[placeholder*="Company name"]', company.name)
      await page.press('input[placeholder*="Company name"]', 'Enter')
      await page.waitForTimeout(3000)
      
      // Filter for technical reports
      const technicalReportButton = page.locator('text="Technical Report"').first()
      if (await technicalReportButton.isVisible()) {
        await technicalReportButton.click()
        await page.waitForTimeout(2000)
      }
      
      // Get document links
      const documents = await page.locator('a[href*="/filings/"]').all()
      console.log(`   📄 Found ${documents.length} documents`)
      
      let reportCount = 0
      for (const doc of documents.slice(0, 5)) { // Get up to 5 recent reports
        try {
          const href = await doc.getAttribute('href')
          const text = await doc.textContent()
          
          if (text?.toLowerCase().includes('technical report') || 
              text?.toLowerCase().includes('43-101')) {
            
            const fullUrl = href?.startsWith('http') 
              ? href 
              : `https://www.sedarplus.ca${href}`
            
            console.log(`      ✅ Technical Report: ${text?.substring(0, 60)}...`)
            console.log(`         ${fullUrl}`)
            
            // Save to database
            await supabase.from('sec_technical_reports').insert({
              company_name: company.name,
              form_type: 'NI 43-101',
              filing_date: new Date().toISOString().split('T')[0],
              document_url: fullUrl,
              exhibit_number: 'Technical Report',
              document_description: text,
              primary_commodity: company.commodity,
              commodities: [company.commodity],
              status: 'pending_parse',
              accession_number: `SEDAR-${company.ticker}-${Date.now()}`
            })
            
            reportCount++
            totalReports++
          }
        } catch (error) {
          console.log(`      ⚠️  Error processing document: ${error}`)
        }
      }
      
      if (reportCount > 0) {
        console.log(`   ✅ Saved ${reportCount} technical reports`)
      } else {
        console.log(`   ❌ No technical reports found`)
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error}`)
    }
    
    // Rate limiting
    await page.waitForTimeout(2000)
  }
  
  await browser.close()
  
  console.log('\n' + '='.repeat(70))
  console.log('SCRAPING COMPLETE')
  console.log('='.repeat(70))
  console.log(`Total technical reports found: ${totalReports}`)
  
  // Show database contents
  const { count, data: samples } = await supabase
    .from('sec_technical_reports')
    .select('*', { count: 'exact' })
    .limit(5)
  
  console.log(`\n📊 Database now contains: ${count} documents`)
  
  if (samples && samples.length > 0) {
    console.log('\n📋 Sample reports:')
    samples.forEach(s => {
      console.log(`   ${s.company_name} - ${s.form_type}`)
      console.log(`   ${s.document_url}`)
    })
  }
  
  console.log('\n✅ Ready for parsing to extract:')
  console.log('   • NPV (pre-tax & post-tax)')
  console.log('   • IRR, Payback Period')
  console.log('   • CAPEX, OPEX, AISC')
  console.log('   • Reserves & Resources')
  console.log('   • Mine Life, Production Rates')
  console.log('='.repeat(70))
}

scrapeSedarReports().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
