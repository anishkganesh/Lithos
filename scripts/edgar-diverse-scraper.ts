#!/usr/bin/env node

import { config } from 'dotenv'
import { resolve } from 'path'
import axios from 'axios'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

import { EDGARScraperV2 } from '../lib/mining-agent/scrapers/edgar-scraper-v2'
import { supabaseService } from '../lib/supabase-service'

async function scrapeDiverseDocuments() {
  console.log('🚀 Starting Diverse EDGAR Document Collection\n')

  const scraper = new EDGARScraperV2((progress) => {
    process.stdout.write(
      `\r📊 Progress: ${progress.processed}/${progress.total} | ` +
      `Errors: ${progress.errors} | ${progress.status}`
    )
  })

  try {
    // Check current count
    const { count: initialCount } = await supabaseService
      .from('edgar_technical_documents')
      .select('*', { count: 'exact', head: true })

    console.log(`📈 Starting with ${initialCount || 0} documents\n`)

    // Get existing accession numbers to avoid duplicates
    const { data: existingDocs } = await supabaseService
      .from('edgar_technical_documents')
      .select('accession_number')

    const existingAccessions = new Set(existingDocs?.map(d => d.accession_number) || [])
    console.log(`📝 Tracking ${existingAccessions.size} existing documents to avoid duplicates\n`)

    // Strategy: Search different time periods with pagination
    const timeRanges = [
      { from: '2023-01-01', to: '2023-03-31', label: '2023 Q1' },
      { from: '2023-04-01', to: '2023-06-30', label: '2023 Q2' },
      { from: '2022-10-01', to: '2022-12-31', label: '2022 Q4' },
      { from: '2022-07-01', to: '2022-09-30', label: '2022 Q3' },
      { from: '2022-01-01', to: '2022-03-31', label: '2022 Q1' }
    ]

    let totalNew = 0

    for (const range of timeRanges) {
      console.log(`\n🗓️ Searching ${range.label}...`)

      // Use pagination to get more results
      for (let offset = 0; offset < 100; offset += 25) {
        try {
          const searchUrl = 'https://efts.sec.gov/LATEST/search-index'
          const searchParams = new URLSearchParams({
            q: 'EX-96.1',
            dateRange: 'custom',
            category: 'form-cat1',
            startdt: range.from,
            enddt: range.to,
            from: String(offset),
            size: '25'
          })

          const response = await axios.get(`${searchUrl}?${searchParams}`, {
            headers: {
              'User-Agent': 'Lithos Mining Analytics (test@example.com)',
              'Accept': 'application/json'
            }
          })

          const hits = response.data?.hits?.hits || []
          const newHits = hits.filter((hit: any) => {
            const adsh = hit._source?.adsh || hit._id?.split(':')[0]
            return adsh && !existingAccessions.has(adsh)
          })

          if (newHits.length === 0) {
            console.log(`   Offset ${offset}: No new documents`)
            break // No more new documents in this range
          }

          console.log(`   Offset ${offset}: Found ${newHits.length} new documents`)

          // Process the new documents
          await scraper.scrapeEX96Documents({
            dateFrom: range.from,
            dateTo: range.to,
            limit: newHits.length
          })

          totalNew += newHits.length

          // Update our tracking set
          newHits.forEach((hit: any) => {
            const adsh = hit._source?.adsh || hit._id?.split(':')[0]
            if (adsh) existingAccessions.add(adsh)
          })

          // Stop if we have enough
          if (totalNew >= 100) {
            console.log('\n✅ Reached 100+ new documents!')
            break
          }

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000))
        } catch (error) {
          console.error(`   Error at offset ${offset}:`, error)
          break
        }
      }

      if (totalNew >= 100) break
    }

    // Final count
    const { count: finalCount } = await supabaseService
      .from('edgar_technical_documents')
      .select('*', { count: 'exact', head: true })

    console.log('\n' + '='.repeat(60))
    console.log(`✅ Collection Complete!`)
    console.log(`📊 Total documents in database: ${finalCount || 0}`)
    console.log(`📈 New documents added: ${(finalCount || 0) - (initialCount || 0)}`)

    // Get unique companies
    const { data: companies } = await supabaseService
      .from('edgar_technical_documents')
      .select('company_name, ticker')
      .not('company_name', 'is', null)

    const uniqueCompanies = new Set(companies?.map(c => c.company_name) || [])
    console.log(`\n🏢 Unique Companies: ${uniqueCompanies.size}`)

    if (finalCount && finalCount >= 100) {
      console.log('\n🎯 SUCCESS: Have 100+ unique documents!')
    }

  } catch (error) {
    console.error('\n❌ Error:', error)
  }
}

// Run the diverse scraper
scrapeDiverseDocuments().catch(console.error)