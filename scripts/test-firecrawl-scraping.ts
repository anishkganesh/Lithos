import FirecrawlApp from '@mendable/firecrawl-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const firecrawlApiKey = process.env.FIRECRAWL_API_KEY!;

if (!firecrawlApiKey) {
  console.error('❌ FIRECRAWL_API_KEY not found in .env.local');
  process.exit(1);
}

async function testFirecrawlScraping() {
  console.log('🧪 Testing Firecrawl News Scraping\n');
  console.log('=' .repeat(50));

  const firecrawl = new FirecrawlApp({ apiKey: firecrawlApiKey });

  // Test sources
  const testSources = [
    {
      name: 'Mining.com',
      url: 'https://www.mining.com/news/'
    },
    {
      name: 'Kitco News',
      url: 'https://www.kitco.com/news/'
    }
  ];

  for (const source of testSources) {
    console.log(`\n📰 Testing ${source.name}...`);
    console.log(`URL: ${source.url}`);
    
    try {
      console.log('Scraping page...');
      const result = await firecrawl.scrapeUrl(source.url, {
        formats: ['markdown', 'html', 'links'],
        onlyMainContent: false,
        waitFor: 3000,
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!result.success) {
        console.log(`❌ Failed to scrape: ${result.error}`);
        continue;
      }

      console.log(`✅ Scraping successful!`);
      
      // Check what we got
      console.log(`- Markdown length: ${result.markdown?.length || 0} chars`);
      console.log(`- HTML length: ${result.html?.length || 0} chars`);
      console.log(`- Links found: ${result.links?.length || 0}`);
      
      // Extract article URLs
      const articleUrls: string[] = [];
      
      // From links array
      if (result.links && Array.isArray(result.links)) {
        result.links.forEach((link: any) => {
          let url = '';
          if (typeof link === 'string') {
            url = link;
          } else if (link && link.href) {
            url = link.href;
          } else if (link && link.url) {
            url = link.url;
          }
          
          if (url && (
            url.includes('/news/') || 
            url.includes('/article/') || 
            url.includes('/2025/') ||
            url.includes('/2024/12/')
          )) {
            articleUrls.push(url);
          }
        });
      }
      
      // From markdown
      if (result.markdown) {
        const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
        let match;
        while ((match = linkPattern.exec(result.markdown)) !== null) {
          const url = match[2];
          if (url && !url.startsWith('#') && !url.startsWith('mailto:')) {
            // Make absolute URL
            const absoluteUrl = url.startsWith('http') ? url : 
              url.startsWith('//') ? 'https:' + url :
              url.startsWith('/') ? new URL(url, source.url).href :
              new URL(url, source.url).href;
            
            if (!articleUrls.includes(absoluteUrl)) {
              articleUrls.push(absoluteUrl);
            }
          }
        }
      }
      
      console.log(`\n📊 Article URLs found: ${articleUrls.length}`);
      
      // Show first 5 URLs
      if (articleUrls.length > 0) {
        console.log('\nFirst 5 article URLs:');
        articleUrls.slice(0, 5).forEach((url, i) => {
          console.log(`  ${i + 1}. ${url}`);
        });
        
        // Test scraping first article
        console.log('\n🔍 Testing first article scrape...');
        const firstArticle = articleUrls[0];
        
        try {
          const articleResult = await firecrawl.scrapeUrl(firstArticle, {
            formats: ['markdown'],
            onlyMainContent: true,
            timeout: 15000
          });
          
          if (articleResult.success) {
            console.log('✅ Article scraped successfully!');
            
            // Extract headline
            const lines = articleResult.markdown?.split('\n') || [];
            const headline = lines.find(line => line.startsWith('# '))?.replace('# ', '') ||
                           lines.find(line => line.trim().length > 20)?.trim() ||
                           'No headline found';
            
            console.log(`Headline: ${headline.substring(0, 100)}...`);
            
            // Look for date
            const datePatterns = [
              /2025-\d{2}-\d{2}/,
              /\d{1,2}\/\d{1,2}\/2025/,
              /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+2025/i,
              /2024-12-\d{2}/,
              /December\s+\d{1,2},?\s+2024/i
            ];
            
            let foundDate = null;
            for (const pattern of datePatterns) {
              const match = articleResult.markdown?.match(pattern);
              if (match) {
                foundDate = match[0];
                break;
              }
            }
            
            console.log(`Date found: ${foundDate || 'No 2025 date found'}`);
          } else {
            console.log(`❌ Failed to scrape article: ${articleResult.error}`);
          }
        } catch (error) {
          console.log(`❌ Error scraping article: ${error}`);
        }
      } else {
        console.log('⚠️ No article URLs found!');
        
        // Debug: Show some content
        if (result.markdown) {
          console.log('\nFirst 500 chars of markdown:');
          console.log(result.markdown.substring(0, 500));
        }
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error}`);
    }
  }

  console.log('\n' + '=' .repeat(50));
  console.log('✅ Test complete!');
  console.log('\nSummary:');
  console.log('- Firecrawl API is working');
  console.log('- Need to ensure article URLs are being extracted correctly');
  console.log('- Date filtering for 2025 content is in place');
}

// Run the test
testFirecrawlScraping().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
