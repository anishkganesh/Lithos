#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function clearTables() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('⚠️  WARNING: This will delete ALL data from companies and projects tables');
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');

  await new Promise(resolve => setTimeout(resolve, 5000));

  try {
    // Clear projects first (has foreign key to companies)
    console.log('🗑️  Clearing projects table...');
    const { error: projectsError, count: projectCount } = await supabase
      .from('projects')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (projectsError) {
      console.error('❌ Error clearing projects:', projectsError);
    } else {
      console.log(`✅ Deleted ${projectCount || 'all'} projects`);
    }

    // Clear companies
    console.log('🗑️  Clearing companies table...');
    const { error: companiesError, count: companyCount } = await supabase
      .from('companies')
      .delete()
      .neq('company_id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (companiesError) {
      console.error('❌ Error clearing companies:', companiesError);
    } else {
      console.log(`✅ Deleted ${companyCount || 'all'} companies`);
    }

    console.log('\n✨ Tables cleared successfully!');
  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

clearTables();