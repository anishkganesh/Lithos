#!/usr/bin/env npx tsx
/**
 * QuoteMedia Projects Extractor
 * Fetches technical documents and extracts project data to populate projects table
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { QuoteMediaClient } from '../lib/quotemedia/api-client';
import * as cheerio from 'cheerio';
import pdfParse from 'pdf-parse';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Critical minerals companies with known technical reports
const MINING_COMPANIES = [
  // Lithium
  { symbol: 'LAC', name: 'Lithium Americas', commodity: 'Lithium' },
  { symbol: 'ALB', name: 'Albemarle', commodity: 'Lithium' },
  { symbol: 'SQM', name: 'SQM', commodity: 'Lithium' },
  { symbol: 'PLL', name: 'Piedmont Lithium', commodity: 'Lithium' },
  // Copper
  { symbol: 'FCX', name: 'Freeport-McMoRan', commodity: 'Copper' },
  { symbol: 'SCCO', name: 'Southern Copper', commodity: 'Copper' },
  { symbol: 'TECK', name: 'Teck Resources', commodity: 'Copper' },
  { symbol: 'HBM', name: 'Hudbay Minerals', commodity: 'Copper' },
  // Rare Earths
  { symbol: 'MP', name: 'MP Materials', commodity: 'Rare Earths' },
  { symbol: 'LYSCF', name: 'Lynas', commodity: 'Rare Earths' },
  // Uranium
  { symbol: 'CCJ', name: 'Cameco', commodity: 'Uranium' },
  { symbol: 'DNN', name: 'Denison Mines', commodity: 'Uranium' },
  { symbol: 'NXE', name: 'NexGen Energy', commodity: 'Uranium' },
  { symbol: 'UEC', name: 'Uranium Energy', commodity: 'Uranium' },
  // Nickel/Cobalt
  { symbol: 'VALE', name: 'Vale', commodity: 'Nickel' },
  { symbol: 'BHP', name: 'BHP Group', commodity: 'Copper' },
  // Gold (often have base metals)
  { symbol: 'NEM', name: 'Newmont', commodity: 'Gold' },
  { symbol: 'GOLD', name: 'Barrick Gold', commodity: 'Gold' },
  { symbol: 'AEM', name: 'Agnico Eagle', commodity: 'Gold' },
];

// Comprehensive regex patterns for financial metrics
const METRIC_PATTERNS = {
  npv: {
    post: [
      /post[\s-]*tax\s+NPV[^\d]*\$?([\d,]+(?:\.\d+)?)\s*(million|M|billion|B)/gi,
      /after[\s-]*tax\s+NPV[^\d]*\$?([\d,]+(?:\.\d+)?)\s*(million|M|billion|B)/gi,
      /NPV.*post[\s-]*tax[^\d]*\$?([\d,]+(?:\.\d+)?)\s*(million|M|billion|B)/gi,
      /NPV\s*\(.*post.*\)[^\d]*\$?([\d,]+(?:\.\d+)?)\s*(million|M|billion|B)/gi
    ],
    pre: [
      /pre[\s-]*tax\s+NPV[^\d]*\$?([\d,]+(?:\.\d+)?)\s*(million|M|billion|B)/gi,
      /before[\s-]*tax\s+NPV[^\d]*\$?([\d,]+(?:\.\d+)?)\s*(million|M|billion|B)/gi,
      /NPV.*pre[\s-]*tax[^\d]*\$?([\d,]+(?:\.\d+)?)\s*(million|M|billion|B)/gi
    ]
  },
  irr: {
    post: [
      /post[\s-]*tax\s+IRR[^\d]*([\d.]+)\s*%/gi,
      /after[\s-]*tax\s+IRR[^\d]*([\d.]+)\s*%/gi,
      /IRR.*post[\s-]*tax[^\d]*([\d.]+)\s*%/gi
    ],
    pre: [
      /pre[\s-]*tax\s+IRR[^\d]*([\d.]+)\s*%/gi,
      /before[\s-]*tax\s+IRR[^\d]*([\d.]+)\s*%/gi
    ]
  },
  capex: [
    /initial\s+(?:capital|CAPEX)[^\d]*\$?([\d,]+(?:\.\d+)?)\s*(million|M|billion|B)/gi,
    /(?:capital|CAPEX)\s+(?:cost|expenditure)[^\d]*\$?([\d,]+(?:\.\d+)?)\s*(million|M|billion|B)/gi,
    /total\s+(?:capital|CAPEX)[^\d]*\$?([\d,]+(?:\.\d+)?)\s*(million|M|billion|B)/gi,
    /upfront\s+(?:capital|CAPEX)[^\d]*\$?([\d,]+(?:\.\d+)?)\s*(million|M|billion|B)/gi
  ],
  opex: [
    /operating\s+(?:cost|expense|OPEX)[^\d]*\$?([\d,]+(?:\.\d+)?)\s*(?:\/|per)\s*(t|tonne|oz|lb)/gi,
    /OPEX[^\d]*\$?([\d,]+(?:\.\d+)?)\s*(?:\/|per)\s*(t|tonne|oz|lb)/gi,
    /cash\s+cost[^\d]*\$?([\d,]+(?:\.\d+)?)\s*(?:\/|per)\s*(t|tonne|oz|lb)/gi
  ],
  aisc: [
    /AISC[^\d]*\$?([\d,]+(?:\.\d+)?)\s*(?:\/|per)\s*(t|tonne|oz|lb)/gi,
    /all[\s-]*in\s+sustaining\s+cost[^\d]*\$?([\d,]+(?:\.\d+)?)\s*(?:\/|per)\s*(t|tonne|oz|lb)/gi
  ],
  mine_life: [
    /mine\s+life[^\d]*([\d.]+)\s*years?/gi,
    /(?:LOM|life\s+of\s+mine)[^\d]*([\d.]+)\s*years?/gi,
    /project\s+life[^\d]*([\d.]+)\s*years?/gi
  ],
  production: [
    /annual\s+production[^\d]*([\d,]+)\s*(tonnes?|t|kt|Mt|oz|koz|Moz|lb|Mlb)/gi,
    /production\s+rate[^\d]*([\d,]+)\s*(tonnes?|t|kt|Mt|oz|koz|Moz|lb|Mlb)/gi,
    /throughput[^\d]*([\d,]+)\s*(tonnes?|t|tpd|tpa|Mtpa)/gi
  ],
  grade: [
    /average\s+grade[^\d]*([\d.]+)\s*(%|g\/t|oz\/t|ppm)/gi,
    /head\s+grade[^\d]*([\d.]+)\s*(%|g\/t|oz\/t|ppm)/gi,
    /ore\s+grade[^\d]*([\d.]+)\s*(%|g\/t|oz\/t|ppm)/gi
  ],
  resource: [
    /(?:measured\s+(?:and|&)\s+indicated|M&I)[^\d]*([\d,]+)\s*(Mt|million\s+tonnes?|kt)/gi,
    /(?:inferred\s+)?resource[^\d]*([\d,]+)\s*(Mt|million\s+tonnes?|kt)/gi,
    /total\s+resource[^\d]*([\d,]+)\s*(Mt|million\s+tonnes?|kt)/gi
  ],
  payback: [
    /payback\s+period[^\d]*([\d.]+)\s*years?/gi,
    /payback[^\d]*([\d.]+)\s*years?/gi
  ]
};

/**
 * Extract text from HTML
 */
