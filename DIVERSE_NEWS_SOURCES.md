# Diverse Mining News Sources

## Overview
Expanded news scraper from 3 sources to **15 diverse mining news sources** covering global mining news, regional publications, commodity-specific coverage, and major financial outlets.

## Implementation Details

### Previous Configuration
Originally scraped from only 3 sources:
- Mining.com
- Northern Miner
- Kitco News

This resulted in limited news diversity with mostly Kitco and Northern Miner content.

### Current Configuration (15 Sources)

#### **Major Mining News Sites** (6 sources)
1. **Mining.com** - https://www.mining.com/latest-news/
   - Global mining news and analysis
   - Covers all commodities and regions

2. **Northern Miner** - https://www.northernminer.com/
   - Canadian mining focus
   - Industry news and exploration updates

3. **Kitco News** - https://www.kitco.com/news/category/commodities/
   - Precious metals focus (gold, silver)
   - Market analysis and pricing

4. **Mining Journal** - https://www.mining-journal.com/news/
   - UK-based international mining coverage
   - Technical and operational news

5. **Mining Weekly** - https://www.miningweekly.com/
   - South African mining focus
   - Weekly industry updates

6. **Mining Technology** - https://www.mining-technology.com/news/
   - Mining technology and innovation
   - Equipment and operational efficiency

#### **Regional Mining News** (3 sources)
7. **Australian Mining** - https://www.australianmining.com.au/news/
   - Australia-specific mining coverage
   - Major producer of lithium, iron ore, gold

8. **Mining Review Africa** - https://www.miningreview.com/news/
   - African mining industry focus
   - Covers major gold, platinum, diamond operations

9. **Canadian Mining Journal** - https://www.canadianminingjournal.com/news/
   - Canadian mining and exploration
   - Junior mining companies and discoveries

#### **Commodity-Specific** (3 sources)
10. **Gold News** - https://www.mining.com/category/gold-2/
    - Gold-focused news and analysis
    - Mine operations, exploration, pricing

11. **Copper News** - https://www.mining.com/category/copper/
    - Copper market updates
    - Critical for energy transition

12. **Lithium News** - https://www.mining.com/category/lithium/
    - Lithium and battery metals
    - EV supply chain news

#### **Industry Publications** (3 sources)
13. **S&P Global Market Intelligence** - https://www.spglobal.com/marketintelligence/en/news-insights/latest-news-headlines?category=metals-mining
    - Financial market analysis
    - Mining company performance and M&A

14. **Reuters Mining** - https://www.reuters.com/business/energy/
    - Global mining business news
    - Breaking news and market-moving events

15. **Bloomberg Mining** - https://www.bloomberg.com/news/articles/mining
    - Financial markets perspective
    - Mining stocks and commodity prices

## Geographic Coverage

### **North America**
- Northern Miner (Canada)
- Canadian Mining Journal (Canada)
- Kitco News (Canada/US)

### **South America**
- Mining.com (includes Latin America coverage)
- Reuters/Bloomberg (global coverage)

### **Australia & Asia-Pacific**
- Australian Mining (Australia)
- Mining.com (Asia-Pacific coverage)

### **Africa**
- Mining Review Africa (pan-African)
- Mining Weekly (South Africa focus)

### **Europe**
- Mining Journal (UK-based, international)
- Mining Technology (Europe focus)

### **Global**
- Mining.com
- S&P Global
- Reuters
- Bloomberg

## Commodity Coverage

### **Precious Metals**
- Kitco News (gold, silver focus)
- Gold News (dedicated gold coverage)
- Mining.com, Reuters, Bloomberg

### **Base Metals**
- Copper News (dedicated copper coverage)
- Mining.com, Mining Journal, Mining Weekly

### **Battery Metals**
- Lithium News (lithium focus)
- Australian Mining (lithium, nickel)
- Mining Technology (EV supply chain)

### **Industrial Minerals**
- Mining Weekly (platinum, iron ore)
- Mining Review Africa (diamonds, coal)
- All general sources

## How It Works

### News Refresh Flow
1. User clicks "Refresh News" button in dashboard
2. System scrapes all 15 sources in sequence
3. Each source: Extract up to 10 articles (configurable)
4. Articles processed with:
   - Title validation and cleaning
   - URL deduplication
   - Commodity extraction
   - Sentiment analysis
   - AI-powered summary generation (if needed)
