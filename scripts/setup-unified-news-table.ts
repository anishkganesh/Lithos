import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false
  }
});

async function setupUnifiedNewsTable() {
  console.log('🚀 Setting up unified_news table...\n');

  try {
    // First, check if table already exists
    const { data: existingTable, error: checkError } = await supabase
      .from('unified_news')
      .select('id')
      .limit(1);

    if (!checkError) {
      console.log('✅ Table unified_news already exists!');
      const { count } = await supabase
        .from('unified_news')
        .select('*', { count: 'exact', head: true });
      console.log(`📊 Current record count: ${count || 0}`);
      return true;
    }

    console.log('📝 Table does not exist, creating it now...\n');

    // Read the SQL file
    const sqlPath = path.join(__dirname, 'create-unified-news-table.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

    console.log('Instructions for manual setup:');
    console.log('=' .repeat(50));
    console.log('\n1. Go to your Supabase dashboard:');
    console.log(`   ${supabaseUrl.replace('/rest/v1', '')}/sql/new`);
    console.log('\n2. Copy and paste the SQL from:');
    console.log(`   scripts/create-unified-news-table.sql`);
    console.log('\n3. Click "Run" to execute the SQL');
    console.log('\n4. You should see "Table unified_news created successfully!"');
    console.log('\n' + '=' .repeat(50));

    // Try to create a simple test record to verify if table was created
    console.log('\n🧪 Testing if table can be created programmatically...');
    
    // Attempt to insert a test record (will fail if table doesn't exist)
    const testRecord = {
      headline: 'Test News Article',
      summary: 'This is a test article',
      url: `https://example.com/test-${Date.now()}`,
      published_date: new Date().toISOString(),
      source_name: 'Test Source',
      source_type: 'news',
      scraper_source: 'firecrawl'
    };

    const { data: insertData, error: insertError } = await supabase
      .from('unified_news')
      .insert([testRecord])
      .select();

    if (insertError) {
      console.log('\n❌ Cannot create table programmatically.');
      console.log('📋 Please follow the manual instructions above.\n');
      
      // Save SQL to clipboard instruction
      console.log('💡 TIP: The SQL has been saved to:');
      console.log('   scripts/create-unified-news-table.sql');
      console.log('   Copy its contents and run in Supabase SQL Editor');
      
      return false;
    } else {
      console.log('✅ Table created and test record inserted successfully!');
      
      // Clean up test record
      if (insertData && insertData[0]) {
        await supabase
          .from('unified_news')
          .delete()
          .eq('id', insertData[0].id);
        console.log('🧹 Test record cleaned up');
      }
      
      return true;
    }

  } catch (error) {
    console.error('❌ Error setting up table:', error);
    return false;
  }
}

// Run the setup
setupUnifiedNewsTable().then(success => {
  if (success) {
    console.log('\n🎉 Setup completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Run: npx tsx scripts/test-news-system.ts');
    console.log('2. Start dev server: npm run dev');
    console.log('3. Visit: http://localhost:3000/news');
    console.log('4. Click "Refresh" to fetch news from all sources');
  } else {
    console.log('\n⚠️ Manual setup required');
    console.log('After running the SQL manually, test with:');
    console.log('  npx tsx scripts/test-news-system.ts');
  }
  process.exit(success ? 0 : 1);
});
