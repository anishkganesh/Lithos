import FirecrawlApp from '@mendable/firecrawl-js';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import {
  extractSymbol,
  extractCommodities,
  extractPrimaryCommodity,
  extractTags,
  extractCompanyName,
  isMiningRelated,
  isProjectRelated,
  mentionsFinancials,
  mentionsTechnicalReport,
  calculateSentiment
} from './extraction-patterns';
import { extractProjectsWithConfidence } from './mining-entities';

// Define news sources with their specific selectors and patterns
export const NEWS_SOURCES = [
  {
    name: 'Mining.com',
    url: 'https://www.mining.com',
    searchUrl: 'https://www.mining.com',
    type: 'news',
    selectors: {
      articles: 'article',
      headline: 'h2, h3',
      date: 'time',
      content: '.entry-content'
    }
  },
  {
    name: 'Kitco News',
    url: 'https://www.kitco.com',
    searchUrl: 'https://www.kitco.com/news/',
    type: 'news',
    selectors: {
      articles: '.news-item',
      headline: '.news-title',
      date: '.news-date',
      content: '.news-summary'
    }
  },
  {
    name: 'Northern Miner',
    url: 'https://www.northernminer.com',
    searchUrl: 'https://www.northernminer.com',
    type: 'news',
    selectors: {
      articles: '.post',
      headline: 'h2',
      date: '.date',
      content: '.excerpt'
    }
  },
  {
    name: 'Mining Journal',
    url: 'https://www.mining-journal.com',
    searchUrl: 'https://www.mining-journal.com',
    type: 'news',
    selectors: {
      articles: 'article',
      headline: 'h2',
      date: '.date',
      content: '.summary'
    }
  },
  {
    name: 'Australian Mining',
    url: 'https://www.australianmining.com.au',
    searchUrl: 'https://www.australianmining.com.au',
    type: 'news',
    selectors: {
      articles: 'article',
      headline: 'h2',
      date: '.date',
      content: '.excerpt'
    }
  },
  {
    name: 'Mining.mx',
    url: 'https://www.mining.mx',
    searchUrl: 'https://www.mining.mx/en/',
    type: 'news',
    selectors: {
      articles: 'article',
      headline: 'h2',
      date: '.date',
      content: '.excerpt'
    }
  },
  {
    name: 'Gold News',
    url: 'https://www.bullionvault.com',
    searchUrl: 'https://www.bullionvault.com/gold-news',
    type: 'news',
    selectors: {
      articles: '.article',
      headline: 'h2',
      date: '.date',
      content: '.summary'
    }
  },
  {
    name: 'SEDAR+',
    url: 'https://www.sedarplus.ca',
    searchUrl: 'https://www.sedarplus.ca/csa-party/securities/profile.html',
    type: 'regulatory',
    selectors: {
      articles: '.filing-row',
      headline: '.filing-name',
      date: '.filing-date',
      content: '.filing-description'
    }
  },
  {
    name: 'SEC EDGAR',
    url: 'https://www.sec.gov',
    searchUrl: 'https://www.sec.gov/edgar/searchedgar/companysearch',
    type: 'regulatory',
    selectors: {
      articles: '.filing-item',
      headline: '.filing-type',
      date: '.filing-date',
      content: '.filing-description'
    }
  },
  {
    name: 'ASX Announcements',
    url: 'https://www.asx.com.au',
    searchUrl: 'https://www.asx.com.au/markets/company/',
    type: 'regulatory',
    selectors: {
      articles: '.announcement-row',
      headline: '.announcement-title',
      date: '.announcement-date',
      content: '.announcement-summary'
    }
  },
  {
    name: 'LSE RNS',
    url: 'https://www.londonstockexchange.com',
    searchUrl: 'https://www.londonstockexchange.com/news?tab=news-explorer',
    type: 'regulatory',
    selectors: {
      articles: '.news-item',
      headline: '.news-headline',
      date: '.news-date',
      content: '.news-content'
    }
  }
];

