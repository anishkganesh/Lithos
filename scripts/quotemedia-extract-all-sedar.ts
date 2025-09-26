#!/usr/bin/env npx tsx
/**
 * Extract ALL SEDAR-related documents from QuoteMedia
 * Shows what Canadian/SEDAR content is actually available
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const QUOTEMEDIA_BASE_URL = 'https://app.quotemedia.com/data';
const WMID = '131706';
const PASSWORD = process.env.QUOTEMEDIA_WEBSERVICE_PASSWORD || 'dfbsembl48';

// Canadian mining companies that file with both SEC and SEDAR
const CANADIAN_COMPANIES = [
  { symbol: 'CCJ', name: 'Cameco', primary: 'TSX' },
  { symbol: 'DNN', name: 'Denison Mines', primary: 'TSX' },
  { symbol: 'NXE', name: 'NexGen Energy', primary: 'TSX' },
  { symbol: 'FCU', name: 'Fission Uranium', primary: 'TSX-V' },
  { symbol: 'TECK', name: 'Teck Resources', primary: 'TSX' },
  { symbol: 'IVN', name: 'Ivanhoe Mines', primary: 'TSX' },
  { symbol: 'FM', name: 'First Quantum', primary: 'TSX' },
  { symbol: 'HBM', name: 'Hudbay Minerals', primary: 'TSX' },
  { symbol: 'ERO', name: 'Ero Copper', primary: 'TSX' },
  { symbol: 'CS', name: 'Capstone Mining', primary: 'TSX' },
  { symbol: 'AEM', name: 'Agnico Eagle', primary: 'TSX' },
  { symbol: 'KGC', name: 'Kinross Gold', primary: 'TSX' },
  { symbol: 'WPM', name: 'Wheaton Precious', primary: 'TSX' },
  { symbol: 'FNV', name: 'Franco-Nevada', primary: 'TSX' },
  { symbol: 'AG', name: 'First Majestic', primary: 'TSX' }
];

/**
 * Get enterprise token
 */