async function extractFromHTML(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove script and style elements
    $('script, style').remove();

    // Get text content
    return $('body').text().replace(/\s+/g, ' ').trim();
  } catch (error) {
    console.error('HTML extraction error:', error);
    return '';
  }
}

/**
 * Extract text from PDF
 */
async function extractFromPDF(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    const data = await pdfParse(Buffer.from(buffer));
    return data.text;
  } catch (error) {
    console.error('PDF extraction error:', error);
    return '';
  }
}

/**
 * Extract metrics from text
 */
function extractMetrics(text: string): any {
  const metrics: any = {};
  let confidenceScore = 0;
  let metricsFound = 0;

  // NPV extraction
  for (const pattern of METRIC_PATTERNS.npv.post) {
    const match = pattern.exec(text);
    if (match) {
      const value = parseFloat(match[1].replace(/,/g, ''));
      const multiplier = match[2]?.toLowerCase().includes('b') ? 1000 : 1;
      metrics.post_tax_npv_usd_m = Math.min(99999, Math.round(value * multiplier));
      metricsFound++;
      break;
    }
  }

  for (const pattern of METRIC_PATTERNS.npv.pre) {
    const match = pattern.exec(text);
    if (match) {
      const value = parseFloat(match[1].replace(/,/g, ''));
      const multiplier = match[2]?.toLowerCase().includes('b') ? 1000 : 1;
      metrics.pre_tax_npv_usd_m = Math.min(99999, Math.round(value * multiplier));
      metricsFound++;
      break;
    }
  }

  // IRR extraction
  for (const pattern of METRIC_PATTERNS.irr.post) {
    const match = pattern.exec(text);
    if (match) {
      metrics.irr_percent = Math.min(99, parseFloat(match[1]));
      metricsFound++;
      break;
    }
  }

  // CAPEX extraction
  for (const pattern of METRIC_PATTERNS.capex) {
    const match = pattern.exec(text);
    if (match) {
      const value = parseFloat(match[1].replace(/,/g, ''));
      const multiplier = match[2]?.toLowerCase().includes('b') ? 1000 : 1;
      metrics.capex_usd_m = Math.min(9999, Math.round(value * multiplier));
      metricsFound++;
      break;
    }
  }

  // Mine life extraction
  for (const pattern of METRIC_PATTERNS.mine_life) {
    const match = pattern.exec(text);
    if (match) {
      metrics.mine_life_years = Math.min(99, parseInt(match[1]));
      metricsFound++;
      break;
    }
  }

  // Production extraction
  for (const pattern of METRIC_PATTERNS.production) {
    const match = pattern.exec(text);
    if (match) {
      let value = parseFloat(match[1].replace(/,/g, ''));
      const unit = match[2].toLowerCase();

      // Convert to tonnes
      if (unit.includes('kt')) value *= 1000;
      else if (unit.includes('mt')) value *= 1000000;
      else if (unit.includes('oz')) value *= 0.0000311035;
      else if (unit.includes('lb')) value *= 0.000453592;

      metrics.annual_production_tonnes = Math.min(999999, Math.round(value));
      metricsFound++;
      break;
    }
  }

  // Grade extraction
  for (const pattern of METRIC_PATTERNS.grade) {
    const match = pattern.exec(text);
    if (match) {
      metrics.resource_grade = Math.min(9.9, parseFloat(match[1]));
      metrics.resource_grade_unit = match[2];
      metricsFound++;
      break;
    }
  }

  // Payback extraction
  for (const pattern of METRIC_PATTERNS.payback) {
    const match = pattern.exec(text);
    if (match) {
      metrics.payback_years = Math.min(9.9, parseFloat(match[1]));
      metricsFound++;
      break;
    }
  }

  // Operating cost extraction
  for (const pattern of METRIC_PATTERNS.opex) {
    const match = pattern.exec(text);
    if (match) {
      metrics.opex_usd_per_tonne = Math.min(999, parseFloat(match[1].replace(/,/g, '')));
      metricsFound++;
      break;
    }
  }

  // AISC extraction
  for (const pattern of METRIC_PATTERNS.aisc) {
    const match = pattern.exec(text);
    if (match) {
      metrics.aisc_usd_per_tonne = Math.min(9999, parseFloat(match[1].replace(/,/g, '')));
      metricsFound++;
      break;
    }
  }

  // Calculate confidence score
  confidenceScore = Math.min(9.9, (metricsFound / 10) * 10);
  metrics.extraction_confidence = confidenceScore;
  metrics.metrics_found = metricsFound;

  return metrics;
}

