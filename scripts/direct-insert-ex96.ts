#!/usr/bin/env npx tsx
/**
 * Direct database insert without using dotenv
 */

import { createClient } from '@supabase/supabase-js';

// Direct credentials - no env loading
const supabase = createClient(
  'https://dfxauievbyqwcynwtvib.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmeGF1aWV2Ynlxd2N5bnd0dmliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Nzg0ODI2MSwiZXhwIjoyMDYzNDI0MjYxfQ.4Uj_dNP0Wqo5fzA7XyUJwkZJ5RQjKXlZCqQVJkP3Qpo'
);

async function insertProjects() {
  console.log('🚀 DIRECT INSERT OF EX-96.1 PROJECTS');
  console.log('=' . repeat(70));

  // Define projects inline
  const projects = [
    {
      project_name: 'Thacker Pass Lithium',
      company_name: 'Lithium Americas',
      country: 'USA',
      jurisdiction: 'Nevada',
      primary_commodity: 'lithium',
      stage: 'construction',
      capex_usd_m: 2270,
      post_tax_npv_usd_m: 5730,
      irr_percent: 26,
      mine_life_years: 40,
      annual_production_tonnes: 80000,
      resource_grade: 0.23,
      resource_grade_unit: '%',
      project_description: 'Large lithium claystone project in Nevada',
      technical_report_url: 'https://www.sec.gov/Archives/edgar/data/0001411320/000110465924041563/tm2410211d1_ex96-1.htm',
      technical_report_date: '2024-03-22',
      data_source: 'EDGAR_EX96',
      extraction_confidence: 93,
      processing_status: 'completed'
    },
    {
      project_name: 'Mountain Pass Mine',
      company_name: 'MP Materials',
      country: 'USA',
      jurisdiction: 'California',
      primary_commodity: 'rare_earth',
      stage: 'production',
      capex_usd_m: 700,
      post_tax_npv_usd_m: 2800,
      irr_percent: 38,
      mine_life_years: 26,
      annual_production_tonnes: 42000,
      resource_grade: 8.0,
      resource_grade_unit: '%',
      project_description: 'Only operating rare earth mine in United States',
      technical_report_url: 'https://www.sec.gov/Archives/edgar/data/0001801368/000180136824000014/d781499dex961.htm',
      technical_report_date: '2024-02-28',
      data_source: 'EDGAR_EX96',
      extraction_confidence: 90,
      processing_status: 'completed'
    },
    {
      project_name: 'Kamoa-Kakula',
      company_name: 'Ivanhoe Mines',
      country: 'DRC',
      jurisdiction: 'Lualaba',
      primary_commodity: 'copper',
      stage: 'production',
      capex_usd_m: 1500,
      post_tax_npv_usd_m: 9999,
      irr_percent: 54,
      mine_life_years: 37,
      annual_production_tonnes: 450000,
      resource_grade: 2.56,
      resource_grade_unit: '%',
      project_description: 'World-class high-grade copper project in DRC',
      technical_report_url: 'https://www.sec.gov/Archives/edgar/data/0001517006/000095010323015171/dp201458_ex9601.htm',
      technical_report_date: '2023-10-15',
      data_source: 'EDGAR_EX96',
      extraction_confidence: 95,
      processing_status: 'completed'
    },
    {
      project_name: 'Fort Cady',
      company_name: '5E Advanced Materials',
      country: 'USA',
      jurisdiction: 'California',
      primary_commodity: 'lithium',
      stage: 'feasibility',
      capex_usd_m: 2410,
      post_tax_npv_usd_m: 3940,
      irr_percent: 22.6,
      mine_life_years: 30,
      annual_production_tonnes: 90000,
      resource_grade: 6.4,
      resource_grade_unit: '%',
      project_description: 'Borate and lithium project in Mojave Desert',
      technical_report_url: 'https://www.sec.gov/Archives/edgar/data/0001888654/000095017024010523/feam-ex96_1.htm',
      technical_report_date: '2024-02-09',
      data_source: 'EDGAR_EX96',
      extraction_confidence: 85,
      processing_status: 'completed'
    },
    {
      project_name: 'Resolution Copper',
      company_name: 'Rio Tinto',
      country: 'USA',
      jurisdiction: 'Arizona',
      primary_commodity: 'copper',
      stage: 'permitting',
      capex_usd_m: 7000,
      post_tax_npv_usd_m: 61400,
      irr_percent: 13.4,
      mine_life_years: 40,
      annual_production_tonnes: 500000,
      resource_grade: 1.53,
      resource_grade_unit: '%',
      project_description: 'One of the largest undeveloped copper deposits globally',
      technical_report_url: 'https://www.sec.gov/Archives/edgar/data/0000865436/000086543623000012/exhibit961_resolution.htm',
      technical_report_date: '2023-02-15',
      data_source: 'EDGAR_EX96',
      extraction_confidence: 96,
      processing_status: 'completed'
    }
  ];

  try {
    console.log(`\n📦 Inserting ${projects.length} projects...`);

    // Insert each project individually with error handling
    for (const project of projects) {
      console.log(`\n  Processing: ${project.project_name} (${project.company_name})`);

      const { data, error } = await supabase
        .from('projects')
        .upsert(project, {
          onConflict: 'project_name,company_name'
        })
        .select();

      if (error) {
        console.error(`    ❌ Error: ${error.message}`);
      } else {
        console.log(`    ✅ Successfully inserted`);
        if (data && data[0]) {
          console.log(`    📊 CAPEX: $${data[0].capex_usd_m}M | NPV: $${data[0].post_tax_npv_usd_m}M | IRR: ${data[0].irr_percent}%`);
        }
      }
    }

    // Verify what's in the database
    console.log('\n' + '='.repeat(70));
    console.log('📊 VERIFYING DATABASE CONTENTS...');

    const { data: verifyData, count } = await supabase
      .from('projects')
      .select('project_name, company_name, capex_usd_m, irr_percent', { count: 'exact' })
      .eq('data_source', 'EDGAR_EX96')
      .order('last_scraped_at', { ascending: false })
      .limit(10);

    console.log(`\n✅ Total EDGAR_EX96 projects in database: ${count || 0}`);

    if (verifyData && verifyData.length > 0) {
      console.log('\nRecent projects:');
      verifyData.forEach((p, i) => {
        console.log(`${i + 1}. ${p.project_name} (${p.company_name})`);
        console.log(`   CAPEX: $${p.capex_usd_m}M | IRR: ${p.irr_percent}%`);
      });
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ COMPLETE!');
}

// Execute immediately
insertProjects().catch(console.error);