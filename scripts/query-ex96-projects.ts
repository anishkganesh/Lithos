#!/usr/bin/env npx tsx

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

async function queryProjects() {
  console.log('📊 PROJECTS TABLE - EX-96.1 PARSED DATA');
  console.log('='.repeat(70));

  // First, check if any projects exist with EDGAR_EX96 source
  const { data: ex96Projects, error: ex96Error } = await supabase
    .from('projects')
    .select('*')
    .eq('data_source', 'EDGAR_EX96')
    .order('last_scraped_at', { ascending: false });

  if (ex96Error) {
    console.error('❌ Error querying EX-96 projects:', ex96Error);
  } else if (ex96Projects && ex96Projects.length > 0) {
    console.log(`\n✅ Found ${ex96Projects.length} projects from EX-96.1 documents:\n`);

    ex96Projects.forEach((p, i) => {
      console.log(`${i + 1}. ${p.project_name}`);
      console.log(`   Company: ${p.company_name}`);
      console.log(`   Commodity: ${p.primary_commodity || 'N/A'}`);
      console.log(`   Location: ${p.jurisdiction || 'N/A'}, ${p.country || 'N/A'}`);

      const metrics = [];
      if (p.capex_usd_m) metrics.push(`CAPEX: $${p.capex_usd_m}M`);
      if (p.post_tax_npv_usd_m) metrics.push(`NPV: $${p.post_tax_npv_usd_m}M`);
      if (p.irr_percent) metrics.push(`IRR: ${p.irr_percent}%`);
      if (p.mine_life_years) metrics.push(`Life: ${p.mine_life_years}y`);

      if (metrics.length > 0) {
        console.log(`   Metrics: ${metrics.join(' | ')}`);
      }
      console.log('');
    });
  } else {
    console.log('\n⚠️ No projects found with EDGAR_EX96 source.');
  }

  // Show any recent projects regardless of source
  console.log('\n' + '-'.repeat(70));
  console.log('📈 RECENT PROJECTS (ANY SOURCE):');

  const { data: recentProjects, error: recentError } = await supabase
    .from('projects')
    .select('project_name, company_name, data_source, capex_usd_m, irr_percent, last_scraped_at')
    .order('last_scraped_at', { ascending: false })
    .limit(10);

  if (recentError) {
    console.error('❌ Error querying recent projects:', recentError);
  } else if (recentProjects && recentProjects.length > 0) {
    console.log(`\nFound ${recentProjects.length} recent projects:\n`);

    recentProjects.forEach((p, i) => {
      const metrics = [];
      if (p.capex_usd_m) metrics.push(`$${p.capex_usd_m}M`);
      if (p.irr_percent) metrics.push(`${p.irr_percent}% IRR`);

      console.log(`${i + 1}. ${p.project_name || 'Unnamed'} (${p.company_name}) - ${p.data_source}`);
      if (metrics.length > 0) {
        console.log(`   ${metrics.join(', ')}`);
      }
    });
  } else {
    console.log('\n⚠️ No recent projects found.');
  }

  // Show data source summary
  console.log('\n' + '-'.repeat(70));
  console.log('📊 DATA SOURCE SUMMARY:');

  const { data: sources, error: sourceError } = await supabase
    .from('projects')
    .select('data_source');

  if (sources && !sourceError) {
    const sourceCounts = new Map<string, number>();
    sources.forEach(s => {
      if (s.data_source) {
        sourceCounts.set(s.data_source, (sourceCounts.get(s.data_source) || 0) + 1);
      }
    });

    console.log('\nProjects by source:');
    sourceCounts.forEach((count, source) => {
      console.log(`  - ${source}: ${count} projects`);
    });
  }

  console.log('\n' + '='.repeat(70));
}

queryProjects().catch(console.error);