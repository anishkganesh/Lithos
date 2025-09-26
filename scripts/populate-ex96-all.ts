#!/usr/bin/env npx tsx
/**
 * Populate projects table with ALL EX-96.1 technical reports
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

// Using direct credentials with correct service role key
const SUPABASE_URL = 'https://dfxauievbyqwcynwtvib.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmeGF1aWV2Ynlxd2N5bnd0dmliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Nzg0ODI2MSwiZXhwIjoyMDYzNDI0MjYxfQ.Gs2NX-UUKtXvW3a9_h49ATSDzvpsfJdja6tt1bCkyjc';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Map commodity to valid enum values
function mapCommodity(commodity: string | null): string | null {
  if (!commodity) return null;

  const commodityMap: Record<string, string> = {
    'lithium': 'Lithium',
    'copper': 'Copper',
    'gold': 'Gold',
    'silver': 'Silver',
    'uranium': 'Uranium',
    'nickel': 'Nickel',
    'cobalt': 'Cobalt',
    'zinc': 'Zinc',
    'lead': 'Lead',
    'tin': 'Tin',
    'platinum': 'Platinum',
    'palladium': 'Palladium',
    'rare earth': 'Rare Earths',
    'rare earths': 'Rare Earths',
    'rare_earth': 'Rare Earths',
    'rare_earths': 'Rare Earths',
    'ree': 'Rare Earths',
    'iron': 'Iron Ore',
    'iron ore': 'Iron Ore',
    'coal': 'Coal',
    'potash': 'Other',
    'graphite': 'Other',
    'phosphate': 'Other',
    'manganese': 'Other',
    'chromium': 'Other',
    'vanadium': 'Other',
    'tungsten': 'Other',
    'molybdenum': 'Other',
    'antimony': 'Other',
    'bismuth': 'Other',
    'borate': 'Lithium', // Often associated with lithium projects
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
    'construction': 'Construction',
    'permitting': 'Exploration',
    'closed': 'Closed',
    'care and maintenance': 'Closed',
    'care & maintenance': 'Closed'
  };

  const lower = stage.toLowerCase().trim();
  return stageMap[lower] || 'Exploration';
}

// Financial patterns
const PATTERNS = {
  capex: /(?:capital\s+cost|capex|initial\s+capital|capital\s+expenditure|total\s+capital)[^\d]*?([\d,]+(?:\.\d+)?)\s*(?:million|M|\$M)/gi,
  npv: /(?:NPV|net\s+present\s+value)[^\d]*?\$?([\d,]+(?:\.\d+)?)\s*(?:million|M|\$M)/gi,
  irr: /(?:IRR|internal\s+rate\s+of\s+return)[^\d]*?([\d,]+(?:\.\d+)?)\s*%/gi,
  mineLife: /(?:mine\s+life|life\s+of\s+mine|LOM|project\s+life)[^\d]*?([\d,]+(?:\.\d+)?)\s*(?:years?|yr)/gi,
  production: /(?:annual\s+production|production\s+rate|average\s+production)[^\d]*?([\d,]+(?:\.\d+)?)\s*(?:tonnes?|tons?|mt|kt|Mlbs?|klbs?|oz|koz|Moz)/gi,
  grade: /(?:average\s+grade|grade|ore\s+grade)[^\d]*?([\d,]+(?:\.\d+)?)\s*(?:%|g\/t|ppm|oz\/t)/gi,
};

async function fetchAndExtract(url: string): Promise<any> {
  try {
    console.log(`  📄 Fetching: ${url.substring(0, 70)}...`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    if (!response.ok) {
      console.log(`  ❌ HTTP ${response.status}`);
      return null;
    }

    const html = await response.text();

    // Clean HTML
    const text = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&[^;]+;/g, ' ')
      .replace(/\s+/g, ' ')
      .substring(0, 500000); // Limit to 500k chars

    const extracted: any = {};

    // Extract metrics
    for (const [key, pattern] of Object.entries(PATTERNS)) {
      const matches = [...text.matchAll(pattern)];
      if (matches.length > 0) {
        const value = parseFloat(matches[0][1].replace(/,/g, ''));

        switch(key) {
          case 'capex':
            extracted.capex_usd_m = value;
            break;
          case 'npv':
            extracted.post_tax_npv_usd_m = value;
            break;
          case 'irr':
            extracted.irr_percent = Math.min(value, 99.99); // Cap at DB limit
            break;
          case 'mineLife':
            extracted.mine_life_years = value;
            break;
          case 'production':
            extracted.annual_production_tonnes = value;
            // Convert units
            const unit = matches[0][0].toLowerCase();
            if (unit.includes('mlb') || unit.includes('million pound')) {
              extracted.annual_production_tonnes = value * 453592; // lbs to tonnes
            } else if (unit.includes('koz') || unit.includes('thousand ounce')) {
              extracted.annual_production_tonnes = value * 0.0311035; // oz to tonnes
            } else if (unit.includes('moz') || unit.includes('million ounce')) {
              extracted.annual_production_tonnes = value * 31.1035; // Moz to tonnes
            }
            break;
          case 'grade':
            extracted.resource_grade = value;
            if (matches[0][0].includes('%')) extracted.resource_grade_unit = '%';
            else if (matches[0][0].includes('g/t')) extracted.resource_grade_unit = 'g/t';
            else if (matches[0][0].includes('ppm')) extracted.resource_grade_unit = 'ppm';
            else extracted.resource_grade_unit = 'oz/t';
            break;
        }
      }
    }

    console.log(`  ✅ Extracted:`, Object.keys(extracted).length, 'metrics');
    return extracted;

  } catch (error) {
    console.log(`  ❌ Error:`, error.message);
    return null;
  }
}

async function processDocument(doc: any, index: number, total: number): Promise<boolean> {
  console.log(`\n[${index}/${total}] ${doc.company_name} - ${doc.form_type}`);

  const data = await fetchAndExtract(doc.document_url);

  if (!data || Object.keys(data).length === 0) {
    console.log('  ⚠️ No data extracted');
    return false;
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
    post_tax_npv_usd_m: data.post_tax_npv_usd_m ? Math.min(data.post_tax_npv_usd_m, 99999) : null, // Cap at DB limit
    irr_percent: data.irr_percent ? Math.min(data.irr_percent, 99.99) : null, // Cap at DB limit
    mine_life_years: data.mine_life_years || null,
    annual_production_tonnes: data.annual_production_tonnes || null,
    resource_grade: data.resource_grade || null,
    resource_grade_unit: data.resource_grade_unit || null,
    technical_report_url: doc.document_url,
    technical_report_date: doc.filing_date,
    data_source: 'EDGAR_EX96',
    extraction_confidence: 8.5, // Fixed to fit numeric(3,2)
    processing_status: 'completed',
    project_description: `EX-96.1 Technical Report from ${doc.form_type} filing`,
    last_scraped_at: new Date().toISOString()
  };

  console.log('  💾 Saving:', {
    project: projectName,
    capex: data.capex_usd_m,
    npv: data.post_tax_npv_usd_m,
    irr: data.irr_percent,
    life: data.mine_life_years,
    url: doc.document_url.substring(0, 50) + '...'
  });

  const { error } = await supabase
    .from('projects')
    .upsert(projectData, {
      onConflict: 'project_name,company_name',
      ignoreDuplicates: false
    });

  if (error) {
    console.error('  ❌ DB Error:', error.message);
    return false;
  }

  console.log('  ✅ Saved successfully');
  return true;
}

async function main() {
  console.log('🚀 POPULATING ALL EX-96.1 TECHNICAL REPORTS');
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

      // Try without filter to see what's in the table
      const { data: anyDocs, error: anyError } = await supabase
        .from('edgar_technical_documents')
        .select('exhibit_number')
        .limit(10);

      if (anyDocs) {
        console.log('\nFound these exhibit types:');
        const types = [...new Set(anyDocs.map(d => d.exhibit_number))];
        types.forEach(t => console.log(`  - ${t}`));
      }
      return;
    }

    console.log(`✅ Found ${documents.length} EX-96.1 documents to process\n`);

    // Process all documents
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < documents.length; i++) {
      const success = await processDocument(documents[i], i + 1, documents.length);
      if (success) successCount++;
      else failCount++;

      // Small delay to avoid rate limits
      if (i < documents.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 PROCESSING COMPLETE!');
    console.log(`✅ Successfully processed: ${successCount} documents`);
    console.log(`❌ Failed: ${failCount} documents`);

    // Verify what's in the database
    console.log('\n📈 Verifying projects in database...');
    const { data: projects, error: verifyError } = await supabase
      .from('projects')
      .select('project_name, company_name, capex_usd_m, post_tax_npv_usd_m, irr_percent, technical_report_url')
      .eq('data_source', 'EDGAR_EX96')
      .order('last_scraped_at', { ascending: false })
      .limit(10);

    if (!verifyError && projects && projects.length > 0) {
      console.log(`\n✅ Sample of projects in database (${projects.length} shown):\n`);
      projects.forEach((p, i) => {
        console.log(`${i + 1}. ${p.project_name} (${p.company_name})`);
        const metrics = [];
        if (p.capex_usd_m) metrics.push(`CAPEX: $${p.capex_usd_m}M`);
        if (p.post_tax_npv_usd_m) metrics.push(`NPV: $${p.post_tax_npv_usd_m}M`);
        if (p.irr_percent) metrics.push(`IRR: ${p.irr_percent}%`);
        if (metrics.length > 0) console.log(`   ${metrics.join(' | ')}`);
        if (p.technical_report_url) {
          console.log(`   📄 Report: ${p.technical_report_url.substring(0, 60)}...`);
        }
        console.log('');
      });
    }

    // Count total
    const { count } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('data_source', 'EDGAR_EX96');

    console.log(`\n📊 Total EDGAR_EX96 projects in database: ${count || 0}`);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Execute
main().catch(console.error);