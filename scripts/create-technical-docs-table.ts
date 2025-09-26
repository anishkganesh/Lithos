#!/usr/bin/env npx tsx
/**
 * Direct script to create the edgar_technical_documents table
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Execute raw SQL using service role key
async function executeSQL(sql: string) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc`, {
    method: 'POST',
    headers: {
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      query: sql
    })
  });

  if (!response.ok) {
    // Table might not exist, which is fine for our check
    return null;
  }

  return await response.json();
}

async function main() {
  console.log('🚀 Creating edgar_technical_documents table...\n');

  // First check if table exists
  const { error: checkError } = await supabase
    .from('edgar_technical_documents')
    .select('id')
    .limit(1);

  if (!checkError) {
    console.log('✅ Table edgar_technical_documents already exists');

    // Get row count
    const { count } = await supabase
      .from('edgar_technical_documents')
      .select('*', { count: 'exact', head: true });

    console.log(`📊 Current row count: ${count || 0}`);
    return;
  }

  // If table doesn't exist, we need to create it manually
  console.log('❌ Table does not exist yet.\n');
  console.log('📝 Please create the table using one of these methods:\n');

  console.log('Option 1: Supabase Dashboard (Recommended)');
  console.log('-------------------------------------------');
  console.log('1. Go to: https://supabase.com/dashboard/project/dfxauievbyqwcynwtvib/sql');
  console.log('2. Click "New Query"');
  console.log('3. Copy and paste the SQL from: supabase/migrations/005_create_edgar_technical_documents.sql');
  console.log('4. Click "Run"\n');

  console.log('Option 2: Use the provided SQL');
  console.log('-------------------------------');
  console.log('Copy the following SQL to your Supabase SQL Editor:\n');

  const sql = `-- Create edgar_technical_documents table
CREATE TABLE IF NOT EXISTS edgar_technical_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  filing_id TEXT UNIQUE NOT NULL,
  accession_number TEXT,
  symbol TEXT NOT NULL,
  company_name TEXT NOT NULL,
  cik TEXT,
  issuer_number TEXT,
  cusip TEXT,
  isin TEXT,
  form_type TEXT NOT NULL,
  form_description TEXT,
  form_group TEXT,
  country TEXT CHECK (country IN ('US', 'CA')),
  date_filed DATE NOT NULL,
  period_date DATE,
  html_link TEXT,
  pdf_link TEXT,
  doc_link TEXT,
  xls_link TEXT,
  xbrl_link TEXT,
  file_size TEXT,
  page_count INTEGER,
  is_technical_report BOOLEAN DEFAULT false,
  report_type TEXT,
  project_name TEXT,
  project_location TEXT,
  commodity_types TEXT[],
  content_summary TEXT,
  full_content TEXT,
  processing_status TEXT DEFAULT 'pending',
  processed_at TIMESTAMPTZ,
  processing_error TEXT,
  pdf_stored BOOLEAN DEFAULT false,
  pdf_storage_path TEXT,
  pdf_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes
CREATE INDEX idx_edgar_tech_docs_symbol ON edgar_technical_documents(symbol);
CREATE INDEX idx_edgar_tech_docs_date_filed ON edgar_technical_documents(date_filed DESC);
CREATE INDEX idx_edgar_tech_docs_is_technical ON edgar_technical_documents(is_technical_report);`;

  console.log(sql);
  console.log('\n✅ After creating the table, run: npm run quotemedia:test');
}

main().catch(console.error);