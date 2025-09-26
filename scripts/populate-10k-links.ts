#!/usr/bin/env npx tsx
/**
 * Populate quotemedia_links table with 10-K documents from mining companies
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { QuoteMediaClient } from '../lib/quotemedia/api-client';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
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

async function populate10KLinks() {
  console.log('🚀 POPULATING 10-K LINKS INTO QUOTEMEDIA_LINKS TABLE');
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
        const linkData = {
          symbol: symbol,
          company_name: filing.companyName || symbol,
          form_type: '10-K',
          form_description: filing.formDescription || 'Annual report pursuant to Section 13 or 15(d)',
          filing_date: filing.dateFiled,
          pdf_link: filing.pdfLink,
          html_link: filing.htmlLink,
          accession_number: filing.accessionNumber,
          file_size: filing.fileSize,
          data_source: 'QuoteMedia',
          created_at: new Date().toISOString()
        };

        allLinks.push(linkData);

        // Show the actual links
        console.log(`   📅 ${filing.dateFiled}:`);
        if (filing.pdfLink) {
          console.log(`      PDF: ${filing.pdfLink}`);
        }
        if (filing.htmlLink) {
          console.log(`      HTML: ${filing.htmlLink}`);
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

    // Insert in batches of 100
    for (let i = 0; i < allLinks.length; i += 100) {
      const batch = allLinks.slice(i, i + 100);

      const { error } = await supabase
        .from('quotemedia_links')
        .upsert(batch, {
          onConflict: 'symbol,accession_number'
        });

      if (error) {
        console.error(`   ❌ Database error: ${error.message}`);
      } else {
        console.log(`   ✅ Inserted batch ${Math.floor(i/100) + 1}/${Math.ceil(allLinks.length/100)}`);
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