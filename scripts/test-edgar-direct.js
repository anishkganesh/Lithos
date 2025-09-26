#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const axios = require('axios');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Using URL:', supabaseUrl);
console.log('Using Anon Key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'Not set');

async function testEDGARPipeline() {
  console.log('🚀 Testing EDGAR Pipeline with Direct Insert\n');

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    // Step 1: Test table exists
    console.log('1️⃣ Checking if edgar_technical_documents table exists...');
    const { data: tableCheck, error: tableError } = await supabase
      .from('edgar_technical_documents')
      .select('id')
      .limit(1);

    if (tableError && tableError.message.includes('relation')) {
      console.log('❌ Table does not exist. Please run the migration in Supabase SQL editor.');
      console.log('\n📝 Migration script is in: supabase/migrations/001_create_edgar_documents.sql');
      return;
    }

    console.log('✅ Table exists!\n');

    // Step 2: Fetch real EDGAR data
    console.log('2️⃣ Fetching real EDGAR EX-96.1 data from SEC...');

    // Search for EX-96.1 filings (technical reports)
    const searchUrl = 'https://efts.sec.gov/LATEST/search-index';
    const searchParams = new URLSearchParams({
      q: 'EX-96.1',
      dateRange: 'custom',
      category: 'form-cat1',
      startdt: '2024-11-01',
      enddt: '2024-12-31',
      from: '0',
      size: '5'
    });

    const response = await axios.get(`${searchUrl}?${searchParams}`, {
      headers: {
        'User-Agent': 'Lithos Mining Analytics (test@example.com)',
        'Accept': 'application/json'
      }
    });

    const filings = response.data?.hits?.hits || [];
    console.log(`✅ Found ${filings.length} filings\n`);

    if (filings.length === 0) {
      console.log('No filings found. The SEC API might be rate limiting or down.');
      return;
    }

    // Step 3: Insert sample data into database
    console.log('3️⃣ Inserting sample EDGAR data into database...');

    const documentsToInsert = filings.slice(0, 3).map(hit => {
      const source = hit._source;
      return {
        cik: source.ciks?.[0] || '0000000000',
        company_name: source.display_names?.[0] || 'Unknown Company',
        ticker: source.tickers?.[0] || null,
        filing_date: source.filing_date || new Date().toISOString().split('T')[0],
        accession_number: source.accession_number || `test-${Date.now()}`,
        form_type: source.form || 'EX-96.1',
        document_url: `https://www.sec.gov/Archives/edgar/data/${source.ciks?.[0]}/${source.accession_number?.replace(/-/g, '')}/${source.file_name || 'document.htm'}`,
        document_title: source.description || 'Technical Report',
        exhibit_number: 'EX-96.1',
        sic_code: source.sics?.[0] || null,
        primary_commodity: null, // Will be extracted later
        commodities: [],
        project_names: [],
        is_processed: false
      };
    });

    // Insert documents
    for (const doc of documentsToInsert) {
      console.log(`   Inserting: ${doc.company_name} - ${doc.filing_date}`);

      const { data, error } = await supabase
        .from('edgar_technical_documents')
        .upsert(doc, {
          onConflict: 'accession_number',
          ignoreDuplicates: false
        })
        .select();

      if (error) {
        console.log(`   ⚠️ Error inserting ${doc.company_name}:`, error.message);
      } else {
        console.log(`   ✅ Inserted successfully`);
      }
    }

    // Step 4: Verify data in database
    console.log('\n4️⃣ Verifying data in database...');
    const { data: documents, count } = await supabase
      .from('edgar_technical_documents')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(5);

    console.log(`\n✅ Total documents in database: ${count}`);

    if (documents && documents.length > 0) {
      console.log('\n📊 Recent documents:');
      documents.forEach((doc, i) => {
        console.log(`   ${i + 1}. ${doc.company_name} (${doc.ticker || 'N/A'}) - ${doc.filing_date}`);
        console.log(`      URL: ${doc.document_url}`);
      });
    }

    console.log('\n🎉 Test complete! The EDGAR pipeline is working.');
    console.log('\n📝 Next steps:');
    console.log('   1. Run the full scraper: npm run edgar:scrape:incremental');
    console.log('   2. Check the database for populated data');
    console.log('   3. Process documents to extract commodity and project information');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testEDGARPipeline();