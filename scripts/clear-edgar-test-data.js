#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function clearTestData() {
  console.log('🧹 Clearing test data from EDGAR tables\n');

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    // Delete test records (those with 'test-' in accession number or undefined URLs)
    const { error: deleteError } = await supabase
      .from('edgar_technical_documents')
      .delete()
      .or('accession_number.like.test-%,document_url.like.%undefined%');

    if (deleteError) {
      console.error('Error deleting test data:', deleteError);
    } else {
      console.log('✅ Test data cleared');
    }

    // Check remaining documents
    const { count } = await supabase
      .from('edgar_technical_documents')
      .select('*', { count: 'exact', head: true });

    console.log(`📊 Remaining documents: ${count || 0}`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

clearTestData();