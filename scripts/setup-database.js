#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function setupDatabase() {
  console.log('🚀 Database Setup Script');
  console.log('========================\n');

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Check current state
  console.log('📊 Checking current database state...\n');

  try {
    // Check edgar_technical_documents
    const { count: edgarCount } = await supabase
      .from('edgar_technical_documents')
      .select('*', { count: 'exact', head: true });
    console.log(`✅ edgar_technical_documents table: ${edgarCount} documents`);

    // Check companies
    const { count: companyCount, error: companyError } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true });

    if (companyError) {
      console.log('⚠️  companies table: Not found or error');
    } else {
      console.log(`✅ companies table: ${companyCount} companies`);
    }

    // Check projects
    const { count: projectCount, error: projectError } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true });

    if (projectError) {
      console.log('⚠️  projects table: Not found or error');
    } else {
      console.log(`✅ projects table: ${projectCount} projects`);
    }

    console.log('\n📝 NEXT STEPS:');
    console.log('==============\n');

    console.log('1. Run the migration script in Supabase SQL Editor:');
    console.log('   - Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql');
    console.log('   - Copy the contents of: supabase/migrations/002_complete_mining_setup.sql');
    console.log('   - Paste and run in the SQL editor\n');

    console.log('2. Clear existing data (optional):');
    console.log('   node scripts/clear-companies-projects.js\n');

    console.log('3. Process EDGAR documents to extract projects:');
    console.log('   node scripts/run-document-processor.js\n');

    console.log('4. The processor will:');
    console.log('   - Use GPT-4o to analyze each document');
    console.log('   - Extract company information');
    console.log('   - Extract all mining projects with financial data');
    console.log('   - Generate estimates where data is missing');
    console.log('   - Populate both companies and projects tables\n');

    // Show migration file location
    const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/002_complete_mining_setup.sql');
    console.log('📄 Migration file location:');
    console.log(`   ${migrationPath}\n`);

    // Check if tables need creation
    if (companyError || projectError) {
      console.log('⚠️  IMPORTANT: You need to run the migration first!');
      console.log('   The companies and/or projects tables are missing.\n');
    }

    // Check for unprocessed documents
    const { count: unprocessedCount } = await supabase
      .from('edgar_technical_documents')
      .select('*', { count: 'exact', head: true })
      .eq('is_processed', false);

    console.log(`📈 Documents ready to process: ${unprocessedCount}`);

    if (unprocessedCount > 0) {
      console.log('\n🎯 Ready to process documents!');
      console.log('   Run: node scripts/run-document-processor.js');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

setupDatabase();