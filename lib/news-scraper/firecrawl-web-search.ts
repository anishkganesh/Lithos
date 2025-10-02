import FirecrawlApp from '@mendable/firecrawl-js';
import OpenAI from 'openai';

// Initialize clients
const firecrawl = new FirecrawlApp({ 
  apiKey: process.env.FIRECRAWL_API_KEY! 
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

interface NewsArticle {
  headline: string;
  summary: string;
  url: string;
  source_name: string;
  published_date: Date | null;
  primary_commodity?: string;
  secondary_commodities?: string[];
  company?: string;
  symbol?: string;
  countries?: string[];
  regions?: string[];
  project_names?: string[];
  topics?: string[];
  tags?: string[];
  sentiment_score?: number;
  relevance_score?: number;
}

export class FirecrawlWebSearchScraper {
  // Dynamic search queries based on time range
  private getSearchQueries(timeRange: 'today' | 'week' | 'month' = 'today'): string[] {
    const baseQueries = [
      'mining news and announcements',
      'latest mining industry updates',
      'mining company press releases',
      'mineral exploration news',
      'mining project developments',
      'gold silver copper lithium mining news',
      'mining mergers acquisitions deals',
      'mining feasibility studies bankable',
      'mining production updates operations',
      'mining stocks market news',
      'mining technology innovations',
      'mining environmental sustainability ESG'
    ];
    
    const timeModifier = timeRange === 'today' ? 'today' : 
                         timeRange === 'week' ? 'this week past 7 days' : 
                         'this month past 30 days';
    
    return baseQueries.map(q => `${q} ${timeModifier} ${new Date().getFullYear()}`);
  }
  
  // Extract metadata from content
  private extractMetadata(content: string, url: string): Partial<NewsArticle> {
    const text = content.toLowerCase();
    
    // Extract commodities
    const commodities: string[] = [];
    const commodityKeywords = [
      'gold', 'silver', 'copper', 'lithium', 'nickel', 'cobalt', 
      'zinc', 'iron ore', 'uranium', 'platinum', 'palladium', 
      'rare earth', 'graphite', 'vanadium', 'manganese', 'tin',
      'tungsten', 'molybdenum', 'lead', 'aluminum', 'coal'
    ];
    
    for (const commodity of commodityKeywords) {
      if (text.includes(commodity)) {
        commodities.push(commodity.charAt(0).toUpperCase() + commodity.slice(1));
      }
    }
    
    // Calculate sentiment score
    let sentimentScore = 0;
    const positiveWords = [
      'surge', 'gain', 'rise', 'boom', 'growth', 'record', 'success', 
      'breakthrough', 'increase', 'profit', 'expansion', 'discovery'
    ];
    const negativeWords = [
      'decline', 'fall', 'drop', 'crash', 'loss', 'concern', 'risk', 
      'challenge', 'decrease', 'deficit', 'closure', 'suspension'
    ];
    
    const posCount = positiveWords.filter(w => text.includes(w)).length;
    const negCount = negativeWords.filter(w => text.includes(w)).length;
    
    if (posCount > negCount) {
      sentimentScore = Math.min(0.5 + (posCount - negCount) * 0.1, 1.0);
    } else if (negCount > posCount) {
      sentimentScore = Math.max(-0.5 - (negCount - posCount) * 0.1, -1.0);
    }
    
    // Calculate relevance score
    const miningKeywords = [
      'mining', 'mine', 'mineral', 'exploration', 'drilling', 
      'resource', 'ore', 'deposit', 'extraction', 'processing',
      'feasibility', 'production', 'reserves', 'tailings'
    ];
    const relevanceScore = Math.min(miningKeywords.filter(k => text.includes(k)).length * 1.5, 10);
    
    // Extract source name from URL
    const sourceName = new URL(url).hostname
      .replace('www.', '')
      .replace('.com', '')
      .replace('.org', '')
      .replace('.net', '')
      .split('.')[0]
      .replace(/-/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    return {
      primary_commodity: commodities[0],
      secondary_commodities: commodities.slice(1),
      sentiment_score: sentimentScore,
      relevance_score: Math.max(relevanceScore, 1),
      source_name: sourceName
    };
  }
  
  // Parse date from various formats
  private parseDate(dateStr: string | undefined): Date | null {
    if (!dateStr) return new Date();
    
    try {
      // Handle relative dates
      if (dateStr.toLowerCase().includes('today')) {
        return new Date();
      } else if (dateStr.toLowerCase().includes('yesterday')) {
        const date = new Date();
        date.setDate(date.getDate() - 1);
        return date;
      } else if (dateStr.match(/\d+ (hour|minute)s? ago/i)) {
        const match = dateStr.match(/(\d+) (hour|minute)s? ago/i);
        if (match) {
          const amount = parseInt(match[1]);
          const unit = match[2].toLowerCase();
          const date = new Date();
          if (unit.includes('hour')) {
            date.setHours(date.getHours() - amount);
          } else {
            date.setMinutes(date.getMinutes() - amount);
          }
          return date;
        }
      } else if (dateStr.match(/\d+ days? ago/i)) {
        const match = dateStr.match(/(\d+) days? ago/i);
        if (match) {
          const days = parseInt(match[1]);
          const date = new Date();
          date.setDate(date.getDate() - days);
          return date;
        }
      }
      
      // Try parsing as standard date
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    } catch (e) {
      console.error('Date parsing error:', e);
    }
    
    return new Date();
  }
  
  // Scrape using web search
  async scrapeWebSearch(
    maxResults: number = 20,
    onProgress?: (update: any) => void
  ): Promise<{ articles: NewsArticle[], totalScraped: number, totalSaved: number }> {
    const articles: NewsArticle[] = [];
    const seenUrls = new Set<string>();
    let totalScraped = 0;
    
    // Try different time ranges
    const timeRanges: ('today' | 'week' | 'month')[] = ['today', 'week', 'month'];
    
    for (const timeRange of timeRanges) {
      if (articles.length >= maxResults) break;
      
      const queries = this.getSearchQueries(timeRange);
      
      onProgress?.({
        type: 'status',
        message: `Searching for ${timeRange}'s mining news...`,
        progress: timeRange === 'today' ? 20 : timeRange === 'week' ? 50 : 70
      });
      
      // Search with multiple queries
      for (const query of queries.slice(0, 3)) { // Limit queries per timerange
        if (articles.length >= maxResults) break;
        
        try {
          console.log(`Searching: ${query}`);
          
          // Use Firecrawl to search and scrape
          const searchResult = await firecrawl.search(query, {
            limit: 10,
            scrapeOptions: {
              formats: ['markdown'],
              onlyMainContent: true
            }
          });
          
          if (searchResult.success && searchResult.data) {
            for (const result of searchResult.data) {
              totalScraped++;
              
              // Skip duplicates
              if (seenUrls.has(result.url)) continue;
              seenUrls.add(result.url);
              
              // Extract content
              const content = result.markdown || result.content || '';
              const title = result.title || 'Untitled';
              
              // Skip if not mining related
              if (!content.toLowerCase().includes('mining') && 
                  !content.toLowerCase().includes('mineral') &&
                  !content.toLowerCase().includes('metal')) {
                continue;
              }
              
              // Extract metadata
              const metadata = this.extractMetadata(content, result.url);
              
              // Extract summary (first 200 chars of content)
              const summary = content
                .replace(/\n+/g, ' ')
                .replace(/\s+/g, ' ')
                .trim()
                .substring(0, 200);
              
              // Create article
              const article: NewsArticle = {
                headline: title,
                summary: summary || 'No summary available',
                url: result.url,
                published_date: this.parseDate(result.publishedDate),
                ...metadata
              };
              
              articles.push(article);
              
              onProgress?.({
                type: 'article_saved',
                source: metadata.source_name,
                headline: title,
                totalSaved: articles.length
              });
              
              if (articles.length >= maxResults) break;
            }
          }
        } catch (error) {
          console.error(`Error searching for "${query}":`, error);
        }
      }
      
      // If we found enough for today, don't expand
      if (timeRange === 'today' && articles.length >= 10) {
        console.log(`Found ${articles.length} articles from today`);
        break;
      } else if (timeRange === 'today' && articles.length < 10) {
        console.log(`Only ${articles.length} today, expanding to week...`);
      } else if (timeRange === 'week' && articles.length < 10) {
        console.log(`Only ${articles.length} this week, expanding to month...`);
      }
    }
    
    // Sort by date (newest first)
    articles.sort((a, b) => {
      if (!a.published_date) return 1;
      if (!b.published_date) return -1;
      return b.published_date.getTime() - a.published_date.getTime();
    });
    
    onProgress?.({
      type: 'complete',
      totalScraped,
      totalSaved: articles.length
    });
    
    return {
      articles: articles.slice(0, maxResults),
      totalScraped,
      totalSaved: Math.min(articles.length, maxResults)
    };
  }
}
