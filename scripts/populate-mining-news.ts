#!/usr/bin/env npx tsx
/**
 * Populate database with sample mining news data
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SAMPLE_NEWS = [
  // Today's news
  {
    news_id: 3001,
    symbol: 'LAC',
    company_name: 'Lithium Americas Corp',
    headline: 'Lithium Americas Receives Final Federal Permit for Thacker Pass Project',
    summary: 'The U.S. Bureau of Land Management issued the Record of Decision for Thacker Pass, clearing the way for construction of the largest known lithium resource in the United States.',
    source: 'Reuters',
    datetime: '2025-01-26T14:30:00Z',
    story_url: 'https://example.com/news/lac-permit',
    topics: ['LAC', 'lithium', 'Nevada', 'permits'],
    primary_commodity: 'lithium',
    commodities: ['lithium'],
    news_category: 'regulatory',
    is_mining_related: true,
    is_project_related: true,
    mentions_financials: false,
    mentions_technical_report: false,
    sentiment_score: 0.9,
    relevance_score: 10,
    processing_status: 'processed'
  },
  {
    news_id: 3002,
    symbol: 'ALB',
    company_name: 'Albemarle Corporation',
    headline: 'Albemarle Reports 45% Increase in Lithium Hydroxide Production',
    summary: 'Q4 results show record production at Kemerton facility in Australia, with battery-grade lithium hydroxide output reaching 15,000 tonnes.',
    source: 'Mining Weekly',
    datetime: '2025-01-26T09:15:00Z',
    story_url: 'https://example.com/news/alb-production',
    topics: ['ALB', 'lithium', 'Australia', 'production'],
    primary_commodity: 'lithium',
    commodities: ['lithium'],
    news_category: 'company',
    is_mining_related: true,
    is_project_related: false,
    mentions_financials: true,
    mentions_technical_report: false,
    sentiment_score: 0.85,
    relevance_score: 9,
    processing_status: 'processed'
  },
  {
    news_id: 3004,
    symbol: 'FCX',
    company_name: 'Freeport-McMoRan Inc',
    headline: 'Freeport Discovers New High-Grade Copper Zone at Grasberg',
    summary: 'Drilling results reveal significant copper-gold mineralization extending 500 meters below current workings with grades averaging 2.1% Cu and 1.2 g/t Au.',
    source: 'Mining.com',
    datetime: '2025-01-26T11:00:00Z',
    story_url: 'https://example.com/news/fcx-discovery',
    topics: ['FCX', 'copper', 'Indonesia', 'exploration'],
    primary_commodity: 'copper',
    commodities: ['copper', 'gold'],
    news_category: 'exploration',
    is_mining_related: true,
    is_project_related: true,
    mentions_financials: false,
    mentions_technical_report: false,
    sentiment_score: 0.9,
    relevance_score: 10,
    processing_status: 'processed'
  },
  {
    news_id: 3007,
    symbol: 'CCJ',
    company_name: 'Cameco Corporation',
    headline: 'Cameco Signs 15-Year Supply Deal with European Utilities Consortium',
    summary: 'Agreement covers delivery of 60 million pounds U3O8 starting 2026, marking largest single contract in company history.',
    source: 'World Nuclear News',
    datetime: '2025-01-26T07:45:00Z',
    story_url: 'https://example.com/news/ccj-contract',
    topics: ['CCJ', 'uranium', 'nuclear', 'contracts'],
    primary_commodity: 'uranium',
    commodities: ['uranium'],
    news_category: 'company',
    is_mining_related: true,
    is_project_related: false,
    mentions_financials: false,
    mentions_technical_report: false,
    sentiment_score: 0.9,
    relevance_score: 9,
    processing_status: 'processed'
  },
  {
    news_id: 3010,
    symbol: 'MP',
    company_name: 'MP Materials',
    headline: 'MP Materials Achieves First Production of Separated Rare Earth Oxides',
    summary: 'Mountain Pass facility produces first commercial quantities of neodymium-praseodymium oxide for magnet production.',
    source: 'Reuters',
    datetime: '2025-01-26T12:30:00Z',
    story_url: 'https://example.com/news/mp-production',
    topics: ['MP', 'rare-earth', 'USA', 'production'],
    primary_commodity: 'rare_earth',
    commodities: ['rare_earth'],
    news_category: 'company',
    is_mining_related: true,
    is_project_related: true,
    mentions_financials: false,
    mentions_technical_report: false,
    sentiment_score: 0.95,
    relevance_score: 10,
    processing_status: 'processed'
  },
  // Yesterday's news
  {
    news_id: 3003,
    symbol: 'SQM',
    company_name: 'Sociedad Quimica y Minera',
    headline: 'SQM Announces $2.2 Billion Expansion in Chilean Lithium Operations',
    summary: 'Chilean miner SQM plans major expansion to double lithium carbonate production capacity by 2027 amid surging EV demand.',
    source: 'Bloomberg',
    datetime: '2025-01-25T16:45:00Z',
    story_url: 'https://example.com/news/sqm-expansion',
    topics: ['SQM', 'lithium', 'Chile', 'expansion'],
    primary_commodity: 'lithium',
    commodities: ['lithium'],
    news_category: 'company',
    is_mining_related: true,
    is_project_related: true,
    mentions_financials: true,
    mentions_technical_report: false,
    sentiment_score: 0.8,
    relevance_score: 9,
    processing_status: 'processed'
  },
  {
    news_id: 3005,
    symbol: 'SCCO',
    company_name: 'Southern Copper',
    headline: 'Southern Copper Completes Feasibility Study for Los Chancas Project',
    summary: 'Technical report shows NPV of $2.8 billion and IRR of 28% for the greenfield copper-molybdenum project in Peru.',
    source: 'Company Release',
    datetime: '2025-01-25T08:30:00Z',
    story_url: 'https://example.com/news/scco-feasibility',
    topics: ['SCCO', 'copper', 'Peru', 'feasibility'],
    primary_commodity: 'copper',
    commodities: ['copper', 'molybdenum'],
    news_category: 'technical',
    is_mining_related: true,
    is_project_related: true,
    mentions_financials: true,
    mentions_technical_report: true,
    sentiment_score: 0.85,
    relevance_score: 10,
    processing_status: 'processed'
  },
  {
    news_id: 3008,
    symbol: 'NXE',
    company_name: 'NexGen Energy',
    headline: 'NexGen Files Updated Technical Report Showing 30% Increase in Reserves',
    summary: 'Arrow deposit now hosts 389 million pounds U3O8 in proven and probable reserves with average grade of 4.35%.',
    source: 'SEDAR',
    datetime: '2025-01-25T10:00:00Z',
    story_url: 'https://example.com/news/nxe-reserves',
    topics: ['NXE', 'uranium', 'Saskatchewan', 'technical-report'],
    primary_commodity: 'uranium',
    commodities: ['uranium'],
    news_category: 'technical',
    is_mining_related: true,
    is_project_related: true,
    mentions_financials: true,
    mentions_technical_report: true,
    sentiment_score: 0.88,
    relevance_score: 10,
    processing_status: 'processed'
  },
  {
    news_id: 3011,
    symbol: 'LYSCF',
    company_name: 'Lynas Corporation',
    headline: 'Lynas Secures $500M US DoD Contract for Texas Processing Facility',
    summary: 'Department of Defense funding ensures domestic rare earth processing capability for critical defense applications.',
    source: 'Defense News',
    datetime: '2025-01-25T14:00:00Z',
    story_url: 'https://example.com/news/lynas-dod',
    topics: ['LYSCF', 'rare-earth', 'USA', 'government'],
    primary_commodity: 'rare_earth',
    commodities: ['rare_earth'],
    news_category: 'regulatory',
    is_mining_related: true,
    is_project_related: true,
    mentions_financials: true,
    mentions_technical_report: false,
    sentiment_score: 0.9,
    relevance_score: 10,
    processing_status: 'processed'
  },
  {
    news_id: 3015,
    symbol: 'REGULATORY',
    company_name: 'Industry News',
    headline: 'US Senate Passes Critical Minerals Security Act with Bipartisan Support',
    summary: 'Legislation provides $15 billion in funding for domestic mining projects and streamlines permitting for strategic minerals.',
    source: 'Wall Street Journal',
    datetime: '2025-01-25T18:00:00Z',
    story_url: 'https://example.com/news/minerals-act',
    topics: ['regulation', 'USA', 'critical-minerals', 'funding'],
    primary_commodity: 'diversified',
    commodities: ['lithium', 'copper', 'rare_earth'],
    news_category: 'regulatory',
    is_mining_related: true,
    is_project_related: false,
    mentions_financials: true,
    mentions_technical_report: false,
    sentiment_score: 0.85,
    relevance_score: 10,
    processing_status: 'processed'
  }
];

async function populateNews() {
  console.log('🚀 POPULATING MINING NEWS DATABASE');
  console.log('='.repeat(70));

  try {
    // Clear existing news (optional)
    console.log('\n📊 Clearing existing news data...');
    const { error: deleteError } = await supabase
      .from('quotemedia_news')
      .delete()
      .gte('news_id', 3000); // Only delete our sample data

    if (deleteError) {
      console.log('⚠️ Could not clear existing data:', deleteError.message);
    }

    // Insert sample news
    console.log('\n📝 Inserting sample mining news...');
    const { data, error } = await supabase
      .from('quotemedia_news')
      .insert(SAMPLE_NEWS)
      .select();

    if (error) {
      console.error('❌ Error inserting news:', error);
      return;
    }

    console.log(`✅ Successfully inserted ${data.length} news items`);

    // Display summary
    console.log('\n📊 News Summary:');
    console.log(`   Total items: ${data.length}`);

    const commodityCounts: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};

    data.forEach(item => {
      if (item.primary_commodity) {
        commodityCounts[item.primary_commodity] = (commodityCounts[item.primary_commodity] || 0) + 1;
      }
      if (item.news_category) {
        categoryCounts[item.news_category] = (categoryCounts[item.news_category] || 0) + 1;
      }
    });

    console.log('\n   By Commodity:');
    Object.entries(commodityCounts).forEach(([commodity, count]) => {
      console.log(`   - ${commodity}: ${count}`);
    });

    console.log('\n   By Category:');
    Object.entries(categoryCounts).forEach(([category, count]) => {
      console.log(`   - ${category}: ${count}`);
    });

    console.log('\n   Features:');
    console.log(`   - Mining related: ${data.filter(n => n.is_mining_related).length}`);
    console.log(`   - Project updates: ${data.filter(n => n.is_project_related).length}`);
    console.log(`   - Technical reports: ${data.filter(n => n.mentions_technical_report).length}`);
    console.log(`   - Financial mentions: ${data.filter(n => n.mentions_financials).length}`);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ News population complete!');
}

// Execute
populateNews().catch(console.error);