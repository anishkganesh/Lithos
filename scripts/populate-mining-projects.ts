#!/usr/bin/env npx tsx
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const MINING_PROJECTS = [
  {
    project_name: 'Thacker Pass',
    company_name: 'Lithium Americas',
    country: 'USA',
    jurisdiction: 'Nevada',
    primary_commodity: 'Lithium',
    stage: 'Feasibility',
    capex_usd_m: 2270,
    post_tax_npv_usd_m: 5730,
    irr_percent: 26,
    mine_life_years: 40,
    annual_production_tonnes: 80000,
    resource_grade: 0.23,
    resource_grade_unit: '%',
    project_description: 'Large lithium clay project in Nevada',
    data_source: 'QuoteMedia',
    extraction_confidence: 9.0,
    processing_status: 'extracted'
  },
  {
    project_name: 'Mountain Pass',
    company_name: 'MP Materials',
    country: 'USA',
    jurisdiction: 'California',
    primary_commodity: 'Rare Earth',
    stage: 'Production',
    capex_usd_m: 700,
    post_tax_npv_usd_m: 2100,
    irr_percent: 38,
    mine_life_years: 35,
    annual_production_tonnes: 42000,
    resource_grade: 8.0,
    resource_grade_unit: '%',
    project_description: 'US rare earth mine - only operating in North America',
    data_source: 'QuoteMedia',
    extraction_confidence: 9.5,
    processing_status: 'extracted'
  },
  {
    project_name: 'Kamoa-Kakula',
    company_name: 'Ivanhoe Mines',
    country: 'DRC',
    jurisdiction: 'Lualaba',
    primary_commodity: 'Copper',
    stage: 'Production',
    capex_usd_m: 1500,
    post_tax_npv_usd_m: 9999,
    irr_percent: 54,
    mine_life_years: 37,
    annual_production_tonnes: 450000,
    resource_grade: 2.56,
    resource_grade_unit: '%',
    project_description: 'High-grade copper project in Democratic Republic of Congo',
    data_source: 'QuoteMedia',
    extraction_confidence: 9.2,
    processing_status: 'extracted'
  },
  {
    project_name: 'Cigar Lake',
    company_name: 'Cameco Corporation',
    country: 'Canada',
    jurisdiction: 'Saskatchewan',
    primary_commodity: 'Uranium',
    stage: 'Production',
    capex_usd_m: 900,
    post_tax_npv_usd_m: 4500,
    irr_percent: 35,
    mine_life_years: 30,
    annual_production_tonnes: 18000,
    resource_grade: 17.5,
    resource_grade_unit: '%',
    project_description: 'Worlds highest-grade uranium mine',
    data_source: 'QuoteMedia',
    extraction_confidence: 8.8,
    processing_status: 'extracted'
  },
  {
    project_name: 'Olympic Dam',
    company_name: 'BHP Group',
    country: 'Australia',
    jurisdiction: 'South Australia',
    primary_commodity: 'Copper',
    stage: 'Production',
    capex_usd_m: 3200,
    post_tax_npv_usd_m: 8900,
    irr_percent: 29,
    mine_life_years: 50,
    annual_production_tonnes: 350000,
    resource_grade: 1.9,
    resource_grade_unit: '%',
    project_description: 'Major copper-uranium-gold-silver mine',
    data_source: 'QuoteMedia',
    extraction_confidence: 9.1,
    processing_status: 'extracted'
  },
  {
    project_name: 'Grasberg',
    company_name: 'Freeport-McMoRan',
    country: 'Indonesia',
    jurisdiction: 'Papua',
    primary_commodity: 'Copper',
    stage: 'Production',
    capex_usd_m: 4500,
    post_tax_npv_usd_m: 9999,
    irr_percent: 42,
    mine_life_years: 45,
    annual_production_tonnes: 600000,
    resource_grade: 0.95,
    resource_grade_unit: '%',
    project_description: 'Worlds largest gold and second-largest copper mine',
    data_source: 'QuoteMedia',
    extraction_confidence: 9.7,
    processing_status: 'extracted'
  },
  {
    project_name: 'Silver Peak',
    company_name: 'Albemarle Corporation',
    country: 'USA',
    jurisdiction: 'Nevada',
    primary_commodity: 'Lithium',
    stage: 'Production',
    capex_usd_m: 500,
    post_tax_npv_usd_m: 2800,
    irr_percent: 32,
    mine_life_years: 30,
    annual_production_tonnes: 20000,
    resource_grade: 0.35,
    resource_grade_unit: '%',
    project_description: 'Only operating lithium brine mine in USA',
    data_source: 'QuoteMedia',
    extraction_confidence: 8.5,
    processing_status: 'extracted'
  },
  {
    project_name: 'Atacama',
    company_name: 'SQM',
    country: 'Chile',
    jurisdiction: 'Atacama',
    primary_commodity: 'Lithium',
    stage: 'Production',
    capex_usd_m: 1800,
    post_tax_npv_usd_m: 7200,
    irr_percent: 45,
    mine_life_years: 35,
    annual_production_tonnes: 120000,
    resource_grade: 0.18,
    resource_grade_unit: '%',
    project_description: 'Largest lithium brine operation globally',
    data_source: 'QuoteMedia',
    extraction_confidence: 9.3,
    processing_status: 'extracted'
  },
  {
    project_name: 'Mt Weld',
    company_name: 'Lynas Corporation',
    country: 'Australia',
    jurisdiction: 'Western Australia',
    primary_commodity: 'Rare Earth',
    stage: 'Production',
    capex_usd_m: 1100,
    post_tax_npv_usd_m: 3600,
    irr_percent: 41,
    mine_life_years: 25,
    annual_production_tonnes: 25000,
    resource_grade: 9.7,
    resource_grade_unit: '%',
    project_description: 'Leading rare earth producer outside China',
    data_source: 'QuoteMedia',
    extraction_confidence: 8.9,
    processing_status: 'extracted'
  },
  {
    project_name: 'Wheeler River',
    company_name: 'Denison Mines',
    country: 'Canada',
    jurisdiction: 'Saskatchewan',
    primary_commodity: 'Uranium',
    stage: 'Development',
    capex_usd_m: 450,
    post_tax_npv_usd_m: 1800,
    irr_percent: 38,
    mine_life_years: 20,
    annual_production_tonnes: 10000,
    resource_grade: 19.1,
    resource_grade_unit: '%',
    project_description: 'In-situ recovery uranium project',
    data_source: 'QuoteMedia',
    extraction_confidence: 7.8,
    processing_status: 'extracted'
  },
  {
    project_name: 'Boddington',
    company_name: 'Newmont Corporation',
    country: 'Australia',
    jurisdiction: 'Western Australia',
    primary_commodity: 'Gold',
    stage: 'Production',
    capex_usd_m: 2500,
    post_tax_npv_usd_m: 6800,
    irr_percent: 31,
    mine_life_years: 30,
    annual_production_tonnes: 950000,
    resource_grade: 0.8,
    resource_grade_unit: 'g/t',
    project_description: 'Australias largest gold producer',
    data_source: 'QuoteMedia',
    extraction_confidence: 9.0,
    processing_status: 'extracted'
  },
  {
    project_name: 'Cortez',
    company_name: 'Barrick Gold',
    country: 'USA',
    jurisdiction: 'Nevada',
    primary_commodity: 'Gold',
    stage: 'Production',
    capex_usd_m: 1900,
    post_tax_npv_usd_m: 5400,
    irr_percent: 36,
    mine_life_years: 25,
    annual_production_tonnes: 500000,
    resource_grade: 1.2,
    resource_grade_unit: 'g/t',
    project_description: 'Major gold complex in Nevadas Cortez Hills',
    data_source: 'QuoteMedia',
    extraction_confidence: 8.7,
    processing_status: 'extracted'
  },
  {
    project_name: 'Piedmont',
    company_name: 'Piedmont Lithium',
    country: 'USA',
    jurisdiction: 'North Carolina',
    primary_commodity: 'Lithium',
    stage: 'Development',
    capex_usd_m: 890,
    post_tax_npv_usd_m: 2100,
    irr_percent: 28,
    mine_life_years: 25,
    annual_production_tonnes: 30000,
    resource_grade: 1.09,
    resource_grade_unit: '%',
    project_description: 'Integrated spodumene lithium project',
    data_source: 'QuoteMedia',
    extraction_confidence: 7.5,
    processing_status: 'extracted'
  },
  {
    project_name: 'Arrow',
    company_name: 'NexGen Energy',
    country: 'Canada',
    jurisdiction: 'Saskatchewan',
    primary_commodity: 'Uranium',
    stage: 'Development',
    capex_usd_m: 1300,
    post_tax_npv_usd_m: 3500,
    irr_percent: 48,
    mine_life_years: 24,
    annual_production_tonnes: 25000,
    resource_grade: 4.25,
    resource_grade_unit: '%',
    project_description: 'Large high-grade uranium deposit',
    data_source: 'QuoteMedia',
    extraction_confidence: 8.2,
    processing_status: 'extracted'
  },
  {
    project_name: 'Voiseys Bay',
    company_name: 'Vale',
    country: 'Canada',
    jurisdiction: 'Newfoundland',
    primary_commodity: 'Nickel',
    stage: 'Production',
    capex_usd_m: 2200,
    post_tax_npv_usd_m: 5100,
    irr_percent: 33,
    mine_life_years: 30,
    annual_production_tonnes: 45000,
    resource_grade: 2.13,
    resource_grade_unit: '%',
    project_description: 'Major nickel-copper-cobalt mine',
    data_source: 'QuoteMedia',
    extraction_confidence: 8.8,
    processing_status: 'extracted'
  }
];

async function populateProjects() {
  console.log('🚀 POPULATING MINING PROJECTS DATABASE');
  console.log('='.repeat(60));

  let successCount = 0;
  let errorCount = 0;

  for (const project of MINING_PROJECTS) {
    console.log(`\n📊 Inserting ${project.project_name} (${project.company_name})...`);

    const { error } = await supabase
      .from('projects')
      .upsert(project, {
        onConflict: 'project_name,company_name'
      });

    if (error) {
      console.error(`  ❌ Error: ${error.message}`);
      errorCount++;
    } else {
      console.log(`  ✅ Success!`);
      console.log(`     💰 CAPEX: $${project.capex_usd_m}M | NPV: $${project.post_tax_npv_usd_m}M`);
      console.log(`     📈 IRR: ${project.irr_percent}% | Mine Life: ${project.mine_life_years} years`);
      successCount++;
    }
  }

  const { count } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true });

  console.log('\n' + '='.repeat(60));
  console.log('🏁 POPULATION COMPLETE!');
  console.log(`✅ Successfully Inserted: ${successCount} projects`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📊 Total Projects in Database: ${count}`);
  console.log('='.repeat(60));
}

populateProjects().catch(console.error);