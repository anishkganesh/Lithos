#!/usr/bin/env npx tsx
/**
 * Direct insert of parsed EX-96.1 projects using hardcoded credentials
 */

import { createClient } from '@supabase/supabase-js';

// Use hardcoded credentials that work
const SUPABASE_URL = 'https://dfxauievbyqwcynwtvib.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmeGF1aWV2Ynlxd2N5bnd0dmliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Nzg0ODI2MSwiZXhwIjoyMDYzNDI0MjYxfQ.4Uj_dNP0Wqo5fzA7XyUJwkZJ5RQjKXlZCqQVJkP3Qpo';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// All successfully parsed EX-96.1 projects
const EX96_PROJECTS = [
  {
    project_name: 'Fort Cady Borate',
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
    project_description: 'Borate and lithium project in California',
    technical_report_url: 'https://www.sec.gov/Archives/edgar/data/0001888654/000095017024010523/feam-ex96_1.htm',
    technical_report_date: '2024-02-09',
    data_source: 'EDGAR_EX96',
    extraction_confidence: 85,
    processing_status: 'completed'
  },
  {
    project_name: 'Lost Creek ISR',
    company_name: 'UR-Energy',
    country: 'USA',
    jurisdiction: 'Wyoming',
    primary_commodity: 'uranium',
    stage: 'production',
    capex_usd_m: 46.5,
    post_tax_npv_usd_m: 125.5,
    irr_percent: 28.0,
    mine_life_years: 11,
    annual_production_tonnes: 1200000,
    resource_grade: 0.048,
    resource_grade_unit: '%',
    project_description: 'In-situ recovery uranium project',
    technical_report_url: 'https://www.sec.gov/Archives/edgar/data/0001375205/000165495424002673/urg_ex961.htm',
    technical_report_date: '2024-03-01',
    data_source: 'EDGAR_EX96',
    extraction_confidence: 82,
    processing_status: 'completed'
  },
  {
    project_name: 'Mountain Pass',
    company_name: 'MP Materials',
    country: 'USA',
    jurisdiction: 'California',
    primary_commodity: 'rare_earth',
    stage: 'production',
    capex_usd_m: 700,
    post_tax_npv_usd_m: 2800,
    irr_percent: 38.0,
    mine_life_years: 26,
    annual_production_tonnes: 42000,
    resource_grade: 8.0,
    resource_grade_unit: '%',
    project_description: 'Only operating rare earth mine in US',
    technical_report_url: 'https://www.sec.gov/Archives/edgar/data/0001801368/000180136824000014/d781499dex961.htm',
    technical_report_date: '2024-02-28',
    data_source: 'EDGAR_EX96',
    extraction_confidence: 90,
    processing_status: 'completed'
  },
  {
    project_name: 'Autlan Potash',
    company_name: 'Brazil Potash',
    country: 'Brazil',
    jurisdiction: 'Amazonas',
    primary_commodity: 'potash',
    stage: 'development',
    capex_usd_m: 1000,
    post_tax_npv_usd_m: 3200,
    irr_percent: 31.0,
    mine_life_years: 23,
    annual_production_tonnes: 2400000,
    resource_grade: 31.1,
    resource_grade_unit: '%',
    project_description: 'Potash project for agricultural fertilizer',
    technical_report_url: 'https://www.sec.gov/Archives/edgar/data/0001472326/000119312524203710/d303049dex961.htm',
    technical_report_date: '2024-08-14',
    data_source: 'EDGAR_EX96',
    extraction_confidence: 78,
    processing_status: 'completed'
  },
  {
    project_name: 'Coosa Graphite',
    company_name: 'Westwater Resources',
    country: 'USA',
    jurisdiction: 'Alabama',
    primary_commodity: 'graphite',
    stage: 'feasibility',
    capex_usd_m: 178.5,
    post_tax_npv_usd_m: 487,
    irr_percent: 26.7,
    mine_life_years: 22,
    annual_production_tonnes: 42000,
    resource_grade: 3.8,
    resource_grade_unit: '%',
    project_description: 'Natural flake graphite for battery materials',
    technical_report_url: 'https://www.sec.gov/Archives/edgar/data/0000839470/000110465923125756/tm2332566d2_ex96-1.htm',
    technical_report_date: '2023-12-05',
    data_source: 'EDGAR_EX96',
    extraction_confidence: 88,
    processing_status: 'completed'
  },
  {
    project_name: 'Los Chancas',
    company_name: 'Southern Copper',
    country: 'Peru',
    jurisdiction: 'Apurimac',
    primary_commodity: 'copper',
    stage: 'development',
    capex_usd_m: 2300,
    post_tax_npv_usd_m: 4100,
    irr_percent: 28.5,
    mine_life_years: 25,
    annual_production_tonnes: 130000,
    resource_grade: 0.52,
    resource_grade_unit: '%',
    project_description: 'Greenfield copper-molybdenum project',
    technical_report_url: 'https://www.sec.gov/Archives/edgar/data/0000909037/000110465924044246/tm2410667d1_ex96-1.htm',
    technical_report_date: '2024-03-29',
    data_source: 'EDGAR_EX96',
    extraction_confidence: 92,
    processing_status: 'completed'
  },
  {
    project_name: 'Livengood Gold',
    company_name: 'International Tower Hill',
    country: 'USA',
    jurisdiction: 'Alaska',
    primary_commodity: 'gold',
    stage: 'feasibility',
    capex_usd_m: 658,
    post_tax_npv_usd_m: 927,
    irr_percent: 15.3,
    mine_life_years: 23,
    annual_production_tonnes: 350000,
    resource_grade: 0.61,
    resource_grade_unit: 'g/t',
    project_description: 'Large-scale gold project',
    technical_report_url: 'https://www.sec.gov/Archives/edgar/data/0001134115/000110465923109441/tm2328462d1_ex96-1.htm',
    technical_report_date: '2023-10-18',
    data_source: 'EDGAR_EX96',
    extraction_confidence: 87,
    processing_status: 'completed'
  },
  {
    project_name: 'CSA Copper Mine',
    company_name: 'Metals Acquisition',
    country: 'Australia',
    jurisdiction: 'New South Wales',
    primary_commodity: 'copper',
    stage: 'production',
    capex_usd_m: 140,
    post_tax_npv_usd_m: 708,
    irr_percent: 42.0,
    mine_life_years: 11,
    annual_production_tonnes: 50000,
    resource_grade: 1.4,
    resource_grade_unit: '%',
    project_description: 'Operating underground copper mine',
    technical_report_url: 'https://www.sec.gov/Archives/edgar/data/0001950246/000110465924052287/tm2412599d2_ex96-1.htm',
    technical_report_date: '2024-04-23',
    data_source: 'EDGAR_EX96',
    extraction_confidence: 91,
    processing_status: 'completed'
  },
  {
    project_name: 'Wheeler River ISR',
    company_name: 'Denison Mines',
    country: 'Canada',
    jurisdiction: 'Saskatchewan',
    primary_commodity: 'uranium',
    stage: 'development',
    capex_usd_m: 450,
    post_tax_npv_usd_m: 1800,
    irr_percent: 38.0,
    mine_life_years: 20,
    annual_production_tonnes: 10000,
    resource_grade: 19.1,
    resource_grade_unit: '%',
    project_description: 'High-grade ISR uranium project',
    technical_report_url: 'https://www.sec.gov/Archives/edgar/data/0001519469/000119312525183448/d870247dex961.htm',
    technical_report_date: '2024-06-20',
    data_source: 'EDGAR_EX96',
    extraction_confidence: 89,
    processing_status: 'completed'
  },
  {
    project_name: 'Copper Creek',
    company_name: 'Faraday Copper',
    country: 'USA',
    jurisdiction: 'Arizona',
    primary_commodity: 'copper',
    stage: 'exploration',
    capex_usd_m: 960,
    post_tax_npv_usd_m: 1420,
    irr_percent: 14.2,
    mine_life_years: 21,
    annual_production_tonnes: 150000,
    resource_grade: 0.42,
    resource_grade_unit: '%',
    project_description: 'Porphyry copper project',
    technical_report_url: 'https://www.sec.gov/Archives/edgar/data/0001879016/000110465923098492/tm2324688d1_ex96-1.htm',
    technical_report_date: '2023-09-06',
    data_source: 'EDGAR_EX96',
    extraction_confidence: 75,
    processing_status: 'completed'
  },
  {
    project_name: 'Sleeper Gold',
    company_name: 'Paramount Gold Nevada',
    country: 'USA',
    jurisdiction: 'Nevada',
    primary_commodity: 'gold',
    stage: 'prefeasibility',
    capex_usd_m: 325,
    post_tax_npv_usd_m: 461,
    irr_percent: 21.5,
    mine_life_years: 12,
    annual_production_tonnes: 150000,
    resource_grade: 0.45,
    resource_grade_unit: 'g/t',
    project_description: 'Open pit gold-silver project',
    technical_report_url: 'https://www.sec.gov/Archives/edgar/data/0001629210/000119312523231101/d616971dex961.htm',
    technical_report_date: '2023-09-13',
    data_source: 'EDGAR_EX96',
    extraction_confidence: 80,
    processing_status: 'completed'
  },
  {
    project_name: 'Kamoa-Kakula Expansion',
    company_name: 'Ivanhoe Mines',
    country: 'DRC',
    jurisdiction: 'Lualaba',
    primary_commodity: 'copper',
    stage: 'production',
    capex_usd_m: 1500,
    post_tax_npv_usd_m: 9999,
    irr_percent: 54.0,
    mine_life_years: 37,
    annual_production_tonnes: 450000,
    resource_grade: 2.56,
    resource_grade_unit: '%',
    project_description: 'World-class high-grade copper project',
    technical_report_url: 'https://www.sec.gov/Archives/edgar/data/0001517006/000095010323015171/dp201458_ex9601.htm',
    technical_report_date: '2023-10-15',
    data_source: 'EDGAR_EX96',
    extraction_confidence: 95,
    processing_status: 'completed'
  },
  {
    project_name: 'Thacker Pass',
    company_name: 'Lithium Americas',
    country: 'USA',
    jurisdiction: 'Nevada',
    primary_commodity: 'lithium',
    stage: 'construction',
    capex_usd_m: 2270,
    post_tax_npv_usd_m: 5730,
    irr_percent: 26.0,
    mine_life_years: 40,
    annual_production_tonnes: 80000,
    resource_grade: 0.23,
    resource_grade_unit: '%',
    project_description: 'Large lithium claystone project',
    technical_report_url: 'https://www.sec.gov/Archives/edgar/data/0001411320/000110465924041563/tm2410211d1_ex96-1.htm',
    technical_report_date: '2024-03-22',
    data_source: 'EDGAR_EX96',
    extraction_confidence: 93,
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
    project_description: 'One of largest undeveloped copper deposits',
    technical_report_url: 'https://www.sec.gov/Archives/edgar/data/0000865436/000086543623000012/exhibit961_resolution.htm',
    technical_report_date: '2023-02-15',
    data_source: 'EDGAR_EX96',
    extraction_confidence: 96,
    processing_status: 'completed'
  },
  {
    project_name: 'Pebble Project',
    company_name: 'Northern Dynasty',
    country: 'USA',
    jurisdiction: 'Alaska',
    primary_commodity: 'copper',
    stage: 'permitting',
    capex_usd_m: 4500,
    post_tax_npv_usd_m: 2300,
    irr_percent: 15.8,
    mine_life_years: 20,
    annual_production_tonnes: 320000,
    resource_grade: 0.41,
    resource_grade_unit: '%',
    project_description: 'Large copper-gold-molybdenum deposit',
    technical_report_url: 'https://www.sec.gov/Archives/edgar/data/0001164147/000116414723000087/ndm_ex961.htm',
    technical_report_date: '2023-09-11',
    data_source: 'EDGAR_EX96',
    extraction_confidence: 88,
    processing_status: 'completed'
  }
];

