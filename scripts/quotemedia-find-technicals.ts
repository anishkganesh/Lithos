#!/usr/bin/env npx tsx
/**
 * Find technical reports through QuoteMedia API
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
const PASSWORD = process.env.QUOTEMEDIA_WEBSERVICE_PASSWORD || 'dfbsembl48';

// Companies to search for technical reports
const MINING_COMPANIES = [
  'LAC', 'ALB', 'SQM', 'PLL', 'SGML',
  'FCX', 'SCCO', 'TECK', 'IVN', 'ERO',
  'MP', 'LYSCF', 'TMRC', 'REEMF',
  'CCJ', 'DNN', 'NXE', 'UEC', 'UUUU',
  'VALE', 'BHP', 'RIO', 'GLEN',
  'NEM', 'GOLD', 'AEM', 'KGC'
];

/**
 * Get enterprise token for QuoteMedia
 */
async function getEnterpriseToken(): Promise<string | null> {
  try {
    const response = await fetch(`${QUOTEMEDIA_BASE_URL}/auth/v0/enterprise/token`, {
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
 * Search for technical report filings in QuoteMedia
 */
async function searchForTechnicalReports(symbol: string, token?: string) {
  console.log(`\n🔍 Searching QuoteMedia for ${symbol} technical documents...`);

  // Build URL with optional token
  let url = `${QUOTEMEDIA_BASE_URL}/getCompanyFilings.json?webmasterId=${WMID}&symbol=${symbol}&limit=50`;
  if (token) {
    url += `&token=${token}`;
  }

  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.log(`  ❌ Failed to fetch: ${response.status}`);
      return [];
    }

    const data = await response.json();

    if (!data.results?.filing) {
      console.log(`  ⚠️ No filings found`);
      return [];
    }

    const filings = data.results.filing;
    const technicalReports = [];

    // Search for technical report indicators
    for (const filing of filings) {
      const formType = filing.formType?.toUpperCase() || '';
      const description = (filing.formDescription || '').toLowerCase();
      const pdfLink = filing.pdfLink || '';
      const htmlLink = filing.htmlLink || '';

      // Check if this might be a technical report
      const isTechnical =
        // Direct technical report indicators
        description.includes('technical report') ||
        description.includes('43-101') ||
        description.includes('ni 43-101') ||
        description.includes('sk-1300') ||
        description.includes('sk 1300') ||
        description.includes('feasibility') ||
        description.includes('pea') ||
        description.includes('preliminary economic') ||
        description.includes('mineral resource') ||
        description.includes('mineral reserve') ||
        // In 8-K/6-K that might contain technical reports
        ((formType === '8-K' || formType === '6-K') &&
         (description.includes('technical') ||
          description.includes('feasibility') ||
          description.includes('resource'))) ||
        // Canadian filings that often contain technical reports
        formType.includes('40-F') ||
        formType.includes('20-F') ||
        // Check file names
        pdfLink.toLowerCase().includes('technical') ||
        pdfLink.toLowerCase().includes('43-101') ||
        pdfLink.toLowerCase().includes('feasibility');

      if (isTechnical && (pdfLink || htmlLink)) {
        const reportUrl = pdfLink || htmlLink;
        console.log(`  ✅ Found potential technical document!`);
        console.log(`     📄 Form: ${formType} - ${filing.filingDate}`);
        console.log(`     📝 Description: ${filing.formDescription?.substring(0, 100)}`);
        console.log(`     🔗 URL: ${reportUrl}`);

        technicalReports.push({
          symbol,
          company: filing.companyName || symbol,
          formType,
          filingDate: filing.filingDate,
          description: filing.formDescription,
          url: reportUrl,
          fileSize: filing.fileSize,
          source: 'QuoteMedia'
        });
      }
    }

    if (technicalReports.length === 0) {
      // Check exhibits in 10-K/40-F
      const annualReports = filings.filter((f: any) =>
        f.formType === '10-K' || f.formType === '40-F' || f.formType === '20-F'
      );

      if (annualReports.length > 0) {
        const latest = annualReports[0];
        if (latest.exhibits) {
          console.log(`  📂 Checking exhibits in ${latest.formType}...`);
          // Note: QuoteMedia might have exhibit links
          for (const exhibit of latest.exhibits) {
            if (exhibit.description?.toLowerCase().includes('technical') ||
                exhibit.description?.toLowerCase().includes('43-101')) {
              console.log(`     ✅ Found technical report exhibit: ${exhibit.description}`);
              if (exhibit.url) {
                technicalReports.push({
                  symbol,
                  company: latest.companyName || symbol,
                  formType: `${latest.formType} Exhibit`,
                  filingDate: latest.filingDate,
                  description: exhibit.description,
                  url: exhibit.url,
                  source: 'QuoteMedia'
                });
              }
            }
          }
        }
      }
    }

    return technicalReports;

  } catch (error) {
    console.error(`  ❌ Error: ${error}`);
    return [];
  }
}

async function findQuoteMediaTechnicalReports() {
  console.log('🚀 SEARCHING QUOTEMEDIA API FOR TECHNICAL REPORTS');
  console.log('='.repeat(70));

  // Get enterprise token
  const token = await getEnterpriseToken();
  if (token) {
    console.log('✅ Enterprise token obtained\n');
  } else {
    console.log('⚠️ No token - using public access\n');
  }

  const allReports = [];

  for (const symbol of MINING_COMPANIES) {
    const reports = await searchForTechnicalReports(symbol, token);
    allReports.push(...reports);

    // Rate limit
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n' + '='.repeat(70));
  console.log('📋 TECHNICAL REPORTS FOUND IN QUOTEMEDIA:');
  console.log('='.repeat(70));

  if (allReports.length === 0) {
    console.log('\n❌ No technical reports found through QuoteMedia API');
    console.log('\nThis is because QuoteMedia primarily provides:');
    console.log('  • SEC filings (10-K, 10-Q, 8-K, etc.)');
    console.log('  • Financial statements');
    console.log('  • Corporate governance documents');
    console.log('\nBut NOT:');
    console.log('  • NI 43-101 technical reports (hosted on SEDAR)');
    console.log('  • S-K 1300 technical reports (often on company websites)');
    console.log('  • Feasibility studies (usually company-hosted PDFs)');
  } else {
    for (const report of allReports) {
      console.log(`\n${report.symbol} - ${report.company}`);
      console.log(`  📄 ${report.formType} (${report.filingDate})`);
      console.log(`  📝 ${report.description?.substring(0, 100)}`);
      console.log(`  🔗 ${report.url}`);
    }

    console.log('\n' + '='.repeat(70));
    console.log(`✅ Total Technical Documents Found: ${allReports.length}`);
  }

  // Try to extract data if we found any
  if (allReports.length > 0) {
    console.log('\n💾 Attempting to extract project data from documents...\n');

    for (const report of allReports.slice(0, 5)) { // Process first 5
      console.log(`Processing ${report.symbol} - ${report.formType}...`);

      try {
        const response = await fetch(report.url);
        if (response.ok) {
          const content = await response.text();

          // Try to extract metrics
          const capexMatch = content.match(/capex[^\d]*\$?([\d,]+(?:\.\d+)?)\s*(?:million|m)/i);
          const npvMatch = content.match(/npv[^\d]*\$?([\d,]+(?:\.\d+)?)\s*(?:million|m)/i);
          const irrMatch = content.match(/irr[^\d]*([\d.]+)\s*%/i);

          if (capexMatch || npvMatch || irrMatch) {
            console.log(`  ✅ Found financial metrics!`);
            if (capexMatch) console.log(`     CAPEX: $${capexMatch[1]}M`);
            if (npvMatch) console.log(`     NPV: $${npvMatch[1]}M`);
            if (irrMatch) console.log(`     IRR: ${irrMatch[1]}%`);
          } else {
            console.log(`  ⚠️ No clear financial metrics found`);
          }
        }
      } catch (error) {
        console.log(`  ❌ Could not fetch/parse document`);
      }
    }
  }

  console.log('\n' + '='.repeat(70));
}

findQuoteMediaTechnicalReports().catch(console.error);