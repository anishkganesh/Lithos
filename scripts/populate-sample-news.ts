#!/usr/bin/env npx tsx
/**
 * Populate database with sample mining news data
 * This creates realistic news entries based on actual mining industry events
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dfxauievbyqwcynwtvib.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmeGF1aWV2Ynlxd2N5bnd0dmliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Nzg0ODI2MSwiZXhwIjoyMDYzNDI0MjYxfQ.4Uj_dNP0Wqo5fzA7XyUJwkZJ5RQjKXlZCqQVJkP3Qpo'
);

// Sample realistic news data
const SAMPLE_NEWS = [
  // Lithium news
  {
    news_id: 1001,
    symbol: 'LAC',
    company_name: 'Lithium Americas Corp',
    headline: 'Lithium Americas Announces Positive Feasibility Study Results for Thacker Pass Project',
    summary: 'Lithium Americas reported strong economics with an after-tax NPV of $5.7 billion and IRR of 26% for its Thacker Pass lithium project in Nevada. The project is expected to produce 80,000 tonnes of lithium carbonate annually over a 40-year mine life.',
    source: 'Company Press Release',
    datetime: new Date('2025-01-24T09:30:00Z'),
    story_url: 'https://example.com/news/lac-feasibility-study',
    topics: ['LAC', 'lithium', 'Nevada', 'feasibility-study'],
    primary_commodity: 'lithium',
    commodities: ['lithium'],
    news_category: 'company',
    is_mining_related: true,
    is_project_related: true,
    mentions_financials: true,
    mentions_technical_report: true,
    sentiment_score: 0.8,
    relevance_score: 10,
    processing_status: 'processed',
  },
  {
    news_id: 1002,
    symbol: 'ALB',
    company_name: 'Albemarle Corporation',
    headline: 'Albemarle Expands Lithium Production Capacity in Australia',
    summary: 'Albemarle announced a $500 million expansion of its Kemerton lithium hydroxide plant in Western Australia, increasing capacity by 50,000 tonnes per year to meet growing EV battery demand.',
    source: 'Reuters',
    datetime: new Date('2025-01-23T14:15:00Z'),
    story_url: 'https://example.com/news/alb-expansion',
    topics: ['ALB', 'lithium', 'Australia', 'expansion'],
    primary_commodity: 'lithium',
    commodities: ['lithium'],
    news_category: 'company',
    is_mining_related: true,
    is_project_related: true,
    mentions_financials: true,
    mentions_technical_report: false,
    sentiment_score: 0.7,
    relevance_score: 9,
    processing_status: 'processed',
  },

  // Copper news
  {
    news_id: 1003,
    symbol: 'FCX',
    company_name: 'Freeport-McMoRan Inc',
    headline: 'Freeport-McMoRan Reports Record Copper Production at Grasberg Mine',
    summary: 'FCX achieved record quarterly copper production of 1.1 billion pounds at its Grasberg mine in Indonesia, driven by higher ore grades and improved recovery rates.',
    source: 'Mining Weekly',
    datetime: new Date('2025-01-22T11:00:00Z'),
    story_url: 'https://example.com/news/fcx-production',
    topics: ['FCX', 'copper', 'Indonesia', 'production'],
    primary_commodity: 'copper',
    commodities: ['copper', 'gold'],
    news_category: 'company',
    is_mining_related: true,
    is_project_related: false,
    mentions_financials: false,
    mentions_technical_report: false,
    sentiment_score: 0.9,
    relevance_score: 8,
    processing_status: 'processed',
  },
  {
    news_id: 1004,
    symbol: 'SCCO',
    company_name: 'Southern Copper Corporation',
    headline: 'Southern Copper Receives Environmental Permit for Tia Maria Project',
    summary: 'SCCO received final environmental approval for its $1.4 billion Tia Maria copper project in Peru, with construction expected to begin in Q2 2025.',
    source: 'Bloomberg',
    datetime: new Date('2025-01-21T08:45:00Z'),
    story_url: 'https://example.com/news/scco-permit',
    topics: ['SCCO', 'copper', 'Peru', 'permits'],
    primary_commodity: 'copper',
    commodities: ['copper'],
    news_category: 'regulatory',
    is_mining_related: true,
    is_project_related: true,
    mentions_financials: true,
    mentions_technical_report: false,
    sentiment_score: 0.85,
    relevance_score: 9,
    processing_status: 'processed',
  },

  // Uranium news
  {
    news_id: 1005,
    symbol: 'CCJ',
    company_name: 'Cameco Corporation',
    headline: 'Cameco Signs Long-term Uranium Supply Agreement with Major Utility',
    summary: 'Cameco announced a 10-year uranium supply contract with a major US utility for 40 million pounds of U3O8, strengthening its order book amid nuclear energy renaissance.',
    source: 'World Nuclear News',
    datetime: new Date('2025-01-20T13:20:00Z'),
    story_url: 'https://example.com/news/ccj-contract',
    topics: ['CCJ', 'uranium', 'nuclear', 'contracts'],
    primary_commodity: 'uranium',
    commodities: ['uranium'],
    news_category: 'company',
    is_mining_related: true,
    is_project_related: false,
    mentions_financials: false,
    mentions_technical_report: false,
    sentiment_score: 0.75,
    relevance_score: 8,
    processing_status: 'processed',
  },
  {
    news_id: 1006,
    symbol: 'DNN',
    company_name: 'Denison Mines Corp',
    headline: 'Denison Mines Completes NI 43-101 Technical Report for Wheeler River ISR Project',
    summary: 'DNN released an updated NI 43-101 compliant technical report showing robust economics with NPV8% of C$1.8 billion and IRR of 38% for its Wheeler River in-situ recovery uranium project.',
    source: 'SEDAR',
    datetime: new Date('2025-01-19T10:00:00Z'),
    story_url: 'https://example.com/news/dnn-technical-report',
    topics: ['DNN', 'uranium', 'Saskatchewan', 'NI-43-101'],
    primary_commodity: 'uranium',
    commodities: ['uranium'],
    news_category: 'technical',
    is_mining_related: true,
    is_project_related: true,
    mentions_financials: true,
    mentions_technical_report: true,
    sentiment_score: 0.8,
    relevance_score: 10,
    processing_status: 'processed',
  },

  // Rare Earth news
  {
    news_id: 1007,
    symbol: 'MP',
    company_name: 'MP Materials Corp',
    headline: 'MP Materials Begins Production at Rare Earth Magnets Facility',
    summary: 'MP Materials commenced production at its Fort Worth rare earth magnets facility, marking a major milestone in establishing a fully integrated US rare earth supply chain.',
    source: 'PR Newswire',
    datetime: new Date('2025-01-18T15:30:00Z'),
    story_url: 'https://example.com/news/mp-magnets',
    topics: ['MP', 'rare-earth', 'magnets', 'USA'],
    primary_commodity: 'rare_earth',
    commodities: ['rare_earth'],
    news_category: 'company',
    is_mining_related: true,
    is_project_related: true,
    mentions_financials: false,
    mentions_technical_report: false,
    sentiment_score: 0.9,
    relevance_score: 9,
    processing_status: 'processed',
  },

  // Nickel news
  {
    news_id: 1008,
    symbol: 'VALE',
    company_name: 'Vale SA',
    headline: 'Vale Announces $2.3 Billion Investment in Indonesian Nickel Processing',
    summary: 'Vale committed $2.3 billion to expand its nickel processing capacity in Indonesia, targeting battery-grade nickel production for the EV market.',
    source: 'Financial Times',
    datetime: new Date('2025-01-17T12:00:00Z'),
    story_url: 'https://example.com/news/vale-nickel',
    topics: ['VALE', 'nickel', 'Indonesia', 'batteries'],
    primary_commodity: 'nickel',
    commodities: ['nickel', 'cobalt'],
    news_category: 'company',
    is_mining_related: true,
    is_project_related: true,
    mentions_financials: true,
    mentions_technical_report: false,
    sentiment_score: 0.7,
    relevance_score: 9,
    processing_status: 'processed',
  },

  // Gold news
  {
    news_id: 1009,
    symbol: 'NEM',
    company_name: 'Newmont Corporation',
    headline: 'Newmont Discovers High-Grade Gold Extension at Tanami Mine',
    summary: 'Newmont reported significant high-grade gold intercepts at its Tanami mine in Australia, with drill results showing 15 meters at 12.3 g/t gold.',
    source: 'Mining.com',
    datetime: new Date('2025-01-16T09:45:00Z'),
    story_url: 'https://example.com/news/nem-discovery',
    topics: ['NEM', 'gold', 'Australia', 'exploration'],
    primary_commodity: 'gold',
    commodities: ['gold'],
    news_category: 'exploration',
    is_mining_related: true,
    is_project_related: true,
    mentions_financials: false,
    mentions_technical_report: false,
    sentiment_score: 0.85,
    relevance_score: 8,
    processing_status: 'processed',
  },

  // Market news
  {
    news_id: 1010,
    symbol: 'MARKET',
    company_name: 'Market Update',
    headline: 'Lithium Prices Surge 15% on Strong EV Sales Data',
    summary: 'Lithium carbonate prices jumped 15% this week following stronger-than-expected global EV sales data, signaling renewed demand for battery materials.',
    source: 'Fastmarkets',
    datetime: new Date('2025-01-15T16:00:00Z'),
    story_url: 'https://example.com/news/lithium-prices',
    topics: ['lithium', 'prices', 'EVs', 'market'],
    primary_commodity: 'lithium',
    commodities: ['lithium'],
    news_category: 'market',
    is_mining_related: true,
    is_project_related: false,
    mentions_financials: false,
    mentions_technical_report: false,
    sentiment_score: 0.7,
    relevance_score: 7,
    processing_status: 'processed',
  },

  // More technical reports
  {
    news_id: 1011,
    symbol: 'IVN',
    company_name: 'Ivanhoe Mines',
    headline: 'Ivanhoe Mines Files S-K 1300 Technical Report for Kamoa-Kakula Expansion',
    summary: 'IVN filed an S-K 1300 compliant technical report showing Phase 3 expansion economics with NPV of $16.9 billion and IRR of 42% at $3.50/lb copper.',
    source: 'SEC EDGAR',
    datetime: new Date('2025-01-14T11:30:00Z'),
    story_url: 'https://example.com/news/ivn-sk1300',
    topics: ['IVN', 'copper', 'DRC', 'S-K-1300'],
    primary_commodity: 'copper',
    commodities: ['copper'],
    news_category: 'technical',
    is_mining_related: true,
    is_project_related: true,
    mentions_financials: true,
    mentions_technical_report: true,
    sentiment_score: 0.9,
    relevance_score: 10,
    processing_status: 'processed',
  },

  {
    news_id: 1012,
    symbol: 'NXE',
    company_name: 'NexGen Energy',
    headline: 'NexGen Receives Federal Environmental Assessment Approval for Rook I Project',
    summary: 'NXE received positive federal environmental assessment decision for its Rook I uranium project in Saskatchewan, clearing a major regulatory milestone.',
    source: 'Canadian Nuclear Safety Commission',
    datetime: new Date('2025-01-13T14:00:00Z'),
    story_url: 'https://example.com/news/nxe-approval',
    topics: ['NXE', 'uranium', 'Saskatchewan', 'environmental'],
    primary_commodity: 'uranium',
    commodities: ['uranium'],
    news_category: 'regulatory',
    is_mining_related: true,
    is_project_related: true,
    mentions_financials: false,
    mentions_technical_report: false,
    sentiment_score: 0.85,
    relevance_score: 9,
    processing_status: 'processed',
  },

  {
    news_id: 1013,
    symbol: 'TECK',
    company_name: 'Teck Resources',
    headline: 'Teck Reports Preliminary Economic Assessment for Zafranal Copper Project',
    summary: 'Teck announced PEA results for Zafranal showing $1.2 billion NPV and 28% IRR, with initial CAPEX of $850 million for 150,000 tpa copper production.',
    source: 'Company Filing',
    datetime: new Date('2025-01-12T10:15:00Z'),
    story_url: 'https://example.com/news/teck-pea',
    topics: ['TECK', 'copper', 'Peru', 'PEA'],
    primary_commodity: 'copper',
    commodities: ['copper', 'gold'],
    news_category: 'technical',
    is_mining_related: true,
    is_project_related: true,
    mentions_financials: true,
    mentions_technical_report: true,
    sentiment_score: 0.75,
    relevance_score: 9,
    processing_status: 'processed',
  },

  {
    news_id: 1014,
    symbol: 'BHP',
    company_name: 'BHP Group',
    headline: 'BHP Approves $6.4 Billion Jansen Potash Project in Canada',
    summary: 'BHP board approved final investment decision for Jansen Stage 1 potash project in Saskatchewan, with first production expected in 2027.',
    source: 'ASX Announcement',
    datetime: new Date('2025-01-11T08:00:00Z'),
    story_url: 'https://example.com/news/bhp-jansen',
    topics: ['BHP', 'potash', 'Canada', 'investment'],
    primary_commodity: 'potash',
    commodities: ['potash'],
    news_category: 'company',
    is_mining_related: true,
    is_project_related: true,
    mentions_financials: true,
    mentions_technical_report: false,
    sentiment_score: 0.8,
    relevance_score: 9,
    processing_status: 'processed',
  },

  {
    news_id: 1015,
    symbol: 'RIO',
    company_name: 'Rio Tinto',
    headline: 'Rio Tinto Partners with Ford on Lithium Supply from Rincon Project',
    summary: 'Rio Tinto signed an MOU with Ford Motor Company for lithium supply from its Rincon project in Argentina, targeting 2026 for first production.',
    source: 'Reuters',
    datetime: new Date('2025-01-10T13:45:00Z'),
    story_url: 'https://example.com/news/rio-ford',
    topics: ['RIO', 'lithium', 'Argentina', 'partnerships'],
    primary_commodity: 'lithium',
    commodities: ['lithium'],
    news_category: 'company',
    is_mining_related: true,
    is_project_related: true,
    mentions_financials: false,
    mentions_technical_report: false,
    sentiment_score: 0.75,
    relevance_score: 8,
    processing_status: 'processed',
  }
];

async function populateSampleNews() {
  console.log('🚀 POPULATING SAMPLE NEWS DATA');
  console.log('='.repeat(70));

  // Insert sample news
  const { data, error } = await supabase
    .from('quotemedia_news')
    .upsert(SAMPLE_NEWS, { onConflict: 'news_id' })
    .select();

  if (error) {
    console.error('❌ Error inserting news:', error);
    return;
  }

  console.log(`✅ Successfully inserted ${data?.length || 0} news items`);

  // Get statistics
  const { data: stats } = await supabase
    .from('quotemedia_news')
    .select('primary_commodity')
    .order('datetime', { ascending: false });

  if (stats) {
    const commodityCounts = stats.reduce((acc: any, item: any) => {
      acc[item.primary_commodity] = (acc[item.primary_commodity] || 0) + 1;
      return acc;
    }, {});

    console.log('\n📊 News by Commodity:');
    Object.entries(commodityCounts).forEach(([commodity, count]) => {
      console.log(`   ${commodity}: ${count} articles`);
    });
  }

  // Get recent headlines
  const { data: recent } = await supabase
    .from('quotemedia_news')
    .select('headline, symbol, datetime')
    .order('datetime', { ascending: false })
    .limit(5);

  if (recent && recent.length > 0) {
    console.log('\n📰 Recent Headlines:');
    recent.forEach((item: any) => {
      console.log(`   [${item.symbol}] ${item.headline}`);
    });
  }

  console.log('\n' + '='.repeat(70));
  console.log('✨ Sample news data populated successfully!');
  console.log('   Visit /news to see the news in the UI');
}

// Execute
populateSampleNews().catch(console.error);