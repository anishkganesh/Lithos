import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkQuoteMediaData() {
  console.log('Checking QuoteMedia news data...\n');

  try {
    // Check if table exists and has data
    const { data, error, count } = await supabase
      .from('quotemedia_news')
      .select('*', { count: 'exact', head: false })
      .limit(5);

    if (error) {
      console.log('❌ Error accessing quotemedia_news table:', error.message);
      console.log('Table might not exist or have no data.\n');
      return false;
    }

    console.log(`✅ QuoteMedia news table exists`);
    console.log(`📊 Total records: ${count || 0}`);
    
    if (data && data.length > 0) {
      console.log('\n📰 Sample news items:');
      data.forEach((item: any, index: number) => {
        console.log(`\n${index + 1}. ${item.headline || 'No headline'}`);
        console.log(`   Company: ${item.company_name || 'Unknown'}`);
        console.log(`   Date: ${item.datetime || 'No date'}`);
        console.log(`   Source: ${item.source || 'Unknown'}`);
        console.log(`   Mining Related: ${item.is_mining_related ? '✅' : '❌'}`);
      });
      return true;
    } else {
      console.log('\n⚠️ Table exists but has no data');
      return false;
    }
  } catch (error) {
    console.error('Error checking data:', error);
    return false;
  }
}

// Run the check
checkQuoteMediaData().then(hasData => {
  console.log('\n' + '='.repeat(50));
  if (hasData) {
    console.log('✅ QuoteMedia IS pulling meaningful data');
    console.log('➡️ Recommendation: Keep QuoteMedia and supplement with Firecrawl');
  } else {
    console.log('❌ QuoteMedia is NOT pulling meaningful data');
    console.log('➡️ Recommendation: Replace with Firecrawl completely');
  }
  console.log('='.repeat(50));
  process.exit(0);
});

