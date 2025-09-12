const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testSaveProject() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  console.log('Testing project save...\n');
  
  // First, let's create a test company
  const testCompany = {
    company_name: 'Test Mining Corp ' + Date.now(),
    website: 'https://testmining.com',
    headquarters_country: 'Canada',
    stock_ticker: 'TMC',
    exchange: 'TSX'
  };
  
  console.log('1. Creating test company...');
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .insert(testCompany)
    .select()
    .single();
    
  if (companyError) {
    console.error('❌ Error creating company:', companyError);
    return;
  }
  
  console.log('✅ Company created:', company.company_id);
  
  // Now create a test project
  const testProject = {
    project_name: 'Test Gold Mine ' + Date.now(),
    company_name: testCompany.company_name,
    company_id: company.company_id,
    country: 'Canada',
    location: 'Ontario',
    stage: 'Exploration',
    primary_commodity: 'Gold',
    post_tax_npv_usd_m: 250,
    irr_percent: 25,
    capex_usd_m: 150,
    mine_life_years: 10,
    data_source: 'Test',
    source_document_url: 'https://example.com/report.pdf',
    source_document_date: new Date().toISOString().split('T')[0],
    extraction_confidence: 0.85,
    discovery_date: new Date().toISOString()
  };
  
  console.log('\n2. Creating test project...');
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert(testProject)
    .select()
    .single();
    
  if (projectError) {
    console.error('❌ Error creating project:', projectError);
    console.error('Details:', JSON.stringify(projectError, null, 2));
    return;
  }
  
  console.log('✅ Project created:', project.id);
  
  // Check if it was saved
  console.log('\n3. Verifying project was saved...');
  const { data: checkProject, error: checkError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', project.id)
    .single();
    
  if (checkError) {
    console.error('❌ Error checking project:', checkError);
    return;
  }
  
  console.log('✅ Project verified in database!');
  console.log('   Name:', checkProject.project_name);
  console.log('   Company:', checkProject.company_name);
  console.log('   Stage:', checkProject.stage);
  
  // Count total projects
  const { count } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true });
    
  console.log('\n📊 Total projects in database:', count);
}

testSaveProject();

