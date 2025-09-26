#!/usr/bin/env npx tsx
/**
 * QuoteMedia Technical Documents Extractor
 * Filters specifically for technical reports and extracts project data
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

// Extended list of mining companies
const MINING_COMPANIES = [
  // Lithium leaders
  'LAC', 'ALB', 'SQM', 'PLL', 'SGML', 'LTHM', 'LILM', 'ALTAF', 'PMETF',
  // Copper giants
  'FCX', 'SCCO', 'TECK', 'HBM', 'ERO', 'CS', 'FM', 'IVN', 'WRN', 'NCU',
  // Rare Earths
  'MP', 'LYSCF', 'TMRC', 'REEMF', 'ARRNF', 'UURAF', 'AVL',
  // Uranium
  'CCJ', 'DNN', 'NXE', 'UEC', 'UUUU', 'URG', 'PALAF', 'FCUUF',
  // Nickel/Cobalt
  'VALE', 'BHP', 'NILSY', 'GLNCY', 'FTSSF', 'CMCL', 'SHLM',
  // Gold (often have critical minerals)
  'NEM', 'GOLD', 'AEM', 'KGC', 'FNV', 'WPM', 'AG', 'PAAS',
  // Graphite
  'GMEXF', 'PHNMF', 'SYAAF', 'GPHOF', 'ASPNF', 'NOVA', 'NGXXF',
  // Vanadium
  'VNMOF', 'VVNRF', 'LGORF', 'SBMIF', 'VRBFF',
  // Tin/Tungsten
  'AFMJF', 'MLXEF', 'ITP', 'TIN', 'VMSRF'
];

// Enhanced regex patterns for better extraction
const METRIC_PATTERNS = {
  npv: {
    patterns: [
      /NPV[^\d]*(?:USD|US\$|\$)?[\s]*([\d,]+(?:\.\d+)?)\s*(?:million|M|billion|B)/gi,
      /net\s+present\s+value[^\d]*(?:USD|US\$|\$)?[\s]*([\d,]+(?:\.\d+)?)\s*(?:million|M|billion|B)/gi,
      /after[\s-]*tax\s+NPV[^\d]*(?:USD|US\$|\$)?[\s]*([\d,]+(?:\.\d+)?)\s*(?:million|M|billion|B)/gi,
      /post[\s-]*tax\s+NPV[^\d]*(?:USD|US\$|\$)?[\s]*([\d,]+(?:\.\d+)?)\s*(?:million|M|billion|B)/gi
    ]
  },
  irr: {
    patterns: [
      /IRR[^\d]*([\d.]+)\s*%/gi,
      /internal\s+rate\s+of\s+return[^\d]*([\d.]+)\s*%/gi,
      /after[\s-]*tax\s+IRR[^\d]*([\d.]+)\s*%/gi,
      /post[\s-]*tax\s+IRR[^\d]*([\d.]+)\s*%/gi
    ]
  },
  capex: {
    patterns: [
      /(?:initial\s+)?(?:capital|CAPEX)[^\d]*(?:USD|US\$|\$)?[\s]*([\d,]+(?:\.\d+)?)\s*(?:million|M|billion|B)/gi,
      /capital\s+(?:cost|expenditure)[^\d]*(?:USD|US\$|\$)?[\s]*([\d,]+(?:\.\d+)?)\s*(?:million|M|billion|B)/gi,
      /development\s+capital[^\d]*(?:USD|US\$|\$)?[\s]*([\d,]+(?:\.\d+)?)\s*(?:million|M|billion|B)/gi,
      /total\s+capital[^\d]*(?:USD|US\$|\$)?[\s]*([\d,]+(?:\.\d+)?)\s*(?:million|M|billion|B)/gi
    ]
  },
  mine_life: {
    patterns: [
      /mine\s+life[^\d]*([\d.]+)\s*years?/gi,
      /life\s+of\s+mine[^\d]*([\d.]+)\s*years?/gi,
      /(?:LOM)[^\d]*([\d.]+)\s*years?/gi,
      /project\s+life[^\d]*([\d.]+)\s*years?/gi,
      /operating\s+life[^\d]*([\d.]+)\s*years?/gi
    ]
  },
  production: {
    patterns: [
      /annual\s+production[^\d]*([\d,]+)\s*(tonnes?|t|kt|Mt|oz|koz|Moz|lb|Mlb|klb)/gi,
      /average\s+annual\s+production[^\d]*([\d,]+)\s*(tonnes?|t|kt|Mt|oz|koz|Moz|lb|Mlb)/gi,
      /production\s+rate[^\d]*([\d,]+)\s*(tonnes?|t|kt|Mt|oz|koz|Moz|lb|Mlb)/gi,
      /throughput[^\d]*([\d,]+)\s*(tonnes?\/day|tpd|tonnes?\/year|tpa|Mtpa)/gi,
      /capacity[^\d]*([\d,]+)\s*(tonnes?\/day|tpd|tonnes?\/year|tpa|Mtpa)/gi
    ]
  },
  grade: {
    patterns: [
      /average\s+grade[^\d]*([\d.]+)\s*(%|g\/t|oz\/t|ppm|kg\/t)/gi,
      /head\s+grade[^\d]*([\d.]+)\s*(%|g\/t|oz\/t|ppm|kg\/t)/gi,
      /ore\s+grade[^\d]*([\d.]+)\s*(%|g\/t|oz\/t|ppm|kg\/t)/gi,
      /(?:Li2O|LCE|Cu|Ni|Co|U3O8)\s+grade[^\d]*([\d.]+)\s*(%|g\/t|oz\/t|ppm)/gi
    ]
  },
  payback: {
    patterns: [
      /payback\s+period[^\d]*([\d.]+)\s*years?/gi,
      /payback[^\d]*([\d.]+)\s*years?/gi,
      /capital\s+payback[^\d]*([\d.]+)\s*years?/gi
    ]
  },
  opex: {
    patterns: [
      /operating\s+(?:cost|expense)[^\d]*(?:USD|US\$|\$)?[\s]*([\d,]+(?:\.\d+)?)\s*(?:\/|per)\s*(t|tonne|oz|lb)/gi,
      /OPEX[^\d]*(?:USD|US\$|\$)?[\s]*([\d,]+(?:\.\d+)?)\s*(?:\/|per)\s*(t|tonne|oz|lb)/gi,
      /cash\s+cost[^\d]*(?:USD|US\$|\$)?[\s]*([\d,]+(?:\.\d+)?)\s*(?:\/|per)\s*(t|tonne|oz|lb)/gi,
      /unit\s+operating\s+cost[^\d]*(?:USD|US\$|\$)?[\s]*([\d,]+(?:\.\d+)?)\s*(?:\/|per)\s*(t|tonne|oz|lb)/gi
    ]
  },
  aisc: {
    patterns: [
      /AISC[^\d]*(?:USD|US\$|\$)?[\s]*([\d,]+(?:\.\d+)?)\s*(?:\/|per)\s*(t|tonne|oz|lb)/gi,
      /all[\s-]*in\s+sustaining\s+cost[^\d]*(?:USD|US\$|\$)?[\s]*([\d,]+(?:\.\d+)?)\s*(?:\/|per)\s*(t|tonne|oz|lb)/gi
    ]
  },
  resource: {
    patterns: [
      /(?:measured\s+(?:and|&)\s+indicated|M&I)\s+resource[^\d]*([\d,]+)\s*(Mt|million\s+tonnes?|kt|thousand\s+tonnes?)/gi,
      /(?:inferred\s+)?resource[^\d]*([\d,]+)\s*(Mt|million\s+tonnes?|kt|thousand\s+tonnes?)/gi,
      /total\s+resource[^\d]*([\d,]+)\s*(Mt|million\s+tonnes?|kt|thousand\s+tonnes?)/gi,
      /mineral\s+resource[^\d]*([\d,]+)\s*(Mt|million\s+tonnes?|kt|thousand\s+tonnes?)/gi
    ]
  }
};

/**
 * Check if filing is a technical document
 */
