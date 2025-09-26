#!/usr/bin/env npx tsx
/**
 * Extract project data from 40-F annual reports (Canadian companies)
 * These often contain references to NI 43-101 technical reports
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

// Canadian mining companies that file 40-F
const CANADIAN_MINERS = [
  'CCJ',   // Cameco
  'DNN',   // Denison Mines
  'NXE',   // NexGen Energy
  'FCU',   // Fission Uranium
  'TECK',  // Teck Resources
  'IVN',   // Ivanhoe Mines
  'FM',    // First Quantum
  'HBM',   // Hudbay Minerals
  'ERO',   // Ero Copper
  'CS',    // Capstone Mining
  'AEM',   // Agnico Eagle
  'KGC',   // Kinross Gold
  'WPM',   // Wheaton Precious Metals
  'FNV',   // Franco-Nevada
  'AG',    // First Majestic Silver
  'PAAS',  // Pan American Silver
  'EQX',   // Equinox Gold
  'SSL',   // Sandstorm Gold
  'GOLD',  // Barrick Gold
  'LUG'    // Lundin Gold
];

/**
 * Check available forms for a company
 */
async function checkAvailableForms(client: QuoteMediaClient, symbol: string) {
  console.log(`\n🔍 Checking available forms for ${symbol}...`);

  try {
    // Get all recent filings to see what's available
    const filings = await client.getCompanyFilings({
      symbol,
      limit: 50
    });

    if (filings.length === 0) {
      console.log(`   ⏭️ No filings found`);
      return { has40F: false, has20F: false, has10K: false };
    }

    const formTypes = new Set(filings.map(f => f.formType));
    const has40F = formTypes.has('40-F');
    const has20F = formTypes.has('20-F');
    const has10K = formTypes.has('10-K');
    const has6K = formTypes.has('6-K');

    console.log(`   📄 Form types available: ${Array.from(formTypes).join(', ')}`);

    if (has40F) console.log(`   ✅ 40-F AVAILABLE (Canadian annual report)`);
    if (has20F) console.log(`   ✅ 20-F AVAILABLE (Foreign annual report)`);
    if (has6K) console.log(`   ✅ 6-K AVAILABLE (Foreign current report)`);

    return { has40F, has20F, has10K, formTypes: Array.from(formTypes) };
  } catch (error) {
    console.error(`   ❌ Error: ${error}`);
    return { has40F: false, has20F: false, has10K: false };
  }
}

/**
 * Extract metrics from 40-F content
 */
async function extractFrom40F(htmlContent: string, symbol: string, companyName: string, filingDate: string) {
  const $ = cheerio.load(htmlContent);
  const text = $('body').text() || '';

  console.log(`   📖 Analyzing ${(htmlContent.length / 1000).toFixed(0)}KB of 40-F content...`);

  // Look for references to technical reports
  const technicalReportPattern = /(?:NI\s*43-?101|technical\s+report|feasibility\s+study|PEA|preliminary\s+economic\s+assessment)[\s\S]{0,500}?(?:dated|filed|prepared|updated|effective)[\s\S]{0,200}?(\d{4})/gi;

  const technicalReports = [];
  let match;
  while ((match = technicalReportPattern.exec(text)) !== null) {
    const context = text.substring(Math.max(0, match.index - 200), Math.min(text.length, match.index + 500));
    console.log(`   📑 Found technical report reference (${match[1]})`);
    technicalReports.push(context);
  }

  // Extract project names more aggressively
  const projectPatterns = [
    /(?:the|our)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,3})\s+(?:project|mine|property|deposit|operation)/gi,
    /(?:project|mine|property|deposit|operation)\s+(?:called|named|known\s+as)\s+"?([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,3})"?/gi,
    /([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,3})\s+(?:Gold|Copper|Lithium|Uranium|Silver|Nickel|Cobalt|Zinc)\s+(?:Project|Mine|Deposit)/gi
  ];

  const projects = new Set<string>();
  for (const pattern of projectPatterns) {
    const matches = text.matchAll(pattern);
    for (const m of matches) {
      if (m[1] && m[1].length > 3 && m[1].length < 40) {
        const projectName = m[1].trim();
        // Filter out common non-project words
        if (!projectName.match(/^(The|Our|This|That|Such|These|Those|Company|Corporation|Management|Board)$/i)) {
          projects.add(projectName);
        }
      }
    }
  }

  if (projects.size > 0) {
    console.log(`   📍 Projects found: ${Array.from(projects).slice(0, 5).join(', ')}`);
  }

  // Extract key metrics with more lenient patterns
  const metrics: any = {};
  let metricsFound = 0;

  // CAPEX - look for capital costs, initial capital, etc.
  const capexMatches = text.match(/(?:capital\s+(?:cost|expenditure)|initial\s+capital|capex|construction\s+cost)[^\$]*?\$?\s?([\d,]+(?:\.\d+)?)\s*(?:million|billion|M|B)/gi);
  if (capexMatches) {
    for (const cm of capexMatches) {
      const value = parseFloat(cm.match(/([\d,]+(?:\.\d+)?)/)?.[1]?.replace(/,/g, '') || '0');
      if (value > 50 && value < 10000) { // Reasonable range for mining CAPEX
        metrics.capex_usd_m = value;
        metricsFound++;
        console.log(`   💰 CAPEX: $${value}M`);
        break;
      }
    }
  }

  // NPV
  const npvMatches = text.match(/(?:NPV|net\s+present\s+value)[^\$]*?\$?\s?([\d,]+(?:\.\d+)?)\s*(?:million|billion|M|B)/gi);
  if (npvMatches) {
    for (const nm of npvMatches) {
      const value = parseFloat(nm.match(/([\d,]+(?:\.\d+)?)/)?.[1]?.replace(/,/g, '') || '0');
      if (value > 10 && value < 50000) {
        metrics.post_tax_npv_usd_m = Math.min(value, 9999);
        metricsFound++;
        console.log(`   💵 NPV: $${value}M`);
        break;
      }
    }
  }

  // IRR
  const irrMatches = text.match(/(?:IRR|internal\s+rate\s+of\s+return)[^\d]*?([\d.]+)\s*%/gi);
  if (irrMatches) {
    for (const im of irrMatches) {
      const value = parseFloat(im.match(/([\d.]+)/)?.[1] || '0');
      if (value > 8 && value < 100) {
        metrics.irr_percent = value;
        metricsFound++;
        console.log(`   📈 IRR: ${value}%`);
        break;
      }
    }
  }

  // Mine Life
  const lifeMatches = text.match(/(?:mine\s+life|project\s+life|life\s+of\s+mine|LOM)[^\d]*?([\d.]+)\s*years?/gi);
  if (lifeMatches) {
    for (const lm of lifeMatches) {
      const value = parseFloat(lm.match(/([\d.]+)/)?.[1] || '0');
      if (value > 3 && value < 60) {
        metrics.mine_life_years = value;
        metricsFound++;
        console.log(`   ⏱️ Mine Life: ${value} years`);
        break;
      }
    }
  }

  // If we found technical report references and some metrics, create projects
  if ((technicalReports.length > 0 || projects.size > 0) && metricsFound >= 2) {
    for (const projectName of Array.from(projects).slice(0, 3)) {
      const projectData = {
        project_name: projectName,
        company_name: companyName || symbol,
        country: 'Canada', // 40-F filers are Canadian
        jurisdiction: 'Unknown',
        primary_commodity: detectCommodity(text),
        stage: 'Development',
        capex_usd_m: metrics.capex_usd_m,
        post_tax_npv_usd_m: metrics.post_tax_npv_usd_m,
        irr_percent: metrics.irr_percent,
        mine_life_years: metrics.mine_life_years,
        data_source: 'QuoteMedia 40-F',
        extraction_confidence: Math.min(5 + metricsFound, 9.9),
        processing_status: 'extracted',
        project_description: `Extracted from ${symbol} 40-F filing (${filingDate}). ${metricsFound} metrics found. ${technicalReports.length > 0 ? 'References NI 43-101 technical report.' : ''}`
      };

      const { error } = await supabase
        .from('projects')
        .upsert(projectData, {
          onConflict: 'project_name,company_name'
        });

      if (!error) {
        console.log(`   ✅ Created project: ${projectName}`);
        return true;
      }
    }
  }

  return metricsFound >= 2;
}