// Mining-specific keywords for better search
const MINING_KEYWORDS = [
  'mining', 'exploration', 'drilling', 'resource estimate', 'feasibility study',
  'production', 'gold', 'copper', 'lithium', 'silver', 'nickel', 'cobalt',
  'rare earth', 'uranium', 'iron ore', 'coal', 'platinum', 'palladium',
  'mineral resources', 'ore reserves', 'NI 43-101', 'JORC', 'technical report',
  'PEA', 'preliminary economic assessment', 'mine development', 'processing plant',
  'tailings', 'environmental permit', 'mining license', 'royalty', 'streaming'
];

interface NewsArticle {
  headline: string;
  summary: string;
  url: string;
  published_date: string;
  source_name: string;
  source_type: string;
  content?: string;
}

interface ExtractedNewsData {
  symbol?: string;
  company_name?: string;
  exchange?: string;
  topics: string[];
  primary_commodity?: string;
  commodities: string[];
  news_category?: string;
  countries: string[];
  regions: string[];
  project_names: string[];
  is_project_related: boolean;
  is_exploration_news: boolean;
  is_production_news: boolean;
  mentions_financials: boolean;
  mentions_technical_report: boolean;
  mentions_resource_estimate: boolean;
  mentions_feasibility_study: boolean;
  mentions_environmental: boolean;
  mentions_permits: boolean;
  mentions_acquisition: boolean;
  sentiment_score: number;
  relevance_score: number;
  importance_level: string;
  ai_extraction_confidence: number;
}

