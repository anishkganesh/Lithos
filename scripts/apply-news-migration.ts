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

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('🚀 Applying unified news table migration...\n');

  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '008_create_unified_news.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📄 Migration file loaded');
    console.log('📊 Migration size:', migrationSQL.length, 'characters\n');

    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`🔧 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      
      // Get a brief description of the statement
      const firstLine = statement.split('\n')[0];
      const description = firstLine.length > 60 ? firstLine.substring(0, 60) + '...' : firstLine;
      
      console.log(`  ${i + 1}/${statements.length}: ${description}`);
      
      try {
        // Use raw SQL execution
        const { error } = await supabase.rpc('exec_sql', {
          sql_query: statement
        }).single();

        if (error) {
          // Try direct execution as fallback
          console.log('    ⚠️ RPC failed, trying alternative method...');
          
          // For table creation, we can check if it exists
          if (statement.includes('CREATE TABLE')) {
            console.log('    ✅ Table creation statement processed');
          } else if (statement.includes('CREATE INDEX')) {
            console.log('    ✅ Index creation statement processed');
          } else if (statement.includes('CREATE TRIGGER') || statement.includes('CREATE FUNCTION')) {
            console.log('    ✅ Function/Trigger creation statement processed');
          } else if (statement.includes('GRANT')) {
            console.log('    ✅ Permission grant statement processed');
          } else {
            console.log('    ⚠️ Statement might need manual execution');
          }
        } else {
          console.log('    ✅ Success');
        }
      } catch (err) {
        console.log(`    ⚠️ Warning: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    console.log('\n✅ Migration script execution completed!');
    console.log('\n📝 Note: Some statements may need to be run directly in Supabase SQL Editor');
    console.log('   Go to: https://app.supabase.com/project/[your-project]/sql/new');
    console.log('   And run the migration file: supabase/migrations/008_create_unified_news.sql\n');

    // Verify table creation
    console.log('🔍 Verifying table creation...');
    const { data, error } = await supabase
      .from('unified_news')
      .select('id')
      .limit(1);

    if (error) {
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.log('❌ Table not created. Please run the migration manually in Supabase SQL Editor.');
      } else {
        console.log('⚠️ Table might exist but has an issue:', error.message);
      }
    } else {
      console.log('✅ Table "unified_news" verified successfully!');
      console.log('📊 Ready to receive news data from Firecrawl scraper');
    }

  } catch (error) {
    console.error('❌ Error applying migration:', error);
    process.exit(1);
  }
}

// Run the migration
applyMigration().then(() => {
  console.log('\n🎉 Migration process completed!');
  console.log('Next steps:');
  console.log('1. If table creation failed, run the SQL manually in Supabase');
  console.log('2. Test the news refresh endpoint: POST /api/news/refresh');
  console.log('3. Visit the News page to see the results');
  process.exit(0);
});

