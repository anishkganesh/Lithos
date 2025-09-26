#!/usr/bin/env npx tsx
/**
 * Fetch mining news headlines from QuoteMedia and populate database
 * Uses getHeadlines API to retrieve news for mining companies and commodity topics
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dfxauievbyqwcynwtvib.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmeGF1aWV2Ynlxd2N5bnd0dmliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Nzg0ODI2MSwiZXhwIjoyMDYzNDI0MjYxfQ.4Uj_dNP0Wqo5fzA7XyUJwkZJ5RQjKXlZCqQVJkP3Qpo'
);

const QUOTEMEDIA_BASE_URL = 'https://app.quotemedia.com/data';
const WMID = '131706';
const PASSWORD = process.env.QUOTEMEDIA_WEBSERVICE_PASSWORD || 'dfbsembl48';

// Mining companies to fetch news for
const MINING_SYMBOLS = [
  // Critical Minerals - Lithium
  'LAC', 'ALB', 'SQM', 'PLL', 'SGML', 'LTHM',
  // Copper
  'FCX', 'SCCO', 'TECK', 'HBM', 'ERO', 'CS', 'FM', 'IVN',
  // Rare Earths
  'MP', 'TMRC', 'REEMF',
  // Uranium
  'CCJ', 'DNN', 'NXE', 'UEC', 'UUUU', 'URG',
  // Nickel/Cobalt
  'VALE', 'BHP', 'NILSY',
  // Gold (often mentions critical minerals)
  'NEM', 'GOLD', 'AEM', 'KGC',
  // Diversified
  'RIO', 'AA', 'CLF'
];

// Commodity and market topics
const NEWS_TOPICS = [
  'mining', 'metals', 'commodities',
  'lithium', 'copper', 'uranium', 'nickel', 'cobalt', 'rare-earth',
  'gold', 'silver', 'aluminum',
  'battery-metals', 'critical-minerals',
  'ev-metals', 'green-metals'
];

/**
 * Get enterprise token for authentication
 */
