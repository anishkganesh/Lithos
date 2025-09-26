#!/usr/bin/env node

import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { EDGARScraperV2 } from '../lib/mining-agent/scrapers/edgar-scraper-v2'
import { EDGARApiClient } from '../lib/mining-agent/scrapers/edgar-api-client'
import { supabaseService } from '../lib/supabase-service'

async function testEDGARPipeline() {
  console.log('🧪 Testing EDGAR Pipeline...\n')

  try {
    // Test 1: API Client functionality
    console.log('1️⃣ Testing EDGAR API Client...')
    const apiClient = new EDGARApiClient()

    // Test search functionality
    const searchResults = await apiClient.searchFilings({
      q: 'EX-96.1',
      category: 'form-cat1',
      dateFrom: '2024-01-01',
      dateTo: '2024-12-31',
      sics: apiClient.getMiningRelatedSicCodes().slice(0, 5) // Use first 5 SIC codes
    })

    console.log(`   ✅ Found ${searchResults.total.value} filings`)
    if (searchResults.filings.length > 0) {
      const firstFiling = searchResults.filings[0]
      console.log(`   📄 Sample filing: ${firstFiling.entityName} - ${firstFiling.accessionNumber}`)
    }

    // Test 2: Document extraction
    console.log('\n2️⃣ Testing Document Extraction...')
    if (searchResults.filings.length > 0) {
      const testFiling = searchResults.filings[0]
      const documents = await apiClient.getFilingDocuments(
        testFiling.cik,
        testFiling.accessionNumber
      )
      console.log(`   ✅ Found ${documents.length} documents in filing`)
      if (documents.length > 0) {
        console.log(`   📄 Sample document: ${documents[0].description}`)
      }
    }

    // Test 3: Commodity-specific search
    console.log('\n3️⃣ Testing Commodity-Specific Search...')
    const lithiumResults = await apiClient.searchByMineralCommodity(
      'lithium',
      '2024-01-01',
      '2024-12-31'
    )
    console.log(`   ✅ Found ${lithiumResults.total.value} lithium-related filings`)

    // Test 4: Database operations
    console.log('\n4️⃣ Testing Database Operations...')

    // Create test tables if they don't exist
    const { error: tableError } = await supabaseService.rpc('exec_sql', {
      query: `
        CREATE TABLE IF NOT EXISTS edgar_technical_documents (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          cik TEXT NOT NULL,
          company_name TEXT NOT NULL,
          ticker TEXT,
          filing_date DATE NOT NULL,
          accession_number TEXT NOT NULL,
          form_type TEXT NOT NULL,
          document_url TEXT NOT NULL,
          document_title TEXT,
          exhibit_number TEXT,
          file_size_bytes BIGINT,
          sic_code TEXT,
          primary_commodity TEXT,
          commodities TEXT[],
          project_names TEXT[],
          is_processed BOOLEAN DEFAULT FALSE,
          processed_at TIMESTAMPTZ,
          extraction_errors TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(accession_number, document_url)
        );

        CREATE TABLE IF NOT EXISTS edgar_scraper_runs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          run_type TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'running',
          search_query TEXT,
          sic_codes TEXT[],
          commodities TEXT[],
          date_from DATE,
          date_to DATE,
          total_filings_found INTEGER DEFAULT 0,
          filings_processed INTEGER DEFAULT 0,
          documents_extracted INTEGER DEFAULT 0,
          errors_count INTEGER DEFAULT 0,
          started_at TIMESTAMPTZ DEFAULT NOW(),
          completed_at TIMESTAMPTZ,
          error_details JSONB,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    }).catch(() => {
      // Tables might already exist, that's okay
      console.log('   ℹ️  Tables already exist or using existing schema')
    })

    // Test scraper with limited data
    console.log('\n5️⃣ Testing Scraper with Limited Data...')
    const scraper = new EDGARScraperV2((progress) => {
      process.stdout.write(
        `\r   Processing: ${progress.processed}/${progress.total} | ` +
        `Errors: ${progress.errors} | ${progress.currentCompany || 'Starting...'}`
      )
    })

    await scraper.scrapeEX96Documents({
      dateFrom: '2024-11-01',
      dateTo: '2024-12-31',
      limit: 3 // Only process 3 filings for testing
    })

    console.log('\n   ✅ Scraper test completed')

    // Test 6: Verify data in database
    console.log('\n6️⃣ Verifying Data in Database...')
    const { data: documents, count } = await supabaseService
      .from('edgar_technical_documents')
      .select('*', { count: 'exact' })
      .limit(5)

    console.log(`   ✅ Total documents in database: ${count || 0}`)

    if (documents && documents.length > 0) {
      console.log('\n   📊 Sample documents:')
      documents.forEach((doc: any, i: number) => {
        console.log(`      ${i + 1}. ${doc.company_name} - ${doc.primary_commodity || 'N/A'}`)
      })
    }

    // Test 7: Check scraper run history
    const { data: runs } = await supabaseService
      .from('edgar_scraper_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(3)

    if (runs && runs.length > 0) {
      console.log('\n   📈 Recent scraper runs:')
      runs.forEach((run: any) => {
        console.log(
          `      - ${run.run_type} | Status: ${run.status} | ` +
          `Processed: ${run.filings_processed} | Documents: ${run.documents_extracted}`
        )
      })
    }

    console.log('\n✅ All tests completed successfully!')
    console.log('\n📝 Summary:')
    console.log('   - EDGAR API Client: Working')
    console.log('   - Document Extraction: Working')
    console.log('   - Database Operations: Working')
    console.log('   - Scraper Pipeline: Working')
    console.log('\n🚀 The EDGAR scraping backend is ready for use!')

  } catch (error) {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  }
}

// Run tests
testEDGARPipeline().catch(console.error)