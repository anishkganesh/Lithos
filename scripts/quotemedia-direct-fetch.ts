#!/usr/bin/env npx tsx
/**
 * Direct QuoteMedia fetcher - no authentication needed
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const QUOTEMEDIA_BASE_URL = 'https://app.quotemedia.com/data';
const WMID = '131706';

// Critical minerals companies
const CRITICAL_MINERALS_COMPANIES = [
  'LAC', 'ALB', 'SQM', 'PLL', 'SGML', 'LTHM',
  'VALE', 'BHP', 'NILSY', 'GLNCY', 'FTSSF',
  'FCX', 'SCCO', 'TECK', 'HBM', 'ERO', 'IVN',
  'MP', 'LYSCF', 'TMRC', 'REEMF', 'ARRNF',
  'CCJ', 'DNN', 'NXE', 'UEC', 'UUUU', 'URG',
  'NEM', 'GOLD', 'AEM', 'KGC', 'FNV', 'WPM'
];

/**
 * Fetch company filings directly without authentication
 */
async function fetchFilings(symbol: string): Promise<any[]> {
  // Try direct URL without token
  const url = `${QUOTEMEDIA_BASE_URL}/getCompanyFilings.json?` +
    `webmasterId=${WMID}&symbol=${symbol}&limit=10`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.log(`  ❌ Failed to fetch ${symbol}: ${response.status}`);
      return [];
    }

    const data = await response.json();

    if (!data.results?.filing) {
      console.log(`  ⚠️ No filings found for ${symbol}`);
      return [];
    }

    // Filter for technical reports
    return data.results.filing.filter((doc: any) => {
      const type = doc.formType?.toLowerCase() || '';
      const desc = doc.formDescription?.toLowerCase() || '';

      return (
        type.includes('10-k') ||
        type.includes('40-f') ||
        type.includes('20-f') ||
        type.includes('8-k') ||
        desc.includes('technical') ||
        desc.includes('43-101') ||
        desc.includes('mineral') ||
        desc.includes('feasibility')
      );
    });
  } catch (error) {
    console.log(`  ❌ Error fetching ${symbol}:`, error);
    return [];
  }
}

async function populateLinks() {
  console.log('🚀 QUOTEMEDIA DIRECT FETCH');
  console.log('='.repeat(60));
  console.log('Fetching documents directly from QuoteMedia\n');

  let totalDocs = 0;
  let insertedDocs = 0;

  for (const symbol of CRITICAL_MINERALS_COMPANIES) {
    console.log(`📊 Processing ${symbol}...`);

    const filings = await fetchFilings(symbol);

    if (filings.length === 0) {
      continue;
    }

    console.log(`  ✅ Found ${filings.length} documents`);

    for (const doc of filings.slice(0, 3)) {
      totalDocs++;

      const linkData = {
        symbol: symbol,
        company_name: doc.companyName || symbol,
        filing_id: `${symbol}_${doc.filingDate}_${doc.formType}_${Math.random()}`,
        filing_date: doc.filingDate,
        form_type: doc.formType,
        form_description: doc.formDescription?.substring(0, 500),
        pdf_link: doc.pdfLink || doc.htmlLink,
        html_link: doc.htmlLink,
        file_size: parseInt(doc.fileSize || '0'),
        has_capex: false,
        has_npv: false,
        has_irr: false,
        has_mine_life: false,
        has_production: false,
        financial_metrics_count: 0,
        document_quality_score: 5.0,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('quotemedia_links')
        .upsert(linkData, {
          onConflict: 'filing_id'
        });

      if (error) {
        console.error(`  ❌ Insert error: ${error.message}`);
      } else {
        insertedDocs++;
        console.log(`  📄 Added: ${doc.formType} - ${doc.filingDate}`);
      }

      if (insertedDocs >= 80) {
        console.log('\n🎯 Reached target!');
        break;
      }
    }

    if (insertedDocs >= 80) break;

    // Rate limit
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  const { count } = await supabase
    .from('quotemedia_links')
    .select('*', { count: 'exact', head: true });

  console.log('\n' + '='.repeat(60));
  console.log('🏁 COMPLETE!');
  console.log(`📄 Documents Processed: ${totalDocs}`);
  console.log(`✅ Documents Inserted: ${insertedDocs}`);
  console.log(`📊 Total in Database: ${count}`);
}

populateLinks().catch(console.error);