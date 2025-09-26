#!/usr/bin/env npx tsx
/**
 * Extract project data from 10-K annual reports via QuoteMedia
 * Focus on mining companies and extract financial metrics
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { QuoteMediaClient } from '../lib/quotemedia/api-client';
import * as cheerio from 'cheerio';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Critical minerals mining companies
const MINING_COMPANIES = [
  // Lithium
  'LAC', 'ALB', 'SQM', 'PLL', 'SGML', 'LTHM',
  // Copper
  'FCX', 'SCCO', 'TECK', 'HBM', 'ERO', 'CS', 'FM', 'IVN',
  // Rare Earths
  'MP', 'LYSCF', 'TMRC', 'REEMF',
  // Uranium
  'CCJ', 'DNN', 'NXE', 'UEC', 'UUUU',
  // Nickel/Cobalt
  'VALE', 'BHP', 'NILSY', 'GLNCY',
  // Gold (often mentions other metals)
  'NEM', 'GOLD', 'AEM', 'KGC'
];

/**
 * Financial metric patterns for extraction
 */
const METRIC_PATTERNS = {
  capex: [
    /capital\s+expenditure[s]?\s+.*?(?:USD|US\$|\$)\s?([\d,]+(?:\.\d+)?)\s*(?:million|billion|M|B)/gi,
    /initial\s+capex\s+.*?(?:USD|US\$|\$)\s?([\d,]+(?:\.\d+)?)\s*(?:million|billion|M|B)/gi,
    /construction\s+cost[s]?\s+.*?(?:USD|US\$|\$)\s?([\d,]+(?:\.\d+)?)\s*(?:million|billion|M|B)/gi,
    /development\s+cost[s]?\s+.*?(?:USD|US\$|\$)\s?([\d,]+(?:\.\d+)?)\s*(?:million|billion|M|B)/gi
  ],
  npv: [
    /NPV\s+.*?(?:USD|US\$|\$)\s?([\d,]+(?:\.\d+)?)\s*(?:million|billion|M|B)/gi,
    /net\s+present\s+value\s+.*?(?:USD|US\$|\$)\s?([\d,]+(?:\.\d+)?)\s*(?:million|billion|M|B)/gi,
    /after[\s-]?tax\s+NPV\s+.*?(?:USD|US\$|\$)\s?([\d,]+(?:\.\d+)?)\s*(?:million|billion|M|B)/gi
  ],
  irr: [
    /IRR\s+.*?([\d.]+)\s*%/gi,
    /internal\s+rate\s+of\s+return\s+.*?([\d.]+)\s*%/gi,
    /after[\s-]?tax\s+IRR\s+.*?([\d.]+)\s*%/gi
  ],
  mineLife: [
    /mine\s+life\s+.*?([\d.]+)\s*years?/gi,
    /project\s+life\s+.*?([\d.]+)\s*years?/gi,
    /life\s+of\s+mine\s+.*?([\d.]+)\s*years?/gi,
    /LOM\s+.*?([\d.]+)\s*years?/gi
  ],
  production: [
    /annual\s+production\s+.*?([\d,]+)\s*(?:tonnes|tons|mt|kt|lbs|pounds|ounces|oz)/gi,
    /production\s+capacity\s+.*?([\d,]+)\s*(?:tonnes|tons|mt|kt|lbs|pounds|ounces|oz)/gi,
    /average\s+annual\s+production\s+.*?([\d,]+)\s*(?:tonnes|tons|mt|kt|lbs|pounds|ounces|oz)/gi
  ],
  grade: [
    /average\s+grade\s+.*?([\d.]+)\s*(?:%|g\/t|oz\/t|ppm|kg\/t)/gi,
    /ore\s+grade\s+.*?([\d.]+)\s*(?:%|g\/t|oz\/t|ppm|kg\/t)/gi,
    /head\s+grade\s+.*?([\d.]+)\s*(?:%|g\/t|oz\/t|ppm|kg\/t)/gi
  ],
  resource: [
    /(?:measured|indicated|inferred)?\s*resource[s]?\s+.*?([\d,]+)\s*(?:million|M)?\s*(?:tonnes|tons|mt)/gi,
    /total\s+resource[s]?\s+.*?([\d,]+)\s*(?:million|M)?\s*(?:tonnes|tons|mt)/gi
  ],
  reserve: [
    /(?:proven|probable)?\s*reserve[s]?\s+.*?([\d,]+)\s*(?:million|M)?\s*(?:tonnes|tons|mt)/gi,
    /total\s+reserve[s]?\s+.*?([\d,]+)\s*(?:million|M)?\s*(?:tonnes|tons|mt)/gi
  ]
};

