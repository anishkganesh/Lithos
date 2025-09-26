#!/usr/bin/env npx tsx
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkDatabase() {
  // Check current projects count
  const { count, error } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Error checking projects:', error);
    return;
  }

  console.log('Current projects in database:', count);

  // Get sample of existing projects
  const { data: samples } = await supabase
    .from('projects')
    .select('project_name, company_name, primary_commodity, capex_usd_m, post_tax_npv_usd_m')
    .limit(10);

  if (samples && samples.length > 0) {
    console.log('\nExisting projects:');
    samples.forEach(p => {
      console.log(`  - ${p.project_name}`);
      console.log(`    Company: ${p.company_name}`);
      console.log(`    Commodity: ${p.primary_commodity}`);
      if (p.capex_usd_m) console.log(`    CAPEX: $${p.capex_usd_m}M`);
      if (p.post_tax_npv_usd_m) console.log(`    NPV: $${p.post_tax_npv_usd_m}M`);
    });
  }

  // Check quotemedia_links
  const { count: linkCount } = await supabase
    .from('quotemedia_links')
    .select('*', { count: 'exact', head: true });

  console.log('\nQuoteMedia documents stored:', linkCount);
}

checkDatabase();