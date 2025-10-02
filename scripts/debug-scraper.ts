import FirecrawlApp from '@mendable/firecrawl-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function debugScraper() {
  const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY! });
  
  console.log('🔍 Debugging Mining.com scraping...\n');
  
  const result = await firecrawl.scrapeUrl('https://www.mining.com', {
    formats: ['markdown', 'html', 'links'],
    onlyMainContent: false,
    waitFor: 3000,
    timeout: 30000
  });
  
  if (!result.success) {
    console.log('❌ Scraping failed');
    return;
  }
  
  console.log('✅ Scraped successfully');
  console.log('Links found:', result.links?.length || 0);
  
  // Show all links that might be articles
  const articleLinks = (result.links || [])
    .filter((link: any) => {
      const url = typeof link === 'string' ? link : link.href || link.url || '';
      return url && (
        url.includes('mining.com/web/') ||
        url.includes('mining.com/news/') ||
        url.match(/mining\.com\/[a-z-]+-\d{4,}/) ||
        url.includes('/2025/') ||
        url.includes('/2024/')
      );
    })
    .map((link: any) => typeof link === 'string' ? link : link.href || link.url || '');
  
  console.log('\nPotential article links:', articleLinks.length);
  articleLinks.slice(0, 10).forEach((url: string, i: number) => {
    console.log(`${i + 1}. ${url}`);
  });
  
  // Also check markdown for links
  if (result.markdown) {
    const mdLinks = result.markdown.match(/\[([^\]]+)\]\(([^)]+)\)/g) || [];
    console.log('\nLinks in markdown:', mdLinks.length);
    
    // Find news article patterns
    const newsLinks = mdLinks
      .map(link => link.match(/\]\(([^)]+)\)/)?.[1])
      .filter(url => url && (
        url.includes('/web/') ||
        url.includes('/news/') ||
        url.match(/\/[a-z-]+-\d{6,}/)
      ));
    
    console.log('News links in markdown:', newsLinks?.length || 0);
    newsLinks?.slice(0, 5).forEach((url, i) => {
      console.log(`${i + 1}. ${url}`);
    });
  }
}

debugScraper().catch(console.error);
