#!/usr/bin/env npx tsx
/**
 * Parse technical reports from quotemedia_links table
 * Extract financial data and populate projects table
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!  // Use ANON_KEY like working scripts
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Financial terms regex patterns
const FINANCIAL_PATTERNS = {
  capex: /(?:capital\s+cost|capex|initial\s+capital|capital\s+expenditure)[^\d]*?([\d,]+(?:\.\d+)?)\s*(?:million|M|\$M)/gi,
  sustainingCapex: /(?:sustaining\s+capital|sustaining\s+capex)[^\d]*?([\d,]+(?:\.\d+)?)\s*(?:million|M|\$M)/gi,
  npvPostTax: /(?:post[\s-]?tax\s+NPV|after[\s-]?tax\s+NPV|NPV[\s\w]*?after[\s-]?tax)[^\d]*?\$?([\d,]+(?:\.\d+)?)\s*(?:million|M|\$M)/gi,
  npvPreTax: /(?:pre[\s-]?tax\s+NPV|before[\s-]?tax\s+NPV|NPV[\s\w]*?before[\s-]?tax)[^\d]*?\$?([\d,]+(?:\.\d+)?)\s*(?:million|M|\$M)/gi,
  irr: /(?:IRR|internal\s+rate\s+of\s+return)[^\d]*?([\d,]+(?:\.\d+)?)\s*%/gi,
  payback: /(?:payback\s+period|payback)[^\d]*?([\d,]+(?:\.\d+)?)\s*(?:years?|yr)/gi,
  mineLife: /(?:mine\s+life|life\s+of\s+mine|LOM)[^\d]*?([\d,]+(?:\.\d+)?)\s*(?:years?|yr)/gi,
  production: /(?:annual\s+production|production\s+rate|yearly\s+production)[^\d]*?([\d,]+(?:\.\d+)?)\s*(?:tonnes?|tons?|mt|kt|Mlbs?|klbs?|oz|koz|Moz)/gi,
  resources: /(?:total\s+resources?|measured\s+\+\s+indicated|M\+I|mineral\s+resources?)[^\d]*?([\d,]+(?:\.\d+)?)\s*(?:million\s+)?(?:tonnes?|tons?|mt|Mt)/gi,
  grade: /(?:average\s+grade|grade|head\s+grade)[^\d]*?([\d,]+(?:\.\d+)?)\s*(?:%|g\/t|ppm|oz\/t|lb\/t)/gi,
  opex: /(?:operating\s+cost|opex|cash\s+cost)[^\d]*?\$?([\d,]+(?:\.\d+)?)\s*(?:\/tonne|\/ton|\/t|\/lb|\/oz)/gi,
  aisc: /(?:AISC|all[\s-]?in\s+sustaining\s+cost)[^\d]*?\$?([\d,]+(?:\.\d+)?)\s*(?:\/tonne|\/ton|\/t|\/lb|\/oz)/gi,
};

interface ExtractedData {
  capex_usd_m?: number;
  sustaining_capex_usd_m?: number;
  post_tax_npv_usd_m?: number;
  pre_tax_npv_usd_m?: number;
  irr_percent?: number;
  payback_years?: number;
  mine_life_years?: number;
  annual_production_tonnes?: number;
  total_resource_tonnes?: number;
  resource_grade?: number;
  resource_grade_unit?: string;
  opex_usd_per_tonne?: number;
  aisc_usd_per_tonne?: number;
  project_name?: string;
  company_name?: string;
  primary_commodity?: string;
  jurisdiction?: string;
  country?: string;
  project_description?: string;
}

async function fetchDocumentContent(url: string): Promise<string | null> {
  try {
    console.log(`  📄 Fetching: ${url}`);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MiningDataExtractor/1.0)'
      }
    });

    if (!response.ok) {
      console.log(`  ❌ Failed to fetch: ${response.status}`);
      return null;
    }

    const html = await response.text();

    // Remove HTML tags and excessive whitespace
    const text = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&[^;]+;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return text;
  } catch (error) {
    console.error(`  ❌ Error fetching document:`, error);
    return null;
  }
}

function extractWithRegex(text: string): Partial<ExtractedData> {
  const extracted: Partial<ExtractedData> = {};

  // Extract values using regex patterns
  for (const [key, pattern] of Object.entries(FINANCIAL_PATTERNS)) {
    const matches = [...text.matchAll(pattern)];
    if (matches.length > 0) {
      // Take the first match for now
      const value = parseFloat(matches[0][1].replace(/,/g, ''));

      switch(key) {
        case 'capex':
          extracted.capex_usd_m = value;
          break;
        case 'sustainingCapex':
          extracted.sustaining_capex_usd_m = value;
          break;
        case 'npvPostTax':
          extracted.post_tax_npv_usd_m = value;
          break;
        case 'npvPreTax':
          extracted.pre_tax_npv_usd_m = value;
          break;
        case 'irr':
          extracted.irr_percent = value;
          break;
        case 'payback':
          extracted.payback_years = value;
          break;
        case 'mineLife':
          extracted.mine_life_years = value;
          break;
        case 'production':
          extracted.annual_production_tonnes = value;
          // Detect units
          const prodMatch = matches[0][0];
          if (prodMatch.includes('Mlb') || prodMatch.includes('klb')) {
            extracted.annual_production_tonnes = value * 453592; // Convert pounds to kg then to tonnes
          } else if (prodMatch.includes('koz') || prodMatch.includes('Moz')) {
            extracted.annual_production_tonnes = value * 31.1035; // Convert oz to grams then to tonnes
          }
          break;
        case 'resources':
          extracted.total_resource_tonnes = value;
          if (matches[0][0].toLowerCase().includes('million')) {
            extracted.total_resource_tonnes = value * 1000000;
          }
          break;
        case 'grade':
          extracted.resource_grade = value;
          const gradeMatch = matches[0][0];
          if (gradeMatch.includes('%')) extracted.resource_grade_unit = '%';
          else if (gradeMatch.includes('g/t')) extracted.resource_grade_unit = 'g/t';
          else if (gradeMatch.includes('ppm')) extracted.resource_grade_unit = 'ppm';
          else if (gradeMatch.includes('oz/t')) extracted.resource_grade_unit = 'oz/t';
          break;
        case 'opex':
          extracted.opex_usd_per_tonne = value;
          break;
        case 'aisc':
          extracted.aisc_usd_per_tonne = value;
          break;
      }
    }
  }

  return extracted;
}

async function extractWithOpenAI(text: string, companyName: string): Promise<ExtractedData> {
  try {
    // Take a relevant chunk of text (first 8000 chars to stay within limits)
    const chunk = text.substring(0, 8000);

    const prompt = `Extract mining project financial data from this technical report for ${companyName}.
Return ONLY a JSON object with these fields (use null for missing values):
{
  "project_name": "project name",
  "capex_usd_m": capital cost in millions USD,
  "sustaining_capex_usd_m": sustaining capital in millions USD,
  "post_tax_npv_usd_m": post-tax NPV in millions USD,
  "pre_tax_npv_usd_m": pre-tax NPV in millions USD,
  "irr_percent": IRR percentage,
  "payback_years": payback period in years,
  "mine_life_years": mine life in years,
  "annual_production_tonnes": annual production in tonnes,
  "total_resource_tonnes": total resources in tonnes,
  "resource_grade": grade value,
  "resource_grade_unit": grade unit (%, g/t, ppm, etc),
  "opex_usd_per_tonne": operating cost per tonne USD,
  "aisc_usd_per_tonne": AISC per tonne USD,
  "primary_commodity": main commodity (lithium, copper, gold, etc),
  "jurisdiction": state/province,
  "country": country,
  "project_description": brief description (max 200 chars)
}

Text: ${chunk}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a mining industry data extraction specialist. Extract only clearly stated values from technical reports.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 1000,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('  ❌ OpenAI extraction error:', error);
  }

  return {};
}

async function processDocument(doc: any): Promise<void> {
  console.log(`\n📊 Processing: ${doc.company_name} - ${doc.form_type}`);

  // Use html_link for document content
  const url = doc.html_link || doc.pdf_link;
  if (!url) {
    console.log('  ⚠️ No document URL, skipping...');
    return;
  }

  // Fetch document content
  const content = await fetchDocumentContent(url);
  if (!content) {
    console.log('  ⚠️ Could not fetch content, skipping...');
    return;
  }

  console.log(`  📏 Document length: ${content.length} chars`);

  // First try regex extraction
  console.log('  🔍 Extracting with regex...');
  const regexData = extractWithRegex(content);

  // Then enhance with OpenAI
  console.log('  🤖 Enhancing with OpenAI...');
  const aiData = await extractWithOpenAI(content, doc.company_name);

  // Merge data (prefer regex for numbers, AI for descriptive fields)
  const finalData: ExtractedData = {
    ...aiData,
    ...regexData, // Regex values override AI for numerical fields
    project_name: aiData.project_name || doc.company_name + ' Project',
    company_name: doc.company_name,
    primary_commodity: doc.primary_commodity?.toLowerCase() || aiData.primary_commodity?.toLowerCase(),
    jurisdiction: aiData.jurisdiction,
    country: aiData.country,
    project_description: aiData.project_description
  };

  // Check if we have meaningful data
  const hasData = finalData.capex_usd_m || finalData.post_tax_npv_usd_m ||
                  finalData.irr_percent || finalData.mine_life_years;

  if (!hasData) {
    console.log('  ⚠️ No financial data extracted, skipping...');
    return;
  }

  console.log('  ✅ Extracted data:', {
    project: finalData.project_name,
    capex: finalData.capex_usd_m,
    npv: finalData.post_tax_npv_usd_m,
    irr: finalData.irr_percent,
    mineLife: finalData.mine_life_years
  });

  // Upsert to projects table
  const { error } = await supabase
    .from('projects')
    .upsert({
      project_name: finalData.project_name,
      company_name: finalData.company_name,
      country: finalData.country,
      jurisdiction: finalData.jurisdiction,
      primary_commodity: finalData.primary_commodity as any,
      capex_usd_m: finalData.capex_usd_m,
      sustaining_capex_usd_m: finalData.sustaining_capex_usd_m,
      post_tax_npv_usd_m: finalData.post_tax_npv_usd_m,
      pre_tax_npv_usd_m: finalData.pre_tax_npv_usd_m,
      irr_percent: finalData.irr_percent,
      payback_years: finalData.payback_years,
      mine_life_years: finalData.mine_life_years,
      annual_production_tonnes: finalData.annual_production_tonnes,
      total_resource_tonnes: finalData.total_resource_tonnes,
      resource_grade: finalData.resource_grade,
      resource_grade_unit: finalData.resource_grade_unit,
      opex_usd_per_tonne: finalData.opex_usd_per_tonne,
      aisc_usd_per_tonne: finalData.aisc_usd_per_tonne,
      technical_report_url: url,
      technical_report_date: doc.filing_date,
      data_source: 'QuoteMedia',
      extraction_confidence: 85,
      processing_status: 'completed',
      project_description: finalData.project_description,
      last_scraped_at: new Date().toISOString()
    }, {
      onConflict: 'project_name,company_name',
      ignoreDuplicates: false
    })
    .select();

  if (error) {
    console.error('  ❌ Database error:', error);
  } else {
    console.log('  ✅ Saved to database');
  }
}

async function main() {
  console.log('🚀 STARTING QUOTEMEDIA TECHNICAL REPORT PARSER');
  console.log('='.repeat(70));

  try {
    // Test connection first
    console.log('\n📚 Testing database connection...');
    const { data: testData, error: testError } = await supabase
      .from('projects')
      .select('project_name')
      .limit(1);

    if (testError) {
      console.error('❌ Cannot connect to database:', testError.message);
      return;
    }
    console.log('✅ Database connection successful');

    // Fetch technical documents from quotemedia_links
    console.log('\n📚 Fetching technical documents from quotemedia_links...');
    const { data: documents, error } = await supabase
      .from('quotemedia_links')
      .select('*')
      .or('form_type.ilike.%EX-96%,form_type.ilike.%technical%,form_type.ilike.%NI%43%,form_type.ilike.%feasibility%')
      .order('filing_date', { ascending: false })
      .limit(50); // Process first 50 for testing

    if (error) {
      console.error('❌ Database error:', error);
      return;
    }

    console.log(`✅ Found ${documents?.length || 0} technical documents`);

    if (!documents || documents.length === 0) {
      console.log('⚠️ No documents to process');

      // Try to find 10-K forms as they may contain technical data
      console.log('\n📚 Looking for 10-K forms with technical data...');
      const { data: forms10k, error: forms10kError } = await supabase
        .from('quotemedia_links')
        .select('*')
        .eq('form_type', '10-K')
        .not('primary_commodity', 'is', null)
        .order('filing_date', { ascending: false })
        .limit(20);

      if (!forms10kError && forms10k && forms10k.length > 0) {
        console.log(`✅ Found ${forms10k.length} 10-K forms to process`);

        // Process in batches of 5
        const batchSize = 5;
        for (let i = 0; i < forms10k.length; i += batchSize) {
          const batch = forms10k.slice(i, i + batchSize);
          console.log(`\n📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(forms10k.length/batchSize)}`);

          await Promise.all(batch.map(doc => processDocument(doc)));

          // Small delay between batches to avoid rate limiting
          if (i + batchSize < forms10k.length) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      } else {
        console.log('⚠️ No 10-K forms found either');
      }

      return;
    }

    // Process in batches of 5
    const batchSize = 5;
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      console.log(`\n📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(documents.length/batchSize)}`);

      await Promise.all(batch.map(doc => processDocument(doc)));

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < documents.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ EXTRACTION COMPLETE!');
}

// Execute
main().catch(console.error);