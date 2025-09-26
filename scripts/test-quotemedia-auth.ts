#!/usr/bin/env npx tsx
/**
 * Test QuoteMedia authentication and API response
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

const QUOTEMEDIA_BASE_URL = 'https://app.quotemedia.com';
const WMID = '131706';
const WEBSERVICE_PASSWORD = process.env.QUOTEMEDIA_WEBSERVICE_PASSWORD || 'dfbsembl48';

async function testAuth() {
  console.log('🔐 Testing QuoteMedia Authentication\n');
  console.log('WMID:', WMID);
  console.log('Password:', WEBSERVICE_PASSWORD);
  console.log('Base URL:', QUOTEMEDIA_BASE_URL);

  // Step 1: Generate enterprise token
  console.log('\n1️⃣ Generating Enterprise Token...');

  const tokenUrl = `${QUOTEMEDIA_BASE_URL}/auth/v0/enterprise/token`;
  const tokenBody = {
    wmId: parseInt(WMID),
    webservicePassword: WEBSERVICE_PASSWORD
  };

  console.log('POST', tokenUrl);
  console.log('Body:', JSON.stringify(tokenBody));

  try {
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tokenBody),
    });

    console.log('Response Status:', tokenResponse.status, tokenResponse.statusText);

    const responseText = await tokenResponse.text();
    console.log('Response Body:', responseText);

    if (!tokenResponse.ok) {
      console.error('❌ Token generation failed');
      return;
    }

    let tokenData;
    try {
      tokenData = JSON.parse(responseText);
    } catch {
      console.error('❌ Invalid JSON response');
      return;
    }

    const token = tokenData.token || tokenData.access_token || tokenData.accessToken;

    if (!token) {
      console.error('❌ No token in response');
      console.log('Response structure:', Object.keys(tokenData));
      return;
    }

    console.log('✅ Token obtained:', token.substring(0, 20) + '...');

    // Step 2: Test API call with token
    console.log('\n2️⃣ Testing API Call with Token...');

    const apiUrl = `${QUOTEMEDIA_BASE_URL}/data/getCompanyFilings.json?symbols=MSFT&limit=2&webmasterId=${WMID}`;

    console.log('GET', apiUrl);
    console.log('Authorization: Bearer', token.substring(0, 20) + '...');

    const apiResponse = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    console.log('Response Status:', apiResponse.status, apiResponse.statusText);

    const apiText = await apiResponse.text();
    console.log('Response Length:', apiText.length, 'bytes');

    if (apiText.length < 1000) {
      console.log('Full Response:', apiText);
    } else {
      console.log('Response Preview:', apiText.substring(0, 500));
    }

    if (apiResponse.ok) {
      try {
        const apiData = JSON.parse(apiText);

        if (apiData.results?.filings?.filing) {
          const filings = Array.isArray(apiData.results.filings.filing)
            ? apiData.results.filings.filing
            : [apiData.results.filings.filing];

          console.log(`\n✅ Success! Found ${filings.length} filings`);

          filings.forEach((filing: any, i: number) => {
            console.log(`\n Filing ${i + 1}:`);
            console.log(`   Form: ${filing.formtype}`);
            console.log(`   Date: ${filing.datefiled}`);
            console.log(`   PDF: ${filing.pdflink ? 'Available' : 'Not available'}`);
          });
        } else {
          console.log('\n⚠️ No filings in response');
          console.log('Response structure:', JSON.stringify(apiData, null, 2));
        }
      } catch (e) {
        console.error('❌ Failed to parse API response as JSON');
      }
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

testAuth().catch(console.error);