/**
 * Detect primary commodity from text
 */
function detectCommodity(text: string): string {
  const commodityCounts: Record<string, number> = {
    'Gold': (text.match(/\bgold\b/gi) || []).length,
    'Silver': (text.match(/\bsilver\b/gi) || []).length,
    'Copper': (text.match(/\bcopper\b/gi) || []).length,
    'Uranium': (text.match(/\buranium\b/gi) || []).length,
    'Lithium': (text.match(/\blithium\b/gi) || []).length,
    'Nickel': (text.match(/\bnickel\b/gi) || []).length,
    'Cobalt': (text.match(/\bcobalt\b/gi) || []).length,
    'Zinc': (text.match(/\bzinc\b/gi) || []).length,
    'Lead': (text.match(/\blead\b/gi) || []).length
  };

  const sorted = Object.entries(commodityCounts).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[1] > 10 ? sorted[0][0] : 'Unknown';
}

/**
 * Main execution
 */
async function extract40FData() {
  console.log('🚀 QUOTEMEDIA 40-F DATA EXTRACTOR');
  console.log('='.repeat(70));
  console.log('Extracting project data from Canadian company 40-F filings\n');

  const client = new QuoteMediaClient(process.env.QUOTEMEDIA_WEBSERVICE_PASSWORD || 'dfbsembl48');

  let total40F = 0;
  let total20F = 0;
  let projectsCreated = 0;

  for (const symbol of CANADIAN_MINERS) {
    const forms = await checkAvailableForms(client, symbol);

    // Try 40-F first (Canadian annual report)
    if (forms.has40F) {
      total40F++;

      try {
        const filings = await client.getCompanyFilings({
          symbol,
          form: '40-F',
          limit: 2 // Get last 2 annual reports
        });

        for (const filing of filings) {
          if (!filing.htmlLink) continue;

          console.log(`   📅 Processing 40-F from ${filing.dateFiled}...`);

          const response = await fetch(filing.htmlLink);
          if (response.ok) {
            const htmlContent = await response.text();
            const success = await extractFrom40F(htmlContent, symbol, filing.companyName, filing.dateFiled);
            if (success) projectsCreated++;
          }

          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`   ❌ Error processing 40-F: ${error}`);
      }
    }

    // Also try 20-F if available (some use this instead)
    if (forms.has20F && !forms.has40F) {
      total20F++;
      console.log(`   📄 Using 20-F instead of 40-F`);
      // Similar processing for 20-F...
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('📊 40-F EXTRACTION SUMMARY');
  console.log('='.repeat(70));
  console.log(`🇨🇦 Companies with 40-F filings: ${total40F}`);
  console.log(`🌍 Companies with 20-F filings: ${total20F}`);
  console.log(`✅ Projects Created: ${projectsCreated}`);

  const { count } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 Total Projects in Database: ${count}`);
  console.log('='.repeat(70));
  console.log('\n💡 Note: 40-F documents often reference NI 43-101 technical reports');
  console.log('   but the actual technical reports are filed on SEDAR+, not SEC.');
}

// Execute
extract40FData().catch(console.error);