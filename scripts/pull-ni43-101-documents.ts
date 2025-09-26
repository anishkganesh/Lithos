#!/usr/bin/env npx tsx
/**
 * Pull real NI 43-101 and mining technical documents from QuoteMedia
 */

import { config } from 'dotenv';
import { QuoteMediaClient } from '../lib/quotemedia/api-client';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function pullTechnicalDocuments() {
  console.log('🚀 Pulling Real NI 43-101 and Technical Documents');
  console.log('==================================================\n');

  const password = process.env.QUOTEMEDIA_WEBSERVICE_PASSWORD || 'dfbsembl48';
  const client = new QuoteMediaClient(password);

  // Test with known mining companies that file technical reports
  const testCompanies = [
    // US Companies (EDGAR)
    { symbol: 'FCX', name: 'Freeport-McMoRan', country: 'US' as const },
    { symbol: 'NEM', name: 'Newmont', country: 'US' as const },
    { symbol: 'GOLD', name: 'Barrick Gold', country: 'US' as const },

    // Canadian Companies (SEDAR) - These often have NI 43-101 reports
    { symbol: 'AGI', name: 'Alamos Gold', country: 'CA' as const },
    { symbol: 'K', name: 'Kinross Gold', country: 'CA' as const },
    { symbol: 'IMG', name: 'IAMGOLD', country: 'CA' as const },
    { symbol: 'NG', name: 'NovaGold', country: 'CA' as const },
    { symbol: 'AEM', name: 'Agnico Eagle', country: 'CA' as const },
  ];

  let totalDocuments = 0;
  let technicalDocuments = 0;

  for (const company of testCompanies) {
    console.log(`\n📊 Fetching documents for ${company.name} (${company.symbol})...`);

    try {
      // Fetch documents - don't use country when we have symbol
      const documents = await client.getCompanyFilings({
        symbol: company.symbol,
        limit: 10, // Get last 10 documents
      });

      console.log(`   Found ${documents.length} documents`);
      totalDocuments += documents.length;

      // Process each document
      for (const doc of documents) {
        // Check if it's a technical document
        const isTechnical =
          doc.formDescription?.toLowerCase().includes('43-101') ||
          doc.formDescription?.toLowerCase().includes('technical') ||
          doc.formDescription?.toLowerCase().includes('mineral') ||
          doc.formDescription?.toLowerCase().includes('resource') ||
          doc.formDescription?.toLowerCase().includes('reserve') ||
          doc.formDescription?.toLowerCase().includes('feasibility') ||
          doc.formDescription?.toLowerCase().includes('preliminary economic') ||
          doc.formType?.toLowerCase().includes('43-101');

        if (isTechnical) {
          technicalDocuments++;
          console.log(`   ⭐ TECHNICAL REPORT FOUND:`);
          console.log(`      Type: ${doc.formType}`);
          console.log(`      Description: ${doc.formDescription}`);
          console.log(`      Date: ${doc.dateFiled}`);
          console.log(`      PDF Link: ${doc.pdfLink?.substring(0, 100)}...`);
        }

        // Store in database
        const { error } = await supabase
          .from('edgar_technical_documents')
          .upsert({
            filing_id: doc.filingId,
            accession_number: doc.accessionNumber,
            symbol: doc.symbol,
            company_name: doc.companyName || company.name,
            cik: doc.cik,
            issuer_number: doc.issuerNumber,
            form_type: doc.formType,
            form_description: doc.formDescription,
            form_group: doc.formGroup,
            country: company.country,
            date_filed: doc.dateFiled,
            period_date: doc.period,
            html_link: doc.htmlLink,
            pdf_link: doc.pdfLink,
            doc_link: doc.docLink,
            xls_link: doc.xlsLink,
            file_size: doc.fileSize,
            page_count: doc.pages,
            is_technical_report: isTechnical,
            report_type: isTechnical ? determineReportType(doc.formDescription || '') : null,
            processing_status: 'completed',
            processed_at: new Date().toISOString(),
          }, {
            onConflict: 'filing_id'
          });

        if (error && !error.message.includes('does not exist')) {
          console.error(`   ⚠️ Database error: ${error.message}`);
        }
      }

    } catch (error) {
      console.error(`   ❌ Error fetching ${company.symbol}:`, error instanceof Error ? error.message : error);
    }
  }

  // Show summary
  console.log('\n\n📊 SUMMARY');
  console.log('==========');
  console.log(`Total documents fetched: ${totalDocuments}`);
  console.log(`Technical reports found: ${technicalDocuments}`);

  // Query database for stored technical reports
  const { data: dbReports, count } = await supabase
    .from('edgar_technical_documents')
    .select('*', { count: 'exact' })
    .eq('is_technical_report', true)
    .order('date_filed', { ascending: false })
    .limit(5);

  if (dbReports && dbReports.length > 0) {
    console.log(`\n📄 Latest Technical Reports in Database (${count} total):\n`);

    for (const report of dbReports) {
      console.log(`• ${report.symbol} - ${report.company_name}`);
      console.log(`  Type: ${report.form_type} - ${report.report_type || report.form_description}`);
      console.log(`  Filed: ${report.date_filed}`);
      if (report.pdf_link) {
        console.log(`  PDF: ${report.pdf_link}`);
      }
      console.log('');
    }
  }

  console.log('\n✅ Document pull complete!');
}

function determineReportType(description: string): string {
  const desc = description.toLowerCase();

  if (desc.includes('43-101')) return 'NI 43-101';
  if (desc.includes('preliminary economic assessment') || desc.includes('pea')) return 'PEA';
  if (desc.includes('feasibility study')) return 'Feasibility Study';
  if (desc.includes('pre-feasibility')) return 'Pre-Feasibility Study';
  if (desc.includes('resource estimate')) return 'Resource Estimate';
  if (desc.includes('reserve estimate')) return 'Reserve Estimate';
  if (desc.includes('technical report')) return 'Technical Report';

  return 'Technical Document';
}

pullTechnicalDocuments().catch(console.error);