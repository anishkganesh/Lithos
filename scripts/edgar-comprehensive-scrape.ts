#!/usr/bin/env node

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

import { EDGARScraperV2 } from '../lib/mining-agent/scrapers/edgar-scraper-v2'
import { EDGARApiClient } from '../lib/mining-agent/scrapers/edgar-api-client'
import { supabaseService } from '../lib/supabase-service'

async function comprehensiveScrape() {
  console.log('🚀 Starting Comprehensive EDGAR Scrape for 100+ Documents\n')

  const scraper = new EDGARScraperV2((progress) => {
    process.stdout.write(
      `\r📊 Progress: ${progress.processed}/${progress.total} | ` +
      `Errors: ${progress.errors} | ${progress.status}`
    )
  })

  const client = new EDGARApiClient()

  try {
    // Check current count
    const { count: initialCount } = await supabaseService
      .from('edgar_technical_documents')
      .select('*', { count: 'exact', head: true })

    console.log(`📈 Starting with ${initialCount || 0} documents in database\n`)

    // Strategy 1: Get all of 2024 data
    console.log('\n1️⃣ Scraping 2024 Technical Reports...')
    await scraper.scrapeEX96Documents({
      dateFrom: '2024-01-01',
      dateTo: '2024-12-31',
      limit: 50 // Process first 50 from 2024
    })

    // Strategy 2: Get 2023 Q4 data for more diversity
    console.log('\n\n2️⃣ Scraping 2023 Q4 Technical Reports...')
    await scraper.scrapeEX96Documents({
      dateFrom: '2023-10-01',
      dateTo: '2023-12-31',
      limit: 30
    })

    // Strategy 3: Search for specific high-value commodities
    console.log('\n\n3️⃣ Scraping Lithium-specific Reports...')
    await scraper.scrapeByMineralCommodity('lithium', '2023-06-01', '2024-12-31')

    console.log('\n\n4️⃣ Scraping Gold-specific Reports...')
    await scraper.scrapeByMineralCommodity('gold', '2023-06-01', '2024-12-31')

    console.log('\n\n5️⃣ Scraping Uranium-specific Reports...')
    await scraper.scrapeByMineralCommodity('uranium', '2023-06-01', '2024-12-31')

    console.log('\n\n6️⃣ Scraping Copper-specific Reports...')
    await scraper.scrapeByMineralCommodity('copper', '2023-06-01', '2024-12-31')

    console.log('\n\n7️⃣ Scraping Rare Earth Reports...')
    await scraper.scrapeByMineralCommodity('rare earth', '2023-06-01', '2024-12-31')

    // Strategy 4: Get recent 2023 data for more coverage
    console.log('\n\n8️⃣ Scraping 2023 Q3 Technical Reports...')
    await scraper.scrapeEX96Documents({
      dateFrom: '2023-07-01',
      dateTo: '2023-09-30',
      limit: 20
    })

    // Final count
    const { count: finalCount } = await supabaseService
      .from('edgar_technical_documents')
      .select('*', { count: 'exact', head: true })

    console.log('\n\n' + '='.repeat(60))
    console.log(`✅ Scraping Complete!`)
    console.log(`📊 Total documents in database: ${finalCount || 0}`)
    console.log(`📈 Documents added: ${(finalCount || 0) - (initialCount || 0)}`)

    // Get commodity distribution
    const { data: documents } = await supabaseService
      .from('edgar_technical_documents')
      .select('primary_commodity, company_name')
      .not('primary_commodity', 'is', null)

    const commodityCount: Record<string, number> = {}
    const companySet = new Set<string>()

    documents?.forEach((doc: any) => {
      if (doc.primary_commodity) {
        commodityCount[doc.primary_commodity] = (commodityCount[doc.primary_commodity] || 0) + 1
      }
      if (doc.company_name) {
        companySet.add(doc.company_name)
      }
    })

    console.log(`\n📊 Commodity Distribution:`)
    Object.entries(commodityCount)
      .sort((a, b) => b[1] - a[1])
      .forEach(([commodity, count]) => {
        console.log(`   ${commodity}: ${count} documents`)
      })

    console.log(`\n🏢 Unique Companies: ${companySet.size}`)

    if (finalCount && finalCount >= 100) {
      console.log('\n🎯 SUCCESS: Reached 100+ unique documents!')
    } else {
      console.log(`\n⚠️  Need ${100 - (finalCount || 0)} more documents to reach 100`)
    }

  } catch (error) {
    console.error('\n❌ Error during comprehensive scrape:', error)
  }
}

// Run the comprehensive scrape
comprehensiveScrape().catch(console.error)