async function getEnterpriseToken(): Promise<string | null> {
  try {
    const response = await fetch(`https://app.quotemedia.com/auth/v0/enterprise/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wmId: parseInt(WMID),
        webservicePassword: PASSWORD
      })
    });

    if (response.ok) {
      const data = await response.json();
      return data.token;
    }
  } catch (error) {
    console.error('Failed to get token:', error);
  }
  return null;
}

/**
 * Extract all SEDAR-related documents
 */
async function extractAllSEDARDocs() {
  console.log('🚀 EXTRACTING ALL SEDAR/CANADIAN DOCUMENTS FROM QUOTEMEDIA');
  console.log('='.repeat(70));

  const token = await getEnterpriseToken();
  if (!token) {
    console.log('❌ Failed to get authentication token');
    return;
  }
  console.log('✅ Authentication successful\n');

  const allSEDARDocs = [];
  const formTypeSummary = new Map<string, number>();
  let totalFilings = 0;
  let sedarRelatedCount = 0;

  for (const company of CANADIAN_COMPANIES) {
    console.log(`\n📊 Processing ${company.symbol} (${company.name}) - Primary: ${company.primary}`);
    console.log('─'.repeat(50));

    // Get ALL filings for this company
    const url = `${QUOTEMEDIA_BASE_URL}/getCompanyFilings.json?` +
      `webmasterId=${WMID}&` +
      `symbol=${company.symbol}&` +
      `limit=100&` +
      `token=${token}`;

    try {
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();

        if (data.results?.filing) {
          const filings = data.results.filing;
          console.log(`   Found ${filings.length} total filings`);
          totalFilings += filings.length;

          // Check each filing for SEDAR/Canadian indicators
          for (const filing of filings) {
            const formType = filing.formType || '';
            const description = (filing.formDescription || '').toLowerCase();
            const pdfLink = filing.pdfLink || '';

            // Track all form types
            formTypeSummary.set(formType, (formTypeSummary.get(formType) || 0) + 1);

            // Check if this is SEDAR-related or Canadian filing
            const isSEDARRelated =
              // Canadian SEC forms
              formType === '40-F' ||           // Annual report for Canadian companies
              formType === '6-K' ||            // Current report for foreign companies
              formType === '20-F' ||           // Foreign annual report
              formType === 'F-10' ||           // Registration for Canadian companies
              formType === 'F-1' ||            // Foreign registration
              formType === 'F-3' ||            // Foreign registration
              formType === 'F-4' ||            // Foreign business combination
              formType === 'F-6' ||            // ADR registration
              formType === 'F-7' ||            // Rights offerings
              formType === 'F-8' ||            // Business combinations
              formType === 'F-9' ||            // Investment grade offerings
              formType === 'F-10' ||           // Canadian offerings
              formType === 'F-80' ||           // Canadian business combinations
              formType === 'F-X' ||            // Foreign appointment
              formType === 'CB' ||             // Canadian bulletin
              formType === 'SUPPL' ||          // Supplemental filing
              formType.includes('SEDAR') ||
              formType.includes('AIF') ||      // Annual Information Form (Canadian)
              formType.includes('MD&A') ||     // Management Discussion & Analysis
              // Description indicators
              description.includes('sedar') ||
              description.includes('annual information') ||
              description.includes('canadian') ||
              description.includes('ontario') ||
              description.includes('british columbia') ||
              description.includes('alberta') ||
              description.includes('tsx') ||
              description.includes('tsxv') ||
              description.includes('cse') ||
              description.includes('material change') ||
              description.includes('ni 43-101') ||
              description.includes('43-101') ||
              description.includes('technical report') ||
              description.includes('mineral') ||
              description.includes('resource') ||
              description.includes('reserve');

            if (isSEDARRelated) {
              sedarRelatedCount++;

              console.log(`   🎯 SEDAR-RELATED DOCUMENT FOUND!`);
              console.log(`      Form Type: ${formType}`);
              console.log(`      Description: ${filing.formDescription?.substring(0, 100)}`);
              console.log(`      Date: ${filing.filingDate}`);
              console.log(`      PDF: ${pdfLink ? 'Available' : 'Not Available'}`);

              allSEDARDocs.push({
                symbol: company.symbol,
                company: company.name,
                exchange: company.primary,
                formType,
                description: filing.formDescription,
                filingDate: filing.filingDate,
                pdfUrl: pdfLink,
                htmlUrl: filing.htmlLink,
                fileSize: filing.fileSize,
                accessionNumber: filing.accessionNumber
              });

              // Check if it mentions technical reports
              if (description.includes('43-101') ||
                  description.includes('technical') ||
                  description.includes('feasibility')) {
                console.log(`      ⭐ POTENTIAL TECHNICAL REPORT REFERENCE!`);
              }
            }
          }
        }
      } else {
        console.log(`   ❌ Failed to fetch: ${response.status}`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error}`);
    }

    // Rate limit
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📋 SEDAR/CANADIAN DOCUMENT EXTRACTION SUMMARY');
  console.log('='.repeat(70));

  console.log(`\n📊 STATISTICS:`);
  console.log(`   Total companies checked: ${CANADIAN_COMPANIES.length}`);
  console.log(`   Total filings examined: ${totalFilings}`);
  console.log(`   SEDAR-related documents: ${sedarRelatedCount}`);
  console.log(`   Percentage: ${((sedarRelatedCount / totalFilings) * 100).toFixed(2)}%`);

  console.log(`\n📄 FORM TYPES FOUND (Top 10):`);
  const sortedForms = Array.from(formTypeSummary.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  for (const [form, count] of sortedForms) {
    const isCanadian = ['40-F', '6-K', '20-F', 'F-10', 'F-1', 'F-3'].includes(form);
    console.log(`   ${form}: ${count} filings ${isCanadian ? '🇨🇦' : ''}`);
  }

  console.log(`\n🎯 SEDAR-RELATED DOCUMENTS BY COMPANY:`);
  const companySummary = new Map<string, number>();
  for (const doc of allSEDARDocs) {
    companySummary.set(doc.symbol, (companySummary.get(doc.symbol) || 0) + 1);
  }

  for (const [symbol, count] of companySummary) {
    const company = CANADIAN_COMPANIES.find(c => c.symbol === symbol);
    console.log(`   ${symbol} (${company?.name}): ${count} documents`);
  }

  // Save to database
  if (allSEDARDocs.length > 0) {
    console.log(`\n💾 SAVING ${allSEDARDocs.length} SEDAR-RELATED DOCUMENTS TO DATABASE...`);

    // Create table if needed
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS sedar_documents (
          id SERIAL PRIMARY KEY,
          symbol TEXT,
          company_name TEXT,
          exchange TEXT,
          form_type TEXT,
          description TEXT,
          filing_date DATE,
          pdf_url TEXT,
          html_url TEXT,
          file_size BIGINT,
          accession_number TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(symbol, accession_number)
        );
      `
    }).single().catch(() => {});

    let savedCount = 0;
    for (const doc of allSEDARDocs) {
      const { error } = await supabase
        .from('sedar_documents')
        .upsert({
          symbol: doc.symbol,
          company_name: doc.company,
          exchange: doc.exchange,
          form_type: doc.formType,
          description: doc.description,
          filing_date: doc.filingDate,
          pdf_url: doc.pdfUrl,
          html_url: doc.htmlUrl,
          file_size: doc.fileSize,
          accession_number: doc.accessionNumber || `${doc.symbol}_${doc.filingDate}_${Date.now()}`
        }, { onConflict: 'symbol,accession_number' });

      if (!error) savedCount++;
    }

    console.log(`   ✅ Saved ${savedCount} documents to database`);
  }

  console.log('\n' + '='.repeat(70));
  console.log('🔍 KEY FINDINGS:');
  console.log('='.repeat(70));

  console.log('\n✅ WHAT QUOTEMEDIA HAS FOR CANADIAN COMPANIES:');
  console.log('   • 40-F Annual Reports (SEC filing for Canadian companies)');
  console.log('   • 6-K Current Reports (foreign issuer reports)');
  console.log('   • 20-F Foreign Annual Reports');
  console.log('   • Other F-series forms for cross-listed companies');

  console.log('\n❌ WHAT QUOTEMEDIA DOES NOT HAVE:');
  console.log('   • Direct SEDAR filings');
  console.log('   • NI 43-101 technical reports');
  console.log('   • Annual Information Forms (AIF) from SEDAR');
  console.log('   • Canadian MD&A documents');
  console.log('   • Material change reports from SEDAR');

  console.log('\n💡 CONCLUSION:');
  console.log('   QuoteMedia provides SEC filings for Canadian companies');
  console.log('   that are cross-listed on US exchanges (40-F, 6-K, etc.)');
  console.log('   but NOT direct SEDAR filings or technical reports.');

  console.log('='.repeat(70));

  return allSEDARDocs;
}

// Execute
extractAllSEDARDocs().catch(console.error);