5. Saved to database (duplicates skipped)

### Rate Limiting & Performance
- 2-second delay between sources (prevent rate limiting)
- Total refresh time: ~30-45 seconds for all 15 sources
- Parallel processing not used to respect API limits
- Firecrawl API handles scraping and extraction

### Quality Controls
- Title length validation (15-250 characters)
- URL validation (must be http/https links)
- Image URL filtering (no .jpg, .png, etc.)
- Teaser text filtering (no "Image:", "Photo:", etc.)
- Duplicate detection (by URL and title)

## Expected Results

### Before (3 sources)
- Limited diversity
- Mostly Kitco and Northern Miner
- Heavy Canadian/North American bias
- Precious metals focus

### After (15 sources)
- **Global coverage** across all continents
- **Regional perspectives** (Australia, Africa, Canada, Europe)
- **Commodity diversity** (gold, copper, lithium, base metals)
- **Multiple viewpoints** (operational, financial, technical)
- **Balanced coverage** of major and junior mining companies

## Monitoring Source Performance

Each refresh provides detailed metrics:
```json
{
  "success": true,
  "totalScraped": 150,
  "totalSaved": 87,
  "sources": [
    { "name": "Mining.com", "scraped": 10, "saved": 8 },
    { "name": "Northern Miner", "scraped": 10, "saved": 6 },
    { "name": "Kitco News", "scraped": 10, "saved": 7 },
    // ... all 15 sources
  ]
}
```

## Configuration

### Adjusting Sources
Edit `lib/news-scraper/firecrawl-news-scraper.ts`:
```typescript
private newsSources = [
  { name: 'Source Name', url: 'https://...' },
  // Add, remove, or modify sources
];
```

### Adjusting Articles Per Source
Modify the refresh API call:
```typescript
fetch('/api/news/refresh', {
  method: 'POST',
  body: JSON.stringify({
    maxPerSource: 10  // Change this number
  })
})
```

### Default: 10 articles per source = 150 articles per refresh

## Benefits

1. **Comprehensive Coverage**
   - No major mining news missed
   - Multiple perspectives on same stories

2. **Geographic Diversity**
   - Local news from major mining regions
   - Regional regulatory and policy updates

3. **Commodity Diversity**
   - Dedicated coverage for critical minerals
   - Battery metals and energy transition news

4. **Credibility**
   - Mix of established publications
   - Financial news outlets (S&P, Reuters, Bloomberg)

5. **User Value**
   - More relevant news for specific interests
   - Better commodity-specific insights
   - Global project tracking

## Future Enhancements

Potential improvements:
- Add company-specific news sources (e.g., ASX announcements, SEDAR+, SEC EDGAR)
- Implement intelligent source prioritization based on user interests
- Add source reliability scoring
- Enable/disable specific sources via UI
- Add RSS feed support for real-time updates
- Implement source-specific scraping strategies (some sources may need different extraction logic)

## Testing

To test the diverse sources:
1. Navigate to News section
2. Click "Refresh News" button
3. Wait ~30-45 seconds for scraping to complete
4. Check toast notification for results
5. Verify articles from different sources appear in the table
6. Check console logs for source-by-source results

## Troubleshooting

**If a source fails to scrape:**
- Check the source URL is still valid
- Verify website structure hasn't changed
- Review Firecrawl API limits
- Check console logs for specific errors

**If articles seem duplicate:**
- System has deduplication by URL and title
- May appear similar due to wire service articles
- Can adjust deduplication logic if needed

**If refresh is too slow:**
- Reduce `maxPerSource` from 10 to 5
- Remove some sources temporarily
- Note: 2-second delays are needed to prevent rate limiting

## Summary

✅ **Expanded from 3 to 15 diverse news sources**
✅ **Global geographic coverage** (6 continents)
✅ **Commodity-specific** news (gold, copper, lithium)
✅ **Regional publications** (Australia, Africa, Canada)
✅ **Financial outlets** (S&P, Reuters, Bloomberg)
✅ **Balanced coverage** of major and junior miners
✅ **Quality controls** and deduplication
✅ **AI-powered summaries** for all articles
✅ **Build successful** and ready to use
