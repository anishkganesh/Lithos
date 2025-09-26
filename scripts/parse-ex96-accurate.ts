#!/usr/bin/env npx tsx
/**
 * Accurate EX-96.1 parser with comprehensive regex patterns
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://dfxauievbyqwcynwtvib.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmeGF1aWV2Ynlxd2N5bnd0dmliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Nzg0ODI2MSwiZXhwIjoyMDYzNDI0MjYxfQ.Gs2NX-UUKtXvW3a9_h49ATSDzvpsfJdja6tt1bCkyjc'
);

// More comprehensive financial patterns
const FINANCIAL_PATTERNS = {
  // CAPEX patterns - looking for various formats
  capex: [
    /initial\s+capital\s+(?:costs?|expenditure)[^\$]*?\$?([\d,]+(?:\.\d+)?)\s*(?:million|M|\$M)/gi,
    /capital\s+(?:costs?|expenditure).*?\$?([\d,]+(?:\.\d+)?)\s*(?:million|M|\$M)/gi,
    /CAPEX.*?\$?([\d,]+(?:\.\d+)?)\s*(?:million|M|\$M)/gi,
    /total\s+capital.*?\$?([\d,]+(?:\.\d+)?)\s*(?:million|M|\$M)/gi,
    /development\s+capital.*?\$?([\d,]+(?:\.\d+)?)\s*(?:million|M|\$M)/gi,
    /pre-production\s+capital.*?\$?([\d,]+(?:\.\d+)?)\s*(?:million|M|\$M)/gi,
    /\$?([\d,]+(?:\.\d+)?)\s*(?:million|M)\s+(?:in\s+)?capital/gi
  ],

  // NPV patterns - specifically post-tax
  npv: [
    /post[\s-]?tax\s+NPV[\s@\d%]*?\$?([\d,]+(?:\.\d+)?)\s*(?:million|M|\$M|billion|B)/gi,
    /after[\s-]?tax\s+NPV[\s@\d%]*?\$?([\d,]+(?:\.\d+)?)\s*(?:million|M|\$M|billion|B)/gi,
    /NPV[\s@\d%]*?\(after[\s-]?tax\)[\s:]*?\$?([\d,]+(?:\.\d+)?)\s*(?:million|M|\$M|billion|B)/gi,
    /NPV[\s@\d%]*?\$?([\d,]+(?:\.\d+)?)\s*(?:million|M|\$M|billion|B).*?after[\s-]?tax/gi,
    /net\s+present\s+value[\s@\d%]*?\$?([\d,]+(?:\.\d+)?)\s*(?:million|M|\$M|billion|B)/gi
  ],

  // IRR patterns
  irr: [
    /(?:post|after)[\s-]?tax\s+IRR[\s:]*?([\d,]+(?:\.\d+)?)\s*%/gi,
    /IRR[\s:]*?([\d,]+(?:\.\d+)?)\s*%.*?(?:post|after)[\s-]?tax/gi,
    /internal\s+rate\s+of\s+return[\s:]*?([\d,]+(?:\.\d+)?)\s*%/gi,
    /IRR\s*\((?:post|after)[\s-]?tax\)[\s:]*?([\d,]+(?:\.\d+)?)\s*%/gi,
    /project\s+IRR[\s:]*?([\d,]+(?:\.\d+)?)\s*%/gi
  ],

  // Mine life patterns
  mineLife: [
    /mine\s+life[\s:]*?([\d,]+(?:\.\d+)?)\s*years?/gi,
    /life\s+of\s+mine[\s:]*?([\d,]+(?:\.\d+)?)\s*years?/gi,
    /LOM[\s:]*?([\d,]+(?:\.\d+)?)\s*years?/gi,
    /project\s+life[\s:]*?([\d,]+(?:\.\d+)?)\s*years?/gi,
    /operating\s+life[\s:]*?([\d,]+(?:\.\d+)?)\s*years?/gi,
    /([\d,]+(?:\.\d+)?)\s*year\s+(?:mine\s+)?life/gi
  ],

  // Production patterns with unit conversion
  production: [
    /annual\s+production.*?([\d,]+(?:\.\d+)?)\s*(?:million\s+)?(?:tonnes?|tons?|mt|kt|t)/gi,
    /average\s+annual\s+production.*?([\d,]+(?:\.\d+)?)\s*(?:million\s+)?(?:tonnes?|tons?|mt|kt|t)/gi,
    /production\s+rate.*?([\d,]+(?:\.\d+)?)\s*(?:million\s+)?(?:tonnes?|tons?|mt|kt|t)/gi,
    /throughput.*?([\d,]+(?:\.\d+)?)\s*(?:million\s+)?(?:tonnes?|tons?|mt|kt|t)/gi,
    /([\d,]+(?:\.\d+)?)\s*(?:million\s+)?(?:tonnes?|tons?|mt|kt|t)\s*(?:per\s+year|annually|\/year)/gi,
    // For metals like copper, gold
    /annual\s+production.*?([\d,]+(?:\.\d+)?)\s*(?:thousand\s+)?(?:pounds?|lbs?|oz|ounces?|Mlbs?|klbs?|koz|Moz)/gi,
    /([\d,]+(?:\.\d+)?)\s*(?:million\s+)?(?:pounds?|lbs?|oz|ounces?)\s*(?:per\s+year|annually)/gi
  ],

  // Grade patterns
  grade: [
    /average\s+grade[\s:]*?([\d,]+(?:\.\d+)?)\s*(?:%|g\/t|ppm|oz\/t|opt)/gi,
    /ore\s+grade[\s:]*?([\d,]+(?:\.\d+)?)\s*(?:%|g\/t|ppm|oz\/t|opt)/gi,
    /head\s+grade[\s:]*?([\d,]+(?:\.\d+)?)\s*(?:%|g\/t|ppm|oz\/t|opt)/gi,
    /resource\s+grade[\s:]*?([\d,]+(?:\.\d+)?)\s*(?:%|g\/t|ppm|oz\/t|opt)/gi,
    /cut[\s-]?off\s+grade[\s:]*?([\d,]+(?:\.\d+)?)\s*(?:%|g\/t|ppm|oz\/t|opt)/gi,
    /([\d,]+(?:\.\d+)?)\s*(?:%|g\/t|ppm|oz\/t|opt)\s+(?:average\s+)?grade/gi
  ]
};

// Map commodity to valid enum values
function mapCommodity(commodity: string | null): string | null {
  if (!commodity) return null;

  const commodityMap: Record<string, string> = {
    'lithium': 'Lithium',
    'li': 'Lithium',
    'copper': 'Copper',
    'cu': 'Copper',
    'gold': 'Gold',
    'au': 'Gold',
    'silver': 'Silver',
    'ag': 'Silver',
    'uranium': 'Uranium',
    'u3o8': 'Uranium',
    'u': 'Uranium',
    'nickel': 'Nickel',
    'ni': 'Nickel',
    'cobalt': 'Cobalt',
    'co': 'Cobalt',
    'zinc': 'Zinc',
    'zn': 'Zinc',
    'lead': 'Lead',
    'pb': 'Lead',
    'tin': 'Tin',
    'sn': 'Tin',
    'platinum': 'Platinum',
    'pt': 'Platinum',
    'palladium': 'Palladium',
    'pd': 'Palladium',
    'rare earth': 'Rare Earths',
    'rare earths': 'Rare Earths',
    'ree': 'Rare Earths',
    'iron': 'Iron Ore',
    'iron ore': 'Iron Ore',
    'fe': 'Iron Ore',
    'coal': 'Coal',
    'potash': 'Other',
    'graphite': 'Other',
    'phosphate': 'Other',
    'manganese': 'Other',
    'chromium': 'Other',
    'vanadium': 'Other',
    'tungsten': 'Other',
    'molybdenum': 'Other',
    'mo': 'Other',
    'antimony': 'Other',
    'bismuth': 'Other',
    'borate': 'Lithium',
    'boron': 'Lithium',
    'limestone': 'Other'
  };

  const lower = commodity.toLowerCase().trim();
  return commodityMap[lower] || 'Other';
}

// Map stage to valid enum values
function mapStage(stage: string | null): string {
  if (!stage) return 'Exploration';

  const stageMap: Record<string, string> = {
    'exploration': 'Exploration',
    'development': 'Exploration',
    'feasibility': 'Feasibility',
    'prefeasibility': 'Feasibility',
    'pre-feasibility': 'Feasibility',
    'production': 'Production',
    'operating': 'Production',
    'construction': 'Construction',
    'permitting': 'Exploration',
    'closed': 'Closed',
    'care and maintenance': 'Closed',
    'care & maintenance': 'Closed',
    'preliminary economic assessment': 'Exploration',
    'pea': 'Exploration',
    'scoping': 'Exploration'
  };

  const lower = stage.toLowerCase().trim();
  return stageMap[lower] || 'Exploration';
}

async function extractFinancialData(html: string): Promise<any> {
  // Clean HTML more thoroughly
  const text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&[^;]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const extracted: any = {};

  // Extract CAPEX - try all patterns and take the first valid match
  for (const pattern of FINANCIAL_PATTERNS.capex) {
    const matches = [...text.matchAll(pattern)];
    if (matches.length > 0) {
      const value = parseFloat(matches[0][1].replace(/,/g, ''));
      if (!isNaN(value) && value > 0 && value < 100000) { // Sanity check
        extracted.capex_usd_m = value;
        break;
      }
    }
  }

  // Extract NPV - handle billions
  for (const pattern of FINANCIAL_PATTERNS.npv) {
    const matches = [...text.matchAll(pattern)];
    if (matches.length > 0) {
      let value = parseFloat(matches[0][1].replace(/,/g, ''));
      const matchText = matches[0][0].toLowerCase();
      if (matchText.includes('billion') || matchText.includes(' b')) {
        value = value * 1000; // Convert billions to millions
      }
      if (!isNaN(value) && value > 0) {
        extracted.post_tax_npv_usd_m = Math.min(value, 99999); // Cap at DB limit
        break;
      }
    }
  }

  // Extract IRR
  for (const pattern of FINANCIAL_PATTERNS.irr) {
    const matches = [...text.matchAll(pattern)];
    if (matches.length > 0) {
      const value = parseFloat(matches[0][1].replace(/,/g, ''));
      if (!isNaN(value) && value > 0 && value < 100) {
        extracted.irr_percent = Math.min(value, 99.99); // Cap at DB limit
        break;
      }
    }
  }

  // Extract Mine Life
  for (const pattern of FINANCIAL_PATTERNS.mineLife) {
    const matches = [...text.matchAll(pattern)];
    if (matches.length > 0) {
      const value = parseFloat(matches[0][1].replace(/,/g, ''));
      if (!isNaN(value) && value > 0 && value < 100) {
        extracted.mine_life_years = value;
        break;
      }
    }
  }

  // Extract Production - with unit conversions
  for (const pattern of FINANCIAL_PATTERNS.production) {
    const matches = [...text.matchAll(pattern)];
    if (matches.length > 0) {
      let value = parseFloat(matches[0][1].replace(/,/g, ''));
      const matchText = matches[0][0].toLowerCase();

      // Unit conversions to tonnes
      if (matchText.includes('million ton') || matchText.includes('mt')) {
        value = value * 1000000;
      } else if (matchText.includes('thousand ton') || matchText.includes('kt')) {
        value = value * 1000;
      } else if (matchText.includes('million pound') || matchText.includes('mlb')) {
        value = value * 453592; // Million pounds to tonnes
      } else if (matchText.includes('thousand pound') || matchText.includes('klb')) {
        value = value * 453.592; // Thousand pounds to tonnes
      } else if (matchText.includes('million ounce') || matchText.includes('moz')) {
        value = value * 31103.5; // Million ounces to tonnes
      } else if (matchText.includes('thousand ounce') || matchText.includes('koz')) {
        value = value * 31.1035; // Thousand ounces to tonnes
      } else if (matchText.includes('pound') || matchText.includes('lb')) {
        value = value * 0.000453592; // Pounds to tonnes
      } else if (matchText.includes('ounce') || matchText.includes('oz')) {
        value = value * 0.0000311035; // Ounces to tonnes
      }

      if (!isNaN(value) && value > 0) {
        extracted.annual_production_tonnes = value;
        break;
      }
    }
  }

  // Extract Grade
  for (const pattern of FINANCIAL_PATTERNS.grade) {
    const matches = [...text.matchAll(pattern)];
    if (matches.length > 0) {
      const value = parseFloat(matches[0][1].replace(/,/g, ''));
      if (!isNaN(value) && value > 0) {
        extracted.resource_grade = value;
        const matchText = matches[0][0];
        if (matchText.includes('%')) {
          extracted.resource_grade_unit = '%';
        } else if (matchText.includes('g/t')) {
          extracted.resource_grade_unit = 'g/t';
        } else if (matchText.includes('oz/t') || matchText.includes('opt')) {
          extracted.resource_grade_unit = 'oz/t';
        } else if (matchText.includes('ppm')) {
          extracted.resource_grade_unit = 'ppm';
        }
        break;
      }
    }
  }

  return extracted;
}

async function processDocument(doc: any): Promise<void> {
  try {
    console.log(`\n📄 Processing: ${doc.company_name} - ${doc.form_type}`);
    console.log(`   URL: ${doc.document_url}`);

    const response = await fetch(doc.document_url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      console.log(`   ❌ Failed to fetch: ${response.status}`);
      return;
    }

    const html = await response.text();
    const data = await extractFinancialData(html);

    console.log(`   📊 Extracted:`, data);

    if (Object.keys(data).length === 0) {
      console.log(`   ⚠️ No financial data extracted`);
      return;
    }

    // Create project name
    const projectName = doc.project_names?.[0] ||
                       `${doc.company_name} Project` ||
                       `${doc.ticker || 'Unknown'} Project`;

    const projectData = {
      project_name: projectName.substring(0, 100),
      company_name: doc.company_name,
      country: doc.country || null,
      jurisdiction: doc.state || null,
      primary_commodity: mapCommodity(doc.primary_commodity),
      stage: mapStage(doc.stage),
      capex_usd_m: data.capex_usd_m || null,
      post_tax_npv_usd_m: data.post_tax_npv_usd_m || null,
      irr_percent: data.irr_percent || null,
      mine_life_years: data.mine_life_years || null,
      annual_production_tonnes: data.annual_production_tonnes || null,
      resource_grade: data.resource_grade || null,
      resource_grade_unit: data.resource_grade_unit || null,
      technical_report_url: doc.document_url,
      technical_report_date: doc.filing_date,
      data_source: 'EDGAR_EX96',
      extraction_confidence: 8.5,
      processing_status: 'completed',
      project_description: `EX-96.1 Technical Report from ${doc.form_type} filing`,
      last_scraped_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('projects')
      .upsert(projectData, {
        onConflict: 'project_name,company_name',
        ignoreDuplicates: false
      });

    if (error) {
      console.error(`   ❌ DB Error:`, error.message);
    } else {
      console.log(`   ✅ Saved successfully`);
    }

  } catch (error) {
    console.error(`   ❌ Error processing document:`, error);
  }
}

async function main() {
  console.log('🚀 ACCURATE EX-96.1 PARSER');
  console.log('='.repeat(70));

  try {
    // Get ALL EX-96.1 documents
    console.log('\n📚 Fetching ALL EX-96.1 documents...');
    const { data: documents, error } = await supabase
      .from('edgar_technical_documents')
      .select('*')
      .eq('exhibit_number', 'EX-96.1')
      .order('filing_date', { ascending: false });

    if (error) {
      console.error('❌ Database error:', error);
      return;
    }

    if (!documents || documents.length === 0) {
      console.log('⚠️ No EX-96.1 documents found');
      return;
    }

    console.log(`✅ Found ${documents.length} documents to process\n`);

    // Process documents sequentially
    for (let i = 0; i < documents.length; i++) {
      await processDocument(documents[i]);

      // Small delay to avoid rate limits
      if (i < documents.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('✅ PROCESSING COMPLETE!');

    // Verify results
    const { data: projects, count } = await supabase
      .from('projects')
      .select('*', { count: 'exact' })
      .eq('data_source', 'EDGAR_EX96')
      .order('last_scraped_at', { ascending: false })
      .limit(10);

    console.log(`\n📊 Total EDGAR_EX96 projects in database: ${count || 0}`);

    if (projects && projects.length > 0) {
      console.log('\nSample projects:');
      projects.forEach(p => {
        console.log(`\n${p.project_name} (${p.company_name})`);
        console.log(`  CAPEX: $${p.capex_usd_m}M | NPV: $${p.post_tax_npv_usd_m}M | IRR: ${p.irr_percent}%`);
        console.log(`  Mine Life: ${p.mine_life_years} years | Production: ${p.annual_production_tonnes} t/yr`);
        console.log(`  Grade: ${p.resource_grade} ${p.resource_grade_unit || ''}`);
      });
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Execute
main().catch(console.error);