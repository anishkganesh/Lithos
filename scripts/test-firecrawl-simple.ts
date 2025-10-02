import FirecrawlApp from '@mendable/firecrawl-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const firecrawlApiKey = process.env.FIRECRAWL_API_KEY!;

async function testFirecrawl() {
  console.log('Testing Firecrawl API...\n');
  console.log('API Key:', firecrawlApiKey ? `${firecrawlApiKey.substring(0, 10)}...` : 'NOT FOUND');
  
  try {
    const app = new FirecrawlApp({ apiKey: firecrawlApiKey });
    
    // Try a simple scrape
    console.log('\nTrying to scrape a simple page...');
    const result = await app.scrapeUrl('https://example.com', {
      formats: ['markdown']
    });
    
    if (result.success) {
      console.log('✅ Firecrawl API is working!');
      console.log('Content length:', result.markdown?.length || 0);
    } else {
      console.log('❌ Scrape failed:', result.error);
      
      // Check if it's an API key issue
      if (result.error?.includes('401') || result.error?.includes('Unauthorized')) {
        console.log('\n⚠️ API Key might be invalid or expired');
        console.log('Please check your Firecrawl API key at: https://www.firecrawl.dev/app/api-keys');
      }
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message || error);
    
    if (error.message?.includes('401')) {
      console.log('\n⚠️ Authentication failed. Your API key might be:');
      console.log('1. Invalid or expired');
      console.log('2. Out of credits');
      console.log('3. Not activated yet');
      console.log('\nPlease check: https://www.firecrawl.dev/app/api-keys');
    }
  }
}

testFirecrawl();
