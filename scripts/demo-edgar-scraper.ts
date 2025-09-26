#!/usr/bin/env node

import { EDGARApiClient } from '../lib/mining-agent/scrapers/edgar-api-client'

async function demoEDGARScraper() {
  console.log('🚀 Demo EDGAR Scraper - Testing API Connection\n')
  console.log('This demo will show you what data would be extracted and stored in your database.\n')

  const client = new EDGARApiClient()

  try {
    // Step 1: Search for recent EX-96.1 technical reports
    console.log('📋 Step 1: Searching for EX-96.1 Technical Reports...')
    console.log('   Query: EX-96.1 (Mining technical reports)')
    console.log('   Date Range: Last 30 days')
    console.log('   SIC Codes: Mining-related (1000, 1040, 1090, etc.)\n')

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30)

    const searchResults = await client.searchFilings({
      q: 'EX-96.1',
      category: 'form-cat1',
      dateFrom: startDate.toISOString().split('T')[0],
      dateTo: endDate.toISOString().split('T')[0],
      sics: client.getMiningRelatedSicCodes().slice(0, 5)
    })

    console.log(`✅ Found ${searchResults.total.value} filings\n`)

    // Step 2: Show sample filings
    if (searchResults.filings.length > 0) {
      console.log('📄 Sample Technical Reports Found:')
      console.log('─'.repeat(80))

      const samplesToShow = Math.min(5, searchResults.filings.length)

      for (let i = 0; i < samplesToShow; i++) {
        const filing = searchResults.filings[i]
        console.log(`\n${i + 1}. ${filing.entityName}`)
        console.log(`   📌 Ticker: ${filing.ticker || 'N/A'}`)
        console.log(`   📅 Filing Date: ${filing.filingDate}`)
        console.log(`   📑 Form Type: ${filing.form}`)
        console.log(`   🏢 CIK: ${filing.cik}`)
        console.log(`   📋 Accession: ${filing.accessionNumber}`)
        console.log(`   🏭 SIC Code: ${filing.sicCode || 'N/A'} - ${filing.sicDescription || 'N/A'}`)

        // Get document details for the first filing
        if (i === 0) {
          try {
            console.log('\n   📎 Fetching document details...')
            const documents = await client.getFilingDocuments(filing.cik, filing.accessionNumber)

            if (documents.length > 0) {
              console.log(`   📚 Found ${documents.length} technical document(s):`)
              documents.forEach((doc, j) => {
                if (j < 3) { // Show max 3 documents
                  console.log(`      - ${doc.description}`)
                  console.log(`        URL: ${doc.documentUrl}`)
                }
              })
            }
          } catch (error) {
            console.log('   ⚠️  Could not fetch document details')
          }
        }
      }

      console.log('\n' + '─'.repeat(80))
    }

    // Step 3: Test commodity-specific search
    console.log('\n📊 Step 3: Testing Commodity-Specific Search...')
    const commodities = ['lithium', 'copper', 'nickel']

    for (const commodity of commodities) {
      const commodityResults = await client.searchByMineralCommodity(
        commodity,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      )
      console.log(`   ${commodity.charAt(0).toUpperCase() + commodity.slice(1)}: ${commodityResults.total.value} filings`)
    }

    // Step 4: Show what would be stored in database
    console.log('\n💾 Step 4: Database Storage Preview')
    console.log('─'.repeat(80))
    console.log('\nThe following data would be stored in your `edgar_technical_documents` table:\n')

    if (searchResults.filings.length > 0) {
      const sampleFiling = searchResults.filings[0]
      const sampleDoc = {
        cik: sampleFiling.cik,
        company_name: sampleFiling.entityName,
        ticker: sampleFiling.ticker || null,
        filing_date: sampleFiling.filingDate,
        accession_number: sampleFiling.accessionNumber,
        form_type: sampleFiling.form,
        document_url: `https://www.sec.gov/Archives/edgar/data/${sampleFiling.cik}/...`,
        sic_code: sampleFiling.sicCode,
        primary_commodity: 'Would be extracted from document content',
        commodities: ['Would', 'be', 'extracted'],
        project_names: ['Project names would be extracted'],
        is_processed: false
      }

      console.log(JSON.stringify(sampleDoc, null, 2))
    }

    console.log('\n' + '─'.repeat(80))
    console.log('\n✅ Demo Complete!')
    console.log('\n📝 Summary:')
    console.log(`   • Total technical reports found: ${searchResults.total.value}`)
    console.log('   • Data includes: Company info, filing dates, document URLs')
    console.log('   • Commodity extraction: Ready to parse document content')
    console.log('   • SIC code filtering: Active for mining companies')
    console.log('\n🎯 Next Steps:')
    console.log('   1. Fix your Supabase credentials in .env.local')
    console.log('   2. Run: npm run edgar:scrape:incremental')
    console.log('   3. Data will populate in your edgar_technical_documents table')

  } catch (error) {
    console.error('\n❌ Error:', error)
    console.log('\nThis might be due to SEC API rate limits or network issues.')
    console.log('The SEC API allows 10 requests per second.')
  }
}

// Run demo
demoEDGARScraper().catch(console.error)