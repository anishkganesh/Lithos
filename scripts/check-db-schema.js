const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkSchema() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  console.log('Checking database schema...\n');
  
  // Check if companies table exists
  const { data: companiesCols, error: companiesError } = await supabase
    .from('companies')
    .select('*')
    .limit(0);
    
  if (companiesError) {
    console.log('❌ Companies table: NOT FOUND');
    console.log('   Error:', companiesError.message);
  } else {
    console.log('✅ Companies table: EXISTS');
  }
  
  // Check projects table columns
  const { data: projectData, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .limit(1);
    
  if (projectError) {
    console.log('❌ Projects table: ERROR');
    console.log('   Error:', projectError.message);
  } else {
    console.log('✅ Projects table: EXISTS');
    if (projectData && projectData[0]) {
      const columns = Object.keys(projectData[0]);
      console.log('   Columns:', columns.join(', '));
      
      // Check for new columns
      const newColumns = ['company_id', 'data_source', 'source_document_url', 'source_document_date', 'extraction_confidence'];
      console.log('\n   Checking for new columns:');
      newColumns.forEach(col => {
        if (columns.includes(col)) {
          console.log(`   ✅ ${col}: EXISTS`);
        } else {
          console.log(`   ❌ ${col}: MISSING`);
        }
      });
    }
  }
  
  console.log('\n📝 To apply migrations, run the SQL in supabase/migrations/004_create_companies_table.sql');
}

checkSchema();
