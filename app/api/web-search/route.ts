// Web search API using Firecrawl
import { NextResponse } from 'next/server';
import FirecrawlApp from '@mendable/firecrawl-js';

export async function POST(req: Request) {
  try {
    const { query } = await req.json();
    
    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }
    
    // Get Firecrawl API key from environment
    const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
    
    if (!firecrawlApiKey) {
      console.error('Firecrawl API key not found');
      return NextResponse.json({ 
        results: [],
        error: 'Web search configuration error' 
      });
    }
    
    // Initialize Firecrawl
    const firecrawl = new FirecrawlApp({ apiKey: firecrawlApiKey });
    
    // Add mining-specific context to the query
    const miningQuery = `${query} mining industry commodity technical report`;
    
    // Retry mechanism for API calls
    let attempts = 0;
    const maxAttempts = 2;
    let lastError = null;
    
    while (attempts < maxAttempts) {
      attempts++;
      
      try {
        // Use Firecrawl search API
        const searchResults = await firecrawl.search(miningQuery, {
          limit: 5,
          scrapeOptions: {
            formats: ["markdown"],
            timeout: 20000,
            waitFor: 500,
            includeTags: ['article', 'main', 'section', 'div', 'p'],
            excludeTags: ['nav', 'header', 'footer', 'aside', 'script', 'style', 'advertisement']
          }
        });
        
        if (!searchResults.success || !searchResults.data) {
          lastError = new Error('No search results returned');
          
          if (attempts < maxAttempts) {
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
        }
        
        // Transform Firecrawl results to our format
        const results = (searchResults.data || []).map((item: any) => ({
          title: item.title || 'No title',
          link: item.url || '#',
          snippet: item.markdown ? 
            item.markdown.substring(0, 200) + (item.markdown.length > 200 ? '...' : '') :
            'No content available'
        }));
        
        return NextResponse.json({ results });
        
      } catch (error) {
        console.error(`Error during Firecrawl search (attempt ${attempts}):`, error);
        lastError = error;
        
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
      }
    }
    
    // If all attempts failed, return error but continue without search
    console.error('All Firecrawl search attempts failed:', lastError);
    return NextResponse.json({ 
      results: [],
      error: 'Web search temporarily unavailable, continuing without search results'
    });
    
  } catch (error) {
    console.error('Web search error:', error);
    return NextResponse.json({ 
      results: [],
      error: 'Failed to perform web search' 
    });
  }
} 