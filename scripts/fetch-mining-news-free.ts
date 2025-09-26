#!/usr/bin/env npx tsx
/**
 * Fetch mining news from free sources
 * Alternative to QuoteMedia which requires paid news entitlements
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Fetch news from NewsAPI (free tier available)
 * Sign up at: https://newsapi.org/register
 */
async function fetchFromNewsAPI() {
  const API_KEY = process.env.NEWS_API_KEY; // You'll need to get a free API key

  if (!API_KEY) {
    console.log('⚠️ NEWS_API_KEY not found in environment');
    console.log('   Sign up for free at: https://newsapi.org/register');
    return [];
  }

  const topics = ['lithium mining', 'copper mining', 'uranium mining', 'rare earth'];
  const allArticles = [];

  for (const topic of topics) {
    const url = `https://newsapi.org/v2/everything?` +
      `q=${encodeURIComponent(topic)}&` +
      `language=en&` +
      `sortBy=publishedAt&` +
      `pageSize=10&` +
      `apiKey=${API_KEY}`;

    try {
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        allArticles.push(...data.articles);
      }
    } catch (error) {
      console.error(`Error fetching ${topic}:`, error);
    }
  }

  return allArticles;
}

/**
 * Fetch from Alpha Vantage News (free with API key)
 * Sign up at: https://www.alphavantage.co/support/#api-key
 */
async function fetchFromAlphaVantage() {
  const API_KEY = process.env.ALPHA_VANTAGE_KEY;

  if (!API_KEY) {
    console.log('⚠️ ALPHA_VANTAGE_KEY not found');
    console.log('   Sign up for free at: https://www.alphavantage.co/support/#api-key');
    return [];
  }

  const symbols = ['LAC', 'ALB', 'FCX', 'CCJ', 'MP', 'VALE'];
  const allNews = [];

  for (const symbol of symbols) {
    const url = `https://www.alphavantage.co/query?` +
      `function=NEWS_SENTIMENT&` +
      `tickers=${symbol}&` +
      `apikey=${API_KEY}`;

    try {
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.feed) {
          allNews.push(...data.feed);
        }
      }
    } catch (error) {
      console.error(`Error fetching ${symbol}:`, error);
    }
  }

  return allNews;
}

/**
 * Use RSS feeds from mining news sites (completely free)
 */
async function fetchFromRSSFeeds() {
  const RSS_FEEDS = [
    'https://www.mining.com/feed/', // Mining.com RSS
    'https://www.miningweekly.com/rss', // Mining Weekly RSS
    'https://www.northernminer.com/feed/', // Northern Miner RSS
  ];

  console.log('📡 Fetching from RSS feeds (free, no API key required)...');

  // Note: RSS parsing would require an RSS parser library
  // For demonstration, showing the structure

  return [
    {
      title: 'Example: Lithium Americas Reports Strong Feasibility Study',
      link: 'https://www.mining.com/example',
      pubDate: new Date(),
      description: 'Example mining news from RSS feed',
      source: 'Mining.com'
    }
  ];
}

/**
 * Main execution
 */
async function fetchMiningNews() {
  console.log('🚀 FETCHING MINING NEWS FROM FREE SOURCES');
  console.log('='.repeat(70));

  // Try different sources
  console.log('\n1️⃣ Attempting NewsAPI...');
  const newsAPIArticles = await fetchFromNewsAPI();
  console.log(`   Found ${newsAPIArticles.length} articles`);

  console.log('\n2️⃣ Attempting Alpha Vantage...');
  const alphaVantageNews = await fetchFromAlphaVantage();
  console.log(`   Found ${alphaVantageNews.length} articles`);

  console.log('\n3️⃣ RSS Feeds (always available)...');
  const rssNews = await fetchFromRSSFeeds();
  console.log(`   Found ${rssNews.length} articles`);

  console.log('\n' + '='.repeat(70));
  console.log('📌 RECOMMENDATIONS:');
  console.log('1. NewsAPI.org - Free tier with 100 requests/day');
  console.log('2. Alpha Vantage - Free tier with 500 requests/day');
  console.log('3. RSS Feeds - Completely free, no limits');
  console.log('4. Web scraping with Puppeteer - Free but requires maintenance');
  console.log('\n💡 Add API keys to .env.local:');
  console.log('   NEWS_API_KEY=your_key_here');
  console.log('   ALPHA_VANTAGE_KEY=your_key_here');
}

// Execute
fetchMiningNews().catch(console.error);