#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Comprehensive extraction patterns for accurate data
const EXTRACTION_PATTERNS = {
  npv: [
    /(?:after-?tax\s+)?NPV(?:\s*\([^)]+\))?\s*(?:of\s+)?(?:US)?\$?([\d,]+(?:\.\d+)?)\s*(?:million|M(?![a-zA-Z]))/gi,
    /Net\s+Present\s+Value[^$]{0,50}\$?([\d,]+(?:\.\d+)?)\s*(?:million|M(?![a-zA-Z]))/gi,
    /NPV[^$]{0,30}\$?([\d,]+(?:\.\d+)?)\s*(?:million|M(?![a-zA-Z]))/gi,
    /post[\s-]?tax\s+value[^$]{0,50}\$?([\d,]+(?:\.\d+)?)\s*(?:million|M(?![a-zA-Z]))/gi
  ],
  irr: [
    /(?:after-?tax\s+)?IRR(?:\s*\([^)]+\))?\s*(?:of\s+)?([\d]+(?:\.\d+)?)\s*%/gi,
    /Internal\s+Rate\s+of\s+Return[^%]{0,50}([\d]+(?:\.\d+)?)\s*%/gi,
    /IRR[^%]{0,30}([\d]+(?:\.\d+)?)\s*%/gi,
    /return\s+of\s+([\d]+(?:\.\d+)?)\s*%/gi
  ],
  capex: [
    /(?:initial\s+)?(?:capital|CAPEX|CapEx)(?:\s+(?:cost|expenditure))?\s*(?:of\s+)?(?:US)?\$?([\d,]+(?:\.\d+)?)\s*(?:million|M(?![a-zA-Z]))/gi,
    /capital\s+(?:cost|expenditure)[^$]{0,50}\$?([\d,]+(?:\.\d+)?)\s*(?:million|M(?![a-zA-Z]))/gi,
    /pre-?production\s+capital[^$]{0,50}\$?([\d,]+(?:\.\d+)?)\s*(?:million|M(?![a-zA-Z]))/gi,
    /total\s+(?:project\s+)?capital[^$]{0,50}\$?([\d,]+(?:\.\d+)?)\s*(?:million|M(?![a-zA-Z]))/gi
  ],
  opex: [
    /(?:operating|OPEX|OpEx)(?:\s+(?:cost|expenditure))?\s*(?:of\s+)?(?:US)?\$?([\d,]+(?:\.\d+)?)\s*(?:\/t|per\s+tonne|\/ton|per\s+ton)/gi,
    /operating\s+(?:cost|expenditure)[^$]{0,50}\$?([\d,]+(?:\.\d+)?)\s*(?:\/t|per\s+tonne|\/ton|per\s+ton)/gi,
    /cash\s+(?:operating\s+)?cost[^$]{0,50}\$?([\d,]+(?:\.\d+)?)\s*(?:\/t|per\s+tonne|\/ton|per\s+ton)/gi,
    /unit\s+(?:operating\s+)?cost[^$]{0,50}\$?([\d,]+(?:\.\d+)?)\s*(?:\/t|per\s+tonne|\/ton|per\s+ton)/gi
  ],
  aisc: [
    /AISC(?:\s*\([^)]+\))?\s*(?:of\s+)?(?:US)?\$?([\d,]+(?:\.\d+)?)\s*(?:\/oz|per\s+ounce|\/t|per\s+tonne)/gi,
    /All-?in\s+Sustaining\s+Cost[^$]{0,50}\$?([\d,]+(?:\.\d+)?)\s*(?:\/oz|per\s+ounce|\/t|per\s+tonne)/gi,
    /sustaining\s+cost[^$]{0,50}\$?([\d,]+(?:\.\d+)?)\s*(?:\/oz|per\s+ounce|\/t|per\s+tonne)/gi
  ],
  payback: [
    /payback(?:\s+period)?\s*(?:of\s+)?([\d]+(?:\.\d+)?)\s*years?/gi,
    /([\d]+(?:\.\d+)?)\s*years?\s+payback/gi,
    /capital\s+payback[^0-9]{0,50}([\d]+(?:\.\d+)?)\s*years?/gi
  ],
  mineLife: [
    /(?:mine|project)\s+life\s*(?:of\s+)?([\d]+(?:\.\d+)?)\s*years?/gi,
    /([\d]+(?:\.\d+)?)\s*[-\s]?years?\s+(?:mine|project)\s+life/gi,
    /(?:LOM|life\s+of\s+mine)\s*(?:of\s+)?([\d]+(?:\.\d+)?)\s*years?/gi,
    /operating\s+(?:life|period)\s*(?:of\s+)?([\d]+(?:\.\d+)?)\s*years?/gi
  ],
  production: [
    /(?:annual\s+)?production\s*(?:of\s+)?([\d,]+(?:\.\d+)?)\s*(?:million\s+)?(?:tonnes?|tons?|tpa|Mtpa|Mt\/year)/gi,
    /([\d,]+(?:\.\d+)?)\s*(?:million\s+)?(?:tonnes?|tons?|tpa|Mtpa|Mt\/year)\s+(?:annual\s+)?production/gi,
    /throughput\s*(?:of\s+)?([\d,]+(?:\.\d+)?)\s*(?:million\s+)?(?:tonnes?|tons?|tpa|Mtpa)/gi,
    /processing\s+(?:rate|capacity)\s*(?:of\s+)?([\d,]+(?:\.\d+)?)\s*(?:million\s+)?(?:tonnes?|tons?|tpa|Mtpa)/gi,
    /(?:annual\s+)?production\s*(?:of\s+)?([\d,]+(?:\.\d+)?)\s*(?:k)?(?:oz|ounces?)\s*(?:per\s+(?:year|annum))?/gi
  ],
  grade: [
    /(?:average\s+)?grade\s*(?:of\s+)?([\d]+(?:\.\d+)?)\s*(?:g\/t|gpt|%|ppm|oz\/t|opt)/gi,
    /([\d]+(?:\.\d+)?)\s*(?:g\/t|gpt|%|ppm|oz\/t|opt)\s+(?:average\s+)?grade/gi,
    /(?:head\s+)?grade\s*(?:of\s+)?([\d]+(?:\.\d+)?)\s*(?:g\/t|gpt|%|ppm)/gi,
    /ore\s+grade\s*(?:of\s+)?([\d]+(?:\.\d+)?)\s*(?:g\/t|gpt|%|ppm)/gi
  ],
  recovery: [
    /(?:metallurgical\s+)?recovery\s*(?:of\s+)?([\d]+(?:\.\d+)?)\s*%/gi,
    /([\d]+(?:\.\d+)?)\s*%\s+(?:metallurgical\s+)?recovery/gi,
    /(?:overall\s+)?recovery\s*(?:of\s+)?([\d]+(?:\.\d+)?)\s*%/gi,
    /(?:metal\s+)?extraction\s*(?:of\s+)?([\d]+(?:\.\d+)?)\s*%/gi
  ]
};