async function getEnterpriseToken(): Promise<string | null> {
  try {
    const response = await fetch(`https://app.quotemedia.com/auth/v0/enterprise/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wmId: parseInt(WMID),
        webservicePassword: PASSWORD
      })
    });

    if (response.ok) {
      const data = await response.json();
      return data.token;
    }
  } catch (error) {
    console.error('Failed to get token:', error);
  }
  return null;
}

/**
 * Fetch news headlines for a topic/symbol
 */
async function fetchHeadlines(topic: string, token: string, perTopic: number = 50) {
  const url = `${QUOTEMEDIA_BASE_URL}/getHeadlines.json?` +
    `topics=${topic}&` +
    `perTopic=${perTopic}&` +
    `webmasterId=${WMID}&` +
    `summary=true&` +
    `summLen=250&` +
    `thumbnailurl=true&` +
    `token=${token}`;

  try {
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      return data.results?.news || [];
    }
  } catch (error) {
    console.error(`Error fetching news for ${topic}:`, error);
  }
  return [];
}

/**
 * Detect commodity from topics array
 */
function detectCommodity(topics: string[]): string {
  const topicsStr = topics.join(' ').toLowerCase();

  if (topicsStr.includes('lithium') || topicsStr.includes('li')) return 'lithium';
  if (topicsStr.includes('copper') || topicsStr.includes('cu')) return 'copper';
  if (topicsStr.includes('uranium') || topicsStr.includes('u3o8')) return 'uranium';
  if (topicsStr.includes('nickel') || topicsStr.includes('ni')) return 'nickel';
  if (topicsStr.includes('cobalt') || topicsStr.includes('co')) return 'cobalt';
  if (topicsStr.includes('rare') && topicsStr.includes('earth')) return 'rare_earth';
  if (topicsStr.includes('gold') || topicsStr.includes('au')) return 'gold';
  if (topicsStr.includes('silver') || topicsStr.includes('ag')) return 'silver';
  if (topicsStr.includes('aluminum') || topicsStr.includes('al')) return 'aluminum';

  return 'diversified';
}

/**
 * Check if news is mining related
 */
function isMiningRelated(headline: string, topics: string[]): boolean {
  const text = (headline + ' ' + topics.join(' ')).toLowerCase();

  const miningKeywords = [
    'mine', 'mining', 'mineral', 'metal', 'ore', 'resource',
    'drill', 'exploration', 'production', 'feasibility',
    'lithium', 'copper', 'uranium', 'nickel', 'cobalt', 'rare earth',
    'gold', 'silver', 'aluminum', 'zinc', 'lead',
    'capex', 'npv', 'irr', 'grade', 'tonnage', 'reserve',
    'ni 43-101', '43-101', 's-k 1300', 'technical report'
  ];

  return miningKeywords.some(keyword => text.includes(keyword));
}

/**
 * Process and insert news items into database
 */
async function insertNewsItems(newsData: any[], symbol: string) {
  const newsItems = [];

  for (const newsGroup of newsData) {
    if (!newsGroup.newsitem) continue;

    const companyName = newsGroup.topicinfo?.name || symbol;
    const items = Array.isArray(newsGroup.newsitem) ? newsGroup.newsitem : [newsGroup.newsitem];

    for (const item of items) {
      // Parse topics from the topic string
      const topicMatch = item.topic?.match(/\[(.*?)\]/);
      const topics = topicMatch ? topicMatch[1].split(',').map((t: string) => t.trim()) : [];

      const newsRecord = {
        news_id: parseInt(item.newsid),
        symbol: symbol,
        company_name: companyName,
        headline: item.headline,
        summary: item.qmsummary || null,
        source: item.source,
        datetime: new Date(item.datetime),
        vendor_time: item.vendortime ? new Date(item.vendortime) : null,
        story_url: item.storyurl,
        permalink: item.permalink || null,
        thumbnail_url: item.thumbnailurl || null,
        video_url: item.videourl || null,
        video_image_url: item.videoimageurl || null,
        topics: topics,
        primary_commodity: detectCommodity(topics),
        commodities: [detectCommodity(topics)],
        news_category: 'company',
        is_mining_related: isMiningRelated(item.headline, topics),
        is_project_related: item.headline?.toLowerCase().includes('project'),
        mentions_financials: /capex|npv|irr|revenue|earnings|ebitda/i.test(item.headline),
        mentions_technical_report: /43-101|technical report|feasibility|pea/i.test(item.headline),
        processing_status: 'fetched',
        fetched_at: new Date(),
        metadata: {
          original_item: item,
          fetch_symbol: symbol
        }
      };

      newsItems.push(newsRecord);
    }
  }

  if (newsItems.length > 0) {
    // Insert in batches of 100
    for (let i = 0; i < newsItems.length; i += 100) {
      const batch = newsItems.slice(i, i + 100);
      const { data, error } = await supabase
        .from('quotemedia_news')
        .upsert(batch, { onConflict: 'news_id' })
        .select();

      if (error) {
        console.error(`   ❌ Error inserting news: ${error.message}`);
      } else {
        console.log(`   ✅ Inserted ${data?.length || 0} news items`);
      }
    }
  }

  return newsItems.length;
}

/**
 * Main execution - fetch news for all symbols
 */
async function fetchMiningNews() {
  console.log('🚀 QUOTEMEDIA NEWS FETCHER');
  console.log('='.repeat(70));
  console.log('Fetching latest mining news headlines from QuoteMedia\n');

  const token = await getEnterpriseToken();
  if (!token) {
    console.log('❌ Failed to get authentication token');
    return;
  }
  console.log('✅ Authentication successful\n');

  let totalNewsItems = 0;

  // Fetch news for each mining company
  console.log('📰 FETCHING COMPANY NEWS');
  console.log('─'.repeat(40));

  for (const symbol of MINING_SYMBOLS) {
    console.log(`\n📊 Fetching news for ${symbol}...`);

    const newsData = await fetchHeadlines(symbol, token, 30); // Get 30 headlines per company
    const itemCount = await insertNewsItems(newsData, symbol);

    totalNewsItems += itemCount;
    console.log(`   Total items: ${itemCount}`);

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Fetch commodity/topic news
  console.log('\n📰 FETCHING COMMODITY & MARKET NEWS');
  console.log('─'.repeat(40));

  for (const topic of NEWS_TOPICS) {
    console.log(`\n🏷️ Fetching news for topic: ${topic}...`);

    const newsData = await fetchHeadlines(topic, token, 25); // Get 25 headlines per topic
    const itemCount = await insertNewsItems(newsData, topic.toUpperCase());

    totalNewsItems += itemCount;
    console.log(`   Total items: ${itemCount}`);

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Get final count from database
  const { count } = await supabase
    .from('quotemedia_news')
    .select('*', { count: 'exact', head: true });

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 NEWS FETCHING COMPLETE');
  console.log('='.repeat(70));
  console.log(`📰 Total News Items Fetched: ${totalNewsItems}`);
  console.log(`💾 Total News Items in Database: ${count}`);
  console.log(`🏢 Companies Processed: ${MINING_SYMBOLS.length}`);
  console.log(`🏷️ Topics Processed: ${NEWS_TOPICS.length}`);
  console.log('='.repeat(70));

  // Show sample of mining-related news
  const { data: miningNews } = await supabase
    .from('quotemedia_news')
    .select('headline, symbol, datetime')
    .eq('is_mining_related', true)
    .order('datetime', { ascending: false })
    .limit(5);

  if (miningNews && miningNews.length > 0) {
    console.log('\n📌 LATEST MINING-RELATED NEWS:');
    for (const news of miningNews) {
      console.log(`\n   ${news.symbol} (${new Date(news.datetime).toLocaleDateString()})`);
      console.log(`   "${news.headline}"`);
    }
  }
}

// Execute
fetchMiningNews().catch(console.error);