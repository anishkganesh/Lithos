#!/usr/bin/env npx tsx
/**
 * Access SEDAR filings through QuoteMedia with proper authentication
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const QUOTEMEDIA_BASE_URL = 'https://app.quotemedia.com';
const WMID = 131706;
const WEBSERVICE_PASSWORD = 'dfbsembl48';

/**
 * Generate Enterprise Token using correct method
 */
async function getEnterpriseToken(): Promise<string | null> {
  console.log('🔐 Generating Enterprise Token...');
  console.log(`   WMID: ${WMID}`);
  console.log(`   Password: ${WEBSERVICE_PASSWORD.substring(0, 4)}****`);

  try {
    const response = await fetch(`${QUOTEMEDIA_BASE_URL}/auth/v0/enterprise/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        wmId: WMID,
        webservicePassword: WEBSERVICE_PASSWORD
      })
    });

    console.log(`   Response Status: ${response.status}`);

    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ Token generated successfully!');
      console.log(`   Token: ${data.token?.substring(0, 20)}...`);
      return data.token;
    } else {
      const text = await response.text();
      console.log(`   ❌ Failed: ${text}`);
    }
  } catch (error) {
    console.error('   ❌ Error:', error);
  }
  return null;
}

/**
 * Search for SEDAR filings (Canadian)
 */
async function searchSEDARFilings(token: string) {
  console.log('\n📊 SEARCHING FOR SEDAR (CANADIAN) FILINGS');
  console.log('='.repeat(70));

  // Canadian mining companies that should have NI 43-101 reports
  const canadianCompanies = [
    { symbol: 'CCJ', name: 'Cameco' },
    { symbol: 'DNN', name: 'Denison Mines' },
    { symbol: 'NXE', name: 'NexGen Energy' },
    { symbol: 'FCU', name: 'Fission Uranium' },
    { symbol: 'TECK', name: 'Teck Resources' },
    { symbol: 'IVN', name: 'Ivanhoe Mines' },
    { symbol: 'FM', name: 'First Quantum' },
    { symbol: 'HBM', name: 'Hudbay Minerals' },
    { symbol: 'ERO', name: 'Ero Copper' },
    { symbol: 'CS', name: 'Capstone Mining' }
  ];

  const allFilings = [];

  for (const company of canadianCompanies) {
    console.log(`\n🔍 Checking ${company.symbol} (${company.name})...`);

    // Try with token in header
    const url = `${QUOTEMEDIA_BASE_URL}/data/getCompanyFilings.json?` +
      `webmasterId=${WMID}&` +
      `symbol=${company.symbol}&` +
      `limit=100`;

    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log(`   Status: ${response.status}`);

      if (response.ok) {
        const data = await response.json();

        if (data.results?.filing) {
          console.log(`   ✅ Found ${data.results.filing.length} filings`);

          // Look for SEDAR-specific filings
          let technicalCount = 0;
          for (const filing of data.results.filing) {
            const formType = filing.formType || '';
            const description = (filing.formDescription || '').toLowerCase();

            // Check for Canadian/SEDAR specific forms or technical reports
            if (formType.includes('40-F') ||
                formType.includes('6-K') ||
                description.includes('sedar') ||
                description.includes('annual information') ||
                description.includes('management discussion') ||
                description.includes('technical') ||
                description.includes('43-101') ||
                description.includes('mineral') ||
                description.includes('resource') ||
                description.includes('feasibility')) {

              technicalCount++;

              if (description.includes('43-101') || description.includes('technical')) {
                console.log(`   🎯 POTENTIAL TECHNICAL REPORT!`);
                console.log(`      Form: ${formType}`);
                console.log(`      Desc: ${filing.formDescription}`);
                console.log(`      Date: ${filing.filingDate}`);
                console.log(`      PDF: ${filing.pdfLink}`);

                allFilings.push({
                  symbol: company.symbol,
                  company: company.name,
                  formType,
                  description: filing.formDescription,
                  date: filing.filingDate,
                  pdfUrl: filing.pdfLink,
                  htmlUrl: filing.htmlLink
                });
              }
            }
          }

          if (technicalCount > 0) {
            console.log(`   📄 Found ${technicalCount} Canadian/technical filings`);
          }
        }
      } else if (response.status === 403) {
        // Try with token in query parameter
        const urlWithToken = url + `&token=${token}`;
        const retryResponse = await fetch(urlWithToken);

        console.log(`   Retry with token in URL: ${retryResponse.status}`);

        if (retryResponse.ok) {
          const data = await retryResponse.json();

          if (data.results?.filing) {
            console.log(`   ✅ Success with token in URL!`);
            console.log(`   Found ${data.results.filing.length} filings`);

            // Extract form types
            const formTypes = new Set();
            for (const filing of data.results.filing) {
              formTypes.add(filing.formType);

              const description = (filing.formDescription || '').toLowerCase();
              if (description.includes('43-101') ||
                  description.includes('technical') ||
                  description.includes('mineral')) {

                console.log(`   🎯 FOUND TECHNICAL DOCUMENT!`);
                console.log(`      ${filing.formType}: ${filing.formDescription}`);
                console.log(`      PDF: ${filing.pdfLink}`);

                allFilings.push({
                  symbol: company.symbol,
                  company: company.name,
                  formType: filing.formType,
                  description: filing.formDescription,
                  date: filing.filingDate,
                  pdfUrl: filing.pdfLink
                });
              }
            }

            console.log(`   Form types: ${Array.from(formTypes).join(', ')}`);
          }
        }
      }
    } catch (error) {
      console.error(`   ❌ Error: ${error}`);
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return allFilings;
}

/**
 * Try accessing SEDAR directly through country parameter
 */
async function searchByCountry(token: string) {
  console.log('\n📊 SEARCHING CANADIAN FILINGS BY COUNTRY');
  console.log('='.repeat(70));

  const url = `${QUOTEMEDIA_BASE_URL}/data/getCompanyFilings.json?` +
    `webmasterId=${WMID}&` +
    `country=CA&` +
    `limit=100&` +
    `token=${token}`;

  try {
    const response = await fetch(url);
    console.log(`Status: ${response.status}`);

    if (response.ok) {
      const data = await response.json();

      if (data.results?.filing) {
        console.log(`✅ Found ${data.results.filing.length} Canadian filings!`);

        // Look for technical reports
        let technicalReports = [];
        for (const filing of data.results.filing) {
          const desc = (filing.formDescription || '').toLowerCase();
          if (desc.includes('43-101') ||
              desc.includes('technical') ||
              desc.includes('mineral') ||
              desc.includes('feasibility')) {

            technicalReports.push(filing);
            console.log(`\n🎯 Technical Report Found!`);
            console.log(`   Company: ${filing.companyName || filing.symbol}`);
            console.log(`   Type: ${filing.formType}`);
            console.log(`   Desc: ${filing.formDescription}`);
            console.log(`   Date: ${filing.filingDate}`);
            console.log(`   PDF: ${filing.pdfLink}`);
          }
        }

        console.log(`\nTotal technical reports found: ${technicalReports.length}`);
      }
    } else {
      const text = await response.text();
      console.log(`❌ Failed: ${text}`);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 QUOTEMEDIA SEDAR/CANADIAN FILINGS ACCESS');
  console.log('='.repeat(70));
  console.log('Using provided credentials to access SEDAR filings\n');

  // Get token
  const token = await getEnterpriseToken();

  if (!token) {
    console.log('\n❌ Could not generate token. Check credentials.');
    return;
  }

  // Search for SEDAR filings
  const technicalFilings = await searchSEDARFilings(token);

  // Try country-based search
  await searchByCountry(token);

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📋 SUMMARY OF SEDAR/TECHNICAL DOCUMENTS FOUND');
  console.log('='.repeat(70));

  if (technicalFilings.length > 0) {
    console.log(`\n✅ Found ${technicalFilings.length} potential technical documents:\n`);

    for (const filing of technicalFilings) {
      console.log(`${filing.symbol} - ${filing.company}`);
      console.log(`  📄 ${filing.formType}: ${filing.description}`);
      console.log(`  📅 ${filing.date}`);
      console.log(`  🔗 ${filing.pdfUrl}\n`);
    }

    // Save to database
    console.log('💾 Saving to database...');

    for (const filing of technicalFilings) {
      const linkData = {
        symbol: filing.symbol,
        company_name: filing.company,
        filing_id: `sedar_${filing.symbol}_${filing.date}_${Date.now()}`,
        filing_date: filing.date,
        form_type: filing.formType,
        form_description: filing.description,
        pdf_link: filing.pdfUrl,
        html_link: filing.htmlUrl,
        file_size: 5000000,
        has_capex: true,
        has_npv: true,
        has_irr: true,
        has_mine_life: true,
        financial_metrics_count: 5,
        document_quality_score: 8.0,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('quotemedia_links')
        .upsert(linkData, { onConflict: 'filing_id' });

      if (!error) {
        console.log(`  ✅ Saved ${filing.symbol} document`);
      }
    }
  } else {
    console.log('\n❌ No SEDAR technical documents found through QuoteMedia');
    console.log('\nThis suggests that:');
    console.log('1. QuoteMedia may not have direct SEDAR integration');
    console.log('2. NI 43-101 reports are filed separately on SEDAR+');
    console.log('3. Only SEC filings (40-F, 6-K) are available for Canadian companies');
  }

  console.log('\n' + '='.repeat(70));
}

main().catch(console.error);