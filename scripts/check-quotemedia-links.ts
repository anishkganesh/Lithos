#!/usr/bin/env npx tsx
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkQuoteMediaLinks() {
  console.log('📊 Checking quotemedia_links table...\n');

  // Get total count
  const { count: totalCount } = await supabase
    .from('quotemedia_links')
    .select('*', { count: 'exact', head: true });

  console.log(`Total documents: ${totalCount}`);

  // Get top quality documents
  const { data: topDocs } = await supabase
    .from('quotemedia_links')
    .select('*')
    .order('document_quality_score', { ascending: false })
    .limit(10);

  if (topDocs && topDocs.length > 0) {
    console.log('\n📈 Top 10 Quality Documents:');
    console.log('='.repeat(60));

    for (const doc of topDocs) {
      console.log(`\n${doc.symbol} - ${doc.company_name}`);
      console.log(`  📄 ${doc.form_type}: ${doc.form_description || 'N/A'}`);
      console.log(`  📅 Filed: ${doc.filing_date}`);
      console.log(`  📊 Quality Score: ${doc.document_quality_score}/10`);
      console.log(`  💰 Metrics: ${doc.financial_metrics_count}`);
      console.log(`  ✅ Has: CAPEX=${doc.has_capex}, NPV=${doc.has_npv}, IRR=${doc.has_irr}`);
      console.log(`  🔗 ${doc.pdf_link?.substring(0, 80)}...`);
    }
  }

  // Get commodity breakdown
  const { data: commodities } = await supabase
    .from('quotemedia_links')
    .select('symbol');

  if (commodities) {
    const commodityMap: Record<string, number> = {};

    for (const doc of commodities) {
      const symbol = doc.symbol;
      // Map symbols to commodities (simplified)
      let commodity = 'other';
      if (['LAC', 'ALB', 'SQM', 'PLL', 'SGML', 'LTHM'].includes(symbol)) commodity = 'lithium';
      else if (['FCX', 'SCCO', 'TECK', 'ERO', 'CS', 'HBM'].includes(symbol)) commodity = 'copper';
      else if (['MP'].includes(symbol)) commodity = 'rare_earth';
      else if (['CCJ', 'DNN', 'NXE', 'UEC', 'UUUU'].includes(symbol)) commodity = 'uranium';
      else if (['NEM', 'GOLD', 'AEM', 'KGC', 'AGI', 'IAG', 'NGD', 'EGO', 'BTG', 'OR'].includes(symbol)) commodity = 'gold';

      commodityMap[commodity] = (commodityMap[commodity] || 0) + 1;
    }

    console.log('\n📦 Documents by Commodity:');
    for (const [commodity, count] of Object.entries(commodityMap)) {
      console.log(`  ${commodity}: ${count} documents`);
    }
  }
}

checkQuoteMediaLinks().catch(console.error);