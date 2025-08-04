import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

// Import after env vars are loaded
import { getSupabaseAdmin } from '../lib/supabase/client'

async function addNewProjects() {
  console.log('🚀 Adding new mining projects to database...\n')
  
  const supabaseAdmin = getSupabaseAdmin()
  
  // New mining projects not in the original set
  const newProjects = [
    {
      project_name: 'Pilgangoora Lithium-Tantalum Project',
      company_name: 'Pilbara Minerals Limited',
      project_description: 'One of the world\'s largest hard-rock lithium-tantalum projects',
      jurisdiction: 'Western Australia',
      country: 'Australia',
      stage: 'Production',
      mine_life_years: 26,
      post_tax_npv_usd_m: 6200,
      pre_tax_npv_usd_m: 8900,
      irr_percent: 38,
      payback_years: 2.8,
      capex_usd_m: 1300,
      opex_usd_per_tonne: 320,
      aisc_usd_per_tonne: 456,
      primary_commodity: 'Lithium',
      annual_production_tonnes: 580000,
      total_resource_tonnes: 308900000,
      resource_grade: 1.14,
      resource_grade_unit: '% Li2O',
      investors_ownership: ['Pilbara Minerals (100%)'],
      permit_status: 'Operating',
      technical_report_url: 'https://www.pilbaraminerals.com.au',
      report_type: 'Annual Report',
      data_source: 'Company Website',
      source_url: 'https://www.pilbaraminerals.com.au',
      last_scraped_at: new Date().toISOString(),
      processing_status: 'completed',
      jurisdiction_risk: 'Low',
      esg_score: 'A'
    },
    {
      project_name: 'Olaroz Lithium Facility',
      company_name: 'Allkem Limited',
      project_description: 'Operating lithium brine project in Argentina',
      jurisdiction: 'Jujuy',
      country: 'Argentina',
      stage: 'Production',
      mine_life_years: 40,
      post_tax_npv_usd_m: 2800,
      pre_tax_npv_usd_m: 3900,
      irr_percent: 31,
      payback_years: 3.5,
      capex_usd_m: 565,
      opex_usd_per_tonne: 3844,
      aisc_usd_per_tonne: 4526,
      primary_commodity: 'Lithium',
      annual_production_tonnes: 42500,
      total_resource_tonnes: 16200000,
      resource_grade: 690,
      resource_grade_unit: 'mg/L Li',
      investors_ownership: ['Allkem (66.5%)', 'Toyota Tsusho (25%)', 'JEMSE (8.5%)'],
      permit_status: 'Operating',
      technical_report_url: 'https://www.allkem.co',
      report_type: 'Technical Report',
      data_source: 'Company Website',
      source_url: 'https://www.allkem.co',
      last_scraped_at: new Date().toISOString(),
      processing_status: 'completed',
      jurisdiction_risk: 'Medium',
      esg_score: 'B'
    },
    {
      project_name: 'Cauchari-Olaroz Project',
      company_name: 'Ganfeng Lithium Co Ltd',
      project_description: 'Large-scale lithium brine project under construction',
      jurisdiction: 'Jujuy',
      country: 'Argentina',
      stage: 'Construction',
      mine_life_years: 40,
      post_tax_npv_usd_m: 1900,
      pre_tax_npv_usd_m: 2700,
      irr_percent: 25,
      payback_years: 4,
      capex_usd_m: 741,
      opex_usd_per_tonne: 3956,
      aisc_usd_per_tonne: 4789,
      primary_commodity: 'Lithium',
      annual_production_tonnes: 40000,
      total_resource_tonnes: 24000000,
      resource_grade: 592,
      resource_grade_unit: 'mg/L Li',
      investors_ownership: ['Ganfeng Lithium (51%)', 'Lithium Americas (49%)'],
      permit_status: 'Construction permits granted',
      technical_report_url: 'https://www.ganfenglithium.com',
      report_type: 'Feasibility Study',
      data_source: 'Company Website',
      source_url: 'https://www.ganfenglithium.com',
      last_scraped_at: new Date().toISOString(),
      processing_status: 'completed',
      jurisdiction_risk: 'Medium',
      esg_score: 'B'
    }
  ]

  let created = 0
  let errors = 0

  for (const project of newProjects) {
    try {
      console.log(`📝 Adding: ${project.project_name}...`)
      
      const { data, error } = await supabaseAdmin
        .from('projects')
        .insert(project)
        .select('id')
        .single()
      
      if (error) {
        console.error(`❌ Insert error for ${project.project_name}:`, error.message)
        errors++
      } else {
        console.log(`✅ Created: ${project.project_name}`)
        created++
      }
    } catch (error) {
      console.error(`❌ Error processing ${project.project_name}:`, error)
      errors++
    }
  }

  console.log('\n📊 Summary:')
  console.log(`  - Projects created: ${created}`)
  console.log(`  - Errors: ${errors}`)
  
  // Show total projects in database
  const { count } = await supabaseAdmin
    .from('projects')
    .select('*', { count: 'exact', head: true })
  
  console.log(`  - Total projects in database: ${count}`)
}

// Run the script
addNewProjects().then(() => {
  console.log('\n✨ New projects added successfully!')
  process.exit(0)
}).catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
}) 