# 📰 Lithos News & Announcements System Setup

## Overview
The News & Announcements system uses **Firecrawl API** to scrape real-time mining news from multiple sources and display them in a unified interface.

## 🚀 Quick Setup

### Step 1: Create Database Table
1. Go to your Supabase SQL Editor:
   ```
   https://dfxauievbyqwcynwtvib.supabase.co/sql/new
   ```

2. Copy the entire contents of:
   ```
   scripts/create-unified-news-table.sql
   ```

3. Paste it in the SQL Editor and click **"Run"**

4. You should see: "Table unified_news created successfully!"

### Step 2: Verify Setup
Run the test script to verify everything is working:
```bash
npx tsx scripts/test-news-system.ts
```

You should see:
- ✅ Environment variables configured
- ✅ Database table exists
- ✅ Firecrawl scraper working
- ✅ API endpoints ready

### Step 3: Start the Application
```bash
npm run dev
```

### Step 4: Test the News System
1. Navigate to: http://localhost:3000/news
2. Click the **"Refresh"** button to fetch latest news
3. News will be scraped from all configured sources

## 📋 System Architecture

### News Sources
The system scrapes from these sources:
- **Mining.com** - General mining news
- **Kitco News** - Precious metals and mining
- **Northern Miner** - Canadian mining news  
- **Mining Journal** - Global mining coverage
- **SEDAR+** - Canadian regulatory filings
- **SEC EDGAR** - US regulatory filings
- **ASX Announcements** - Australian exchange
- **LSE RNS** - London Stock Exchange

### Data Flow
1. **User clicks Refresh** → Triggers `/api/news/refresh`
2. **Firecrawl scrapes** each news source (3-5 articles per source)
3. **OpenAI extracts** structured data from articles:
   - Company/symbol mapping
   - Commodities mentioned
   - Geographic locations
   - Project names
   - Sentiment analysis
   - Relevance scoring
4. **Data saved** to `unified_news` table
5. **Frontend displays** the aggregated news

### Database Schema
The `unified_news` table stores:
- **Core fields**: headline, summary, URL, published date
- **Source info**: source name, type, domain
- **Company data**: symbol, name, exchange
- **Topics**: commodities, countries, project names
- **Flags**: mining-related, technical reports, financials
- **Metrics**: sentiment score, relevance score, importance level
- **AI metadata**: extraction confidence, model version

## 🔧 Configuration

### Environment Variables
Ensure these are set in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
FIRECRAWL_API_KEY=your_firecrawl_key
OPENAI_API_KEY=your_openai_key
```

### Customizing News Sources
Edit `lib/news-scraper/firecrawl-news-scraper.ts` to add/remove sources:
```typescript
export const NEWS_SOURCES = [
  {
    name: 'Your News Source',
    url: 'https://example.com',
    searchUrl: 'https://example.com/news',
    type: 'news', // or 'regulatory'
    selectors: {
      articles: '.article-class',
      headline: '.headline-class',
      date: '.date-class',
      content: '.content-class'
    }
  }
  // ... more sources
];
```

### Refresh Settings
Adjust the number of articles per source in the refresh endpoint:
```typescript
// In components/news-announcements/news-announcements.tsx
body: JSON.stringify({
  maxPerSource: 3  // Change this number
})
```

## 📊 API Endpoints

### GET /api/news
Fetches news from the database.

Query parameters:
- `limit` - Number of items (default: 100)
- `commodity` - Filter by commodity
- `source` - Filter by source name
- `category` - Filter by news category
- `importance` - Filter by importance level
- `search` - Search in headline/summary/company

Example:
```
GET /api/news?commodity=lithium&limit=50
```

### POST /api/news/refresh
Triggers news scraping from all sources.

Request body:
```json
{
  "maxPerSource": 5  // Articles per source
}
```

Response:
```json
{
  "success": true,
  "totalScraped": 40,
  "totalSaved": 35,
  "sources": [
    {
      "name": "Mining.com",
      "scraped": 5,
      "saved": 5
    }
    // ... more sources
  ]
}
```

## 🎨 Frontend Components

### NewsAnnouncements Component
Located at: `components/news-announcements/news-announcements.tsx`

Features:
- **Real-time refresh** with Firecrawl scraping
- **Search** by headline, company, symbol
- **Filter** by commodity
- **Statistics** showing news counts and trends
- **Clickable headlines** that redirect to source
- **Source attribution** for each article
- **Sentiment indicators** (positive/negative)
- **Category badges** (Project, Financials, Technical)

## 🐛 Troubleshooting

### Table Creation Failed
If the table doesn't create:
1. Check Supabase connection
2. Ensure service role key has permissions
3. Run SQL manually in Supabase dashboard

### No News Appearing
1. Check Firecrawl API key is valid
2. Verify OpenAI API key is set
3. Check browser console for errors
4. Run test script: `npx tsx scripts/test-news-system.ts`

### Scraping Errors
- **Rate limiting**: Reduce `maxPerSource` value
- **Site structure changed**: Update selectors in `NEWS_SOURCES`
- **Firecrawl timeout**: Increase timeout in scraper

### API Errors
- Check environment variables
- Verify database table exists
- Check Supabase service role permissions

## 📈 Performance Tips

1. **Caching**: News is cached in database, refresh only when needed
2. **Batch size**: Keep `maxPerSource` between 3-5 for quick refreshes
3. **Indexing**: Database has indexes on commonly queried fields
4. **Pagination**: Use `limit` parameter to control data size

## 🔒 Security

- All scraped content is sanitized before storage
- API endpoints use Supabase authentication
- Service role key is only used server-side
- URLs are validated before scraping

## 📝 Next Steps

1. **Schedule automatic refreshes** using cron jobs
2. **Add more news sources** specific to your needs
3. **Implement email alerts** for important news
4. **Create saved searches** for users
5. **Add export functionality** for news data

## 💡 Tips

- The system intelligently extracts mining-specific information
- Clicking on any headline opens the original article
- Sentiment scores help identify positive/negative news
- Relevance scores prioritize mining-related content
- Source attribution ensures transparency

## 🆘 Support

If you encounter issues:
1. Check this documentation
2. Run the test script: `npx tsx scripts/test-news-system.ts`
3. Check logs in browser console and terminal
4. Verify all API keys are correctly set

---

**System Status**: Ready for deployment after table creation
**Last Updated**: September 2025
**Version**: 1.0.0
