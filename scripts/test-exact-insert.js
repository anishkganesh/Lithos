const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testExactInsert() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  // This mimics what the mining agent is trying to insert
  const projectData = {
    project_name: 'Mining Agent Test ' + Date.now(),
    company_name: 'Test Mining Corp',
    company_id: null,
    country: 'Canada',
    jurisdiction: 'Ontario',
    stage: 'Exploration',
    primary_commodity: 'Gold',
    post_tax_npv_usd_m: 250.5,
    irr_percent: 22.3,
    capex_usd_m: 150,
    mine_life_years: 10,
    annual_production_tonnes: 50000,
    project_description: 'A test gold mining project',
    data_source: 'Web',
    source_document_url: 'https://example.com/report.pdf',
    source_document_date: '2025-01-08',
    extraction_confidence: 0.85,
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    discovery_date: new Date().toISOString(),
    shown_count: 0,
    location: null
  };
  
  console.log('Attempting to insert:', JSON.stringify(projectData, null, 2));
  
  const { data, error } = await supabase
    .from('projects')
    .insert(projectData)
    .select();
    
  if (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Error code:', error.code);
    console.error('Error details:', error.details);
    console.error('Error hint:', error.hint);
  } else {
    console.log('\n✅ Success! Created project:', data[0].id);
    console.log('Project name:', data[0].project_name);
  }
  
  // Count projects
  const { count } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true });
    
  console.log('\nTotal projects in database:', count);
}

testExactInsert();

