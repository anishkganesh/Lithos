const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testDirectInsert() {
  const project = {
    project_name: 'Direct Test ' + Date.now(),
    company_name: 'Test Company',
    country: 'Canada',
    stage: 'Exploration',
    primary_commodity: 'Gold'
  };
  
  console.log('Inserting:', project);
  
  const { data, error } = await supabase
    .from('projects')
    .insert(project)
    .select('stage');
    
  if (error) {
    console.error('Error:', error.message);
    console.error('Full error:', error);
  } else {
    console.log('Success! Inserted stage:', data[0].stage);
  }
}

testDirectInsert();