function isTechnicalDocument(filing: any): boolean {
  const formType = filing.formType?.toLowerCase() || '';
  const description = filing.formDescription?.toLowerCase() || '';
  const size = parseInt(filing.fileSize || '0');

  // Check for technical report indicators
  const technicalKeywords = [
    '43-101', 'ni 43-101', 'sk-1300', 's-k 1300',
    'technical report', 'feasibility', 'pea', 'pfs', 'dfs',
    'preliminary economic assessment', 'pre-feasibility',
    'definitive feasibility', 'mineral resource', 'mineral reserve',
    'resource estimate', 'reserve estimate', 'economic assessment'
  ];

  const hasTechnicalKeyword = technicalKeywords.some(keyword =>
    description.includes(keyword) || formType.includes(keyword)
  );

  // Annual reports often contain project summaries
  const isAnnualReport = formType === '10-k' || formType === '20-f' || formType === '40-f';

  // Must be substantial document (>1MB for technical reports, >500KB for annual reports)
  const sizeThreshold = hasTechnicalKeyword ? 1000000 : (isAnnualReport ? 500000 : 2000000);

  return (hasTechnicalKeyword || isAnnualReport) && size > sizeThreshold;
}

/**
 * Extract text from document
 */
async function extractDocumentText(filing: any): Promise<string> {
  try {
    // Try PDF first (usually better for technical reports)
    if (filing.pdfLink) {
      const response = await fetch(filing.pdfLink);
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        const data = await pdfParse(Buffer.from(buffer));
        return data.text;
      }
    }

    // Fallback to HTML
    if (filing.htmlLink) {
      const response = await fetch(filing.htmlLink);
      if (response.ok) {
        const html = await response.text();
        const $ = cheerio.load(html);
        $('script, style').remove();
        return $('body').text().replace(/\s+/g, ' ').trim();
      }
    }

    return '';
  } catch (error) {
    console.error('    ❌ Extraction error:', error);
    return '';
  }
}

