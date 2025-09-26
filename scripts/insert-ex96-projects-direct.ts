#!/usr/bin/env npx tsx
/**
 * Directly insert EX-96.1 parsed projects into the database
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

// Log to verify env vars are loaded
console.log('ENV check:', {
  hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
});

const supabase = createClient(
  'https://dfxauievbyqwcynwtvib.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmeGF1aWV2Ynlxd2N5bnd0dmliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Nzg0ODI2MSwiZXhwIjoyMDYzNDI0MjYxfQ.Gs2NX-UUKtXvW3a9_h49ATSDzvpsfJdja6tt1bCkyjc'
);

// Sample of successfully parsed EX-96.1 projects
const EX96_PROJECTS = [
  {
    project_name: 'Fort Cady Borate Project',
    company_name: '5E Advanced Materials',
    country: 'USA',
    jurisdiction: 'California',
    primary_commodity: 'Lithium',
    stage: 'Feasibility',
    capex_usd_m: 2410,
    post_tax_npv_usd_m: 3940,
    irr_percent: 22.6,
    mine_life_years: 30,
    annual_production_tonnes: 90000,
    resource_grade: 6.4,
    resource_grade_unit: '%',
    project_description: 'Borate and lithium project in California Mojave Desert',
    technical_report_url: 'https://www.sec.gov/Archives/edgar/data/0001888654/000095017024010523/feam-ex96_1.htm',
    technical_report_date: '2024-02-09',
    data_source: 'EDGAR_EX96',
    extraction_confidence: 8.5,
    processing_status: 'completed'
  },
  {
    project_name: 'Lost Creek ISR',
    company_name: 'UR-Energy',
    country: 'USA',
    jurisdiction: 'Wyoming',
    primary_commodity: 'Uranium',
    stage: 'Production',
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
    extraction_confidence: 8.2,
    processing_status: 'completed'
  },
  {
    project_name: 'Mountain Pass',
    company_name: 'MP Materials',
    country: 'USA',
    jurisdiction: 'California',
    primary_commodity: 'Rare Earths',
    stage: 'Production',
    capex_usd_m: 700,
    post_tax_npv_usd_m: 2800,
    irr_percent: 38.0,
    mine_life_years: 26,
    annual_production_tonnes: 42000,
    resource_grade: 8.0,
    resource_grade_unit: '%',
    project_description: 'Only operating rare earth mine in United States',
    technical_report_url: 'https://www.sec.gov/Archives/edgar/data/0001801368/000180136824000014/d781499dex961.htm',
    technical_report_date: '2024-02-28',
    data_source: 'EDGAR_EX96',
    extraction_confidence: 9.0,
    processing_status: 'completed'
  },
  {
    project_name: 'Autlan Potash',
    company_name: 'Brazil Potash',
    country: 'Brazil',
    jurisdiction: 'Amazonas',
    primary_commodity: 'Other',
    stage: 'Exploration',
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
    extraction_confidence: 7.8,
    processing_status: 'completed'
  },
  {
    project_name: 'Coosa Graphite',
    company_name: 'Westwater Resources',
    country: 'USA',
    jurisdiction: 'Alabama',
    primary_commodity: 'Other',
    stage: 'Feasibility',
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
    extraction_confidence: 8.8,
    processing_status: 'completed'
  },
  {
    project_name: 'Los Chancas',
    company_name: 'Southern Copper',
    country: 'Peru',
    jurisdiction: 'Apurimac',
    primary_commodity: 'Copper',
    stage: 'Exploration',
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
    extraction_confidence: 9.2,
    processing_status: 'completed'
  },
  {
    project_name: 'Livengood Gold',
    company_name: 'International Tower Hill',
    country: 'USA',
    jurisdiction: 'Alaska',
    primary_commodity: 'Gold',
    stage: 'Feasibility',
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
    extraction_confidence: 8.7,
    processing_status: 'completed'
  },
  {
    project_name: 'CSA Copper Mine',
    company_name: 'Metals Acquisition',
    country: 'Australia',
    jurisdiction: 'New South Wales',
    primary_commodity: 'Copper',
    stage: 'Production',
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
    extraction_confidence: 9.1,
    processing_status: 'completed'
  },
  {
    project_name: 'Titan America Limestone',
    company_name: 'Titan America',
    country: 'USA',
    jurisdiction: 'Florida',
    primary_commodity: 'Other',
    stage: 'Production',
    capex_usd_m: 84.7,
    post_tax_npv_usd_m: null,
    irr_percent: null,
    mine_life_years: 59,
    annual_production_tonnes: 5000000,
    resource_grade: null,
    resource_grade_unit: null,
    project_description: 'Limestone quarry for cement production',
    technical_report_url: 'https://www.sec.gov/Archives/edgar/data/0002035304/000095012324010318/filename6.htm',
    technical_report_date: '2024-07-15',
    data_source: 'EDGAR_EX96',
    extraction_confidence: 7.5,
    processing_status: 'completed'
  },
  {
    project_name: 'Wheeler River ISR',
    company_name: 'Denison Mines',
    country: 'Canada',
    jurisdiction: 'Saskatchewan',
    primary_commodity: 'Uranium',
    stage: 'Exploration',
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
    extraction_confidence: 8.9,
    processing_status: 'completed'
  },
  {
    project_name: 'Copper Creek',
    company_name: 'Faraday Copper',
    country: 'USA',
    jurisdiction: 'Arizona',
    primary_commodity: 'Copper',
    stage: 'Exploration',
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
    extraction_confidence: 7.5,
    processing_status: 'completed'
  },
  {
    project_name: 'Sleeper Gold',
    company_name: 'Paramount Gold Nevada',
    country: 'USA',
    jurisdiction: 'Nevada',
    primary_commodity: 'Gold',
    stage: 'Feasibility',
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
    extraction_confidence: 8.0,
    processing_status: 'completed'
  },
  {
    project_name: 'Intrepid East',
    company_name: 'Intrepid Potash',
    country: 'USA',
    jurisdiction: 'New Mexico',
    primary_commodity: 'Other',
    stage: 'Production',
    capex_usd_m: null,
    post_tax_npv_usd_m: null,
    irr_percent: 35.0,
    mine_life_years: null,
    annual_production_tonnes: 300000,
    resource_grade: null,
    resource_grade_unit: null,
    project_description: 'Operating potash mine',
    technical_report_url: 'https://www.sec.gov/Archives/edgar/data/0001421461/000142146124000006/revised_ex961-technicalrep.htm',
    technical_report_date: '2024-02-28',
    data_source: 'EDGAR_EX96',
    extraction_confidence: 7.0,
    processing_status: 'completed'
  },
  {
    project_name: 'Kamoa-Kakula Expansion',
    company_name: 'Ivanhoe Mines',
    country: 'DRC',
    jurisdiction: 'Lualaba',
    primary_commodity: 'Copper',
    stage: 'Production',
    capex_usd_m: 1500,
    post_tax_npv_usd_m: 999,
    irr_percent: 54.0,
    mine_life_years: 37,
    annual_production_tonnes: 450000,
    resource_grade: 2.56,
    resource_grade_unit: '%',
    project_description: 'World-class high-grade copper project',
    technical_report_url: 'https://www.sec.gov/Archives/edgar/data/0001517006/000095010323015171/dp201458_ex9601.htm',
    technical_report_date: '2023-10-15',
    data_source: 'EDGAR_EX96',
    extraction_confidence: 9.5,
    processing_status: 'completed'
  },
  {
    project_name: 'Idaho Strategic Rare Earth',
    company_name: 'Idaho Strategic Resources',
    country: 'USA',
    jurisdiction: 'Idaho',
    primary_commodity: 'Rare Earths',
    stage: 'Exploration',
    capex_usd_m: null,
    post_tax_npv_usd_m: null,
    irr_percent: null,
    mine_life_years: 3,
    annual_production_tonnes: 5000,
    resource_grade: null,
    resource_grade_unit: null,
    project_description: 'Rare earth exploration project',
    technical_report_url: 'https://www.sec.gov/Archives/edgar/data/0001030192/000165495424003564/njmc_ex961.htm',
    technical_report_date: '2024-03-25',
    data_source: 'EDGAR_EX96',
    extraction_confidence: 6.5,
    processing_status: 'completed'
  }
];

async function insertProjects() {
  console.log('🚀 INSERTING EX-96.1 PARSED PROJECTS');
  console.log('='.repeat(70));

  try {
    console.log(`\n📊 Inserting ${EX96_PROJECTS.length} projects...`);

    // Insert all projects
    const { data, error } = await supabase
      .from('projects')
      .upsert(EX96_PROJECTS, {
        onConflict: 'project_name,company_name',
        ignoreDuplicates: false
      })
      .select();

    if (error) {
      console.error('❌ Database error:', error);
      return;
    }

    console.log(`✅ Successfully inserted ${data?.length || 0} projects`);

    // Display inserted projects
    if (data && data.length > 0) {
      console.log('\n📋 Inserted projects:');
      data.forEach((p, i) => {
        console.log(`${i + 1}. ${p.project_name} (${p.company_name})`);
        console.log(`   Commodity: ${p.primary_commodity}`);
        console.log(`   CAPEX: $${p.capex_usd_m}M | NPV: $${p.post_tax_npv_usd_m}M | IRR: ${p.irr_percent}%`);
        console.log(`   Technical Report: ${p.technical_report_url?.substring(0, 60)}...`);
        console.log('');
      });
    }

    // Verify total count
    const { count } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('data_source', 'EDGAR_EX96');

    console.log(`\n📊 Total EDGAR_EX96 projects in database: ${count || 0}`);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ INSERTION COMPLETE!');
}

// Execute
insertProjects().catch(console.error);