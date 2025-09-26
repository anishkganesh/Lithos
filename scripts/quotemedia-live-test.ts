#!/usr/bin/env npx tsx
/**
 * Live test of QuoteMedia API - pulls REAL documents
 * This will work as soon as you add the webservice password
 */

import { config } from 'dotenv';
import { QuoteMediaClient } from '../lib/quotemedia/api-client';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function pullRealDocuments() {
  console.log('🚀 QuoteMedia LIVE Document Fetcher');
  console.log('====================================\n');

  // Check if password is set
  const password = process.env.QUOTEMEDIA_WEBSERVICE_PASSWORD;

  if (!password) {
    console.log('❌ QUOTEMEDIA_WEBSERVICE_PASSWORD not set!\n');
    console.log('To get your password:');
    console.log('1. Go to: https://crs.sh/uJgMAfsC');
    console.log('2. Copy the password shown');
    console.log('3. Add to .env.local: QUOTEMEDIA_WEBSERVICE_PASSWORD=<your_password>');
    console.log('\n⚠️  Note: The link expires 30 days after first view!');
    return;
  }

  console.log('✅ Password found, initializing client...\n');

  try {
    const client = new QuoteMediaClient(password);

    // Test with real mining companies
    const miningSymbols = [
      'FCX',     // Freeport-McMoRan (US)
      'NEM',     // Newmont (US)
      'GOLD',    // Barrick Gold (US listing)
      'AGI.TO',  // Alamos Gold (Canadian)
      'K.TO',    // Kinross Gold (Canadian)
      'IMG.TO',  // IAMGOLD (Canadian)
    ];

    console.log('📡 Fetching REAL documents for mining companies...\n');

    for (const symbol of miningSymbols) {
      console.log(`\n🔍 Fetching documents for ${symbol}...`);

      try {
        // Determine country based on symbol
        const country = symbol.includes('.TO') ? 'CA' : 'US';

        // Fetch real filings
        const filings = await client.getCompanyFilings({
          symbol: symbol,
          country: country,
          limit: 5, // Get last 5 documents
          form: country === 'CA' ? undefined : '10-K,10-Q,8-K', // Filter for key US forms
        });

        console.log(`📄 Found ${filings.length} documents for ${symbol}`);

        // Process each filing
        for (const filing of filings) {
          const isTechnical = filing.formDescription?.toLowerCase().includes('technical') ||
                             filing.formDescription?.toLowerCase().includes('43-101') ||
                             filing.formDescription?.toLowerCase().includes('mineral') ||
                             filing.formDescription?.toLowerCase().includes('resource');

          console.log(`\n  ${isTechnical ? '⭐' : '•'} ${filing.formType}: ${filing.formDescription}`);
          console.log(`    Date: ${filing.dateFiled}`);
          console.log(`    Size: ${filing.fileSize || 'N/A'}`);

          if (filing.pdfLink) {
            console.log(`    PDF: ${filing.pdfLink.substring(0, 100)}...`);
          }

          // Store in database
          const { error } = await supabase
            .from('edgar_technical_documents')
            .upsert({
              filing_id: filing.filingId || `${symbol}-${filing.dateFiled}-${filing.formType}`,
              symbol: symbol,
              company_name: filing.companyName || symbol,
              form_type: filing.formType,
              form_description: filing.formDescription,
              form_group: filing.formGroup,
              country: country,
              date_filed: filing.dateFiled,
              html_link: filing.htmlLink,
              pdf_link: filing.pdfLink,
              doc_link: filing.docLink,
              xls_link: filing.xlsLink,
              file_size: filing.fileSize,
              page_count: filing.pages,
              is_technical_report: isTechnical,
              cik: filing.cik,
              issuer_number: filing.issuerNumber,
              processing_status: 'completed',
              processed_at: new Date().toISOString(),
            }, {
              onConflict: 'filing_id'
            });

          if (error) {
            console.log(`    ⚠️ Database error: ${error.message}`);
          } else {
            console.log(`    ✅ Stored in database`);
          }
        }

        // Special search for NI 43-101 reports if Canadian
        if (country === 'CA') {
          console.log(`\n  🔎 Searching specifically for NI 43-101 reports...`);
          const technicalReports = await client.getNI43101Reports({
            symbol: symbol,
            limit: 3
          });

          if (technicalReports.length > 0) {
            console.log(`  ⭐ Found ${technicalReports.length} NI 43-101 technical reports!`);
            for (const report of technicalReports) {
              console.log(`    - ${report.formDescription} (${report.dateFiled})`);
            }
          }
        }

      } catch (error) {
        console.error(`  ❌ Error fetching ${symbol}:`, error instanceof Error ? error.message : error);
      }
    }

    // Show summary from database
    console.log('\n\n📊 DATABASE SUMMARY');
    console.log('===================\n');

    const { data: summary, count } = await supabase
      .from('edgar_technical_documents')
      .select('*', { count: 'exact' })
      .eq('is_technical_report', true)
      .order('date_filed', { ascending: false })
      .limit(10);

    console.log(`Total technical reports in database: ${count || 0}\n`);

    if (summary && summary.length > 0) {
      console.log('Latest technical reports:');
      summary.forEach(doc => {
        console.log(`\n• ${doc.symbol} - ${doc.company_name}`);
        console.log(`  Type: ${doc.form_type} - ${doc.form_description}`);
        console.log(`  Filed: ${doc.date_filed}`);
        console.log(`  PDF: ${doc.pdf_link ? '✅ Available' : '❌ Not available'}`);
      });
    }

  } catch (error) {
    console.error('\n❌ Error:', error);

    if (error instanceof Error && error.message.includes('Failed to generate enterprise token')) {
      console.log('\n⚠️  Authentication failed. Possible issues:');
      console.log('1. Invalid webservice password');
      console.log('2. Password may have expired (30 days after first view)');
      console.log('3. Network connectivity issues');
      console.log('\nPlease verify your password at: https://crs.sh/uJgMAfsC');
    }
  }

  console.log('\n✅ Script completed!');
}

// Run the live test
pullRealDocuments().catch(console.error);