#!/usr/bin/env npx tsx
/**
 * Debug QuoteMedia API - Check available form types and authentication
 */

import { config } from 'dotenv';

config({ path: '.env.local' });

const QUOTEMEDIA_BASE_URL = 'https://app.quotemedia.com/data';
const WMID = '131706';
const PASSWORD = process.env.QUOTEMEDIA_WEBSERVICE_PASSWORD || 'dfbsembl48';

/**
 * Get enterprise token for QuoteMedia
 */
async function getEnterpriseToken(): Promise<string | null> {
  console.log('🔐 Attempting to get enterprise token...');
  console.log(`   WMID: ${WMID}`);
  console.log(`   Password: ${PASSWORD.substring(0, 4)}****`);

  try {
    const response = await fetch(`${QUOTEMEDIA_BASE_URL}/auth/v0/enterprise/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wmId: parseInt(WMID),
        webservicePassword: PASSWORD
      })
    });

    console.log(`   Response Status: ${response.status}`);

    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ Token obtained successfully!');
      return data.token;
    } else {
      const text = await response.text();
      console.log(`   ❌ Failed to get token: ${text}`);
    }
  } catch (error) {
    console.error('   ❌ Error getting token:', error);
  }
  return null;
}

/**
 * Test QuoteMedia API with different approaches
 */
async function testQuoteMediaAPI() {
  console.log('🚀 QUOTEMEDIA API DEBUG - FORM TYPES & AUTHENTICATION');
  console.log('='.repeat(70));

  // Step 1: Get token
  const token = await getEnterpriseToken();

  console.log('\n📋 STEP 1: TEST WITHOUT TOKEN');
  console.log('-'.repeat(50));

  // Test basic request without token
  const basicUrl = `${QUOTEMEDIA_BASE_URL}/getCompanyFilings.json?webmasterId=${WMID}&symbol=LAC&limit=5`;
  console.log(`URL: ${basicUrl}`);

  try {
    const response = await fetch(basicUrl);
    console.log(`Status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Success without token!');

      if (data.results?.filing) {
        console.log(`Found ${data.results.filing.length} filings`);

        // Extract unique form types
        const formTypes = new Set();
        for (const filing of data.results.filing) {
          formTypes.add(filing.formType);
        }
        console.log('Form types found:', Array.from(formTypes));
      }
    } else {
      console.log('❌ Failed without token');
    }
  } catch (error) {
    console.error('Error:', error);
  }

  console.log('\n📋 STEP 2: TEST WITH TOKEN');
  console.log('-'.repeat(50));

  if (token) {
    const tokenUrl = `${QUOTEMEDIA_BASE_URL}/getCompanyFilings.json?webmasterId=${WMID}&symbol=LAC&limit=5&token=${token}`;
    console.log(`URL: ${tokenUrl.substring(0, 100)}...`);

    try {
      const response = await fetch(tokenUrl);
      console.log(`Status: ${response.status} ${response.statusText}`);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Success with token!');

        if (data.results?.filing) {
          console.log(`Found ${data.results.filing.length} filings`);
        }
      } else {
        console.log('❌ Failed with token');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  console.log('\n📋 STEP 3: GET ALL FORM TYPES FOR CANADIAN COMPANY');
  console.log('-'.repeat(50));

  // Try a Canadian company to see SEDAR filings
  const canadianUrl = `${QUOTEMEDIA_BASE_URL}/getCompanyFilings.json?webmasterId=${WMID}&symbol=DNN&limit=50`;
  console.log(`Testing Canadian company (DNN)...`);

  try {
    const response = await fetch(canadianUrl);

    if (response.ok) {
      const data = await response.json();

      if (data.results?.filing) {
        const formTypesMap = new Map();

        for (const filing of data.results.filing) {
          const type = filing.formType;
          const desc = filing.formDescription || '';

          if (!formTypesMap.has(type)) {
            formTypesMap.set(type, desc);
          }
        }

        console.log('\nForm Types Found:');
        for (const [type, desc] of formTypesMap) {
          console.log(`  • ${type}: ${desc.substring(0, 60)}`);
        }
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }

  console.log('\n📋 STEP 4: TEST FORM PARAMETER WITH VALID SEC FORMS');
  console.log('-'.repeat(50));

  // Test with known valid SEC form types
  const validForms = ['10-K', '10-Q', '8-K', '20-F', '40-F', 'DEF 14A', 'S-1', 'S-3', 'S-8'];

  for (const form of validForms) {
    const formUrl = `${QUOTEMEDIA_BASE_URL}/getCompanyFilings.json?webmasterId=${WMID}&symbol=FCX&form=${encodeURIComponent(form)}&limit=2`;

    try {
      const response = await fetch(formUrl);
      console.log(`Form="${form}": Status ${response.status}`);

      if (response.ok) {
        const data = await response.json();
        const count = data.results?.filing?.length || 0;
        if (count > 0) {
          console.log(`  ✅ Found ${count} ${form} filings`);
        }
      }
    } catch (error) {
      // Skip
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n📋 STEP 5: CHECK getFilingFormsByCountry API');
  console.log('-'.repeat(50));
  console.log('Checking if getFilingFormsByCountry endpoint exists...');

  // Try to get list of all filing forms
  const formsListUrl = `${QUOTEMEDIA_BASE_URL}/getFilingFormsByCountry.json?webmasterId=${WMID}&country=US`;

  try {
    const response = await fetch(formsListUrl);
    console.log(`Status: ${response.status}`);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Forms list endpoint works!');
      console.log('Sample forms:', JSON.stringify(data).substring(0, 200));
    } else if (response.status === 404) {
      console.log('❌ getFilingFormsByCountry endpoint not found');
    } else if (response.status === 403) {
      console.log('❌ getFilingFormsByCountry requires authentication');
    }
  } catch (error) {
    console.error('Error:', error);
  }

  console.log('\n📋 STEP 6: CHECK FOR CANADIAN SEDAR FILINGS');
  console.log('-'.repeat(50));

  // Check if we can access Canadian filings with country parameter
  const canadianFilingsUrl = `${QUOTEMEDIA_BASE_URL}/getCompanyFilings.json?webmasterId=${WMID}&country=CA&limit=10`;

  try {
    const response = await fetch(canadianFilingsUrl);
    console.log(`Country=CA Status: ${response.status}`);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Canadian filings accessible!');

      if (data.results?.filing) {
        console.log(`Found ${data.results.filing.length} Canadian filings`);

        // Look for NI 43-101
        for (const filing of data.results.filing) {
          const desc = (filing.formDescription || '').toLowerCase();
          if (desc.includes('43-101') || desc.includes('technical') || desc.includes('mineral')) {
            console.log(`  🎯 FOUND: ${filing.formType} - ${filing.formDescription}`);
          }
        }
      }
    } else {
      console.log('❌ Cannot access Canadian filings by country');
    }
  } catch (error) {
    console.error('Error:', error);
  }

  console.log('\n' + '='.repeat(70));
  console.log('🔍 ANALYSIS:');
  console.log('-'.repeat(50));
  console.log('1. 403 Forbidden occurs when:');
  console.log('   - Using invalid form types (NI 43-101, S-K 1300, etc.)');
  console.log('   - These are not standard SEC form types');
  console.log('\n2. QuoteMedia only supports standard SEC/EDGAR form types:');
  console.log('   - 10-K, 10-Q, 8-K, 20-F, 40-F, etc.');
  console.log('\n3. Technical reports (NI 43-101, S-K 1300) are:');
  console.log('   - NOT standalone SEC form types');
  console.log('   - Filed as EXHIBITS to 10-K/20-F/8-K');
  console.log('   - Or filed directly with SEDAR (not in QuoteMedia)');
  console.log('='.repeat(70));
}

testQuoteMediaAPI().catch(console.error);