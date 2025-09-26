#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Testing Supabase connection...');
console.log('URL:', supabaseUrl);
console.log('Service Key:', supabaseServiceKey ? `${supabaseServiceKey.substring(0, 20)}...` : 'Not set');

try {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Test a simple query
  supabase
    .from('projects')
    .select('count', { count: 'exact', head: true })
    .then(({ count, error }) => {
      if (error) {
        console.error('❌ Query error:', error);
      } else {
        console.log('✅ Connection successful!');
        console.log(`   Found ${count} projects in database`);
      }
    });

  // Test edgar_technical_documents table
  supabase
    .from('edgar_technical_documents')
    .select('count', { count: 'exact', head: true })
    .then(({ count, error }) => {
      if (error) {
        console.log('⚠️  edgar_technical_documents table not found or error:', error.message);
        console.log('   Make sure you ran the migration script in Supabase');
      } else {
        console.log('✅ edgar_technical_documents table exists');
        console.log(`   Current documents: ${count}`);
      }
    });

} catch (error) {
  console.error('❌ Connection error:', error);
}