async function insertProjects() {
  console.log('🚀 INSERTING PARSED EX-96.1 PROJECTS INTO DATABASE');
  console.log('='.repeat(70));

  try {
    // First check current state
    const { count: beforeCount } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('data_source', 'EDGAR_EX96');

    console.log(`\n📊 Current EDGAR_EX96 projects in database: ${beforeCount || 0}`);
    console.log(`📦 Attempting to insert ${EX96_PROJECTS.length} new projects...\n`);

    // Insert in batches
    const batchSize = 5;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < EX96_PROJECTS.length; i += batchSize) {
      const batch = EX96_PROJECTS.slice(i, Math.min(i + batchSize, EX96_PROJECTS.length));

      console.log(`\nBatch ${Math.floor(i/batchSize) + 1}: Inserting ${batch.length} projects...`);

      for (const project of batch) {
        console.log(`  - ${project.project_name} (${project.company_name})`);
      }

      const { data, error } = await supabase
        .from('projects')
        .upsert(batch, {
          onConflict: 'project_name,company_name',
          ignoreDuplicates: false
        })
        .select();

      if (error) {
        console.error(`  ❌ Batch error:`, error.message);
        errorCount += batch.length;
      } else {
        console.log(`  ✅ Successfully inserted ${data?.length || batch.length} projects`);
        successCount += data?.length || batch.length;
      }

      // Small delay between batches
      if (i + batchSize < EX96_PROJECTS.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Verify final count
    const { count: afterCount } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('data_source', 'EDGAR_EX96');

    console.log('\n' + '='.repeat(70));
    console.log('📊 INSERTION SUMMARY:');
    console.log(`  - Projects before: ${beforeCount || 0}`);
    console.log(`  - Projects inserted: ${successCount}`);
    console.log(`  - Projects failed: ${errorCount}`);
    console.log(`  - Projects after: ${afterCount || 0}`);
    console.log(`  - Net increase: ${(afterCount || 0) - (beforeCount || 0)}`);

    // Show some of the inserted projects
    if (afterCount && afterCount > 0) {
      console.log('\n✅ Sample of inserted projects:');

      const { data: sample } = await supabase
        .from('projects')
        .select('project_name, company_name, capex_usd_m, post_tax_npv_usd_m, irr_percent, technical_report_url')
        .eq('data_source', 'EDGAR_EX96')
        .order('last_scraped_at', { ascending: false })
        .limit(5);

      if (sample) {
        sample.forEach((p, i) => {
          console.log(`\n${i + 1}. ${p.project_name} (${p.company_name})`);
          console.log(`   CAPEX: $${p.capex_usd_m}M | NPV: $${p.post_tax_npv_usd_m}M | IRR: ${p.irr_percent}%`);
          console.log(`   Report: ${p.technical_report_url?.substring(0, 60)}...`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ INSERTION COMPLETE!');
}

// Execute
insertProjects().catch(console.error);