/**
 * Extract project names from text
 */
function extractProjectNames(text: string): string[] {
  const projectPatterns = [
    /(?:the|our)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:project|mine|operation|property|deposit)/gi,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:lithium|copper|nickel|cobalt|uranium|gold|silver)\s+(?:project|mine)/gi,
    /(?:project|mine|operation)\s+(?:called|named|known as)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi
  ];

  const projects = new Set<string>();
  for (const pattern of projectPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && match[1].length > 2 && match[1].length < 50) {
        projects.add(match[1].trim());
      }
    }
  }
  return Array.from(projects);
}

/**
 * Parse value with unit conversion
 */
function parseValue(value: string, unit: string): number | null {
  if (!value) return null;

  let num = parseFloat(value.replace(/,/g, ''));

  // Convert billions to millions
  if (unit && (unit.toLowerCase().includes('billion') || unit === 'B')) {
    num *= 1000;
  }

  return isNaN(num) ? null : num;
}

/**
 * Extract metrics from 10-K content
 */
async function extractMetricsFrom10K(htmlContent: string, symbol: string, companyName: string) {
  const $ = cheerio.load(htmlContent);
  const text = $('body').text() || '';

  // Focus on relevant sections
  const businessSection = text.match(/item\s+1[.\s]+business([\s\S]*?)item\s+1a/i)?.[1] || '';
  const mdaSection = text.match(/management['']?s?\s+discussion\s+and\s+analysis([\s\S]*?)item\s+8/i)?.[1] || '';
  const relevantText = businessSection + ' ' + mdaSection;

  const metrics: any = {
    symbol,
    company_name: companyName
  };

  // Extract project names
  const projectNames = extractProjectNames(relevantText);
  if (projectNames.length > 0) {
    console.log(`   📍 Projects found: ${projectNames.join(', ')}`);
  }

  // Extract each metric type
  let metricsFound = 0;

  // CAPEX
  for (const pattern of METRIC_PATTERNS.capex) {
    const match = relevantText.match(pattern);
    if (match) {
      const value = parseValue(match[1], match[0]);
      if (value && value > 10 && value < 50000) { // Reasonable range for mining CAPEX in millions
        metrics.capex_usd_m = value;
        metricsFound++;
        console.log(`   💰 CAPEX: $${value}M`);
        break;
      }
    }
  }

  // NPV
  for (const pattern of METRIC_PATTERNS.npv) {
    const match = relevantText.match(pattern);
    if (match) {
      const value = parseValue(match[1], match[0]);
      if (value && value > 10 && value < 100000) {
        metrics.post_tax_npv_usd_m = Math.min(value, 9999); // Database constraint
        metricsFound++;
        console.log(`   💵 NPV: $${value}M`);
        break;
      }
    }
  }

  // IRR
  for (const pattern of METRIC_PATTERNS.irr) {
    const match = relevantText.match(pattern);
    if (match) {
      const value = parseFloat(match[1]);
      if (value && value > 5 && value < 200) {
        metrics.irr_percent = value;
        metricsFound++;
        console.log(`   📈 IRR: ${value}%`);
        break;
      }
    }
  }

  // Mine Life
  for (const pattern of METRIC_PATTERNS.mineLife) {
    const match = relevantText.match(pattern);
    if (match) {
      const value = parseFloat(match[1]);
      if (value && value > 1 && value < 100) {
        metrics.mine_life_years = value;
        metricsFound++;
        console.log(`   ⏱️ Mine Life: ${value} years`);
        break;
      }
    }
  }

  // Production
  for (const pattern of METRIC_PATTERNS.production) {
    const match = relevantText.match(pattern);
    if (match) {
      const value = parseValue(match[1], '');
      if (value && value > 100) {
        metrics.annual_production_tonnes = value;
        metricsFound++;
        console.log(`   🏭 Production: ${value.toLocaleString()} tonnes/year`);
        break;
      }
    }
  }

  // Grade
  for (const pattern of METRIC_PATTERNS.grade) {
    const match = relevantText.match(pattern);
    if (match) {
      const value = parseFloat(match[1]);
      const unit = match[2];
      if (value && value > 0) {
        metrics.resource_grade = value;
        metrics.resource_grade_unit = unit;
        metricsFound++;
        console.log(`   ⚡ Grade: ${value} ${unit}`);
        break;
      }
    }
  }

  // Detect commodity
  const commodityMatches = {
    lithium: (relevantText.match(/lithium/gi) || []).length,
    copper: (relevantText.match(/copper/gi) || []).length,
    nickel: (relevantText.match(/nickel/gi) || []).length,
    cobalt: (relevantText.match(/cobalt/gi) || []).length,
    uranium: (relevantText.match(/uranium/gi) || []).length,
    'rare earth': (relevantText.match(/rare\s+earth/gi) || []).length,
    gold: (relevantText.match(/gold/gi) || []).length
  };

  const primaryCommodity = Object.entries(commodityMatches)
    .sort((a, b) => b[1] - a[1])[0];

  if (primaryCommodity[1] > 5) {
    metrics.primary_commodity = primaryCommodity[0];
  }

  // Determine if we have enough metrics to create a project
  if (metricsFound >= 3 && projectNames.length > 0) {
    // Create projects for each identified project
    for (const projectName of projectNames.slice(0, 3)) { // Limit to top 3 projects
      const projectData = {
        project_name: projectName,
        company_name: companyName || symbol,
        country: 'Unknown',
        jurisdiction: 'Unknown',
        primary_commodity: metrics.primary_commodity || 'Unknown',
        stage: 'Development', // Default for 10-K mentioned projects
        capex_usd_m: metrics.capex_usd_m,
        post_tax_npv_usd_m: metrics.post_tax_npv_usd_m,
        irr_percent: metrics.irr_percent,
        mine_life_years: metrics.mine_life_years,
        annual_production_tonnes: metrics.annual_production_tonnes,
        resource_grade: metrics.resource_grade,
        resource_grade_unit: metrics.resource_grade_unit,
        data_source: 'QuoteMedia 10-K',
        extraction_confidence: Math.min(metricsFound * 2, 9.9),
        processing_status: 'extracted',
        project_description: `Extracted from ${symbol} 10-K filing. ${metricsFound} financial metrics found.`
      };

      const { error } = await supabase
        .from('projects')
        .upsert(projectData, {
          onConflict: 'project_name,company_name'
        });

      if (!error) {
        console.log(`   ✅ Created project: ${projectName}`);
        return true;
      } else {
        console.error(`   ❌ Error: ${error.message}`);
      }
    }
  }

  return metricsFound >= 3;
}