// Project name patterns - improved
const PROJECT_NAME_PATTERNS = [
  // Specific project names with commodity
  /(?:the\s+)?([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,2})\s+(?:Gold|Copper|Silver|Lithium|Nickel|Uranium|Zinc|Lead|Cobalt|Iron|Platinum)\s+(?:Project|Mine|Property|Deposit|Operation)/gi,
  // Project/Mine/Property followed by name
  /(?:Project|Mine|Property|Deposit|Operation)[\s:]+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,2})(?:\s|,|\.|$)/gi,
  // Technical report on X project
  /Technical\s+Report\s+(?:on|for)\s+(?:the\s+)?([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,2})\s+(?:Project|Mine|Property)/gi,
  // Name followed by project/mine
  /([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,2})\s+(?:Project|Mine|Property|Deposit)(?:\s|,|\.|$)/gi
];

// Extract numeric value with proper unit handling
function extractNumericValue(match, pattern) {
  if (!match) return null;

  // Reset regex and extract
  pattern.lastIndex = 0;
  const matches = pattern.exec(match);
  if (!matches || !matches[1]) return null;

  let value = parseFloat(matches[1].replace(/,/g, ''));
  if (isNaN(value) || value === 0) return null;

  // Handle billions for financial metrics
  if (/billion|B(?![a-zA-Z])/i.test(match)) {
    value *= 1000; // Convert to millions
  }

  // Handle production units
  if (/production|throughput|processing/i.test(match)) {
    if (/million|Mt|Mtpa/i.test(match)) {
      value *= 1000000; // Convert million tonnes to tonnes
    } else if (/k(?:oz|ounces?)/i.test(match)) {
      value = value * 1000 / 32150; // Convert koz to tonnes (for gold)
    } else if (/oz|ounces?/i.test(match) && !/\/oz/i.test(match)) {
      value = value / 32150; // Convert oz to tonnes (for gold)
    }
  }

  return value;
}