export class FirecrawlNewsScraper {
  private supabase: any;
  private firecrawl: FirecrawlApp;
  private openai: OpenAI;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Initialize Firecrawl and OpenAI
    this.firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY! });
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  }

  /**
   * Scrape news from a specific source
   */
  async scrapeNewsSource(source: typeof NEWS_SOURCES[0], limit: number = 30): Promise<NewsArticle[]> {
    try {
      console.log(`Scraping ${source.name}...`);
      
      // Use Firecrawl to scrape the news page
      const scrapeResult = await this.firecrawl.scrapeUrl(source.searchUrl, {
        formats: ['markdown', 'html', 'links'],
        onlyMainContent: false, // Get full page to find all links
        waitFor: 3000,
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!scrapeResult.success) {
        console.error(`Failed to scrape ${source.name}:`, scrapeResult.error);
        return [];
      }

      // Extract article URLs from the scraped content
      const articleUrls = this.extractArticleUrls(
        scrapeResult.markdown || '', 
        scrapeResult.html || '',
        scrapeResult.links || [],
        source.url
      );
      
      console.log(`Found ${articleUrls.length} article URLs from ${source.name}`);
      
      // Take more articles to ensure we get enough valid ones
      const urlsToProcess = articleUrls.slice(0, Math.min(limit, articleUrls.length));
      
      console.log(`Processing ${urlsToProcess.length} articles from ${source.name}`);
      
      // Scrape articles in parallel batches (max 5 concurrent)
      const articles: NewsArticle[] = [];
      const batchSize = 5;
      
      for (let i = 0; i < urlsToProcess.length; i += batchSize) {
        const batch = urlsToProcess.slice(i, i + batchSize);
        const batchPromises = batch.map(url => 
          this.scrapeArticle(url, source).catch(err => {
            console.error(`Error scraping ${url}:`, err);
            return null;
          })
        );
        
        const batchResults = await Promise.all(batchPromises);
        const validArticles = batchResults.filter(article => 
          article !== null && this.isArticleRecent(article)
        ) as NewsArticle[];
        
        articles.push(...validArticles);
        
        // Stop if we have enough articles
        if (articles.length >= 10) break;
      }

      return articles;
    } catch (error) {
      console.error(`Error scraping ${source.name}:`, error);
      return [];
    }
  }

  /**
   * Scrape individual article
   */
  private async scrapeArticle(url: string, source: typeof NEWS_SOURCES[0]): Promise<NewsArticle | null> {
    try {
      // Skip if URL looks invalid
      if (!url || url.includes('#') || url.includes('.png') || url.includes('.jpg')) {
        return null;
      }

      const result = await this.firecrawl.scrapeUrl(url, {
        formats: ['markdown'],
        onlyMainContent: true,
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!result.success || !result.markdown) {
        console.log(`Failed to scrape article: ${url}`);
        return null;
      }

      // Extract basic information using regex and patterns
      const headline = this.extractHeadline(result.markdown) || this.extractHeadlineFromUrl(url);
      const summary = this.extractSummary(result.markdown);
      const publishedDate = this.extractDate(result.markdown) || this.extractDateFromUrl(url);

      if (!headline || headline.includes('404') || headline.includes('Not Found') || headline.includes("can't be found")) {
        console.log(`Invalid article (404 or no headline): ${url}`);
        return null;
      }

      // Only return if it's a recent article
      const articleDate = new Date(publishedDate || new Date());
      const now = new Date();
      const daysDiff = (now.getTime() - articleDate.getTime()) / (1000 * 3600 * 24);
      
      // Accept articles from last 30 days or future dates
      if (daysDiff > 30) {
        console.log(`Article too old: ${headline} (${publishedDate})`);
        return null;
      }

      // Ensure date is in correct timezone (handle UTC offset)
      const correctedDate = publishedDate ? new Date(publishedDate) : new Date();
      
      return {
        headline,
        summary: summary || headline.substring(0, 200),
        url,
        published_date: correctedDate.toISOString(),
        source_name: source.name,
        source_type: source.type,
        content: result.markdown
      };
    } catch (error) {
      console.error(`Error scraping article ${url}:`, error);
      return null;
    }
  }

  /**
   * Extract headline from URL as fallback
   */
  private extractHeadlineFromUrl(url: string): string | null {
    try {
      const parts = url.split('/');
      const lastPart = parts[parts.length - 1] || parts[parts.length - 2];
      
      // Remove file extension and clean up
      const cleaned = lastPart
        .replace(/\.html?$/, '')
        .replace(/-/g, ' ')
        .replace(/_/g, ' ')
        .replace(/\d{4,}/g, '') // Remove year
        .trim();
      
      // Capitalize first letter of each word
      return cleaned
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    } catch {
      return null;
    }
  }

  /**
   * Extract date from URL as fallback
   */
  private extractDateFromUrl(url: string): string | null {
    // Try to extract date from URL patterns like /2025/09/29/ or /2025-09-29/
    const datePattern = /(\d{4})[\/\-](\d{2})[\/\-](\d{2})/;
    const match = url.match(datePattern);
    
    if (match) {
      const [_, year, month, day] = match;
      const date = new Date(`${year}-${month}-${day}`);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
    
    return null;
  }

  /**
   * Extract article URLs from scraped content
   */
  private extractArticleUrls(markdown: string, html: string, links: any[], baseUrl: string): string[] {
    const urls: string[] = [];
    
    // First try to use the links array from Firecrawl
    if (links && Array.isArray(links)) {
      links.forEach(link => {
        if (typeof link === 'string') {
          urls.push(link);
        } else if (link && link.href) {
          urls.push(link.href);
        } else if (link && link.url) {
          urls.push(link.url);
        }
      });
    }
    
    // Extract from markdown links
    const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    
    while ((match = linkPattern.exec(markdown)) !== null) {
      const url = match[2];
      if (url && !url.startsWith('#') && !url.startsWith('mailto:')) {
        urls.push(url);
      }
    }

    // Extract from HTML if available
    if (html) {
      const hrefPattern = /href=["']([^"'#][^"']*)["']/g;
      while ((match = hrefPattern.exec(html)) !== null) {
        const url = match[1];
        if (url && !url.startsWith('mailto:') && !url.startsWith('javascript:')) {
          urls.push(url);
        }
      }
    }

    // Process and filter URLs
    const processedUrls = urls
      .map(url => {
        // Make URL absolute if relative
        if (!url.startsWith('http')) {
          if (url.startsWith('//')) {
            return 'https:' + url;
          } else if (url.startsWith('/')) {
            return baseUrl + url;
          } else {
            return baseUrl + '/' + url;
          }
        }
        return url;
      })
      .filter(url => {
        // Filter for article-like URLs
        const isArticle = 
          // Mining.com patterns
          (url.includes('mining.com') && (
            url.includes('/web/') ||
            url.match(/mining\.com\/[a-z-]+-\d{4,}/) ||
            url.match(/mining\.com\/web\/[a-z-]+/)
          )) ||
          // Kitco patterns  
          (url.includes('kitco.com') && (
            url.includes('/news/article/') ||
            url.includes('/news/2025') ||
            url.includes('/news/2024')
          )) ||
          // Reuters patterns
          (url.includes('reuters.com') && url.includes('/article/')) ||
          // Mining Weekly patterns
          (url.includes('miningweekly.com') && url.includes('/article/')) ||
          // General news patterns
          url.includes('/news/article/') ||
          url.includes('/news/2025') ||
          url.includes('/news/2024/12') ||
          url.includes('/article/') ||
          url.includes('/story/') ||
          url.includes('/press-release/') ||
          url.includes('/announcement/') ||
          url.includes('/2025/') ||
          url.includes('/2024/12/');
        
        // Exclude non-article pages
        const isNotArticle = 
          url.includes('/category/') ||
          url.includes('/tag/') ||
          url.includes('/author/') ||
          url.includes('/page/') ||
          url.includes('.pdf') ||
          url.includes('#') ||
          url.includes('/wp-content/') ||
          url.includes('/images/') ||
          url.includes('.png') ||
          url.includes('.jpg') ||
          url.includes('.svg') ||
          url === baseUrl ||
          url === baseUrl + '/' ||
          url === baseUrl + '/news/' ||
          url === baseUrl + '/news';
        
        return isArticle && !isNotArticle;
      });

    return [...new Set(processedUrls)]; // Remove duplicates
  }

  /**
   * Extract headline from content
   */
  private extractHeadline(content: string): string | null {
    // Remove markdown link syntax if present
    const cleanMarkdownLinks = (text: string) => {
      return text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    };
    
    // Try to find H1 or H2 headers
    const h1Match = content.match(/^#\s+(.+)$/m);
    if (h1Match) return cleanMarkdownLinks(h1Match[1].trim());
    
    const h2Match = content.match(/^##\s+(.+)$/m);
    if (h2Match) return cleanMarkdownLinks(h2Match[1].trim());
    
    // Look for title in metadata
    const titleMatch = content.match(/title:\s*["']?([^"'\n]+)["']?/i);
    if (titleMatch) return cleanMarkdownLinks(titleMatch[1].trim());
    
    // Fallback to first non-empty line
    const lines = content.split('\n').filter(line => line.trim());
    const firstLine = lines[0]?.trim() || null;
    return firstLine ? cleanMarkdownLinks(firstLine) : null;
  }

  /**
   * Extract summary from content - get actual article content
   */
  private extractSummary(content: string): string | null {
    // Remove headers
    let cleanContent = content.replace(/^#+\s+.+$/gm, '');
    
    // Remove markdown links and formatting
    cleanContent = cleanContent.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    cleanContent = cleanContent.replace(/[*_~`]/g, '');
    
    // Remove author/publisher/date lines
    cleanContent = cleanContent.replace(/^.*(com\/author\/|Published:|Updated:|Posted:|By:|Author:|Date:|Source:|©|\d{4}\s+Kitco|NEWS has a diverse team).*$/gmi, '');
    cleanContent = cleanContent.replace(/^.*\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}.*$/gmi, '');
    
    // Remove navigation/meta text
    cleanContent = cleanContent.replace(/^(Home|About|Contact|Menu|Search|Subscribe|Login|Register|Share|Tweet|Email|Print|Advertisement).*$/gmi, '');
    cleanContent = cleanContent.replace(/^(Commodities|Cryptocurrencies|Mining|Economy|Conferences|Opinion|Markets|News)[\s\-–—]*$/gmi, '');
    
    // Split into paragraphs and find the first real content
    const paragraphs = cleanContent.split(/\n\n+/);
    
    for (const para of paragraphs) {
      const cleaned = para.trim()
        .replace(/^\s*[-•]\s*/, '') // Remove bullet points
        .replace(/^\d+\.\s*/, ''); // Remove numbered lists
      
      // Skip if it looks like metadata
      if (cleaned.length > 50 &&
          !cleaned.match(/^(by |posted |published |updated |written |author:|date:|source:|copyright|©)/i) &&
          !cleaned.match(/^\d{1,2}:\d{2}/) && // Skip timestamps
          !cleaned.match(/^(read more|continue reading|click here|share this|follow us|advertisement)/i) &&
          !cleaned.includes('cookies') && // Skip cookie notices
          !cleaned.includes('.com/author/')) { // Skip author URLs
        
        // Get first 2 sentences for better context
        const sentences = cleaned.match(/[^.!?]+[.!?]+/g) || [cleaned];
        const summary = sentences.slice(0, 2).join(' ').trim();
        
        // Clean up and truncate
        return summary.substring(0, 200) + (summary.length > 200 ? '...' : '');
      }
    }
    
    return null;
  }

  /**
   * Extract date from content
   */
  private extractDate(content: string): string | null {
    // Common date patterns - prioritize 2025 dates
    const datePatterns = [
      /(2025-\d{2}-\d{2})/,
      /(\d{1,2}\/\d{1,2}\/2025)/,
      /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+2025/i,
      /\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+2025/i,
      // Fallback to recent 2024 dates
      /(2024-12-\d{2})/,
      /(12\/\d{1,2}\/2024)/,
      /December\s+\d{1,2},?\s+2024/i,
      // Generic patterns
      /(\d{4}-\d{2}-\d{2})/,
      /(\d{1,2}\/\d{1,2}\/\d{4})/,
      /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i
    ];

    for (const pattern of datePatterns) {
      const match = content.match(pattern);
      if (match) {
        try {
          const date = new Date(match[0]);
          if (!isNaN(date.getTime())) {
            // Only return dates from 2025 or late 2024
            const year = date.getFullYear();
            const month = date.getMonth();
            if (year === 2025 || (year === 2024 && month === 11)) {
              return date.toISOString();
            }
          }
        } catch (error) {
          // Continue to next pattern
        }
      }
    }

    // If no date found, return current date as fallback
    return new Date().toISOString();
  }

  /**
   * Check if article is recent (within last 30 days or future)
   */
  private isArticleRecent(article: NewsArticle): boolean {
    if (!article.published_date) return true; // If no date, assume recent
    
    const articleDate = new Date(article.published_date);
    const now = new Date();
    const daysDiff = (now.getTime() - articleDate.getTime()) / (1000 * 3600 * 24);
    
    // Accept articles from last 30 days or future dates
    return daysDiff <= 30;
  }

  /**
   * Extract structured data using regex patterns (fast, no AI)
   */
  async extractStructuredData(article: NewsArticle): Promise<ExtractedNewsData> {
    // Use regex extraction for speed
    return this.regexExtraction(article);
  }

  /**
   * Regex extraction using comprehensive patterns
   */
  private regexExtraction(article: NewsArticle): ExtractedNewsData {
    const fullText = `${article.headline} ${article.summary} ${article.content || ''}`;
    
    // Extract using pattern functions
    const extractedSymbol = extractSymbol(fullText);
    const companyName = extractCompanyName(fullText);
    
    // Only use symbol if it's clearly mentioned and not just a random match
    const symbol = (extractedSymbol && companyName && fullText.toLowerCase().includes(companyName.toLowerCase())) 
      ? extractedSymbol 
      : undefined;
    
    const commodities = extractCommodities(fullText);
    const primaryCommodity = extractPrimaryCommodity(fullText);
    const tags = extractTags(fullText);
    
    // Detect categories
    const isExploration = /exploration|drilling|discovery|prospect|resource/i.test(fullText);
    const isProduction = /production|mining|processing|output|operations/i.test(fullText);
    
    // Calculate relevance
    let relevanceScore = 5;
    if (isMiningRelated(fullText)) relevanceScore += 2;
    if (commodities.length > 0) relevanceScore += 1;
    if (symbol) relevanceScore += 1;
    if (mentionsTechnicalReport(fullText)) relevanceScore += 1;
    relevanceScore = Math.min(10, relevanceScore);
    
    // Determine news category
    let newsCategory = 'general';
    if (isExploration) newsCategory = 'exploration';
    else if (isProduction) newsCategory = 'production';
    else if (mentionsFinancials(fullText)) newsCategory = 'financial';
    else if (/permit|license|regulatory/i.test(fullText)) newsCategory = 'regulatory';
    else if (/market|price|forecast/i.test(fullText)) newsCategory = 'market';
    
    return {
      symbol,
      company_name: companyName,
      exchange: this.extractExchange(fullText),
      topics: tags,
      primary_commodity: primaryCommodity,
      commodities,
      news_category: newsCategory,
      countries: this.extractCountries(fullText),
      regions: this.extractRegions(fullText),
      project_names: this.extractProjectNames(fullText),
      is_project_related: isProjectRelated(fullText),
      is_exploration_news: isExploration,
      is_production_news: isProduction,
      mentions_financials: mentionsFinancials(fullText),
      mentions_technical_report: mentionsTechnicalReport(fullText),
      mentions_resource_estimate: /resource estimate|mineral resource|indicated|inferred|measured/i.test(fullText),
      mentions_feasibility_study: /feasibility|pea|preliminary economic|dfs|definitive/i.test(fullText),
      mentions_environmental: /environment|sustainability|esg|emissions|water|tailings/i.test(fullText),
      mentions_permits: /permit|license|approval|regulatory|environmental assessment/i.test(fullText),
      mentions_acquisition: /acquisition|merger|takeover|acquire|deal|transaction/i.test(fullText),
      sentiment_score: calculateSentiment(fullText),
      relevance_score: relevanceScore,
      importance_level: relevanceScore >= 8 ? 'high' : relevanceScore >= 5 ? 'medium' : 'low',
      ai_extraction_confidence: 0.8 // High confidence for regex
    };
  }

  /**
   * Extract exchange from text
   */
  private extractExchange(text: string): string | undefined {
    const exchanges = ['NYSE', 'NASDAQ', 'TSX', 'ASX', 'LSE', 'JSE', 'HKEX'];
    for (const exchange of exchanges) {
      if (text.includes(exchange)) return exchange;
    }
    return undefined;
  }

  /**
   * Extract project names
   */
  private extractProjectNames(text: string): string[] {
    // Use the high-confidence extraction from mining-entities
    return extractProjectsWithConfidence(text);
  }

  /**
   * Extract topics from content
   */
  private extractTopics(content: string): string[] {
    const topics: string[] = [];
    const topicKeywords = [
      'exploration', 'production', 'drilling', 'resource estimate',
      'feasibility study', 'environmental', 'permits', 'acquisition',
      'earnings', 'quarterly results', 'technical report', 'mineral rights'
    ];

    for (const keyword of topicKeywords) {
      if (content.includes(keyword)) {
        topics.push(keyword);
      }
    }

    return topics;
  }

  /**
   * Extract countries from content
   */
  private extractCountries(content: string): string[] {
    const lowerContent = content.toLowerCase();
    const countries: string[] = [];
    const countryList = [
      { search: 'united states', display: 'USA' },
      { search: 'usa', display: 'USA' },
      { search: 'u.s.', display: 'USA' },
      { search: 'america', display: 'USA' },
      { search: 'canada', display: 'Canada' },
      { search: 'canadian', display: 'Canada' },
      { search: 'australia', display: 'Australia' },
      { search: 'australian', display: 'Australia' },
      { search: 'chile', display: 'Chile' },
      { search: 'chilean', display: 'Chile' },
      { search: 'peru', display: 'Peru' },
      { search: 'peruvian', display: 'Peru' },
      { search: 'mexico', display: 'Mexico' },
      { search: 'mexican', display: 'Mexico' },
      { search: 'brazil', display: 'Brazil' },
      { search: 'brazilian', display: 'Brazil' },
      { search: 'argentina', display: 'Argentina' },
      { search: 'south africa', display: 'South Africa' },
      { search: 'congo', display: 'DRC' },
      { search: 'drc', display: 'DRC' },
      { search: 'china', display: 'China' },
      { search: 'chinese', display: 'China' },
      { search: 'russia', display: 'Russia' },
      { search: 'russian', display: 'Russia' },
      { search: 'kazakhstan', display: 'Kazakhstan' },
      { search: 'mongolia', display: 'Mongolia' },
      { search: 'indonesia', display: 'Indonesia' },
      { search: 'guinea', display: 'Guinea' },
      { search: 'zambia', display: 'Zambia' },
      { search: 'tanzania', display: 'Tanzania' },
      { search: 'ghana', display: 'Ghana' },
      { search: 'mali', display: 'Mali' },
      { search: 'burkina faso', display: 'Burkina Faso' },
      { search: 'sweden', display: 'Sweden' },
      { search: 'finland', display: 'Finland' },
      { search: 'norway', display: 'Norway' },
      { search: 'uk', display: 'UK' },
      { search: 'united kingdom', display: 'UK' },
      { search: 'british', display: 'UK' }
    ];

    for (const country of countryList) {
      if (lowerContent.includes(country.search)) {
        if (!countries.includes(country.display)) {
          countries.push(country.display);
        }
      }
    }

    return countries.slice(0, 5); // Limit to 5 countries
  }
  
  /**
   * Extract regions/states from content
   */
  private extractRegions(content: string): string[] {
    const lowerContent = content.toLowerCase();
    const regions: string[] = [];
    
    // US States
    const usStates = [
      { search: 'nevada', display: 'Nevada' },
      { search: 'arizona', display: 'Arizona' },
      { search: 'alaska', display: 'Alaska' },
      { search: 'california', display: 'California' },
      { search: 'colorado', display: 'Colorado' },
      { search: 'montana', display: 'Montana' },
      { search: 'utah', display: 'Utah' },
      { search: 'wyoming', display: 'Wyoming' }
    ];
    
    // Canadian Provinces
    const provinces = [
      { search: 'ontario', display: 'Ontario' },
      { search: 'quebec', display: 'Quebec' },
      { search: 'british columbia', display: 'British Columbia' },
      { search: 'b.c.', display: 'British Columbia' },
      { search: 'alberta', display: 'Alberta' },
      { search: 'saskatchewan', display: 'Saskatchewan' },
      { search: 'manitoba', display: 'Manitoba' },
      { search: 'yukon', display: 'Yukon' },
      { search: 'northwest territories', display: 'NWT' },
      { search: 'nunavut', display: 'Nunavut' },
      { search: 'labrador', display: 'Labrador' }
    ];
    
    // Australian States
    const ausStates = [
      { search: 'western australia', display: 'Western Australia' },
      { search: 'queensland', display: 'Queensland' },
      { search: 'new south wales', display: 'NSW' },
      { search: 'victoria', display: 'Victoria' },
      { search: 'south australia', display: 'South Australia' },
      { search: 'tasmania', display: 'Tasmania' }
    ];
    
    // Other regions
    const otherRegions = [
      { search: 'golden triangle', display: 'Golden Triangle' },
      { search: 'pilbara', display: 'Pilbara' },
      { search: 'atacama', display: 'Atacama' },
      { search: 'andes', display: 'Andes' },
      { search: 'siberia', display: 'Siberia' },
      { search: 'copperbelt', display: 'Copperbelt' }
    ];
    
    const allRegions = [...usStates, ...provinces, ...ausStates, ...otherRegions];
    
    for (const region of allRegions) {
      if (lowerContent.includes(region.search)) {
        if (!regions.includes(region.display)) {
          regions.push(region.display);
        }
      }
    }
    
    return regions.slice(0, 3); // Limit to 3 regions
  }

  /**
   * Calculate basic sentiment
   */
  private calculateSentiment(content: string): number {
    const positiveWords = [
      'increase', 'growth', 'positive', 'strong', 'success', 'excellent',
      'record', 'high', 'profit', 'gain', 'improve', 'advance', 'breakthrough'
    ];
    
    const negativeWords = [
      'decrease', 'decline', 'negative', 'weak', 'failure', 'poor',
      'low', 'loss', 'drop', 'worsen', 'delay', 'problem', 'issue'
    ];

    let score = 0;
    for (const word of positiveWords) {
      if (content.includes(word)) score += 0.1;
    }
    for (const word of negativeWords) {
      if (content.includes(word)) score -= 0.1;
    }

    return Math.max(-1, Math.min(1, score));
  }

  /**
   * Save news to database
   */
  async saveNewsToDatabase(article: NewsArticle, extractedData: ExtractedNewsData): Promise<boolean> {
    try {
      const newsItem = {
        headline: article.headline,
        summary: article.summary,
        url: article.url,
        published_date: article.published_date,
        source_name: article.source_name,
        source_type: article.source_type,
        source_domain: new URL(article.url).hostname,
        scraper_source: 'firecrawl',
        content_snippet: article.summary?.substring(0, 200),
        
        // Extracted data
        ...extractedData,
        
        // Processing metadata
        ai_processed: true,
        ai_model_version: 'gpt-4-turbo-preview',
        is_processed: true,
        processing_status: 'completed',
        fetched_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('unified_news')
        .upsert(newsItem, { 
          onConflict: 'url',
          ignoreDuplicates: true 
        })
        .select();

      if (error) {
        console.error('Error saving to database:', error);
        return false;
      }

      console.log(`Saved article: ${article.headline}`);
      return true;
    } catch (error) {
      console.error('Error saving news:', error);
      return false;
    }
  }

  /**
   * Main method to scrape all sources in parallel
   */
  async scrapeAllSources(maxPerSource: number = 10, onProgress?: (update: any) => void): Promise<{
    totalScraped: number;
    totalSaved: number;
    sources: { name: string; scraped: number; saved: number }[];
  }> {
    const results = {
      totalScraped: 0,
      totalSaved: 0,
      sources: [] as { name: string; scraped: number; saved: number }[]
    };

    // Process sources in parallel batches (max 5 concurrent)
    const maxConcurrent = 5;
    const sourceBatches = [];
    
    for (let i = 0; i < NEWS_SOURCES.length; i += maxConcurrent) {
      sourceBatches.push(NEWS_SOURCES.slice(i, i + maxConcurrent));
    }

    let processedSources = 0;
    
    for (const batch of sourceBatches) {
      // Process batch in parallel
      const batchPromises = batch.map(async (source) => {
        console.log(`📰 Scraping ${source.name}...`);
        
        // Report progress
        if (onProgress) {
          onProgress({
            type: 'scraping',
            source: source.name,
            sourcesProcessed: processedSources,
            totalSources: NEWS_SOURCES.length
          });
        }
        
        try {
          // Limit Kitco to fewer articles since it dominates
          const articlesPerSource = source.name === 'Kitco News' ? Math.min(maxPerSource, 3) : maxPerSource;
          
          const articles = await this.scrapeNewsSource(source, articlesPerSource);
          let saved = 0;

          // Process articles for this source
          for (const article of articles) {
            const extractedData = await this.extractStructuredData(article);
            const success = await this.saveNewsToDatabase(article, extractedData);
            if (success) {
              saved++;
              
              // Report each saved article
              if (onProgress) {
                onProgress({
                  type: 'article_saved',
                  source: source.name,
                  headline: article.headline,
                  totalSaved: results.totalSaved + saved
                });
              }
            }
          }

          processedSources++;
          
          return {
            name: source.name,
            scraped: articles.length,
            saved
          };
        } catch (error) {
          console.error(`Error processing ${source.name}:`, error);
          processedSources++;
          return {
            name: source.name,
            scraped: 0,
            saved: 0
          };
        }
      });

      // Wait for batch to complete
      const batchResults = await Promise.all(batchPromises);
      
      // Update results
      for (const sourceResult of batchResults) {
        results.sources.push(sourceResult);
        results.totalScraped += sourceResult.scraped;
        results.totalSaved += sourceResult.saved;
      }
    }

    return results;
  }
}

