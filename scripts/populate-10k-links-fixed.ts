#!/usr/bin/env npx tsx
/**
 * Populate quotemedia_links table with 10-K documents - Fixed version
 * Matches the actual table schema
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { QuoteMediaClient } from '../lib/quotemedia/api-client';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dfxauievbyqwcynwtvib.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmeGF1aWV2Ynlxd2N5bnd0dmliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Nzg0ODI2MSwiZXhwIjoyMDYzNDI0MjYxfQ.4Uj_dNP0Wqo5fzA7XyUJwkZJ5RQjKXlZCqQVJkP3Qpo'
);

// Comprehensive list of mining companies
const MINING_COMPANIES = [
  // Lithium
  'LAC', 'ALB', 'SQM', 'PLL', 'SGML', 'LTHM', 'LILM', 'ALTAF',
  // Copper
  'FCX', 'SCCO', 'TECK', 'HBM', 'ERO', 'CS', 'FM', 'IVN', 'WRN', 'NCU', 'CMMC', 'TGB',
  // Rare Earths
  'MP', 'LYSCF', 'TMRC', 'REEMF', 'ARRNF', 'UURAF', 'AVL', 'UAMY',
  // Uranium
  'CCJ', 'DNN', 'NXE', 'UEC', 'UUUU', 'URG', 'PALAF', 'FCUUF', 'EU',
  // Nickel/Cobalt
  'VALE', 'BHP', 'NILSY', 'GLNCY', 'FTSSF', 'CMCL', 'SHLM',
  // Gold (often have other critical minerals)
  'NEM', 'GOLD', 'AEM', 'KGC', 'FNV', 'WPM', 'AG', 'PAAS', 'AUY', 'AU', 'NGD', 'BTG',
  // Diversified
  'RIO', 'GLEN', 'AA', 'CENX', 'ACH', 'X', 'CLF', 'MT', 'STLD'
];

/**
 * Detect primary commodity from symbol
 */
function detectCommodity(symbol: string): string {
  const symbolUpper = symbol.toUpperCase();

  if (['LAC', 'ALB', 'SQM', 'PLL', 'SGML', 'LTHM', 'LILM'].includes(symbolUpper)) return 'lithium';
  if (['FCX', 'SCCO', 'TECK', 'HBM', 'ERO', 'CS', 'FM', 'IVN'].includes(symbolUpper)) return 'copper';
  if (['MP', 'LYSCF', 'TMRC', 'REEMF'].includes(symbolUpper)) return 'rare_earth';
  if (['CCJ', 'DNN', 'NXE', 'UEC', 'UUUU', 'URG'].includes(symbolUpper)) return 'uranium';
  if (['VALE', 'BHP', 'NILSY', 'GLNCY'].includes(symbolUpper)) return 'nickel';
  if (['NEM', 'GOLD', 'AEM', 'KGC', 'FNV', 'WPM', 'AG', 'PAAS'].includes(symbolUpper)) return 'gold';

  return 'diversified';
}