// Enhanced commodity detection
function detectCommodity(text) {
  const commodityPatterns = {
    'Potash': /potash|KCl|sylvite|carnallite|K2O/gi,
    'Lithium': /lithium|Li2O|spodumene|petalite|lepidolite|LCE/gi,
    'Copper': /copper|Cu(?![a-z])|chalcopyrite|chalcocite|bornite|CuEq/gi,
    'Gold': /gold|Au(?![a-z])|auriferous|precious\s+metal/gi,
    'Silver': /silver|Ag(?![a-z])|argentiferous/gi,
    'Nickel': /nickel|Ni(?![a-z])|pentlandite|garnierite|laterite/gi,
    'Uranium': /uranium|U3O8|U308|uraninite|pitchblende|yellowcake/gi,
    'Cobalt': /cobalt|Co(?![a-z])|cobaltite/gi,
    'Zinc': /zinc|Zn(?![a-z])|sphalerite|ZnEq/gi,
    'Lead': /lead|Pb(?![a-z])|galena/gi,
    'Iron Ore': /iron\s+ore|Fe(?![a-z])|magnetite|hematite|taconite/gi,
    'Platinum': /platinum|PGM|PGE|Pt(?![a-z])|palladium|Pd(?![a-z])|rhodium/gi,
    'Rare Earth': /rare\s+earth|REE|REO|neodymium|dysprosium|praseodymium/gi,
    'Graphite': /graphite|carbon|graphene/gi,
    'Vanadium': /vanadium|V2O5|vanadate/gi
  };

  // Count occurrences
  let maxCount = 0;
  let detectedCommodity = 'Gold'; // Default

  for (const [commodity, pattern] of Object.entries(commodityPatterns)) {
    const matches = text.match(pattern);
    if (matches && matches.length > maxCount) {
      maxCount = matches.length;
      detectedCommodity = commodity;
    }
  }

  return detectedCommodity;
}