/**
 * Extract metrics from text with multiple patterns
 */
function extractMetrics(text: string): any {
  const metrics: any = {};
  let metricsFound = 0;

  // Process first 100k characters for efficiency
  const searchText = text.substring(0, 100000);

  // Extract each metric type
  for (const [metricType, config] of Object.entries(METRIC_PATTERNS)) {
    const patterns = (config as any).patterns || [config];

    for (const pattern of patterns) {
      const matches = searchText.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          const value = parseFloat(match[1].replace(/,/g, ''));

          if (!isNaN(value) && value > 0) {
            // Convert and constrain values based on metric type
            switch (metricType) {
              case 'npv':
                const multiplier = match[2]?.toLowerCase().includes('b') ? 1000 : 1;
                metrics.post_tax_npv_usd_m = Math.min(99999, Math.round(value * multiplier));
                metricsFound++;
                break;
              case 'irr':
                metrics.irr_percent = Math.min(99, value);
                metricsFound++;
                break;
              case 'capex':
                const capexMult = match[2]?.toLowerCase().includes('b') ? 1000 : 1;
                metrics.capex_usd_m = Math.min(9999, Math.round(value * capexMult));
                metricsFound++;
                break;
              case 'mine_life':
                metrics.mine_life_years = Math.min(99, Math.round(value));
                metricsFound++;
                break;
              case 'production':
                let prodValue = value;
                const unit = match[2]?.toLowerCase();
                if (unit?.includes('kt')) prodValue *= 1000;
                else if (unit?.includes('mt')) prodValue *= 1000000;
                else if (unit?.includes('koz')) prodValue *= 31.1035;
                else if (unit?.includes('moz')) prodValue *= 31103.5;
                else if (unit?.includes('mlb')) prodValue *= 453.592;
                metrics.annual_production_tonnes = Math.min(999999, Math.round(prodValue));
                metricsFound++;
                break;
              case 'grade':
                metrics.resource_grade = Math.min(9.9, value);
                metrics.resource_grade_unit = match[2] || '%';
                metricsFound++;
                break;
              case 'payback':
                metrics.payback_years = Math.min(9.9, value);
                metricsFound++;
                break;
              case 'opex':
                metrics.opex_usd_per_tonne = Math.min(999, value);
                metricsFound++;
                break;
              case 'aisc':
                metrics.aisc_usd_per_tonne = Math.min(9999, value);
                metricsFound++;
                break;
              case 'resource':
                let resValue = value;
                if (match[2]?.toLowerCase().includes('million')) resValue *= 1000000;
                else if (match[2]?.toLowerCase().includes('mt')) resValue *= 1000000;
                else if (match[2]?.toLowerCase().includes('kt')) resValue *= 1000;
                metrics.total_resource_tonnes = Math.min(999999999, Math.round(resValue));
                metricsFound++;
                break;
            }
            break; // Found value for this metric, move to next
          }
        }
      }
    }
  }

  metrics.extraction_confidence = Math.min(9.9, (metricsFound / 10) * 10);
  metrics.metrics_found = metricsFound;

  return metrics;
}

/**
 * Detect commodity from text
 */
function detectCommodity(text: string): string {
  const textLower = text.toLowerCase();
  const commodityMap: { [key: string]: string } = {
    'lithium': 'Lithium',
    'li2o': 'Lithium',
    'lce': 'Lithium',
    'copper': 'Copper',
    'nickel': 'Nickel',
    'cobalt': 'Cobalt',
    'graphite': 'Graphite',
    'rare earth': 'Rare Earths',
    'neodymium': 'Rare Earths',
    'dysprosium': 'Rare Earths',
    'uranium': 'Uranium',
    'u3o8': 'Uranium',
    'vanadium': 'Vanadium',
    'manganese': 'Manganese',
    'tin': 'Tin',
    'tungsten': 'Tungsten',
    'gold': 'Gold',
    'silver': 'Silver',
    'zinc': 'Zinc',
    'lead': 'Lead'
  };

  for (const [keyword, commodity] of Object.entries(commodityMap)) {
    if (textLower.includes(keyword)) {
      return commodity;
    }
  }

  return 'Copper'; // Default
}

