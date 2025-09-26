#!/usr/bin/env npx tsx
/**
 * Test QuoteMedia news API to see what we can actually fetch
 */

const QUOTEMEDIA_BASE_URL = 'https://app.quotemedia.com/data';
const WMID = '131706';
const PASSWORD = 'dfbsembl48';

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
      console.log('✅ Authentication successful');
      return data.token;
    } else {
      console.log('❌ Authentication failed:', response.status);
      return null;
    }
  } catch (error) {
    console.error('❌ Failed to get token:', error);
  }
  return null;
}

/**
 * Test news headlines endpoint
 */
async function testNewsEndpoint() {
  console.log('🚀 TESTING QUOTEMEDIA NEWS API');
  console.log('='.repeat(70));

  const token = await getEnterpriseToken();
  if (!token) {
    console.log('❌ Cannot proceed without authentication token');
    return;
  }

  // Test with a single company
  const testSymbol = 'LAC';
  console.log(`\n📊 Testing getHeadlines for ${testSymbol}...`);

  const url = `${QUOTEMEDIA_BASE_URL}/getHeadlines.json?` +
    `topics=${testSymbol}&` +
    `perTopic=5&` +
    `webmasterId=${WMID}&` +
    `summary=true&` +
    `summLen=200&` +
    `thumbnailurl=true&` +
    `token=${token}`;

  console.log(`\n📡 Request URL: ${url}\n`);

  try {
    const response = await fetch(url);
    console.log(`📊 Response Status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const data = await response.json();
      console.log('\n✅ Response received successfully!');
      console.log('📄 Response structure:', JSON.stringify(data, null, 2));

      if (data.results?.news && data.results.news.length > 0) {
        console.log('\n📰 NEWS FOUND:');
        data.results.news.forEach((newsGroup: any) => {
          console.log(`\n   Company: ${newsGroup.topicinfo?.name || testSymbol}`);
          const items = Array.isArray(newsGroup.newsitem) ? newsGroup.newsitem : [newsGroup.newsitem];
          items.forEach((item: any) => {
            console.log(`   📌 ${item.headline}`);
            console.log(`      Date: ${item.datetime}`);
            console.log(`      Source: ${item.source}`);
            if (item.qmsummary) {
              console.log(`      Summary: ${item.qmsummary.substring(0, 100)}...`);
            }
          });
        });
      } else {
        console.log('\n⚠️ No news items found in response');
      }
    } else {
      const errorText = await response.text();
      console.log('\n❌ API Error Response:', errorText);

      if (response.status === 403) {
        console.log('\n💡 403 FORBIDDEN usually means:');
        console.log('   - WMID doesn\'t have news entitlements');
        console.log('   - Need to upgrade the QuoteMedia plan to include news');
      }
    }
  } catch (error) {
    console.error('\n❌ Request failed:', error);
  }

  // Also test a generic news topic
  console.log('\n' + '='.repeat(70));
  console.log('📊 Testing generic news topic "mining"...');

  const topicUrl = `${QUOTEMEDIA_BASE_URL}/getHeadlines.json?` +
    `topics=mining&` +
    `perTopic=5&` +
    `webmasterId=${WMID}&` +
    `token=${token}`;

  try {
    const response = await fetch(topicUrl);
    console.log(`📊 Response Status: ${response.status} ${response.statusText}`);

    if (!response.ok && response.status === 403) {
      console.log('\n❌ News API is not accessible with current WMID entitlements');
    }
  } catch (error) {
    console.error('❌ Topic request failed:', error);
  }

  console.log('\n' + '='.repeat(70));
  console.log('📌 CONCLUSION:');
  console.log('If you\'re seeing 403 errors, the WMID needs news entitlements.');
  console.log('Contact QuoteMedia to add news access to webmaster ID: ' + WMID);
}

// Execute
testNewsEndpoint().catch(console.error);