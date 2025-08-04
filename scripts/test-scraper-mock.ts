import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

// Import after env vars are loaded
import { getSupabaseAdmin } from '../lib/supabase/client'

async function testScraperWithMockData() {
  console.log('🚀 Testing Scraper with Mock Data...\n')
  
  const supabaseAdmin = getSupabaseAdmin()
  
  // Mock project data
  const mockProject = {
    project_name: 'Thacker Pass Lithium Project',
    company_name: 'Lithium Americas Corp',
    project_description: 'Large-scale lithium clay deposit in Nevada, USA',
    jurisdiction: 'Nevada',
    country: 'USA',
    stage: 'Construction',
    mine_life_years: 40,
    post_tax_npv_usd_m: 5730,
    pre_tax_npv_usd_m: 8000,
    irr_percent: 27.1,
    payback_years: 3.8,
    capex_usd_m: 2266,
    opex_usd_per_tonne: 5.74,
    aisc_usd_per_tonne: 7.34,
    primary_commodity: 'Lithium',
    annual_production_tonnes: 80000,
    total_resource_tonnes: 13700000,
    resource_grade: 2.231,
    resource_grade_unit: 'mg/L Li',
    investors_ownership: ['General Motors', 'Lithium Americas Corp'],
    permit_status: 'Federal Record of Decision Received',
    technical_report_url: 'https://www.lithiumamericas.com/thacker-pass',
    report_type: 'Feasibility Study',
    data_source: 'TEST',
    source_url: 'https://www.lithiumamericas.com/thacker-pass',
    last_scraped_at: new Date().toISOString(),
    processing_status: 'completed',
    jurisdiction_risk: 'Low',
    esg_score: 'B'
  }

  try {
    console.log('📝 Creating project in Supabase...')
    
    // Check if project exists
    const { data: existing } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('project_name', mockProject.project_name)
      .eq('company_name', mockProject.company_name)
      .single()
    
    if (existing) {
      console.log('✅ Project already exists, updating...')
      
      const { error } = await supabaseAdmin
        .from('projects')
        .update(mockProject)
        .eq('id', existing.id)
      
      if (error) {
        console.error('❌ Update error:', error)
      } else {
        console.log('✅ Project updated successfully!')
        console.log(`   ID: ${existing.id}`)
      }
    } else {
      console.log('✅ Creating new project...')
      
      const { data, error } = await supabaseAdmin
        .from('projects')
        .insert(mockProject)
        .select('id')
        .single()
      
      if (error) {
        console.error('❌ Insert error:', error)
      } else {
        console.log('✅ Project created successfully!')
        console.log(`   ID: ${data.id}`)
      }
    }
    
    // Fetch all projects to show current state
    console.log('\n📊 Current projects in database:')
    const { data: projects, error: fetchError } = await supabaseAdmin
      .from('projects')
      .select('id, project_name, company_name, stage, primary_commodity')
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (fetchError) {
      console.error('❌ Fetch error:', fetchError)
    } else {
      console.table(projects)
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error)
  }
}

// Run the test
testScraperWithMockData().then(() => {
  console.log('\n✨ Test complete!')
  process.exit(0)
}).catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
}) 