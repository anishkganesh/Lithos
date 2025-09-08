const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testInsert() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  // Create a minimal project with only required fields
  const minimalProject = {
    project_name: 'Simple Test Mine ' + Date.now(),
    company_name: 'Test Company',
    country: 'Canada',
    stage: 'Exploration',
    primary_commodity: 'Gold'
  };
  
  console.log('Inserting minimal project:', minimalProject);
  
  const { data, error } = await supabase
    .from('projects')
    .insert(minimalProject)
    .select();
    
  if (error) {
    console.error('Error:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
  } else {
    console.log('Success! Created project:', data);
  }
  
  // Count projects
  const { count } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true });
    
  console.log('Total projects:', count);
}

testInsert();
