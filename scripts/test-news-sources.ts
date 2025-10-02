import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '../.env.local') });

import { FirecrawlNewsScraper, NEWS_SOURCES } from '../lib/news-scraper/firecrawl-news-scraper';

async function testNewsSources() {
  console.log('🧪 Testing News Sources\n');
  console.log('==================================================\n');
  
  const scraper = new FirecrawlNewsScraper();
  const results: { source: string; status: string; articles: number; error?: string }[] = [];
  
  // Test each source
  for (const source of NEWS_SOURCES.slice(0, 5)) { // Test first 5 sources
    console.log(`Testing ${source.name}...`);
    
    try {
      const articles = await scraper.scrapeNewsSource(source, 2); // Try to get 2 articles
      
      if (articles.length > 0) {
        console.log(`✅ ${source.name}: Found ${articles.length} articles`);
        console.log(`   Sample headline: ${articles[0].headline}`);
        results.push({ source: source.name, status: 'working', articles: articles.length });
      } else {
        console.log(`⚠️ ${source.name}: No articles found`);
        results.push({ source: source.name, status: 'no_articles', articles: 0 });
      }
    } catch (error) {
      console.log(`❌ ${source.name}: Error - ${error instanceof Error ? error.message : 'Unknown error'}`);
      results.push({ 
        source: source.name, 
        status: 'error', 
        articles: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    console.log('');
  }
  
  // Summary
  console.log('==================================================');
  console.log('📊 Summary:\n');
  
  const working = results.filter(r => r.status === 'working');
  const noArticles = results.filter(r => r.status === 'no_articles');
  const errors = results.filter(r => r.status === 'error');
  
  console.log(`✅ Working sources: ${working.length}`);
  working.forEach(r => console.log(`   - ${r.source} (${r.articles} articles)`));
  
  if (noArticles.length > 0) {
    console.log(`\n⚠️ No articles found: ${noArticles.length}`);
    noArticles.forEach(r => console.log(`   - ${r.source}`));
  }
  
  if (errors.length > 0) {
    console.log(`\n❌ Errors: ${errors.length}`);
    errors.forEach(r => console.log(`   - ${r.source}: ${r.error}`));
  }
}

testNewsSources().catch(console.error);
