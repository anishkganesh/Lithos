#!/usr/bin/env npx tsx
/**
 * Parse ALL EX-96.1 documents with correct regex patterns
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://dfxauievbyqwcynwtvib.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmeGF1aWV2Ynlxd2N5bnd0dmliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Nzg0ODI2MSwiZXhwIjoyMDYzNDI0MjYxfQ.Gs2NX-UUKtXvW3a9_h49ATSDzvpsfJdja6tt1bCkyjc'
);

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
    'borate': 'Other',
    'boron': 'Other',
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
    'care & maintenance': 'Closed'
  };

  const lower = stage.toLowerCase().trim();
  return stageMap[lower] || 'Exploration';
}

async function extractFromDocument(doc: any): Promise<any> {
  try {
    // Fetch the document
    const response = await fetch(doc.document_url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml'
      }
    });

    if (!response.ok) {
      console.log(`   ❌ Failed to fetch: ${response.status}`);
      return null;
    }

    const html = await response.text();

    // Clean HTML to text
    const text = html
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
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .substring(0, 1000000) // Limit to 1MB of text
      .trim();

    const extracted: any = {};

    // Extract NPV - Look for patterns like "NPV at X% US$ (million) Y"
    const npvPatterns = [
      /After\s+Tax\s+Free\s+Cash\s+Flow\s+US\$\s*\([^)]*\)\s*([\d,]+)\s+NPV\s+at\s+\d+%\s+US\$\s*\([^)]*\)\s*([\d,]+)/i,
      /NPV\s+at\s+\d+%\s+US\$\s*\([^)]*million[^)]*\)\s*([\d,]+(?:\.\d+)?)/gi,
      /after[\s-]?tax\s+NPV.*?US?\$?\s*([\d,]+(?:\.\d+)?)\s*(?:million|M)/i,
      /post[\s-]?tax\s+NPV.*?US?\$?\s*([\d,]+(?:\.\d+)?)\s*(?:million|M|billion|B)/i,
      /NPV.*?after[\s-]?tax.*?US?\$?\s*([\d,]+(?:\.\d+)?)\s*(?:million|M)/i
    ];

    for (const pattern of npvPatterns) {
      const matches = text.matchAll(pattern instanceof RegExp && pattern.global ? pattern : new RegExp(pattern.source, pattern.flags + 'g'));
      for (const match of matches) {
        const valueIndex = match.length > 2 ? 2 : 1;
        const value = parseFloat(match[valueIndex].replace(/,/g, ''));
        if (!isNaN(value) && value > 0) {
          // Check context for "after tax" or "post tax"
          const context = text.substring(Math.max(0, match.index! - 100), match.index! + match[0].length);
          if (context.toLowerCase().includes('after') || context.toLowerCase().includes('post') || match.length > 2) {
            extracted.post_tax_npv_usd_m = Math.min(value, 99999);
            break;
          }
        }
      }
      if (extracted.post_tax_npv_usd_m) break;
    }

    // Extract IRR
    const irrPatterns = [
      /(?:after|post)[\s-]?tax\s+IRR[^0-9]*?([\d.]+)\s*%/i,
      /IRR[^0-9]*?([\d.]+)\s*%.*?(?:after|post)[\s-]?tax/i,
      /IRR\s*\([^)]*(?:after|post)[\s-]?tax[^)]*\)[^0-9]*?([\d.]+)\s*%/i,
      /internal\s+rate\s+of\s+return[^0-9]*?([\d.]+)\s*%/i
    ];

    for (const pattern of irrPatterns) {
      const match = text.match(pattern);
      if (match) {
        const value = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(value) && value > 0 && value < 100) {
          extracted.irr_percent = Math.min(value, 99.99);
          break;
        }
      }
    }

    // Extract CAPEX
    const capexPatterns = [
      /initial\s+capital[^0-9]*?US?\$?\s*([\d,]+(?:\.\d+)?)\s*(?:million|M)/i,
      /capital\s+(?:cost|expenditure)[^0-9]*?US?\$?\s*([\d,]+(?:\.\d+)?)\s*(?:million|M)/i,
      /CAPEX[^0-9]*?US?\$?\s*([\d,]+(?:\.\d+)?)\s*(?:million|M)/i,
      /total\s+capital[^0-9]*?US?\$?\s*([\d,]+(?:\.\d+)?)\s*(?:million|M)/i,
      /development\s+capital[^0-9]*?US?\$?\s*([\d,]+(?:\.\d+)?)\s*(?:million|M)/i,
      /sustaining\s+capital[^0-9]*?US?\$?\s*([\d,]+(?:\.\d+)?)\s*(?:million|M)/i
    ];

    for (const pattern of capexPatterns) {
      const match = text.match(pattern);
      if (match) {
        const value = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(value) && value > 0 && value < 100000) {
          extracted.capex_usd_m = value;
          break;
        }
      }
    }

    // Extract Mine Life
    const mineLifePatterns = [
      /mine\s+life[^0-9]*?([\d.]+)\s*years?/i,
      /life\s+of\s+mine[^0-9]*?([\d.]+)\s*years?/i,
      /LOM[^0-9]*?([\d.]+)\s*years?/i,
      /project\s+life[^0-9]*?([\d.]+)\s*years?/i,
      /([\d.]+)\s*year\s+mine\s+life/i
    ];

    for (const pattern of mineLifePatterns) {
      const match = text.match(pattern);
      if (match) {
        const value = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(value) && value > 0 && value < 100) {
          extracted.mine_life_years = value;
          break;
        }
      }
    }

    // Extract Annual Production
    const productionPatterns = [
      /(?:annual|average)\s+(?:REO\s+)?production[^0-9]*?([\d,]+(?:\.\d+)?)\s*(?:million\s+)?(?:metric\s+)?(?:tonnes?|tons?|mt|kt)/i,
      /production\s+rate[^0-9]*?([\d,]+(?:\.\d+)?)\s*(?:million\s+)?(?:tonnes?|tons?|mt|kt)/i,
      /throughput[^0-9]*?([\d,]+(?:\.\d+)?)\s*(?:million\s+)?(?:tonnes?|tons?|mt|kt)/i,
      /([\d,]+(?:\.\d+)?)\s*(?:million\s+)?(?:tonnes?|tons?)\s*(?:per\s+year|annually|\/year)/i
    ];

    for (const pattern of productionPatterns) {
      const match = text.match(pattern);
      if (match) {
        let value = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(value) && value > 0) {
          // Convert units
          const matchText = match[0].toLowerCase();
          if (matchText.includes('million')) {
            value = value * 1000000;
          } else if (matchText.includes('kt') || matchText.includes('thousand')) {
            value = value * 1000;
          }
          extracted.annual_production_tonnes = value;
          break;
        }
      }
    }

    // Extract Grade
    const gradePatterns = [
      /(?:average\s+)?(?:REO\s+)?grade[^0-9]*?([\d.]+)\s*%/i,
      /(?:average\s+)?grade[^0-9]*?([\d.]+)\s*(?:g\/t|gpt)/i,
      /ore\s+grade[^0-9]*?([\d.]+)\s*(?:%|g\/t|gpt)/i,
      /head\s+grade[^0-9]*?([\d.]+)\s*(?:%|g\/t|gpt)/i,
      /resource\s+grade[^0-9]*?([\d.]+)\s*(?:%|g\/t|gpt)/i
    ];

    for (const pattern of gradePatterns) {
      const match = text.match(pattern);
      if (match) {
        const value = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(value) && value > 0) {
          extracted.resource_grade = value;
          if (match[0].includes('%')) {
            extracted.resource_grade_unit = '%';
          } else if (match[0].toLowerCase().includes('g/t') || match[0].toLowerCase().includes('gpt')) {
            extracted.resource_grade_unit = 'g/t';
          }
          break;
        }
      }
    }

    return extracted;

  } catch (error) {
    console.error(`   ❌ Error processing: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log('🚀 PARSING ALL EX-96.1 DOCUMENTS WITH CORRECT PATTERNS');
  console.log('='.repeat(70));

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

  let successCount = 0;
  let failCount = 0;
  let extractedCount = 0;

  // Process all documents
  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    console.log(`\n[${i + 1}/${documents.length}] ${doc.company_name}`);

    const extracted = await extractFromDocument(doc);

    if (!extracted || Object.keys(extracted).length === 0) {
      console.log('   ⚠️ No data extracted');
      failCount++;
      continue;
    }

    console.log(`   📊 Extracted: ${Object.keys(extracted).join(', ')}`);
    extractedCount++;

    // Create project name
    const projectName = doc.project_names?.[0] ||
                       `${doc.company_name.split(' ')[0]} Project` ||
                       `${doc.ticker || 'Unknown'} Project`;

    const projectData = {
      project_name: projectName.substring(0, 100),
      company_name: doc.company_name,
      country: doc.country || null,
      jurisdiction: doc.state || null,
      primary_commodity: mapCommodity(doc.primary_commodity),
      stage: mapStage(doc.stage),
      capex_usd_m: extracted.capex_usd_m || null,
      post_tax_npv_usd_m: extracted.post_tax_npv_usd_m || null,
      irr_percent: extracted.irr_percent || null,
      mine_life_years: extracted.mine_life_years || null,
      annual_production_tonnes: extracted.annual_production_tonnes || null,
      resource_grade: extracted.resource_grade || null,
      resource_grade_unit: extracted.resource_grade_unit || null,
      technical_report_url: doc.document_url,
      technical_report_date: doc.filing_date,
      data_source: 'EDGAR_EX96',
      extraction_confidence: 8.5,
      processing_status: 'completed',
      project_description: `EX-96.1 Technical Report from ${doc.form_type} filing`,
      last_scraped_at: new Date().toISOString()
    };

    const { error: saveError } = await supabase
      .from('projects')
      .upsert(projectData, {
        onConflict: 'project_name,company_name',
        ignoreDuplicates: false
      });

    if (saveError) {
      console.error(`   ❌ Save error: ${saveError.message}`);
      failCount++;
    } else {
      console.log(`   ✅ Saved successfully`);
      successCount++;
    }

    // Small delay to avoid rate limits
    if (i < documents.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 PROCESSING COMPLETE!');
  console.log(`✅ Successfully saved: ${successCount} projects`);
  console.log(`📈 Extracted data from: ${extractedCount} documents`);
  console.log(`❌ Failed: ${failCount} documents`);

  // Verify what's in the database
  const { count } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('data_source', 'EDGAR_EX96');

  console.log(`\n📊 Total EDGAR_EX96 projects in database: ${count || 0}`);

  // Show sample of projects with financial data
  const { data: sampleProjects } = await supabase
    .from('projects')
    .select('project_name, company_name, post_tax_npv_usd_m, irr_percent, capex_usd_m, mine_life_years')
    .eq('data_source', 'EDGAR_EX96')
    .not('post_tax_npv_usd_m', 'is', null)
    .order('last_scraped_at', { ascending: false })
    .limit(10);

  if (sampleProjects && sampleProjects.length > 0) {
    console.log('\n📋 Sample projects with NPV data:');
    sampleProjects.forEach(p => {
      console.log(`\n  ${p.project_name} (${p.company_name})`);
      console.log(`    NPV: $${p.post_tax_npv_usd_m}M | IRR: ${p.irr_percent || 'N/A'}% | CAPEX: $${p.capex_usd_m || 'N/A'}M | Life: ${p.mine_life_years || 'N/A'} years`);
    });
  }
}

main().catch(console.error);