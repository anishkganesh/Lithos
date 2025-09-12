const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkBrandsTable() {
  try {
    // Try to query the brands table
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error querying brands table:', error);
      console.log('Error code:', error.code);
      console.log('Error message:', error.message);
      
      if (error.code === '42P01') {
        console.log('❌ The brands table does not exist!');
        console.log('You need to create it with the migration script.');
      }
    } else {
      console.log('✅ Brands table exists');
      console.log('Sample data:', data);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

checkBrandsTable();
