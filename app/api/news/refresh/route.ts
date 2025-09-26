import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const QUOTEMEDIA_BASE_URL = 'https://app.quotemedia.com/data';
const WMID = '131706';
const PASSWORD = process.env.QUOTEMEDIA_WEBSERVICE_PASSWORD || 'dfbsembl48';

// Mining company symbols
const MINING_SYMBOLS = [
  'LAC', 'ALB', 'SQM', 'PLL', 'SGML',
  'FCX', 'SCCO', 'TECK', 'HBM', 'ERO',
  'MP', 'TMRC', 'CCJ', 'DNN', 'NXE', 'UEC',
  'VALE', 'BHP', 'NEM', 'GOLD', 'RIO'
];

/**
 * Get QuoteMedia enterprise token
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
 * Fetch headlines from QuoteMedia
 */
async function fetchHeadlines(symbol: string, token: string) {
  const url = `${QUOTEMEDIA_BASE_URL}/getHeadlines.json?` +
    `topics=${symbol}&` +
    `perTopic=10&` +
    `webmasterId=${WMID}&` +
    `summary=true&` +
    `summLen=200&` +
    `thumbnailurl=true&` +
    `token=${token}`;

  try {
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      return data.results?.news || [];
    }
  } catch (error) {
    console.error(`Error fetching news for ${symbol}:`, error);
  }
  return [];
}

/**
 * Parse news with OpenAI to extract mining-related insights
 */
async function parseNewsWithAI(headline: string, summary: string): Promise<any> {
  try {
    const prompt = `Analyze this mining news headline and summary. Extract key information:

Headline: ${headline}
Summary: ${summary}

Return a JSON object with:
{
  "primary_commodity": "lithium|copper|gold|uranium|nickel|cobalt|rare_earth|silver|diversified",
  "is_mining_related": boolean,
  "is_project_related": boolean,
  "mentions_financials": boolean (mentions CAPEX, NPV, IRR, revenue, costs),
  "mentions_technical_report": boolean (mentions NI 43-101, S-K 1300, feasibility study, PEA),
  "sentiment_score": number (-1 to 1),
  "relevance_score": number (1-10 for mining industry relevance),
  "project_names": string[] (any project names mentioned),
  "key_metrics": {
    "capex": string or null,
    "npv": string or null,
    "irr": string or null,
    "production": string or null
  }
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a mining industry analyst. Extract structured data from news." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    return JSON.parse(completion.choices[0].message.content || '{}');
  } catch (error) {
    console.error('Error parsing with AI:', error);
    return {
      is_mining_related: false,
      sentiment_score: 0,
      relevance_score: 5
    };
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();

    // Get QuoteMedia token
    const token = await getEnterpriseToken();
    if (!token) {
      return NextResponse.json({ error: 'Failed to authenticate with QuoteMedia' }, { status: 500 });
    }

    let totalNewsItems = 0;
    const allNewsItems = [];

    // Fetch news for each mining symbol
    for (const symbol of MINING_SYMBOLS.slice(0, 5)) { // Limit to 5 companies for demo
      const newsData = await fetchHeadlines(symbol, token);

      for (const newsGroup of newsData) {
        if (!newsGroup.newsitem) continue;

        const companyName = newsGroup.topicinfo?.name || symbol;
        const items = Array.isArray(newsGroup.newsitem) ? newsGroup.newsitem : [newsGroup.newsitem];

        for (const item of items.slice(0, 3)) { // Limit to 3 items per company
          // Parse with OpenAI
          const aiParsed = await parseNewsWithAI(item.headline, item.qmsummary || '');

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
            topics: item.topic ? item.topic.match(/\[(.*?)\]/)?.[1]?.split(',').map((t: string) => t.trim()) : [],

            // AI-parsed fields
            primary_commodity: aiParsed.primary_commodity || 'diversified',
            commodities: [aiParsed.primary_commodity || 'diversified'],
            is_mining_related: aiParsed.is_mining_related || false,
            is_project_related: aiParsed.is_project_related || false,
            mentions_financials: aiParsed.mentions_financials || false,
            mentions_technical_report: aiParsed.mentions_technical_report || false,
            sentiment_score: aiParsed.sentiment_score || 0,
            relevance_score: aiParsed.relevance_score || 5,

            news_category: 'company',
            processing_status: 'parsed',
            fetched_at: new Date(),
            metadata: {
              ai_parsed: aiParsed,
              original_item: item
            }
          };

          allNewsItems.push(newsRecord);
          totalNewsItems++;

          // Add small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      // Rate limiting between companies
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Insert news items into database
    if (allNewsItems.length > 0) {
      const { data, error } = await supabase
        .from('quotemedia_news')
        .upsert(allNewsItems, { onConflict: 'news_id' })
        .select();

      if (error) {
        console.error('Error inserting news:', error);
        return NextResponse.json({ error: 'Failed to save news' }, { status: 500 });
      }

      return NextResponse.json({
        message: 'News refreshed successfully',
        itemsFetched: totalNewsItems,
        itemsSaved: data?.length || 0
      });
    }

    return NextResponse.json({
      message: 'No new news items found',
      itemsFetched: 0
    });

  } catch (error) {
    console.error('Error refreshing news:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}