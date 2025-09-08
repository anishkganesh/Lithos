const FirecrawlApp = require('@mendable/firecrawl-js').default;
require('dotenv').config({ path: '.env.local' });

async function testFirecrawl() {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  
  if (!apiKey) {
    console.error('FIRECRAWL_API_KEY not found in .env.local');
    return;
  }
  
  console.log('Testing Firecrawl API...');
  
  try {
    const app = new FirecrawlApp({ apiKey });
    
    // Test with a simple query
    console.log('Searching for: "gold mining news"');
    const results = await app.search('gold mining news', {
      limit: 3,
      searchOptions: {
        limit: 3
      }
    });
    
    console.log('Search success:', results.success);
    
    if (results.success && results.data) {
      console.log(`Found ${results.data.length} results:`);
      results.data.forEach((result, i) => {
        console.log(`\n${i + 1}. ${result.title || 'No title'}`);
        console.log(`   URL: ${result.url}`);
        console.log(`   Content preview: ${(result.content || result.markdown || '').slice(0, 200)}...`);
      });
    } else {
      console.log('No results found or API error');
      console.log('Response:', JSON.stringify(results, null, 2));
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testFirecrawl();
