#!/usr/bin/env npx tsx
/**
 * Search QuoteMedia specifically for NI 43-101 and S-K 1300 technical reports
 * Using the form parameter to filter for these specific document types
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
const MINING_COMPANIES = [
  'LAC', 'ALB', 'SQM', 'PLL', 'SGML',  // Lithium
  'FCX', 'SCCO', 'TECK', 'IVN', 'CS',   // Copper
  'MP', 'LYSCF', 'TMRC', 'REEMF',       // Rare Earth
  'CCJ', 'DNN', 'NXE', 'UEC', 'UUUU',   // Uranium
  'VALE', 'BHP', 'RIO',                 // Diversified
  'NEM', 'GOLD', 'AEM', 'KGC'           // Gold
];

/**
 * Search for NI 43-101 and S-K 1300 technical reports
 */
async function findTechnicalReports() {
  console.log('🚀 SEARCHING QUOTEMEDIA FOR NI 43-101 & S-K 1300 REPORTS');
  console.log('='.repeat(70));
  console.log('Using form parameter to filter for technical report types\n');

  const allReports = [];

  for (const symbol of MINING_COMPANIES) {
    console.log(`\n📊 Searching ${symbol} for technical reports...`);

    // Search for NI 43-101 (Canadian technical reports)
    // These might be in SEDAR filings or referenced in SEC filings
    const ni43101Forms = [
      'NI 43-101',
      '43-101',
      'Technical Report',
      'Mineral Resource',
      'Mineral Reserve',
      'PEA',
      'Feasibility Study'
    ];

    // Search for S-K 1300 (US SEC technical report summaries)
    // These should be in 10-K, 20-F, or 8-K filings as exhibits
    const sk1300Forms = [
      'SK-1300',
      'S-K 1300',
      'Technical Report Summary',
      'TRS'
    ];

    // Try different form filters
    for (const formFilter of [...ni43101Forms, ...sk1300Forms]) {
      const url = `${QUOTEMEDIA_BASE_URL}/getCompanyFilings.json?` +
        `webmasterId=${WMID}&` +
        `symbol=${symbol}&` +
        `form=${encodeURIComponent(formFilter)}&` +
        `limit=10`;

      console.log(`  🔍 Trying form="${formFilter}"...`);

      try {
        const response = await fetch(url);

        if (response.ok) {
          const data = await response.json();

          if (data.results?.filing && data.results.filing.length > 0) {
            console.log(`    ✅ Found ${data.results.filing.length} documents!`);

            for (const filing of data.results.filing) {
              console.log(`      📄 ${filing.formType} - ${filing.filingDate}`);
              console.log(`         ${filing.formDescription}`);
              if (filing.pdfLink) {
                console.log(`         🔗 PDF: ${filing.pdfLink}`);
                allReports.push({
                  symbol,
                  formType: filing.formType,
                  formFilter,
                  date: filing.filingDate,
                  description: filing.formDescription,
                  url: filing.pdfLink
                });
              }
            }
          }
        } else if (response.status === 403) {
          console.log(`    ❌ Access denied (403)`);
        }
      } catch (error) {
        console.log(`    ❌ Error: ${error}`);
      }

      await new Promise(resolve => setTimeout(resolve, 100)); // Rate limit
    }

    // Also try searching in regular filings for keywords
    const regularUrl = `${QUOTEMEDIA_BASE_URL}/getCompanyFilings.json?` +
      `webmasterId=${WMID}&symbol=${symbol}&limit=50`;

    try {
      const response = await fetch(regularUrl);

      if (response.ok) {
        const data = await response.json();

        if (data.results?.filing) {
          for (const filing of data.results.filing) {
            const desc = (filing.formDescription || '').toLowerCase();

            // Check if description mentions technical reports
            if (desc.includes('43-101') ||
                desc.includes('ni 43-101') ||
                desc.includes('sk-1300') ||
                desc.includes('s-k 1300') ||
                desc.includes('technical report') ||
                desc.includes('mineral resource') ||
                desc.includes('feasibility')) {

              console.log(`  ✅ Found in regular filings!`);
              console.log(`     📄 ${filing.formType} - ${filing.filingDate}`);
              console.log(`     📝 ${filing.formDescription}`);
              if (filing.pdfLink) {
                console.log(`     🔗 ${filing.pdfLink}`);
                allReports.push({
                  symbol,
                  formType: filing.formType,
                  formFilter: 'keyword match',
                  date: filing.filingDate,
                  description: filing.formDescription,
                  url: filing.pdfLink
                });
              }
            }
          }
        }
      }
    } catch (error) {
      // Skip errors
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('📋 SUMMARY OF NI 43-101 & S-K 1300 REPORTS FOUND:');
  console.log('='.repeat(70));

  if (allReports.length === 0) {
    console.log('\n❌ No NI 43-101 or S-K 1300 reports found in QuoteMedia');
    console.log('\nPossible reasons:');
    console.log('1. QuoteMedia may not index these specific form types');
    console.log('2. These reports are filed directly with SEDAR (Canada) not SEC');
    console.log('3. S-K 1300 reports are often exhibits to 10-K, not standalone');
    console.log('4. Companies may host these on their own websites');
  } else {
    console.log(`\n✅ Found ${allReports.length} potential technical reports:\n`);

    for (const report of allReports) {
      console.log(`${report.symbol} - ${report.formType} (${report.date})`);
      console.log(`  Filter: ${report.formFilter}`);
      console.log(`  Desc: ${report.description?.substring(0, 80)}`);
      console.log(`  URL: ${report.url}`);
      console.log();
    }
  }
}

findTechnicalReports().catch(console.error);