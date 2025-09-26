#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://dfxauievbyqwcynwtvib.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmeGF1aWV2Ynlxd2N5bnd0dmliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Nzg0ODI2MSwiZXhwIjoyMDYzNDI0MjYxfQ.Gs2NX-UUKtXvW3a9_h49ATSDzvpsfJdja6tt1bCkyjc'
);

async function addColumns() {
  console.log('Adding new columns to projects table...');

  // Test if columns already exist by trying to select them
  const { data: test, error: testError } = await supabase
    .from('projects')
    .select('payback_years')
    .limit(1);

  if (!testError) {
    console.log('✅ Columns already exist!');
    return;
  }

  console.log('Note: Columns need to be added manually via Supabase dashboard or direct SQL.');
  console.log('\nSQL to run in Supabase SQL editor:');
  console.log(`
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS pre_tax_npv_usd_m numeric(10, 2),
ADD COLUMN IF NOT EXISTS payback_years numeric(5, 2),
ADD COLUMN IF NOT EXISTS annual_revenue_usd_m numeric(10, 2),
ADD COLUMN IF NOT EXISTS annual_opex_usd_m numeric(10, 2),
ADD COLUMN IF NOT EXISTS all_in_sustaining_cost numeric(10, 2),
ADD COLUMN IF NOT EXISTS cash_cost numeric(10, 2),
ADD COLUMN IF NOT EXISTS strip_ratio numeric(10, 2),
ADD COLUMN IF NOT EXISTS recovery_rate_percent numeric(5, 2),
ADD COLUMN IF NOT EXISTS reserves_tonnes numeric(20, 2),
ADD COLUMN IF NOT EXISTS resources_tonnes numeric(20, 2),
ADD COLUMN IF NOT EXISTS discount_rate_percent numeric(5, 2);
  `);
}

addColumns().catch(console.error);