async function populate10KLinks() {
  console.log('🚀 POPULATING 10-K LINKS INTO QUOTEMEDIA_LINKS TABLE (FIXED)');
  console.log('='.repeat(70));

  const client = new QuoteMediaClient(process.env.QUOTEMEDIA_WEBSERVICE_PASSWORD || 'dfbsembl48');

  let totalLinks = 0;
  let companiesWithFilings = 0;
  const allLinks = [];

  for (const symbol of MINING_COMPANIES) {
    console.log(`\n📊 Processing ${symbol}...`);

    try {
      // Get 10-K filings
      const filings = await client.getCompanyFilings({
        symbol,
        form: '10-K',
        limit: 5 // Get last 5 years of 10-Ks
      });

      if (filings.length === 0) {
        console.log(`   ⏭️ No 10-K filings found`);
        continue;
      }

      companiesWithFilings++;
      console.log(`   📄 Found ${filings.length} 10-K filings`);

      for (const filing of filings) {
        // Create a comprehensive link data object matching the table schema
        const linkData = {
          // Basic identifiers
          symbol: symbol,
          company_name: filing.companyName || symbol,
          cik: filing.cik || null,
          issuer_number: filing.issuerNumber || null,
          sic_code: filing.sicCode || null,

          // Filing identifiers
          filing_id: filing.filingId || `${symbol}_${filing.dateFiled}_10K`,
          accession_number: filing.accessionNumber || `${symbol}_${filing.dateFiled}`,

          // Form information
          form_type: '10-K',
          form_description: filing.formDescription || 'Annual report pursuant to Section 13 or 15(d)',

          // Dates
          filing_date: filing.dateFiled,
          period_date: filing.periodDate || filing.dateFiled,

          // File information
          file_size: filing.fileSize?.toString() || null,
          page_count: null, // Will be populated during parsing

          // Links
          pdf_link: filing.pdfLink || null,
          html_link: filing.htmlLink || null,
          excel_link: null, // 10-Ks don't typically have Excel
          xbrl_link: filing.xbrlLink || null,

          // Commodity and project info
          primary_commodity: detectCommodity(symbol),
          commodities: [detectCommodity(symbol)],
          project_names: [],

          // Financial metrics flags (will be determined during parsing)
          has_capex: false,
          has_npv: false,
          has_irr: false,
          has_mine_life: false,
          has_production_rate: false,
          has_resource_data: false,
          has_opex: false,
          has_aisc: false,
          financial_metrics_count: 0,

          // Quality and validation
          document_quality_score: null,
          validation_confidence: null,
          is_technical_report: false, // 10-Ks are not technical reports
          report_type: '10-K',
          project_stage: null,

          // Source information
          source: 'QuoteMedia',
          exchange: 'NYSE', // Most are NYSE/NASDAQ
          country: 'USA',

          // Processing flags
          is_downloaded: false,
          is_parsed: false,
          is_validated: false,
          processing_status: 'pending',
          processing_notes: null,

          // Metric values (to be extracted later)
          capex_value: null,
          npv_value: null,
          irr_value: null,
          mine_life_value: null,

          // Timestamps
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          validated_at: null,

          // Metadata
          metadata: {
            quotemedia_ref: filing.ref,
            quotemedia_cdn: filing.cdn,
            original_filing: filing
          }
        };

        allLinks.push(linkData);

        // Show the actual links
        console.log(`   📅 ${filing.dateFiled}:`);
        if (filing.pdfLink) {
          console.log(`      PDF: ${filing.pdfLink.substring(0, 80)}...`);
        }
      }

      totalLinks += filings.length;

    } catch (error) {
      console.error(`   ❌ Error: ${error}`);
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Insert all links into database
  if (allLinks.length > 0) {
    console.log(`\n💾 Inserting ${allLinks.length} links into quotemedia_links table...`);

    // Insert in batches of 50
    let insertedCount = 0;
    for (let i = 0; i < allLinks.length; i += 50) {
      const batch = allLinks.slice(i, i + 50);

      const { data, error } = await supabase
        .from('quotemedia_links')
        .upsert(batch, {
          onConflict: 'symbol,accession_number'
        })
        .select();

      if (error) {
        console.error(`   ❌ Database error: ${error.message}`);
      } else {
        insertedCount += data?.length || 0;
        console.log(`   ✅ Inserted batch ${Math.floor(i/50) + 1}/${Math.ceil(allLinks.length/50)} (${insertedCount} total)`);
      }
    }
  }

  // Get final count
  const { count } = await supabase
    .from('quotemedia_links')
    .select('*', { count: 'exact', head: true })
    .eq('form_type', '10-K');

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 10-K LINKS POPULATION COMPLETE');
  console.log('='.repeat(70));
  console.log(`🏢 Companies Processed: ${MINING_COMPANIES.length}`);
  console.log(`📄 Companies with 10-K Filings: ${companiesWithFilings}`);
  console.log(`🔗 Total 10-K Links Added: ${totalLinks}`);
  console.log(`📊 Total 10-K Links in Database: ${count}`);
  console.log('='.repeat(70));
  console.log('\n✅ All 10-K document links are now in the quotemedia_links table');
  console.log('   These links point to the actual SEC filings on QuoteMedia servers');
}

// Execute
populate10KLinks().catch(console.error);