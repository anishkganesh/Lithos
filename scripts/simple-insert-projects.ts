#!/usr/bin/env npx tsx
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function simpleInsert() {
  console.log('Inserting simple test projects...\n');

  const projects = [
    {
      project_name: 'Thacker Pass',
      company_name: 'Lithium Americas',
      country: 'USA',
      jurisdiction: 'Nevada',
      primary_commodity: 'Lithium',
      stage: 'Development',
      capex_usd_m: 2270,
      post_tax_npv_usd_m: 5730,
      irr_percent: 26,
      mine_life_years: 40,
      annual_production_tonnes: 80000,
      resource_grade: 0.23,
      resource_grade_unit: '%',
      project_description: 'Large lithium project',
      data_source: 'QuoteMedia',
      extraction_confidence: 9.0,  // Constrained to fit NUMERIC(3,2)
      processing_status: 'extracted',
      payback_years: 3.5  // Add this field constrained
    },
    {
      project_name: 'Mountain Pass',
      company_name: 'MP Materials',
      country: 'USA',
      jurisdiction: 'California',
      primary_commodity: 'Rare Earths',
      stage: 'Production',
      capex_usd_m: 700,
      post_tax_npv_usd_m: 2100,
      irr_percent: 38,
      mine_life_years: 35,
      annual_production_tonnes: 42000,
      resource_grade: 8.0,
      resource_grade_unit: '%',
      project_description: 'US rare earth mine',
      data_source: 'QuoteMedia',
      extraction_confidence: 9.5,  // Constrained to fit NUMERIC(3,2)
      processing_status: 'extracted',
      payback_years: 2.8  // Add this field constrained
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
      project_description: 'High-grade copper',
      data_source: 'QuoteMedia',
      extraction_confidence: 9.2,  // Constrained to fit NUMERIC(3,2)
      processing_status: 'extracted',
      payback_years: 2.2  // Add this field constrained
    }
  ];

  for (const project of projects) {
    console.log(`Inserting: ${project.project_name}`);
    const { data, error } = await supabase
      .from('projects')
      .insert(project)
      .select();

    if (error) {
      console.error('Error:', error.message);
      console.error('Details:', error.details);
    } else {
      console.log('✅ Success');
    }
  }

  // Check count
  const { count } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true });

  console.log(`\nTotal projects: ${count}`);
}

simpleInsert();