import FirecrawlApp from '@mendable/firecrawl-js';

// Specific mining news sources to scrape directly
const MINING_SOURCES = [
  { name: 'Mining.com', url: 'https://www.mining.com/news/', selector: 'article' },
  { name: 'Kitco News', url: 'https://www.kitco.com/news/mining/', selector: '.news-item' },
  { name: 'Mining Weekly', url: 'https://www.miningweekly.com/news', selector: '.article' },
  { name: 'Northern Miner', url: 'https://www.northernminer.com/news/', selector: '.post' },
  { name: 'Mining Journal', url: 'https://www.mining-journal.com/news', selector: '.news-item' },
];

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

export class FirecrawlCombinedScraper {
  private firecrawl: FirecrawlApp;
  
  constructor() {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      throw new Error('FIRECRAWL_API_KEY is not set');
    }
    this.firecrawl = new FirecrawlApp({ apiKey });
  }
  
  // Web search queries for broader coverage - more specific to get actual articles
  private getSearchQueries(timeRange: 'today' | 'week' | 'month' = 'today'): string[] {
    // Comprehensive commodity-specific queries
    const commodityQueries = [
      // Precious metals
      'gold silver platinum palladium mining discovery',
      // Base metals
      'copper nickel zinc aluminum lead tin mining news',
      // Battery metals
      'lithium cobalt graphite manganese vanadium mining announcement',
      // Rare earth elements
      'rare earth neodymium dysprosium lanthanum cerium yttrium mining',
      // Energy resources
      'uranium coal mining production update',
      // Industrial minerals
      'phosphate potash gypsum limestone mining project',
      // Strategic metals
      'molybdenum tungsten chromium titanium tantalum mining',
      // Diamonds and gemstones
      'diamond emerald ruby sapphire mining exploration'
    ];
    
    const generalQueries = [
      'mining company announces new discovery',
      'mining project feasibility study results',
      'mining exploration drilling results breakthrough',
      'mining company merger acquisition deal',
      'new mining project approval permit granted',
      'mining production results quarterly report',
      'critical minerals project development update',
      'mining company stock price surge analysis',
      'mining environmental ESG sustainability report',
      'mining CEO executive leadership announcement',
      'mining reserve resource estimate updated',
      'mining expansion project investment funding',
      'mining technology innovation automation AI',
      'mining labor agreement wage increase'
    ];
    
    const allQueries = [...commodityQueries, ...generalQueries];
    
    const timeModifier = timeRange === 'today' ? 'today' : 
                         timeRange === 'week' ? 'this week' : 
                         'this month';
    
    const year = new Date().getFullYear();
    
    return allQueries.map(q => `${q} ${timeModifier} ${year} -filetype:pdf -site:*.edu -site:researchgate.net -site:academia.edu -site:arxiv.org -site:pubs.usgs.gov -site:*.com/ -site:*/news/ article`);
  }
  
  // Extract metadata from content
  private extractMetadata(content: string, url: string): Partial<NewsArticle> {
    const text = content.toLowerCase();
    
    // Comprehensive commodity list
    const commodities: string[] = [];
    const commodityKeywords = [
      'gold', 'silver', 'copper', 'lithium', 'nickel', 'cobalt', 
      'zinc', 'iron ore', 'uranium', 'platinum', 'palladium', 
      'rare earth', 'graphite', 'vanadium', 'manganese', 'tin',
      'tungsten', 'molybdenum', 'lead', 'aluminum', 'coal',
      'potash', 'phosphate', 'bauxite', 'chromium', 'titanium',
      'diamonds', 'emerald', 'ruby', 'sapphire'
    ];
    
    for (const commodity of commodityKeywords) {
      if (text.includes(commodity)) {
        const formatted = commodity.split(' ').map(w => 
          w.charAt(0).toUpperCase() + w.slice(1)
        ).join(' ');
        commodities.push(formatted);
      }
    }
    
    // Extract countries
    const countries: string[] = [];
    const countryKeywords = [
      'canada', 'australia', 'chile', 'peru', 'mexico', 'brazil',
      'south africa', 'russia', 'china', 'india', 'indonesia',
      'united states', 'usa', 'congo', 'drc', 'zambia', 'ghana',
      'argentina', 'bolivia', 'colombia', 'ecuador', 'kazakhstan'
    ];
    
    for (const country of countryKeywords) {
      if (text.includes(country)) {
        const formatted = country.split(' ').map(w => 
          w.charAt(0).toUpperCase() + w.slice(1)
        ).join(' ');
        countries.push(formatted);
      }
    }
    
    // Calculate sentiment score
    let sentimentScore = 0;
    const positiveWords = [
      'surge', 'gain', 'rise', 'boom', 'growth', 'record', 'success', 
      'breakthrough', 'increase', 'profit', 'expansion', 'discovery',
      'upgrade', 'improve', 'advance', 'achieve', 'exceed'
    ];
    const negativeWords = [
      'decline', 'fall', 'drop', 'crash', 'loss', 'concern', 'risk', 
      'challenge', 'decrease', 'deficit', 'closure', 'suspension',
      'delay', 'halt', 'reduce', 'cut', 'warning', 'threat'
    ];
    
    const posCount = positiveWords.filter(w => text.includes(w)).length;
    const negCount = negativeWords.filter(w => text.includes(w)).length;
    
    if (posCount > negCount) {
      sentimentScore = Math.min(0.5 + (posCount - negCount) * 0.1, 1.0);
    } else if (negCount > posCount) {
      sentimentScore = Math.max(-0.5 - (negCount - posCount) * 0.1, -1.0);
    }
    
    // Calculate relevance score (must be integer)
    const miningKeywords = [
      'mining', 'mine', 'mineral', 'exploration', 'drilling', 
      'resource', 'ore', 'deposit', 'extraction', 'processing',
      'feasibility', 'production', 'reserves', 'tailings', 'smelter',
      'concentrator', 'mill', 'heap leach', 'underground', 'open pit'
    ];
    const relevanceScore = Math.round(Math.min(miningKeywords.filter(k => text.includes(k)).length * 1.5, 10));
    
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
      countries,
      sentiment_score: sentimentScore,
      relevance_score: Math.max(relevanceScore, 1),
      source_name: sourceName
    };
  }
  
  // Parse date from various formats with strict validation
  private parseDate(dateStr: string | undefined): Date | null {
    if (!dateStr) return new Date();
    
    try {
      // Handle relative dates
      const relativePatterns = [
        { pattern: /today/i, days: 0 },
        { pattern: /yesterday/i, days: -1 },
        { pattern: /(\d+)\s+(hour|minute)s?\s+ago/i, type: 'time' },
        { pattern: /(\d+)\s+days?\s+ago/i, type: 'days' }
      ];
      
      for (const { pattern, days, type } of relativePatterns) {
        const match = dateStr.match(pattern);
        if (match) {
          const date = new Date();
          if (type === 'time') {
            const amount = parseInt(match[1]);
            const unit = match[2].toLowerCase();
            if (unit.includes('hour')) {
              date.setHours(date.getHours() - amount);
            } else {
              date.setMinutes(date.getMinutes() - amount);
            }
          } else if (type === 'days') {
            const daysAgo = parseInt(match[1]);
            date.setDate(date.getDate() - daysAgo);
          } else if (typeof days === 'number') {
            date.setDate(date.getDate() + days);
          }
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
  
  // Validate that date is recent (within last 30 days)
  private isRecentDate(date: Date | null): boolean {
    if (!date) return false;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const futureLimit = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000); // Allow 1 day in future for timezone differences
    return date >= thirtyDaysAgo && date <= futureLimit;
  }
  
  // Validate that URL is a specific article, not a homepage, PDF, or academic resource
  private isValidArticleUrl(url: string, title: string): boolean {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const hostname = urlObj.hostname;
      
      // Reject PDF files
      if (pathname.toLowerCase().endsWith('.pdf') || pathname.includes('/pdf/')) {
        console.log(`Rejected PDF file: ${url}`);
        return false;
      }
      
      // Reject academic and research domains
      const academicDomains = [
        '.edu', '.ac.', 'researchgate.net', 'academia.edu', 'arxiv.org',
        'sciencedirect.com', 'springer.com', 'jstor.org', 'pubmed.ncbi',
        'pubs.usgs.gov', 'pubs.rsc.org', 'engineering.org.cn',
        'silverado.org/reports', 'irena.org', 'worldbank.org/opendata'
      ];
      
      if (academicDomains.some(domain => hostname.includes(domain))) {
        console.log(`Rejected academic/research URL: ${url}`);
        return false;
      }
      
      // Reject homepage URLs
      const homepagePatterns = [
        /^\/?$/,  // Just domain or domain/
        /^\/news\/?$/,  // /news or /news/
        /^\/mining\/?$/,  // /mining or /mining/
        /^\/articles?\/?$/,  // /article or /articles
        /^\/press-releases?\/?$/,  // /press-release or /press-releases
        /^\/category\/?$/,  // /category
        /^\/tag\/?$/  // /tag
      ];
      
      for (const pattern of homepagePatterns) {
        if (pattern.test(pathname)) {
          console.log(`Rejected homepage URL: ${url}`);
          return false;
        }
      }
      
      // URL should contain article identifiers (dates, IDs, slugs)
      const hasArticleIdentifier = 
        /\d{4}\/\d{2}\/\d{2}/.test(pathname) || // Date in path (2025/09/30)
        /\d{4}-\d{2}-\d{2}/.test(pathname) ||   // Date in path (2025-09-30)
        /\/\d{6,}/.test(pathname) ||             // Numeric ID (6+ digits)
        pathname.split('/').filter(Boolean).length >= 2; // At least 2 path segments
      
      if (!hasArticleIdentifier) {
        console.log(`Rejected URL without article identifier: ${url}`);
        return false;
      }
      
      // Reject titles that look like site names/homepages
      const genericTitlePatterns = [
        /^[\w\s]+(\.com|\.org|\.net)$/i,  // "Site.com"
        /^[\w\s]+\s*\|\s*(home|news|mining|latest|global|magazine|publication|leading|source)$/i,  // "Site | Home"
        /^(home|news|mining|latest|all|global)\s*[-|:]\s*[\w\s]+$/i,  // "Home - Site"
        /^[\w\s]+:\s*(home|news|mining|global|magazine)$/i,  // "Site: Home"
        /^the\s+[\w\s]+:\s*(home|news|global)/i,  // "The Site: Home"
        /mining\s+(magazine|journal|review|news)\s*[:|]\s*/i,  // "Mining Magazine:" or "Mining Journal:"
        /^[\w\s]+\s*\|\s*mining\s+(news|magazine|journal|publication)/i,  // "Site | Mining News"
        /^global\s+mining\s+(review|news|magazine)/i,  // "Global Mining Review"
        /leading\s+(publication|source|magazine)\s+for/i,  // "Leading publication for"
        /in-depth\s+features/i  // "in-depth features"
      ];
      
      for (const pattern of genericTitlePatterns) {
        if (pattern.test(title)) {
          console.log(`Rejected generic title: ${title}`);
          return false;
        }
      }
      
      return true;
    } catch (e) {
      console.error('URL validation error:', e);
      return false;
    }
  }
  
  // Scrape specific mining sites
  private async scrapeSpecificSites(
    maxPerSite: number = 3,
    onProgress?: (update: any) => void
  ): Promise<NewsArticle[]> {
    const articles: NewsArticle[] = [];
    let sitesProcessed = 0;
    
    for (const source of MINING_SOURCES) {
      try {
        onProgress?.({
          type: 'status',
          stage: 'scraping',
          description: `Scraping ${source.name} for latest articles`,
          sitesProcessed: ++sitesProcessed,
          totalSites: MINING_SOURCES.length
        });
        
        const result = await this.firecrawl.scrapeUrl(source.url, {
          formats: ['markdown', 'links'],
          onlyMainContent: true,
          waitFor: 2000
        });
        
        if (result.success && result.data) {
          // Extract article links
          const links = result.data.links || [];
          const articleLinks = links
            .filter(link => link.includes('/news/') || link.includes('/article/'))
            .slice(0, maxPerSite);
          
          // Scrape individual articles
          for (const articleUrl of articleLinks) {
            try {
              const articleResult = await this.firecrawl.scrapeUrl(articleUrl, {
                formats: ['markdown'],
                onlyMainContent: true,
                timeout: 10000
              });
              
              if (articleResult.success && articleResult.data) {
                const content = articleResult.data.markdown || '';
                
                // Extract headline from content or URL
                const headlineMatch = content.match(/^#\s+(.+)/m);
                const headline = headlineMatch ? headlineMatch[1] : 
                               articleUrl.split('/').pop()?.replace(/-/g, ' ') || 'Untitled';
                
                // Validate URL and title
                if (!this.isValidArticleUrl(articleUrl, headline)) {
                  continue; // Skip this article
                }
                
                // Parse and validate date
                const publishedDate = this.parseDate(articleResult.data.publishedDate);
                if (!this.isRecentDate(publishedDate)) {
                  console.log(`Skipping old article: ${headline} (${publishedDate})`);
                  continue; // Skip old articles
                }
                
                const metadata = this.extractMetadata(content, articleUrl);
                
                // Extract summary
                const summary = content
                  .replace(/^#.+$/gm, '')
                  .replace(/\n+/g, ' ')
                  .replace(/\s+/g, ' ')
                  .trim()
                  .substring(0, 200);
                
                articles.push({
                  headline,
                  summary,
                  url: articleUrl,
                  source_name: source.name,
                  published_date: publishedDate,
                  ...metadata
                });
                
                onProgress?.({
                  type: 'article_saved',
                  source: source.name,
                  headline,
                  totalSaved: articles.length
                });
              }
            } catch (error) {
              console.error(`Error scraping article ${articleUrl}:`, error);
            }
          }
        }
      } catch (error) {
        console.error(`Error scraping ${source.name}:`, error);
      }
    }
    
    return articles;
  }
  
  // Scrape using web search
  private async scrapeWebSearch(
    maxResults: number = 15,
    onProgress?: (update: any) => void
  ): Promise<NewsArticle[]> {
    const articles: NewsArticle[] = [];
    const seenUrls = new Set<string>();
    
    // Try different time ranges
    const timeRanges: ('today' | 'week' | 'month')[] = ['today', 'week', 'month'];
    
    for (const timeRange of timeRanges) {
      if (articles.length >= maxResults) break;
      
      const queries = this.getSearchQueries(timeRange);
      const querySubset = queries.slice(0, 3); // Limit queries per timerange
      
      onProgress?.({
        type: 'status',
        stage: 'searching',
        description: `Searching web for ${timeRange}'s mining news using ${querySubset.length} search queries`,
        articlesFound: articles.length
      });
      
      for (const query of querySubset) {
        if (articles.length >= maxResults) break;
        
        try {
          console.log(`Searching: ${query}`);
          
          const searchResult = await this.firecrawl.search(query, {
            limit: 10,
            scrapeOptions: {
              formats: ['markdown'],
              onlyMainContent: true
            }
          });
          
          if (searchResult.success && searchResult.data) {
            for (const result of searchResult.data) {
              // Skip duplicates
              if (seenUrls.has(result.url)) continue;
              
              // Extract content
              const content = result.markdown || result.content || '';
              const title = result.title || 'Untitled';
              
              // Validate URL and title first
              if (!this.isValidArticleUrl(result.url, title)) {
                continue; // Skip generic/homepage links
              }
              
              // Parse and validate date
              const publishedDate = this.parseDate(result.publishedDate);
              if (!this.isRecentDate(publishedDate)) {
                console.log(`Skipping old article: ${title} (${publishedDate})`);
                continue; // Skip old articles
              }
              
              seenUrls.add(result.url);
              
              // Skip if not mining related
              if (!content.toLowerCase().includes('mining') && 
                  !content.toLowerCase().includes('mineral') &&
                  !content.toLowerCase().includes('metal')) {
                continue;
              }
              
              // Extract metadata
              const metadata = this.extractMetadata(content, result.url);
              
              // Extract summary
              const summary = content
                .replace(/\n+/g, ' ')
                .replace(/\s+/g, ' ')
                .trim()
                .substring(0, 200);
              
              articles.push({
                headline: title,
                summary: summary || 'No summary available',
                url: result.url,
                published_date: publishedDate,
                ...metadata
              });
              
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
      
      // Provide status update on time range expansion
      if (timeRange === 'today' && articles.length < 10) {
        onProgress?.({
          type: 'status',
          stage: 'searching',
          description: `Found only ${articles.length} articles today, expanding search to this week`,
          articlesFound: articles.length
        });
      } else if (timeRange === 'week' && articles.length < 10) {
        onProgress?.({
          type: 'status',
          stage: 'searching',
          description: `Found only ${articles.length} articles this week, expanding search to this month`,
          articlesFound: articles.length
        });
      }
    }
    
    return articles;
  }
  
  // Main scraping method combining both approaches
  async scrapeAll(
    maxResults: number = 25,
    onProgress?: (update: any) => void
  ): Promise<{ articles: NewsArticle[], totalScraped: number, totalSaved: number }> {
    const allArticles: NewsArticle[] = [];
    const seenUrls = new Set<string>();
    
    // Step 1: Scrape specific mining sites
    onProgress?.({
      type: 'status',
      stage: 'initializing',
      description: 'Starting targeted scrape of Mining.com, Kitco News, Mining Weekly, Northern Miner, and Mining Journal',
      progress: 5
    });
    
    const siteArticles = await this.scrapeSpecificSites(3, onProgress);
    for (const article of siteArticles) {
      if (!seenUrls.has(article.url)) {
        seenUrls.add(article.url);
        allArticles.push(article);
      }
    }
    
    onProgress?.({
      type: 'status',
      stage: 'searching',
      description: `Found ${allArticles.length} articles from specific sites, now searching broader web`,
      articlesFound: allArticles.length,
      progress: 40
    });
    
    // Step 2: Web search for additional articles
    const webArticles = await this.scrapeWebSearch(maxResults - allArticles.length, onProgress);
    for (const article of webArticles) {
      if (!seenUrls.has(article.url)) {
        seenUrls.add(article.url);
        allArticles.push(article);
      }
    }
    
    // Sort by date (newest first)
    allArticles.sort((a, b) => {
      if (!a.published_date) return 1;
      if (!b.published_date) return -1;
      return b.published_date.getTime() - a.published_date.getTime();
    });
    
    const finalArticles = allArticles.slice(0, maxResults);
    
    onProgress?.({
      type: 'complete',
      totalScraped: seenUrls.size,
      totalSaved: finalArticles.length
    });
    
    return {
      articles: finalArticles,
      totalScraped: seenUrls.size,
      totalSaved: finalArticles.length
    };
  }
}
