import FirecrawlApp from '@mendable/firecrawl-js';

interface NewsSearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  publishedDate?: string;
}

interface ProcessedNewsItem {
  headline: string;
  summary: string;
  url: string;
  source_name: string;
  published_date: Date | null;
  primary_commodity?: string;
  company?: string;
  countries?: string[];
  regions?: string[];
  project_names?: string[];
  sentiment?: string;
  relevance_score?: number;
}

export class WebSearchNewsFetcher {
  private firecrawl: FirecrawlApp;
  
  constructor() {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      throw new Error('FIRECRAWL_API_KEY is not set');
    }
    this.firecrawl = new FirecrawlApp({ apiKey });
  }
  
  // Dynamic search queries based on time range
  private getSearchQueries(timeRange: 'today' | 'week' | 'month' = 'today'): string[] {
    const baseQueries = [
      'mining news and announcements',
      'latest mining industry updates',
      'mining company press releases',
      'mineral exploration news',
      'mining project developments',
      'commodity mining news gold silver copper lithium',
      'mining mergers acquisitions deals',
      'mining feasibility studies reports',
      'mining production updates'
    ];
    
    const timeModifier = timeRange === 'today' ? 'today' : 
                         timeRange === 'week' ? 'this week' : 
                         'this month';
    
    return baseQueries.map(q => `${q} ${timeModifier}`);
  }
  
  // Extract metadata from search results
  private extractMetadata(result: any): Partial<ProcessedNewsItem> {
    const text = `${result.title || ''} ${result.snippet || ''}`.toLowerCase();
    
    // Extract commodities
    const commodities = [];
    const commodityKeywords = ['gold', 'silver', 'copper', 'lithium', 'nickel', 'cobalt', 'zinc', 'iron', 'uranium', 'platinum', 'palladium', 'rare earth'];
    for (const commodity of commodityKeywords) {
      if (text.includes(commodity)) {
        commodities.push(commodity.charAt(0).toUpperCase() + commodity.slice(1));
      }
    }
    
    // Extract sentiment
    let sentiment = 'neutral';
    const positiveWords = ['surge', 'gain', 'rise', 'boom', 'growth', 'record', 'success', 'breakthrough'];
    const negativeWords = ['decline', 'fall', 'drop', 'crash', 'loss', 'concern', 'risk', 'challenge'];
    
    const posCount = positiveWords.filter(w => text.includes(w)).length;
    const negCount = negativeWords.filter(w => text.includes(w)).length;
    
    if (posCount > negCount) sentiment = 'positive';
    else if (negCount > posCount) sentiment = 'negative';
    
    // Calculate relevance score
    const miningKeywords = ['mining', 'mine', 'mineral', 'exploration', 'drilling', 'resource', 'ore', 'deposit'];
    const relevanceScore = miningKeywords.filter(k => text.includes(k)).length * 2;
    
    return {
      primary_commodity: commodities[0],
      sentiment,
      relevance_score: Math.min(relevanceScore, 10)
    };
  }
  
  // Parse date from various formats
  private parseDate(dateStr?: string): Date | null {
    if (!dateStr) return null;
    
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
    
    return null;
  }
  
  // Fetch news using web search
  async fetchNews(
    maxResults: number = 20,
    onProgress?: (message: string) => void
  ): Promise<ProcessedNewsItem[]> {
    const allResults: ProcessedNewsItem[] = [];
    const seenUrls = new Set<string>();
    
    // Try different time ranges
    const timeRanges: ('today' | 'week' | 'month')[] = ['today', 'week', 'month'];
    
    for (const timeRange of timeRanges) {
      if (allResults.length >= maxResults) break;
      
      onProgress?.(`Searching for ${timeRange}'s mining news...`);
      
      const queries = this.getSearchQueries(timeRange);
      
      // Search with multiple queries
      for (const query of queries) {
        if (allResults.length >= maxResults) break;
        
        try {
          console.log(`Searching: ${query}`);
          
          // Use Firecrawl's search capability
          const searchResults = await this.firecrawl.search(query, {
            limit: 10
          });
          
          if (searchResults.success && searchResults.data) {
            for (const result of searchResults.data) {
              // Skip duplicates
              if (seenUrls.has(result.url)) continue;
              seenUrls.add(result.url);
              
              // Extract metadata
              const metadata = this.extractMetadata(result);
              
              // Parse the result
              const newsItem: ProcessedNewsItem = {
                headline: result.title || 'Untitled',
                summary: result.snippet || result.markdown?.substring(0, 200) || '',
                url: result.url,
                source_name: result.sourceName || new URL(result.url).hostname.replace('www.', ''),
                published_date: this.parseDate(result.publishedDate),
                ...metadata
              };
              
              allResults.push(newsItem);
              onProgress?.(`Found article: ${newsItem.headline}`);
              
              if (allResults.length >= maxResults) break;
            }
          }
        } catch (error) {
          console.error(`Error searching for "${query}":`, error);
        }
      }
      
      // If we found enough results for today, don't expand to week/month
      if (timeRange === 'today' && allResults.length >= 10) {
        onProgress?.(`Found ${allResults.length} articles from today`);
        break;
      } else if (timeRange === 'today' && allResults.length < 10) {
        onProgress?.(`Only found ${allResults.length} articles today, expanding search to this week...`);
      } else if (timeRange === 'week' && allResults.length < 10) {
        onProgress?.(`Only found ${allResults.length} articles this week, expanding search to this month...`);
      }
    }
    
    // Sort by date (newest first)
    allResults.sort((a, b) => {
      if (!a.published_date) return 1;
      if (!b.published_date) return -1;
      return b.published_date.getTime() - a.published_date.getTime();
    });
    
    onProgress?.(`Search complete: Found ${allResults.length} unique articles`);
    
    return allResults.slice(0, maxResults);
  }
  
  // Enhanced search with specific topics
  async searchSpecificTopic(
    topic: string,
    maxResults: number = 10,
    onProgress?: (message: string) => void
  ): Promise<ProcessedNewsItem[]> {
    const results: ProcessedNewsItem[] = [];
    const seenUrls = new Set<string>();
    
    onProgress?.(`Searching for: ${topic}`);
    
    try {
      const searchResults = await this.firecrawl.search(topic, {
        limit: maxResults
      });
      
      if (searchResults.success && searchResults.data) {
        for (const result of searchResults.data) {
          if (seenUrls.has(result.url)) continue;
          seenUrls.add(result.url);
          
          const metadata = this.extractMetadata(result);
          
          const newsItem: ProcessedNewsItem = {
            headline: result.title || 'Untitled',
            summary: result.snippet || result.markdown?.substring(0, 200) || '',
            url: result.url,
            source_name: result.sourceName || new URL(result.url).hostname.replace('www.', ''),
            published_date: this.parseDate(result.publishedDate),
            ...metadata
          };
          
          results.push(newsItem);
        }
      }
    } catch (error) {
      console.error(`Error searching for topic "${topic}":`, error);
    }
    
    return results;
  }
}