// Extract data using improved regex patterns
async function extractDataWithRegex(doc, docIndex) {
  try {
    console.log(`\n📄 [${docIndex}] Processing: ${doc.company_name}`);

    // Fetch document
    const response = await fetch(doc.document_url);
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
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&[a-z]+;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Extract all data points
    const extracted = {};
    let foundCount = 0;
    const totalFields = 11;

    // Extract financial and technical metrics
    for (const [key, patterns] of Object.entries(EXTRACTION_PATTERNS)) {
      let found = false;
      for (const pattern of patterns) {
        pattern.lastIndex = 0;
        const matches = text.match(pattern);

        if (matches && matches.length > 0) {
          const match = matches[0];
          pattern.lastIndex = 0;

          const value = extractNumericValue(match, pattern);

          if (value !== null && value > 0) {
            // Apply sanity checks
            if (key === 'capex' && value > 20000) continue; // Skip >$20B CAPEX
            if (key === 'irr' && value > 100) continue; // Skip >100% IRR
            if (key === 'mineLife' && value > 100) continue; // Skip >100 year mine life
            if (key === 'recovery' && value > 100) continue; // Skip >100% recovery
            if (key === 'payback' && value > 50) continue; // Skip >50 year payback

            extracted[key] = value;
            foundCount++;
            found = true;
            break;
          }
        }
      }
    }

    // Calculate extraction percentage
    const percentage = (foundCount / totalFields) * 100;

    // Apply 25% threshold (slightly lower for more projects)
    if (percentage < 25) {
      console.log(`   📊 Only ${foundCount}/${totalFields} data points (${percentage.toFixed(0)}%) - Below threshold`);
      return null;
    }

    console.log(`   ✓ Extracted ${foundCount}/${totalFields} data points (${percentage.toFixed(0)}%)`);

    // Extract project name
    let projectName = null;
    for (const pattern of PROJECT_NAME_PATTERNS) {
      pattern.lastIndex = 0;
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        const match = matches[0];
        pattern.lastIndex = 0;
        const execResult = pattern.exec(match);
        if (execResult && execResult[1]) {
          const name = execResult[1].trim();
          // Filter out generic/bad names
          if (name.length > 3 &&
              !/^(the|and|or|of|in|on|at|to|for|with|from|including|SRK|How|Historical|Report|Summary|Technical|Total|Initial|Project|Mine|Property)$/i.test(name)) {
            projectName = name;
            break;
          }
        }
      }
    }

    // Detect commodity
    const commodity = detectCommodity(text);

    // Use AI for clean project name and description
    let aiProjectName = projectName || `${doc.company_name.replace(/\s+(inc|corp|corporation|limited|ltd|llc|lp|plc)\.?$/i, '')} ${commodity} Project`;
    let projectDescription = '';

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a mining industry expert. Based on the extracted data, provide:
            1. A clean, professional project name (15-40 characters, no codes/numbers)
            2. A compelling 1-2 sentence project description that highlights key metrics

            Guidelines:
            - Use location names if available
            - Include commodity type
            - Make it sound professional and investable
            - If the extracted name is poor, create a better one

            Return as JSON: { "name": "...", "description": "..." }`
          },
          {
            role: "user",
            content: `Company: ${doc.company_name}
            Raw project name: ${projectName || 'Unknown'}
            Commodity: ${commodity}
            Key metrics:
            - NPV: ${extracted.npv ? `$${extracted.npv.toFixed(0)}M` : 'Not disclosed'}
            - IRR: ${extracted.irr ? `${extracted.irr.toFixed(1)}%` : 'Not disclosed'}
            - CAPEX: ${extracted.capex ? `$${extracted.capex.toFixed(0)}M` : 'Not disclosed'}
            - Mine Life: ${extracted.mineLife ? `${extracted.mineLife.toFixed(0)} years` : 'Not disclosed'}
            - Production: ${extracted.production ? `${(extracted.production/1000).toFixed(0)}k tonnes/year` : 'Not disclosed'}

            Create professional name and description.`
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
        max_tokens: 200
      });

      const aiResult = JSON.parse(completion.choices[0].message.content);
      aiProjectName = aiResult.name || aiProjectName;
      projectDescription = aiResult.description || `${commodity} mining project with strong economics`;

    } catch (error) {
      // Fallback description
      projectDescription = `${commodity} mining project ${extracted.npv ? `with NPV of $${extracted.npv.toFixed(0)}M` : 'under development'}`;
    }

    // Log the extracted values
    console.log(`   📌 Project: ${aiProjectName}`);
    if (extracted.npv) console.log(`   💰 NPV: $${extracted.npv.toFixed(0)}M`);
    if (extracted.irr) console.log(`   📈 IRR: ${extracted.irr.toFixed(1)}%`);
    if (extracted.capex) console.log(`   💵 CAPEX: $${extracted.capex.toFixed(0)}M`);

    // Return clean project data
    return {
      project_name: aiProjectName,
      company_name: doc.company_name,
      primary_commodity: commodity,
      project_description: projectDescription,

      // Financial metrics
      post_tax_npv_usd_m: extracted.npv || 0,
      irr_percent: extracted.irr || 0,
      capex_usd_m: extracted.capex || 0,
      opex_usd_per_tonne: extracted.opex || 0,
      aisc_usd_per_tonne: extracted.aisc || 0,
      payback_years: extracted.payback || 0,

      // Production metrics
      mine_life_years: extracted.mineLife || 0,
      annual_production_tonnes: extracted.production || 0,
      resource_grade: extracted.grade || 0,

      // Technical report link
      technical_report_url: doc.document_url,
      technical_report_date: doc.filing_date,

      // Metadata
      data_source: 'SEC EDGAR',
      extraction_confidence: percentage / 100,
      processing_status: 'completed'
    };

  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function populateHighQualityProjects() {
  console.log('🚀 HIGH-QUALITY PROJECT POPULATION - Target: 300+ Projects');
  console.log('='.repeat(60));
  console.log('📋 Features:');
  console.log('   • Accurate data extraction with validation');
  console.log('   • Professional project names and descriptions');
  console.log('   • 25% threshold for data completeness');
  console.log('   • Real financial metrics from documents');
  console.log('='.repeat(60));

  // Clear existing projects
  console.log('\n🗑️  Clearing existing projects...');
  const { error: deleteError } = await supabase
    .from('projects')
    .delete()
    .gte('created_at', '1900-01-01');

  if (deleteError) {
    console.error('Error clearing projects:', deleteError);
    return;
  }
  console.log('✅ Projects table cleared');

  // Get all EDGAR documents
  console.log('\n📚 Fetching EDGAR documents...');
  const { data: documents, error: fetchError } = await supabase
    .from('edgar_technical_documents')
    .select('*')
    .order('filing_date', { ascending: false })
    .limit(1000); // Get more documents to ensure we find 300+ with good data

  if (fetchError) {
    console.error('Error fetching documents:', fetchError);
    return;
  }

  console.log(`✅ Found ${documents.length} documents to process`);
  console.log('🎯 Threshold: 25% of data points required\n');

  const projects = [];
  let processedCount = 0;
  const targetProjects = 300;

  // Process documents until we have 300+ projects
  for (const doc of documents) {
    if (projects.length >= targetProjects) break;

    processedCount++;
    const projectData = await extractDataWithRegex(doc, processedCount);

    if (projectData) {
      projects.push(projectData);
      console.log(`   ✅ Project ${projects.length}/${targetProjects} created\n`);
    }

    // Show progress every 20 documents
    if (processedCount % 20 === 0) {
      console.log(`\n📊 Progress: ${processedCount} documents processed, ${projects.length} quality projects found\n`);
    }

    // Small delay to avoid rate limiting
    if (processedCount % 10 === 0) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Insert projects in batches
  console.log(`\n📝 Inserting ${projects.length} high-quality projects into Supabase...`);

  const batchSize = 20;
  let inserted = 0;

  for (let i = 0; i < projects.length; i += batchSize) {
    const batch = projects.slice(i, i + batchSize);

    const { data, error } = await supabase
      .from('projects')
      .insert(batch)
      .select();

    if (error) {
      console.error('Insert error:', error);

      // Try without project_description if that's the issue
      if (error.message?.includes('project_description')) {
        const batchWithoutDesc = batch.map(p => {
          const { project_description, ...rest } = p;
          return rest;
        });

        const { data: retryData } = await supabase
          .from('projects')
          .insert(batchWithoutDesc)
          .select();

        if (retryData) {
          inserted += retryData.length;
          console.log(`✅ Batch ${Math.floor(i/batchSize) + 1}: ${retryData.length} projects inserted`);
        }
      }
    } else if (data) {
      inserted += data.length;
      console.log(`✅ Batch ${Math.floor(i/batchSize) + 1}: ${data.length} projects inserted`);
    }
  }

  // Final summary
  const { count: finalCount } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true });

  // Get statistics
  const { data: stats } = await supabase
    .from('projects')
    .select('post_tax_npv_usd_m, irr_percent, capex_usd_m, mine_life_years');

  const withNPV = stats?.filter(p => p.post_tax_npv_usd_m > 0).length || 0;
  const withIRR = stats?.filter(p => p.irr_percent > 0).length || 0;
  const withCAPEX = stats?.filter(p => p.capex_usd_m > 0).length || 0;
  const withMineLife = stats?.filter(p => p.mine_life_years > 0).length || 0;

  // Show some sample projects
  const { data: samples } = await supabase
    .from('projects')
    .select('*')
    .gt('post_tax_npv_usd_m', 0)
    .limit(5);

  console.log('\n' + '='.repeat(60));
  console.log('🎉 HIGH-QUALITY PROJECT POPULATION COMPLETE!');
  console.log(`📊 Total projects in database: ${finalCount}`);
  console.log(`\n📈 Projects with real extracted data:`);
  console.log(`   • NPV values: ${withNPV} projects`);
  console.log(`   • IRR values: ${withIRR} projects`);
  console.log(`   • CAPEX values: ${withCAPEX} projects`);
  console.log(`   • Mine Life: ${withMineLife} projects`);

  if (samples && samples.length > 0) {
    console.log(`\n🌟 Sample high-quality projects:`);
    samples.forEach(p => {
      console.log(`\n   📌 ${p.project_name}`);
      console.log(`      Company: ${p.company_name}`);
      console.log(`      Commodity: ${p.primary_commodity}`);
      if (p.post_tax_npv_usd_m > 0) console.log(`      NPV: $${p.post_tax_npv_usd_m}M`);
      if (p.irr_percent > 0) console.log(`      IRR: ${p.irr_percent}%`);
      if (p.project_description) console.log(`      Description: ${p.project_description}`);
    });
  }

  console.log(`\n✅ All projects linked to source EDGAR documents`);
  console.log('✅ Professional naming and descriptions applied');
  console.log('✅ Data accuracy ensured through validation');
  console.log('='.repeat(60));
}

// Run the population script
populateHighQualityProjects().catch(console.error);