/**
 * Extract project name
 */
function extractProjectName(text: string, company: string): string {
  const patterns = [
    /(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:Project|Mine|Deposit|Property)/gi,
    /(?:Project|Mine|Deposit|Property)[\s:]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi
  ];

  for (const pattern of patterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && match[1].length > 2) {
        return match[1].trim();
      }
    }
  }

  return `${company} Project`;
}

/**
 * Determine project stage
 */
function extractStage(text: string): string {
  const textLower = text.toLowerCase();

  if (textLower.includes('in production') || textLower.includes('operating mine')) {
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
async function extractTechnicalProjects() {
  console.log('🚀 QUOTEMEDIA TECHNICAL DOCUMENTS EXTRACTOR');
  console.log('='.repeat(60));
  console.log('Filtering for technical reports with financial metrics\n');

  const password = process.env.QUOTEMEDIA_WEBSERVICE_PASSWORD || 'dfbsembl48';
  const client = new QuoteMediaClient(password);

  let totalFilings = 0;
  let technicalDocs = 0;
  let docsWithMetrics = 0;
  let projectsCreated = 0;

  for (const symbol of MINING_COMPANIES) {
    console.log(`\n📊 Processing ${symbol}...`);

    try {
      // Fetch more filings to find technical documents
      const filings = await client.getCompanyFilings({
        symbol: symbol,
        limit: 50 // Get more filings to find technical ones
      });

      if (!filings || filings.length === 0) {
        console.log('  ⏭️ No filings found');
        continue;
      }

      totalFilings += filings.length;

      // Filter for technical documents
      const technicalFilings = filings.filter(isTechnicalDocument);

      if (technicalFilings.length === 0) {
        console.log(`  ❌ No technical documents in ${filings.length} filings`);
        continue;
      }

      console.log(`  ✅ Found ${technicalFilings.length} technical documents`);
      technicalDocs += technicalFilings.length;

      // Process each technical document
      for (const filing of technicalFilings.slice(0, 2)) { // Process up to 2 per company
        console.log(`  📖 Processing ${filing.formType} (${(parseInt(filing.fileSize) / 1000000).toFixed(1)}MB) - ${filing.dateFiled}`);

        // Extract content
        const content = await extractDocumentText(filing);

        if (!content || content.length < 5000) {
          console.log(`    ❌ Insufficient content extracted`);
          continue;
        }

        console.log(`    📝 Extracted ${(content.length / 1000).toFixed(0)}K characters`);

        // Extract metrics
        const metrics = extractMetrics(content);

        if (metrics.metrics_found < 3) {
          console.log(`    ❌ Only ${metrics.metrics_found} metrics found (need 3+)`);
          continue;
        }

        console.log(`    ✅ Found ${metrics.metrics_found} metrics!`);
        docsWithMetrics++;

        // Create project
        const project = {
          project_name: extractProjectName(content, filing.companyName || symbol),
          company_name: filing.companyName || symbol,
          country: 'USA',
          jurisdiction: 'Unknown',
          primary_commodity: detectCommodity(content),
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
          total_resource_tonnes: metrics.total_resource_tonnes || null,
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

          project_description: `Extracted from ${filing.formType} (${filing.dateFiled}). ${metrics.metrics_found} financial metrics found.`
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
          if (metrics.post_tax_npv_usd_m) console.log(`       NPV: $${metrics.post_tax_npv_usd_m}M`);
          if (metrics.irr_percent) console.log(`       IRR: ${metrics.irr_percent}%`);
          if (metrics.capex_usd_m) console.log(`       CAPEX: $${metrics.capex_usd_m}M`);
          if (metrics.mine_life_years) console.log(`       Mine Life: ${metrics.mine_life_years} years`);
        }
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error(`  ❌ Error processing ${symbol}:`, error);
    }
  }

  // Final stats
  const { count } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true });

  console.log('\n' + '='.repeat(60));
  console.log('🏁 EXTRACTION COMPLETE!');
  console.log(`📄 Total Filings Checked: ${totalFilings}`);
  console.log(`📑 Technical Documents Found: ${technicalDocs}`);
  console.log(`📊 Documents with Metrics: ${docsWithMetrics}`);
  console.log(`✅ Projects Created: ${projectsCreated}`);
  console.log(`📈 Total Projects in DB: ${count}`);
  console.log(`🎯 Success Rate: ${technicalDocs > 0 ? ((docsWithMetrics / technicalDocs) * 100).toFixed(1) : 0}%`);
}

// Run extraction
extractTechnicalProjects().catch(console.error);