/**
 * Extract project name from text
 */
function extractProjectName(text: string, company: string): string {
  const patterns = [
    /(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:Project|Mine|Deposit)/gi,
    /(?:Project|Mine|Deposit)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match && match[1]) {
      return match[1];
    }
  }

  return `${company} Project`;
}

/**
 * Determine project stage from text
 */
function extractStage(text: string): string {
  const textLower = text.toLowerCase();

  if (textLower.includes('production') || textLower.includes('operating')) {
    return 'Production';
  } else if (textLower.includes('feasibility study') || textLower.includes('dfs')) {
    return 'Feasibility';
  } else if (textLower.includes('pre-feasibility') || textLower.includes('pfs')) {
    return 'PFS';
  } else if (textLower.includes('preliminary economic assessment') || textLower.includes('pea')) {
    return 'PEA';
  } else if (textLower.includes('exploration')) {
    return 'Exploration';
  } else if (textLower.includes('development') || textLower.includes('construction')) {
    return 'Development';
  }

  return 'PEA';
}

/**
 * Main extraction pipeline
 */
async function extractProjects() {
  console.log('🚀 QUOTEMEDIA PROJECTS EXTRACTOR');
  console.log('='.repeat(60));
  console.log('Extracting project data from technical documents\n');

  const password = process.env.QUOTEMEDIA_WEBSERVICE_PASSWORD || 'dfbsembl48';
  const client = new QuoteMediaClient(password);

  let totalDocs = 0;
  let projectsCreated = 0;

  for (const company of MINING_COMPANIES) {
    console.log(`\n📊 Processing ${company.symbol} - ${company.name}...`);

    try {
      // Fetch filings
      const filings = await client.getCompanyFilings({
        symbol: company.symbol,
        limit: 10
      });

      if (!filings || filings.length === 0) {
        console.log('  ⏭️ No filings found');
        continue;
      }

      console.log(`  📄 Found ${filings.length} documents`);

      // Process each filing
      for (const filing of filings.slice(0, 3)) {
        totalDocs++;

        // Skip if not technical report
        const isRelevant =
          filing.formType === '10-K' ||
          filing.formType === '40-F' ||
          filing.formType === '8-K' ||
          filing.formDescription?.toLowerCase().includes('technical') ||
          filing.formDescription?.toLowerCase().includes('43-101') ||
          filing.formDescription?.toLowerCase().includes('mineral');

        if (!isRelevant) {
          console.log(`  ⏭️ Skipping ${filing.formType}`);
          continue;
        }

        console.log(`  📖 Processing ${filing.formType} - ${filing.dateFiled}`);

        // Extract content
        let content = '';
        if (filing.htmlLink) {
          content = await extractFromHTML(filing.htmlLink);
        } else if (filing.pdfLink) {
          content = await extractFromPDF(filing.pdfLink);
        }

        if (!content || content.length < 1000) {
          console.log(`    ❌ No content extracted`);
          continue;
        }

        console.log(`    📝 Extracted ${content.length} characters`);

        // Extract metrics
        const metrics = extractMetrics(content.substring(0, 50000)); // Process first 50k chars

        if (metrics.metrics_found < 3) {
          console.log(`    ❌ Insufficient metrics (${metrics.metrics_found})`);
          continue;
        }

        console.log(`    ✅ Found ${metrics.metrics_found} metrics`);

        // Create project
        const project = {
          project_name: extractProjectName(content, company.name),
          company_name: company.name,
          country: 'USA',
          jurisdiction: 'Unknown',
          primary_commodity: company.commodity,
          stage: extractStage(content),

          // Financial metrics
          capex_usd_m: metrics.capex_usd_m || null,
          post_tax_npv_usd_m: metrics.post_tax_npv_usd_m || null,
          pre_tax_npv_usd_m: metrics.pre_tax_npv_usd_m || null,
          irr_percent: metrics.irr_percent || null,
          payback_years: metrics.payback_years || null,

          // Production
          mine_life_years: metrics.mine_life_years || null,
          annual_production_tonnes: metrics.annual_production_tonnes || null,

          // Resource
          resource_grade: metrics.resource_grade || null,
          resource_grade_unit: metrics.resource_grade_unit || null,

          // Costs
          opex_usd_per_tonne: metrics.opex_usd_per_tonne || null,
          aisc_usd_per_tonne: metrics.aisc_usd_per_tonne || null,

          // Metadata
          technical_report_url: filing.pdfLink || filing.htmlLink,
          technical_report_date: filing.dateFiled,
          data_source: 'QuoteMedia',
          extraction_confidence: metrics.extraction_confidence,
          processing_status: 'extracted',

          project_description: `${company.commodity} project extracted from ${filing.formType}. ${metrics.metrics_found} financial metrics found.`
        };

        // Insert into database
        const { error } = await supabase
          .from('projects')
          .upsert(project, {
            onConflict: 'project_name,company_name'
          });

        if (error) {
          console.error(`    ❌ Database error: ${error.message}`);
        } else {
          projectsCreated++;
          console.log(`    ✨ Project created: ${project.project_name}`);
          console.log(`       NPV: $${metrics.post_tax_npv_usd_m}M, IRR: ${metrics.irr_percent}%`);
        }
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`  ❌ Error processing ${company.symbol}:`, error);
    }
  }

  // Final stats
  const { count } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true });

  console.log('\n' + '='.repeat(60));
  console.log('🏁 EXTRACTION COMPLETE!');
  console.log(`📄 Documents Processed: ${totalDocs}`);
  console.log(`✅ Projects Created: ${projectsCreated}`);
  console.log(`📊 Total Projects in DB: ${count}`);
  console.log(`🎯 Success Rate: ${totalDocs > 0 ? ((projectsCreated / totalDocs) * 100).toFixed(1) : 0}%`);
}

// Run extraction
extractProjects().catch(console.error);