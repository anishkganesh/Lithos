#!/usr/bin/env npx tsx
/**
 * Script to fetch and store technical documents from QuoteMedia (EDGAR and SEDAR)
 * Focuses on NI 43-101 and similar technical mining reports
 *
 * Usage: npx tsx scripts/quotemedia-technical-scraper.ts [options]
 *
 * Options:
 *   --symbols SYMBOL1,SYMBOL2  Specific symbols to fetch
 *   --country US|CA|ALL       Country to fetch from (default: ALL)
 *   --start YYYY-MM-DD        Start date
 *   --end YYYY-MM-DD          End date
 *   --limit N                 Max documents to fetch (default: 100)
 *   --download-pdfs           Download PDF files
 *   --force                   Force reprocess existing documents
 *   --test                    Test mode with limited fetch
 */

import { config } from 'dotenv';
import { TechnicalDocumentProcessor } from '../lib/quotemedia/document-processor';
import { createClient } from '@supabase/supabase-js';
import { QuoteMediaClient } from '../lib/quotemedia/api-client';

// Load environment variables
config({ path: '.env.local' });

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (name: string): string | undefined => {
  const index = args.indexOf(`--${name}`);
  return index !== -1 && args[index + 1] ? args[index + 1] : undefined;
};

const hasFlag = (name: string): boolean => args.includes(`--${name}`);

// IMPORTANT: You need to set this webservice password
// This should be retrieved from the secure link provided by QuoteMedia
// For production, store this in environment variables
const WEBSERVICE_PASSWORD = process.env.QUOTEMEDIA_WEBSERVICE_PASSWORD || '';

if (!WEBSERVICE_PASSWORD) {
  console.error('❌ QUOTEMEDIA_WEBSERVICE_PASSWORD not set in environment variables');
  console.error('Please add it to your .env.local file');
  process.exit(1);
}

async function testEnterpriseToken() {
  console.log('\n🔑 Testing Enterprise Token Generation...\n');

  try {
    const client = new QuoteMediaClient(WEBSERVICE_PASSWORD);

    // Test token generation by fetching a sample document
    const testDocs = await client.getCompanyFilings({
      symbol: 'MSFT',
      limit: 1,
    });

    if (testDocs.length > 0) {
      console.log('✅ Enterprise token working successfully!');
      console.log('📄 Sample document:', {
        symbol: testDocs[0].symbol,
        formType: testDocs[0].formType,
        dateFiled: testDocs[0].dateFiled,
      });
      return true;
    } else {
      console.log('⚠️ No documents returned in test');
      return false;
    }
  } catch (error) {
    console.error('❌ Token test failed:', error);
    return false;
  }
}

async function fetchMiningCompanySymbols(): Promise<string[]> {
  console.log('\n🔍 Fetching mining company symbols from database...\n');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from('companies')
    .select('ticker_symbol')
    .not('ticker_symbol', 'is', null)
    .limit(20); // Limit for initial testing

  if (error) {
    console.error('Error fetching symbols:', error);
    return [];
  }

  const symbols = (data || [])
    .map(c => c.ticker_symbol)
    .filter(Boolean);

  console.log(`Found ${symbols.length} symbols:`, symbols.join(', '));
  return symbols;
}

async function main() {
  console.log('🚀 QuoteMedia Technical Document Scraper');
  console.log('=========================================\n');

  // Test enterprise token first
  const tokenWorks = await testEnterpriseToken();
  if (!tokenWorks) {
    console.error('❌ Cannot proceed without working token');
    process.exit(1);
  }

  // Parse options
  const symbolsArg = getArg('symbols');
  const symbols = symbolsArg ? symbolsArg.split(',') : await fetchMiningCompanySymbols();
  const country = getArg('country') || 'ALL';
  const startDate = getArg('start');
  const endDate = getArg('end');
  const limit = parseInt(getArg('limit') || '100');
  const downloadPDFs = hasFlag('download-pdfs');
  const forceReprocess = hasFlag('force');
  const testMode = hasFlag('test');

  // In test mode, only process a few documents
  const processLimit = testMode ? 5 : limit;
  const processSymbols = testMode ? symbols.slice(0, 2) : symbols;

  console.log('\n📋 Configuration:');
  console.log('------------------');
  console.log(`Symbols: ${processSymbols.length > 0 ? processSymbols.join(', ') : 'ALL'}`);
  console.log(`Country: ${country}`);
  console.log(`Start Date: ${startDate || 'Not specified'}`);
  console.log(`End Date: ${endDate || 'Not specified'}`);
  console.log(`Limit: ${processLimit}`);
  console.log(`Download PDFs: ${downloadPDFs ? 'Yes' : 'No'}`);
  console.log(`Force Reprocess: ${forceReprocess ? 'Yes' : 'No'}`);
  console.log(`Test Mode: ${testMode ? 'Yes' : 'No'}`);

  // Run migration first
  console.log('\n📊 Running database migration...');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // The migration will be run by Supabase automatically, but we can check the table
  const { error: tableError } = await supabase
    .from('edgar_technical_documents')
    .select('id')
    .limit(1);

  if (tableError && tableError.message.includes('does not exist')) {
    console.error('❌ Table edgar_technical_documents does not exist.');
    console.error('Please run the migration: npx supabase db push');
    process.exit(1);
  }

  console.log('✅ Database ready');

  // Initialize processor
  const processor = new TechnicalDocumentProcessor(WEBSERVICE_PASSWORD);

  // Determine countries to process
  let countries: ('US' | 'CA')[] = [];
  if (country === 'ALL') {
    countries = ['US', 'CA'];
  } else if (country === 'US' || country === 'CA') {
    countries = [country as 'US' | 'CA'];
  } else {
    console.error('❌ Invalid country. Use US, CA, or ALL');
    process.exit(1);
  }

  // Process documents
  console.log('\n🔄 Processing documents...\n');

  try {
    const result = await processor.processDocuments({
      symbols: processSymbols.length > 0 ? processSymbols : undefined,
      startDate,
      endDate,
      countries,
      limit: processLimit,
      downloadPDFs,
      forceReprocess,
    });

    // Display results
    console.log('\n📊 Processing Complete!');
    console.log('======================');
    console.log(`Total Processed: ${result.totalProcessed}`);
    console.log(`Technical Reports: ${result.technicalReports}`);
    console.log(`New Documents: ${result.newDocuments}`);
    console.log(`Updated Documents: ${result.updatedDocuments}`);

    if (result.errors.length > 0) {
      console.log(`\n⚠️ Errors (${result.errors.length}):`);
      result.errors.forEach(err => console.log(`  - ${err}`));
    }

    // Show some sample technical reports
    if (result.technicalReports > 0) {
      console.log('\n📄 Sample Technical Reports in Database:');

      const { data: samples } = await supabase
        .from('edgar_technical_documents')
        .select('symbol, company_name, form_type, form_description, date_filed, report_type, pdf_link')
        .eq('is_technical_report', true)
        .order('date_filed', { ascending: false })
        .limit(5);

      if (samples) {
        samples.forEach(doc => {
          console.log(`\n  ${doc.symbol} - ${doc.company_name}`);
          console.log(`  Type: ${doc.report_type || doc.form_type}`);
          console.log(`  Description: ${doc.form_description}`);
          console.log(`  Filed: ${doc.date_filed}`);
          if (doc.pdf_link) {
            console.log(`  PDF: ${doc.pdf_link.substring(0, 80)}...`);
          }
        });
      }
    }

    console.log('\n✅ Script completed successfully!');

  } catch (error) {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});