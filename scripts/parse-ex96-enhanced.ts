#!/usr/bin/env npx tsx
/**
 * Enhanced EX-96.1 parser with comprehensive financial metrics extraction
 * Includes: payback years, pre-tax NPV, annual revenue, opex, AISC, cash costs, etc.
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://dfxauievbyqwcynwtvib.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmeGF1aWV2Ynlxd2N5bnd0dmliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Nzg0ODI2MSwiZXhwIjoyMDYzNDI0MjYxfQ.Gs2NX-UUKtXvW3a9_h49ATSDzvpsfJdja6tt1bCkyjc'
);

interface ExtractedMetrics {
  // Existing metrics
  capex_usd_m?: number;
  post_tax_npv_usd_m?: number;
  irr_percent?: number;
  mine_life_years?: number;
  annual_production_tonnes?: number;
  resource_grade?: number;
  resource_grade_unit?: string;

  // New comprehensive metrics
  pre_tax_npv_usd_m?: number;
  payback_years?: number;
  annual_revenue_usd_m?: number;
  annual_opex_usd_m?: number;
  all_in_sustaining_cost?: number;
  cash_cost?: number;
  strip_ratio?: number;
  recovery_rate_percent?: number;
  reserves_tonnes?: number;
  resources_tonnes?: number;
  discount_rate_percent?: number;
}

function cleanHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#150;/g, '-')
    .replace(/&#8194;/g, ' ')
    .replace(/&#8195;/g, ' ')
    .replace(/&#8201;/g, ' ')
    .replace(/&#8202;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractNumber(match: RegExpMatchArray | null, index: number = 1): number | null {
  if (!match || !match[index]) return null;
  const cleaned = match[index].replace(/,/g, '').replace(/\$/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function extractMetrics(text: string, companyName: string): ExtractedMetrics {
  const metrics: ExtractedMetrics = {};

  // ========== CAPITAL COSTS (CAPEX) ==========
  const capexPatterns = [
    /initial\s+capital\s+(?:cost|expenditure|requirements?)[^$\d]*\$?([\d,]+(?:\.\d+)?)\s*(?:million|M)/i,
    /(?:total\s+)?capital\s+(?:cost|expenditure)[^$\d]*\$?([\d,]+(?:\.\d+)?)\s*(?:million|M)/i,
    /capex[^$\d]*\$?([\d,]+(?:\.\d+)?)\s*(?:million|M)/i,
    /development\s+capital[^$\d]*\$?([\d,]+(?:\.\d+)?)\s*(?:million|M)/i,
    /pre[-\s]?production\s+capital[^$\d]*\$?([\d,]+(?:\.\d+)?)\s*(?:million|M)/i
  ];

  for (const pattern of capexPatterns) {
    const match = text.match(pattern);
    if (match) {
      metrics.capex_usd_m = extractNumber(match);
      break;
    }
  }

  // ========== NPV (NET PRESENT VALUE) ==========
  // Post-tax NPV
  const postTaxNpvPatterns = [
    /after[-\s]?tax\s+NPV[^$\d]*\$?([\d,]+(?:\.\d+)?)\s*(?:million|M|billion|B)/i,
    /post[-\s]?tax\s+NPV[^$\d]*\$?([\d,]+(?:\.\d+)?)\s*(?:million|M|billion|B)/i,
    /NPV\s+(?:after|post)[-\s]?tax[^$\d]*\$?([\d,]+(?:\.\d+)?)\s*(?:million|M|billion|B)/i,
    /NPV\s+at\s+\d+%[^$\d]*\$?([\d,]+(?:\.\d+)?)\s*(?:million|M|billion|B).*(?:after|post)[-\s]?tax/i,
    /After\s+Tax\s+Free\s+Cash\s+Flow\s+US\$\s*\([^)]*\)\s*([\d,]+)\s+NPV\s+at\s+\d+%\s+US\$\s*\([^)]*\)\s*([\d,]+)/i
  ];

  for (const pattern of postTaxNpvPatterns) {
    const match = text.match(pattern);
    if (match) {
      let npv = extractNumber(match, match[2] ? 2 : 1);
      if (npv && match[0].includes('billion')) {
        npv = npv * 1000;
      }
      metrics.post_tax_npv_usd_m = npv;
      break;
    }
  }

  // Pre-tax NPV
  const preTaxNpvPatterns = [
    /(?:before|pre)[-\s]?tax\s+NPV[^$\d]*\$?([\d,]+(?:\.\d+)?)\s*(?:million|M|billion|B)/i,
    /NPV\s+(?:before|pre)[-\s]?tax[^$\d]*\$?([\d,]+(?:\.\d+)?)\s*(?:million|M|billion|B)/i,
    /undiscounted\s+pre[-\s]?tax\s+cash\s+flow[^$\d]*\$?([\d,]+(?:\.\d+)?)\s*(?:million|M|billion|B)/i,
    /pre[-\s]?tax\s+cash\s+flow[^$\d]*\$?([\d,]+(?:\.\d+)?)\s*(?:million|M|billion|B)/i
  ];

  for (const pattern of preTaxNpvPatterns) {
    const match = text.match(pattern);
    if (match) {
      let npv = extractNumber(match);
      if (npv && match[0].includes('billion')) {
        npv = npv * 1000;
      }
      metrics.pre_tax_npv_usd_m = npv;
      break;
    }
  }

  // ========== IRR (INTERNAL RATE OF RETURN) ==========
  const irrPatterns = [
    /(?:after|post)[-\s]?tax\s+IRR[^%\d]*([\d.]+)\s*%/i,
    /IRR[^%\d]*([\d.]+)\s*%.*(?:after|post)[-\s]?tax/i,
    /internal\s+rate\s+of\s+return[^%\d]*([\d.]+)\s*%/i,
    /IRR[^%\d]*([\d.]+)\s*%/i
  ];

  for (const pattern of irrPatterns) {
    const match = text.match(pattern);
    if (match) {
      metrics.irr_percent = extractNumber(match);
      break;
    }
  }

  // ========== PAYBACK PERIOD ==========
  const paybackPatterns = [
    /payback\s+(?:period|years?)[^0-9]*([\d.]+)\s*years?/i,
    /payback[^0-9]*([\d.]+)\s*years?/i,
    /capital\s+payback[^0-9]*([\d.]+)\s*years?/i,
    /(?:simple\s+)?payback[^0-9]*([\d.]+)/i,
    /years?\s+payback[^0-9]*([\d.]+)/i
  ];

  for (const pattern of paybackPatterns) {
    const match = text.match(pattern);
    if (match) {
      metrics.payback_years = extractNumber(match);
      break;
    }
  }

  // ========== MINE LIFE ==========
  const mineLifePatterns = [
    /mine\s+life[^0-9]*([\d.]+)\s*years?/i,
    /(?:project|operating)\s+life[^0-9]*([\d.]+)\s*years?/i,
    /life\s+of\s+mine[^0-9]*([\d.]+)\s*years?/i,
    /LOM[^0-9]*([\d.]+)\s*years?/i,
    /([\d.]+)\s*years?\s+mine\s+life/i
  ];

  for (const pattern of mineLifePatterns) {
    const match = text.match(pattern);
    if (match) {
      metrics.mine_life_years = extractNumber(match);
      break;
    }
  }

  // ========== ANNUAL PRODUCTION ==========
  const productionPatterns = [
    /(?:annual|average)\s+production[^0-9]*([\d,]+)\s*(?:tonnes?|tons?|mt|oz|ounces|pounds?|lbs?)/i,
    /(?:annual|average)[^0-9]*([\d,]+)\s*(?:tonnes?|tons?|mt|oz|ounces|pounds?|lbs?)\s+(?:per\s+year|annually)/i,
    /([\d,]+)\s*(?:tonnes?|tons?|mt|oz|ounces|pounds?|lbs?)\s+(?:per\s+year|annually)/i,
    /production\s+capacity[^0-9]*([\d,]+)\s*(?:tonnes?|tons?|mt|oz|ounces|pounds?|lbs?)/i
  ];

  for (const pattern of productionPatterns) {
    const match = text.match(pattern);
    if (match) {
      let production = extractNumber(match);
      // Convert to tonnes if needed
      if (production && match[0].toLowerCase().includes('oz')) {
        production = production * 0.0000283495; // oz to tonnes
      } else if (production && (match[0].toLowerCase().includes('pound') || match[0].toLowerCase().includes('lb'))) {
        production = production * 0.000453592; // pounds to tonnes
      }
      metrics.annual_production_tonnes = production;
      break;
    }
  }

  // ========== ANNUAL REVENUE ==========
  const revenuePatterns = [
    /(?:annual|average)\s+revenue[^$\d]*\$?([\d,]+(?:\.\d+)?)\s*(?:million|M|billion|B)/i,
    /(?:annual|average)\s+(?:gross\s+)?sales[^$\d]*\$?([\d,]+(?:\.\d+)?)\s*(?:million|M|billion|B)/i,
    /revenue\s+per\s+(?:year|annum)[^$\d]*\$?([\d,]+(?:\.\d+)?)\s*(?:million|M|billion|B)/i,
    /(?:total\s+)?revenue[^$\d]*\$?([\d,]+(?:\.\d+)?)\s*(?:million|M|billion|B)\s*(?:per\s+year|annually)/i,
    /gross\s+revenue[^$\d]*\$?([\d,]+(?:\.\d+)?)\s*(?:million|M|billion|B)/i
  ];

  for (const pattern of revenuePatterns) {
    const match = text.match(pattern);
    if (match) {
      let revenue = extractNumber(match);
      if (revenue && match[0].includes('billion')) {
        revenue = revenue * 1000;
      }
      metrics.annual_revenue_usd_m = revenue;
      break;
    }
  }

  // ========== ANNUAL OPERATING COSTS (OPEX) ==========
  const opexPatterns = [
    /(?:annual|average)\s+operating\s+(?:cost|expense|expenditure)[^$\d]*\$?([\d,]+(?:\.\d+)?)\s*(?:million|M|billion|B)/i,
    /(?:annual|average)\s+opex[^$\d]*\$?([\d,]+(?:\.\d+)?)\s*(?:million|M|billion|B)/i,
    /operating\s+(?:cost|expense)s?\s+per\s+(?:year|annum)[^$\d]*\$?([\d,]+(?:\.\d+)?)\s*(?:million|M|billion|B)/i,
    /(?:total\s+)?operating\s+(?:cost|expense)s?[^$\d]*\$?([\d,]+(?:\.\d+)?)\s*(?:million|M|billion|B)\s*(?:per\s+year|annually)/i
  ];

  for (const pattern of opexPatterns) {
    const match = text.match(pattern);
    if (match) {
      let opex = extractNumber(match);
      if (opex && match[0].includes('billion')) {
        opex = opex * 1000;
      }
      metrics.annual_opex_usd_m = opex;
      break;
    }
  }

  // ========== ALL-IN SUSTAINING COST (AISC) ==========
  const aiscPatterns = [
    /(?:AISC|all[-\s]?in\s+sustaining\s+cost)[^$\d]*\$?([\d,]+(?:\.\d+)?)\s*(?:per|\/)\s*(?:oz|ounce|tonne?|ton|lb|pound)/i,
    /all[-\s]?in\s+sustaining\s+cost[^$\d]*\$?([\d,]+(?:\.\d+)?)/i,
    /AISC[^$\d]*\$?([\d,]+(?:\.\d+)?)/i,
    /sustaining\s+cost[^$\d]*\$?([\d,]+(?:\.\d+)?)\s*(?:per|\/)/i
  ];

  for (const pattern of aiscPatterns) {
    const match = text.match(pattern);
    if (match) {
      metrics.all_in_sustaining_cost = extractNumber(match);
      break;
    }
  }

  // ========== CASH COST ==========
  const cashCostPatterns = [
    /cash\s+cost[^$\d]*\$?([\d,]+(?:\.\d+)?)\s*(?:per|\/)\s*(?:oz|ounce|tonne?|ton|lb|pound)/i,
    /operating\s+cash\s+cost[^$\d]*\$?([\d,]+(?:\.\d+)?)/i,
    /(?:C1|C2|C3)\s+cash\s+cost[^$\d]*\$?([\d,]+(?:\.\d+)?)/i,
    /unit\s+cash\s+cost[^$\d]*\$?([\d,]+(?:\.\d+)?)/i
  ];

  for (const pattern of cashCostPatterns) {
    const match = text.match(pattern);
    if (match) {
      metrics.cash_cost = extractNumber(match);
      break;
    }
  }

  // ========== STRIP RATIO ==========
  const stripRatioPatterns = [
    /strip\s+ratio[^:0-9]*([\d.]+)\s*:\s*([\d.]+)/i,
    /strip\s+ratio[^0-9]*([\d.]+)/i,
    /waste[-\s]?to[-\s]?ore\s+ratio[^:0-9]*([\d.]+)/i,
    /stripping\s+ratio[^0-9]*([\d.]+)/i
  ];

  for (const pattern of stripRatioPatterns) {
    const match = text.match(pattern);
    if (match) {
      if (match[2]) {
        // Format like "3.5:1"
        const waste = parseFloat(match[1]);
        const ore = parseFloat(match[2]);
        metrics.strip_ratio = waste / ore;
      } else {
        metrics.strip_ratio = extractNumber(match);
      }
      break;
    }
  }

  // ========== RECOVERY RATE ==========
  const recoveryPatterns = [
    /(?:metallurgical\s+)?recovery\s+(?:rate)?[^%\d]*([\d.]+)\s*%/i,
    /(?:processing\s+)?recovery[^%\d]*([\d.]+)\s*%/i,
    /(?:metal|mineral)\s+recovery[^%\d]*([\d.]+)\s*%/i,
    /recovery\s+(?:rate|efficiency)[^%\d]*([\d.]+)\s*%/i
  ];

  for (const pattern of recoveryPatterns) {
    const match = text.match(pattern);
    if (match) {
      metrics.recovery_rate_percent = extractNumber(match);
      break;
    }
  }

  // ========== RESERVES ==========
  const reservePatterns = [
    /(?:proven\s+(?:and|&)\s+probable\s+)?reserves?[^0-9]*([\d,]+(?:\.\d+)?)\s*(?:million\s+)?(?:tonnes?|tons?|mt)/i,
    /(?:mineral\s+)?reserves?[^0-9]*([\d,]+(?:\.\d+)?)\s*(?:million\s+)?(?:tonnes?|tons?|mt)/i,
    /(?:ore\s+)?reserves?[^0-9]*([\d,]+(?:\.\d+)?)\s*(?:million\s+)?(?:tonnes?|tons?|mt)/i,
    /total\s+reserves?[^0-9]*([\d,]+(?:\.\d+)?)\s*(?:million\s+)?(?:tonnes?|tons?|mt)/i
  ];

  for (const pattern of reservePatterns) {
    const match = text.match(pattern);
    if (match) {
      let reserves = extractNumber(match);
      if (reserves && match[0].toLowerCase().includes('million')) {
        reserves = reserves * 1000000;
      }
      metrics.reserves_tonnes = reserves;
      break;
    }
  }

  // ========== RESOURCES ==========
  const resourcePatterns = [
    /(?:measured\s+(?:and|&)\s+indicated\s+)?resources?[^0-9]*([\d,]+(?:\.\d+)?)\s*(?:million\s+)?(?:tonnes?|tons?|mt)/i,
    /(?:mineral\s+)?resources?[^0-9]*([\d,]+(?:\.\d+)?)\s*(?:million\s+)?(?:tonnes?|tons?|mt)/i,
    /(?:total\s+)?resources?[^0-9]*([\d,]+(?:\.\d+)?)\s*(?:million\s+)?(?:tonnes?|tons?|mt)/i,
    /inferred\s+resources?[^0-9]*([\d,]+(?:\.\d+)?)\s*(?:million\s+)?(?:tonnes?|tons?|mt)/i
  ];

  for (const pattern of resourcePatterns) {
    const match = text.match(pattern);
    if (match) {
      let resources = extractNumber(match);
      if (resources && match[0].toLowerCase().includes('million')) {
        resources = resources * 1000000;
      }
      metrics.resources_tonnes = resources;
      break;
    }
  }

  // ========== DISCOUNT RATE ==========
  const discountRatePatterns = [
    /discount\s+rate[^%\d]*([\d.]+)\s*%/i,
    /discounted\s+at[^%\d]*([\d.]+)\s*%/i,
    /NPV\s+at[^%\d]*([\d.]+)\s*%/i,
    /([\d.]+)\s*%\s+discount\s+rate/i
  ];

  for (const pattern of discountRatePatterns) {
    const match = text.match(pattern);
    if (match) {
      metrics.discount_rate_percent = extractNumber(match);
      break;
    }
  }

  // ========== GRADE ==========
  const gradePatterns = [
    /(?:average\s+)?grade[^0-9]*([\d.]+)\s*(?:%|g\/t|gpt|ppm|oz\/t)/i,
    /(?:ore\s+)?grade[^0-9]*([\d.]+)\s*(?:%|g\/t|gpt|ppm|oz\/t)/i,
    /(?:head\s+)?grade[^0-9]*([\d.]+)\s*(?:%|g\/t|gpt|ppm|oz\/t)/i,
    /resource\s+grade[^0-9]*([\d.]+)\s*(?:%|g\/t|gpt|ppm|oz\/t)/i
  ];

  for (const pattern of gradePatterns) {
    const match = text.match(pattern);
    if (match) {
      metrics.resource_grade = extractNumber(match);
      // Determine unit
      if (match[0].includes('%')) {
        metrics.resource_grade_unit = '%';
      } else if (match[0].includes('g/t') || match[0].includes('gpt')) {
        metrics.resource_grade_unit = 'g/t';
      } else if (match[0].includes('ppm')) {
        metrics.resource_grade_unit = 'ppm';
      } else if (match[0].includes('oz/t')) {
        metrics.resource_grade_unit = 'oz/t';
      }
      break;
    }
  }

  return metrics;
}

function getCommodityMapping(commodity: string | null): string {
  if (!commodity) return 'Other';

  const commodityLower = commodity.toLowerCase();
  const mappings: Record<string, string> = {
    'lithium': 'Lithium',
    'copper': 'Copper',
    'gold': 'Gold',
    'silver': 'Silver',
    'nickel': 'Nickel',
    'cobalt': 'Cobalt',
    'zinc': 'Zinc',
    'lead': 'Lead',
    'uranium': 'Uranium',
    'rare earth': 'Rare Earths',
    'rare earths': 'Rare Earths',
    'reo': 'Rare Earths',
    'graphite': 'Other',
    'potash': 'Other',
    'phosphate': 'Other',
    'vanadium': 'Other',
    'tin': 'Other',
    'tungsten': 'Other',
    'molybdenum': 'Other',
    'platinum': 'Other',
    'palladium': 'Other',
    'iron': 'Other',
    'manganese': 'Other',
    'chromium': 'Other',
    'titanium': 'Other',
    'antimony': 'Other',
    'bismuth': 'Other'
  };

  for (const [key, value] of Object.entries(mappings)) {
    if (commodityLower.includes(key)) {
      return value;
    }
  }

  return 'Other';
}

function getStageMapping(stage: string | null): string {
  if (!stage) return 'Exploration';

  const stageLower = stage.toLowerCase();

  if (stageLower.includes('production') || stageLower.includes('operating') || stageLower.includes('commercial')) {
    return 'Production';
  } else if (stageLower.includes('construction') || stageLower.includes('development') || stageLower.includes('financing')) {
    return 'Construction';
  } else if (stageLower.includes('feasibility') || stageLower.includes('bankable') || stageLower.includes('dfs') || stageLower.includes('pfs')) {
    return 'Feasibility';
  } else {
    return 'Exploration';
  }
}

async function parseAllDocuments() {
  console.log('🔍 ENHANCED EX-96.1 PARSER WITH COMPREHENSIVE METRICS');
  console.log('=' .repeat(80));

  // Get all EX-96.1 documents
  const { data: documents, error } = await supabase
    .from('edgar_technical_documents')
    .select('*')
    .eq('exhibit_number', 'EX-96.1');

  if (error) {
    console.error('❌ Error fetching documents:', error);
    return;
  }

  console.log(`📄 Found ${documents?.length || 0} EX-96.1 documents to parse\n`);

  if (!documents || documents.length === 0) {
    console.log('No documents to process');
    return;
  }

  let successCount = 0;
  let errorCount = 0;
  let totalMetricsExtracted = 0;

  // Process in batches of 5
  const batchSize = 5;
  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = documents.slice(i, Math.min(i + batchSize, documents.length));

    await Promise.all(batch.map(async (doc) => {
      try {
        console.log(`\n[${i + batch.indexOf(doc) + 1}/${documents.length}] Processing: ${doc.company_name}`);

        // Fetch the document
        const response = await fetch(doc.document_url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const html = await response.text();
        const text = cleanHtml(html);

        // Extract metrics
        const metrics = extractMetrics(text, doc.company_name);

        // Count extracted metrics
        const metricsCount = Object.keys(metrics).filter(k => metrics[k as keyof ExtractedMetrics] !== null).length;
        totalMetricsExtracted += metricsCount;

        if (metricsCount === 0) {
          console.log(`  ⚠️ No metrics extracted`);
          errorCount++;
          return;
        }

        console.log(`  ✅ Extracted ${metricsCount} metrics:`);
        if (metrics.capex_usd_m) console.log(`     • Capex: $${metrics.capex_usd_m}M`);
        if (metrics.post_tax_npv_usd_m) console.log(`     • Post-tax NPV: $${metrics.post_tax_npv_usd_m}M`);
        if (metrics.pre_tax_npv_usd_m) console.log(`     • Pre-tax NPV: $${metrics.pre_tax_npv_usd_m}M`);
        if (metrics.payback_years) console.log(`     • Payback: ${metrics.payback_years} years`);
        if (metrics.annual_revenue_usd_m) console.log(`     • Annual Revenue: $${metrics.annual_revenue_usd_m}M`);
        if (metrics.annual_opex_usd_m) console.log(`     • Annual Opex: $${metrics.annual_opex_usd_m}M`);
        if (metrics.all_in_sustaining_cost) console.log(`     • AISC: $${metrics.all_in_sustaining_cost}`);
        if (metrics.cash_cost) console.log(`     • Cash Cost: $${metrics.cash_cost}`);
        if (metrics.strip_ratio) console.log(`     • Strip Ratio: ${metrics.strip_ratio}`);
        if (metrics.recovery_rate_percent) console.log(`     • Recovery: ${metrics.recovery_rate_percent}%`);
        if (metrics.reserves_tonnes) console.log(`     • Reserves: ${(metrics.reserves_tonnes / 1000000).toFixed(1)}Mt`);
        if (metrics.resources_tonnes) console.log(`     • Resources: ${(metrics.resources_tonnes / 1000000).toFixed(1)}Mt`);
        if (metrics.discount_rate_percent) console.log(`     • Discount Rate: ${metrics.discount_rate_percent}%`);

        // Prepare project data
        const projectName = doc.company_name.replace(/\s+(Inc|Corp|Corporation|Ltd|Limited|PLC|LLC|Co\.).*$/i, '').trim() + ' Project';

        const projectData = {
          project_name: projectName,
          company_name: doc.company_name,
          country: doc.country || 'Unknown',
          jurisdiction: doc.jurisdiction || null,
          primary_commodity: getCommodityMapping(doc.primary_commodity),
          stage: getStageMapping(doc.stage),
          // Existing metrics
          capex_usd_m: metrics.capex_usd_m || null,
          post_tax_npv_usd_m: metrics.post_tax_npv_usd_m || null,
          irr_percent: metrics.irr_percent || null,
          mine_life_years: metrics.mine_life_years || null,
          annual_production_tonnes: metrics.annual_production_tonnes || null,
          resource_grade: metrics.resource_grade || null,
          resource_grade_unit: metrics.resource_grade_unit || null,
          // New comprehensive metrics
          pre_tax_npv_usd_m: metrics.pre_tax_npv_usd_m || null,
          payback_years: metrics.payback_years || null,
          annual_revenue_usd_m: metrics.annual_revenue_usd_m || null,
          annual_opex_usd_m: metrics.annual_opex_usd_m || null,
          all_in_sustaining_cost: metrics.all_in_sustaining_cost || null,
          cash_cost: metrics.cash_cost || null,
          strip_ratio: metrics.strip_ratio || null,
          recovery_rate_percent: metrics.recovery_rate_percent || null,
          reserves_tonnes: metrics.reserves_tonnes || null,
          resources_tonnes: metrics.resources_tonnes || null,
          discount_rate_percent: metrics.discount_rate_percent || null,
          // Metadata
          technical_report_url: doc.document_url,
          technical_report_date: doc.filing_date,
          data_source: 'EDGAR_EX96',
          extraction_confidence: Math.min(9.5, 5 + (metricsCount * 0.5)), // Higher confidence with more metrics
          processing_status: 'completed',
          project_description: `Mining project from ${doc.company_name} EX-96.1 technical report`,
          last_scraped_at: new Date().toISOString()
        };

        // Upsert to database
        const { error: upsertError } = await supabase
          .from('projects')
          .upsert(projectData, {
            onConflict: 'project_name,company_name',
            ignoreDuplicates: false
          });

        if (upsertError) {
          console.error(`  ❌ Database error:`, upsertError);
          errorCount++;
        } else {
          console.log(`  💾 Saved to database`);
          successCount++;
        }

      } catch (error: any) {
        console.error(`  ❌ Error processing ${doc.company_name}:`, error.message);
        errorCount++;
      }
    }));

    // Rate limiting
    if (i + batchSize < documents.length) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 FINAL SUMMARY:');
  console.log(`✅ Successfully processed: ${successCount} documents`);
  console.log(`❌ Errors: ${errorCount} documents`);
  console.log(`📈 Total metrics extracted: ${totalMetricsExtracted}`);
  console.log(`📊 Average metrics per document: ${(totalMetricsExtracted / successCount).toFixed(1)}`);
}

parseAllDocuments().catch(console.error);