/**
 * Main execution
 */
async function extract10KData() {
  console.log('🚀 QUOTEMEDIA 10-K DATA EXTRACTOR');
  console.log('='.repeat(70));
  console.log('Extracting financial metrics from annual reports\n');

  const client = new QuoteMediaClient(process.env.QUOTEMEDIA_WEBSERVICE_PASSWORD || 'dfbsembl48');

  let totalFilingsProcessed = 0;
  let projectsCreated = 0;

  for (const symbol of MINING_COMPANIES) {
    console.log(`\n📊 Processing ${symbol}...`);

    try {
      // Get recent 10-K filings
      const filings = await client.getCompanyFilings({
        symbol,
        form: '10-K',
        limit: 3 // Get last 3 annual reports
      });

      if (filings.length === 0) {
        console.log(`   ⏭️ No 10-K filings found`);
        continue;
      }

      console.log(`   📄 Found ${filings.length} 10-K filings`);

      for (const filing of filings) {
        if (!filing.htmlLink) continue;

        console.log(`   📅 Processing 10-K from ${filing.dateFiled}...`);
        totalFilingsProcessed++;

        try {
          // Fetch the 10-K HTML content
          const response = await fetch(filing.htmlLink);

          if (!response.ok) {
            console.log(`   ❌ Failed to fetch filing: ${response.status}`);
            continue;
          }

          const htmlContent = await response.text();

          // Check if content is substantial
          if (htmlContent.length < 10000) {
            console.log(`   ⚠️ Filing too short (${htmlContent.length} chars)`);
            continue;
          }

          console.log(`   📖 Analyzing ${(htmlContent.length / 1000).toFixed(0)}KB of content...`);

          // Extract metrics and create projects
          const success = await extractMetricsFrom10K(htmlContent, symbol, filing.companyName);

          if (success) {
            projectsCreated++;
          } else {
            console.log(`   ⚠️ Insufficient metrics found`);
          }

        } catch (error) {
          console.error(`   ❌ Error processing filing: ${error}`);
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`   ❌ Error fetching filings: ${error}`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 EXTRACTION SUMMARY');
  console.log('='.repeat(70));
  console.log(`📄 Total 10-K Filings Processed: ${totalFilingsProcessed}`);
  console.log(`✅ Projects Created: ${projectsCreated}`);

  const { count } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 Total Projects in Database: ${count}`);
  console.log('='.repeat(70));
}

// Execute
extract10KData().catch(console.error);