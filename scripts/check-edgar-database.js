#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function checkDatabase() {
  console.log('📊 Checking EDGAR Database Contents\n');

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    // Get all documents
    const { data: documents, error, count } = await supabase
      .from('edgar_technical_documents')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching documents:', error);
      return;
    }

    console.log(`✅ Total documents: ${count}\n`);

    if (documents && documents.length > 0) {
      console.log('📄 Documents in database:');
      console.log('─'.repeat(80));

      documents.forEach((doc, i) => {
        console.log(`\n${i + 1}. ${doc.company_name}`);
        console.log(`   CIK: ${doc.cik}`);
        console.log(`   Ticker: ${doc.ticker || 'N/A'}`);
        console.log(`   Filing Date: ${doc.filing_date}`);
        console.log(`   Accession: ${doc.accession_number}`);
        console.log(`   Form Type: ${doc.form_type}`);
        console.log(`   Document URL: ${doc.document_url}`);
        console.log(`   Primary Commodity: ${doc.primary_commodity || 'Not extracted'}`);
        console.log(`   Commodities: ${doc.commodities?.join(', ') || 'None'}`);
        console.log(`   Project Names: ${doc.project_names?.join(', ') || 'None'}`);
        console.log(`   Is Processed: ${doc.is_processed}`);
        console.log(`   Created: ${doc.created_at}`);
      });

      console.log('\n' + '─'.repeat(80));
    } else {
      console.log('No documents found in database.');
    }

    // Check scraper runs
    const { data: runs, error: runsError } = await supabase
      .from('edgar_scraper_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(5);

    if (!runsError && runs && runs.length > 0) {
      console.log('\n📈 Recent Scraper Runs:');
      console.log('─'.repeat(80));

      runs.forEach((run, i) => {
        console.log(`\n${i + 1}. Run ID: ${run.id}`);
        console.log(`   Type: ${run.run_type}`);
        console.log(`   Status: ${run.status}`);
        console.log(`   Started: ${run.started_at}`);
        console.log(`   Completed: ${run.completed_at || 'N/A'}`);
        console.log(`   Total Filings: ${run.total_filings_found}`);
        console.log(`   Processed: ${run.filings_processed}`);
        console.log(`   Documents: ${run.documents_extracted}`);
        console.log(`   Errors: ${run.errors_count}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkDatabase();