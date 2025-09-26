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

// Enhanced extraction patterns with better precision
const EXTRACTION_PATTERNS = {
  npv: [
    /(?:after-?tax\s+)?NPV(?:\s*\([^)]+\))?\s*(?:of\s+)?(?:US)?\$?([\d,]+(?:\.\d+)?)\s*(?:million|M(?![a-zA-Z]))/gi,
    /Net\s+Present\s+Value[^$]{0,50}\$?([\d,]+(?:\.\d+)?)\s*(?:million|M(?![a-zA-Z]))/gi,
    /NPV[^$]{0,30}\$?([\d,]+(?:\.\d+)?)\s*(?:million|M(?![a-zA-Z]))/gi,
    /\$?([\d,]+(?:\.\d+)?)\s*(?:million|M(?![a-zA-Z]))[^a-zA-Z]{0,20}NPV/gi
  ],
  irr: [
    /(?:after-?tax\s+)?IRR(?:\s*\([^)]+\))?\s*(?:of\s+)?([\d]+(?:\.\d+)?)\s*%/gi,
    /Internal\s+Rate\s+of\s+Return[^%]{0,50}([\d]+(?:\.\d+)?)\s*%/gi,
    /IRR[^%]{0,30}([\d]+(?:\.\d+)?)\s*%/gi,
    /([\d]+(?:\.\d+)?)\s*%[^a-zA-Z]{0,20}IRR/gi
  ],
  capex: [
    /(?:initial\s+)?(?:capital|CAPEX|CapEx)(?:\s+(?:cost|expenditure))?\s*(?:of\s+)?(?:US)?\$?([\d,]+(?:\.\d+)?)\s*(?:million|M(?![a-zA-Z]))/gi,
    /capital\s+(?:cost|expenditure)[^$]{0,50}\$?([\d,]+(?:\.\d+)?)\s*(?:million|M(?![a-zA-Z]))/gi,
    /pre-?production\s+capital[^$]{0,50}\$?([\d,]+(?:\.\d+)?)\s*(?:million|M(?![a-zA-Z]))/gi,
    /\$?([\d,]+(?:\.\d+)?)\s*(?:million|M(?![a-zA-Z]))[^a-zA-Z]{0,20}(?:capital|CAPEX)/gi,
    /total\s+(?:capital|CAPEX)[^$]{0,50}\$?([\d,]+(?:\.\d+)?)\s*(?:million|M(?![a-zA-Z]))/gi
  ],
  opex: [
    /(?:operating|OPEX|OpEx)(?:\s+(?:cost|expenditure))?\s*(?:of\s+)?(?:US)?\$?([\d,]+(?:\.\d+)?)\s*(?:\/t|per\s+tonne|\/ton|per\s+ton)/gi,
    /operating\s+(?:cost|expenditure)[^$]{0,50}\$?([\d,]+(?:\.\d+)?)\s*(?:\/t|per\s+tonne|\/ton|per\s+ton)/gi,
    /\$?([\d,]+(?:\.\d+)?)\s*(?:\/t|per\s+tonne|\/ton|per\s+ton)[^a-zA-Z]{0,20}(?:operating|OPEX)/gi,
    /cash\s+(?:operating\s+)?cost[^$]{0,50}\$?([\d,]+(?:\.\d+)?)\s*(?:\/t|per\s+tonne|\/ton|per\s+ton)/gi
  ],
  aisc: [
    /AISC(?:\s*\([^)]+\))?\s*(?:of\s+)?(?:US)?\$?([\d,]+(?:\.\d+)?)\s*(?:\/oz|per\s+ounce|\/t|per\s+tonne)/gi,
    /All-?in\s+Sustaining\s+Cost[^$]{0,50}\$?([\d,]+(?:\.\d+)?)\s*(?:\/oz|per\s+ounce|\/t|per\s+tonne)/gi,
    /\$?([\d,]+(?:\.\d+)?)\s*(?:\/oz|per\s+ounce|\/t|per\s+tonne)[^a-zA-Z]{0,20}AISC/gi
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
    /operating\s+life\s*(?:of\s+)?([\d]+(?:\.\d+)?)\s*years?/gi
  ],
  production: [
    /(?:annual\s+)?production\s*(?:of\s+)?([\d,]+(?:\.\d+)?)\s*(?:million\s+)?(?:tonnes?|tons?|tpa|Mtpa|Mt\/year)/gi,
    /([\d,]+(?:\.\d+)?)\s*(?:million\s+)?(?:tonnes?|tons?|tpa|Mtpa|Mt\/year)\s+(?:annual\s+)?production/gi,
    /throughput\s*(?:of\s+)?([\d,]+(?:\.\d+)?)\s*(?:million\s+)?(?:tonnes?|tons?|tpa|Mtpa)/gi,
    /processing\s+capacity\s*(?:of\s+)?([\d,]+(?:\.\d+)?)\s*(?:million\s+)?(?:tonnes?|tons?|tpa|Mtpa)/gi,
    /([\d,]+(?:\.\d+)?)\s*(?:million\s+)?(?:tonnes?|tons?)\s+per\s+(?:year|annum)/gi,
    /(?:annual\s+)?production\s*(?:of\s+)?([\d,]+(?:\.\d+)?)\s*(?:k)?(?:oz|ounces?)\s*(?:per\s+(?:year|annum))?/gi
  ],
  grade: [
    /(?:average\s+)?grade\s*(?:of\s+)?([\d]+(?:\.\d+)?)\s*(?:g\/t|gpt|%|ppm|oz\/t|opt)/gi,
    /([\d]+(?:\.\d+)?)\s*(?:g\/t|gpt|%|ppm|oz\/t|opt)\s+(?:average\s+)?grade/gi,
    /(?:head\s+)?grade\s*(?:of\s+)?([\d]+(?:\.\d+)?)\s*(?:g\/t|gpt|%|ppm)/gi,
    /([\d]+(?:\.\d+)?)\s*(?:g\/t|gpt)\s+(?:gold|silver|Au|Ag)/gi,
    /([\d]+(?:\.\d+)?)\s*%\s+(?:copper|nickel|lithium|Cu|Ni|Li)/gi
  ],
  recovery: [
    /(?:metallurgical\s+)?recovery\s*(?:of\s+)?([\d]+(?:\.\d+)?)\s*%/gi,
    /([\d]+(?:\.\d+)?)\s*%\s+(?:metallurgical\s+)?recovery/gi,
    /(?:overall\s+)?recovery\s*(?:of\s+)?([\d]+(?:\.\d+)?)\s*%/gi,
    /extraction\s*(?:of\s+)?([\d]+(?:\.\d+)?)\s*%/gi
  ],
  resources: [
    /(?:measured\s+(?:and|&)\s+indicated|M&I)\s*(?:of\s+)?([\d,]+(?:\.\d+)?)\s*(?:Mt|million\s+tonnes?|Moz|million\s+ounces?)/gi,
    /(?:inferred\s+)?resources?\s*(?:of\s+)?([\d,]+(?:\.\d+)?)\s*(?:Mt|million\s+tonnes?|Moz|million\s+ounces?)/gi,
    /total\s+resources?\s*(?:of\s+)?([\d,]+(?:\.\d+)?)\s*(?:Mt|million\s+tonnes?|Moz|million\s+ounces?)/gi
  ]
};

// Better project name patterns
const PROJECT_NAME_PATTERNS = [
  /(?:the\s+)?([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,3})\s+(?:Gold|Copper|Silver|Lithium|Nickel|Uranium|Zinc|Lead|Cobalt)\s+(?:Project|Mine|Property|Deposit)/gi,
  /(?:Project|Mine|Property|Deposit)[\s:]+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,3})/gi,
  /Technical\s+Report\s+(?:on|for)\s+(?:the\s+)?([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,3})\s+(?:Project|Mine|Property)/gi,
  /([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,3})\s+(?:Project|Mine|Property|Deposit)(?:\s|,|\.)/gi
];

// Extract numeric value with proper unit handling
function extractNumericValue(match, pattern, isMillions = true) {
  if (!match) return null;

  // Extract the captured group (the number)
  const matches = pattern.exec(match);
  if (!matches || !matches[1]) return null;

  let value = parseFloat(matches[1].replace(/,/g, ''));

  if (isNaN(value)) return null;

  // Handle billions
  if (/billion|B(?![a-zA-Z])/i.test(match)) {
    value *= 1000; // Convert to millions
  }

  // Handle production units
  if (/production|throughput|processing/i.test(match)) {
    // Check if it's already in millions
    if (/million|Mt|Mtpa/i.test(match)) {
      value *= 1000000; // Convert million tonnes to tonnes
    } else if (/k(?:oz|ounces?)/i.test(match)) {
      value = value * 1000 / 32150; // Convert koz to tonnes (for gold)
    } else if (/oz|ounces?/i.test(match) && !/\/oz/i.test(match)) {
      value = value / 32150; // Convert oz to tonnes (for gold)
    }
    // Otherwise assume it's already in tonnes/year
  }

  return value;
}

// Enhanced commodity detection
function detectCommodity(text) {
  const commodityPatterns = {
    'Potash': /potash|KCl|sylvite|carnallite/gi,
    'Lithium': /lithium|Li2O|spodumene|petalite|lepidolite/gi,
    'Copper': /copper|Cu(?![a-z])|chalcopyrite|chalcocite|bornite/gi,
    'Gold': /gold|Au(?![a-z])|auriferous/gi,
    'Silver': /silver|Ag(?![a-z])|argentiferous/gi,
    'Nickel': /nickel|Ni(?![a-z])|pentlandite|garnierite/gi,
    'Uranium': /uranium|U3O8|uraninite|pitchblende/gi,
    'Cobalt': /cobalt|Co(?![a-z])|cobaltite/gi,
    'Zinc': /zinc|Zn(?![a-z])|sphalerite/gi,
    'Lead': /lead|Pb(?![a-z])|galena/gi,
    'Iron': /iron\s+ore|Fe(?![a-z])|magnetite|hematite/gi,
    'Platinum': /platinum|PGM|PGE|Pt(?![a-z])|palladium|Pd(?![a-z])/gi,
    'Rare Earth': /rare\s+earth|REE|REO|neodymium|dysprosium/gi
  };

  // Count occurrences of each commodity
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
async function extractDataWithRegex(doc) {
  try {
    console.log(`\n📄 Processing: ${doc.company_name}`);
    console.log(`   URL: ${doc.document_url}`);

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

    console.log(`   Document size: ${text.length} characters`);

    // Extract all data points
    const extracted = {};
    let foundCount = 0;
    const totalFields = 11; // Number of numeric fields we're extracting

    // Extract financial metrics
    for (const [key, patterns] of Object.entries(EXTRACTION_PATTERNS)) {
      let found = false;
      for (const pattern of patterns) {
        // Reset the regex
        pattern.lastIndex = 0;
        const matches = text.match(pattern);

        if (matches && matches.length > 0) {
          // Use the first match
          const match = matches[0];
          pattern.lastIndex = 0; // Reset for extraction

          let value = null;

          if (key === 'production') {
            value = extractNumericValue(match, pattern, false);
          } else if (key === 'irr' || key === 'recovery' || key === 'grade') {
            value = extractNumericValue(match, pattern, false);
          } else if (key === 'mineLife' || key === 'payback') {
            value = extractNumericValue(match, pattern, false);
          } else if (key === 'opex' || key === 'aisc') {
            value = extractNumericValue(match, pattern, false);
          } else {
            // NPV, CAPEX, resources - these are in millions
            value = extractNumericValue(match, pattern, true);
          }

          if (value !== null && value > 0) {
            // Apply sanity checks
            if (key === 'capex' && value > 50000) {
              console.log(`   ⚠️ CAPEX $${value}M seems too high, skipping`);
              continue;
            }
            if (key === 'irr' && value > 100) {
              console.log(`   ⚠️ IRR ${value}% seems too high, skipping`);
              continue;
            }
            if (key === 'mineLife' && value > 100) {
              console.log(`   ⚠️ Mine life ${value} years seems too high, skipping`);
              continue;
            }

            extracted[key] = value;
            foundCount++;
            console.log(`   ✓ Found ${key}: ${value}`);
            found = true;
            break;
          }
        }
      }
    }

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
          projectName = execResult[1].trim();
          // Filter out bad names
          if (projectName.length > 3 &&
              !/^(the|and|or|of|in|on|at|to|for|with|from|including|SRK|How|Historical)$/i.test(projectName)) {
            console.log(`   ✓ Found project name: ${projectName}`);
            break;
          } else {
            projectName = null;
          }
        }
      }
    }

    // Detect commodity
    const commodity = detectCommodity(text);
    console.log(`   ✓ Detected commodity: ${commodity}`);

    // Calculate extraction percentage
    const percentage = (foundCount / totalFields) * 100;
    console.log(`   📊 Extracted ${foundCount}/${totalFields} data points (${percentage.toFixed(0)}%)`);

    // Apply 30% threshold
    if (percentage < 30) {
      console.log(`   ❌ Below 30% threshold - Skipping`);
      return null;
    }

    console.log(`   ✅ MEETS THRESHOLD - Processing with AI for name and description`);

    // Use AI only for project name and description
    let aiProjectName = projectName || `${doc.company_name} ${commodity} Project`;
    let projectDescription = '';

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a mining industry expert. Based on the extracted data, provide:
            1. A clean, professional project name (no codes, no "including", "Historical", etc.)
            2. A brief 1-2 sentence description of the project

            If the extracted name is generic or poor quality, create a better one based on the company and commodity.

            Return as JSON: { "name": "...", "description": "..." }`
          },
          {
            role: "user",
            content: `Company: ${doc.company_name}
            Extracted project name: ${projectName || 'Unknown'}
            Commodity: ${commodity}
            NPV: $${extracted.npv || 0}M
            IRR: ${extracted.irr || 0}%
            CAPEX: $${extracted.capex || 0}M
            Mine Life: ${extracted.mineLife || 0} years
            Production: ${extracted.production || 0} tonnes/year

            Create a professional project name and description.`
          }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" },
        max_tokens: 200
      });

      const aiResult = JSON.parse(completion.choices[0].message.content);
      aiProjectName = aiResult.name || aiProjectName;
      projectDescription = aiResult.description || `${commodity} mining project by ${doc.company_name}`;

      console.log(`   🤖 AI enhanced name: ${aiProjectName}`);
    } catch (error) {
      console.log(`   ⚠️ AI enhancement failed, using defaults`);
      projectDescription = `${commodity} mining project by ${doc.company_name}`;
    }

    // Return extracted data
    return {
      project_name: aiProjectName,
      company_name: doc.company_name,
      primary_commodity: commodity,
      project_description: projectDescription,

      // Financial metrics - use extracted values or 0
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

async function parseHighQualityProjects() {
  console.log('🚀 FIXED HIGH QUALITY EDGAR PARSER - 100 Projects with Real Data');
  console.log('='.repeat(60));
  console.log('📋 Improvements:');
  console.log('   • Better numeric extraction with unit handling');
  console.log('   • Improved project name patterns');
  console.log('   • Enhanced commodity detection');
  console.log('   • Sanity checks on values');
  console.log('   • 30% threshold requirement');
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

  // Get EDGAR documents
  console.log('\n📚 Fetching EDGAR documents...');
  const { data: documents, error: fetchError } = await supabase
    .from('edgar_technical_documents')
    .select('*')
    .order('filing_date', { ascending: false })
    .limit(500); // Get more to ensure we find 100 with good data

  if (fetchError) {
    console.error('Error fetching documents:', fetchError);
    return;
  }

  console.log(`✅ Found ${documents.length} documents to process`);
  console.log('🎯 Threshold: 30% of data points required\n');

  const projects = [];
  let processedCount = 0;

  // Process documents until we have 100 projects
  for (const doc of documents) {
    if (projects.length >= 100) break;

    processedCount++;
    const projectData = await extractDataWithRegex(doc);

    if (projectData) {
      projects.push(projectData);
      console.log(`   ✅ Project ${projects.length}/100 created\n`);
    }

    // Show progress
    if (processedCount % 10 === 0) {
      console.log(`\n📊 Progress: ${processedCount} documents processed, ${projects.length} projects created\n`);
    }
  }

  // Insert projects in batches
  console.log(`\n📝 Inserting ${projects.length} high-quality projects...`);

  const batchSize = 10;
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
          console.log(`✅ Batch ${Math.floor(i/batchSize) + 1}: ${retryData.length} projects`);
        }
      }
    } else if (data) {
      inserted += data.length;
      console.log(`✅ Batch ${Math.floor(i/batchSize) + 1}: ${data.length} projects`);

      // Show sample project with real data
      if (data.length > 0 && inserted % 20 === 10) {
        const sample = data[0];
        console.log(`\n   📋 Sample project with real data:`);
        console.log(`   Name: ${sample.project_name}`);
        console.log(`   Company: ${sample.company_name}`);
        console.log(`   Commodity: ${sample.primary_commodity}`);
        if (sample.post_tax_npv_usd_m > 0) console.log(`   💰 NPV: $${sample.post_tax_npv_usd_m}M`);
        if (sample.irr_percent > 0) console.log(`   📈 IRR: ${sample.irr_percent}%`);
        if (sample.capex_usd_m > 0) console.log(`   💵 CAPEX: $${sample.capex_usd_m}M`);
        if (sample.mine_life_years > 0) console.log(`   ⏱️  Mine Life: ${sample.mine_life_years} years`);
        if (sample.annual_production_tonnes > 0) console.log(`   ⚒️  Production: ${sample.annual_production_tonnes.toLocaleString()} tonnes/year`);
        console.log(`   📄 Source: ${sample.technical_report_url}\n`);
      }
    }
  }

  // Final summary
  const { count: finalCount } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true });

  // Get statistics
  const { data: stats } = await supabase
    .from('projects')
    .select('post_tax_npv_usd_m, irr_percent, capex_usd_m, mine_life_years')
    .gt('post_tax_npv_usd_m', 0);

  const withNPV = stats?.filter(p => p.post_tax_npv_usd_m > 0).length || 0;
  const withIRR = stats?.filter(p => p.irr_percent > 0).length || 0;
  const withCAPEX = stats?.filter(p => p.capex_usd_m > 0).length || 0;
  const withMineLife = stats?.filter(p => p.mine_life_years > 0).length || 0;

  console.log('\n' + '='.repeat(60));
  console.log('🎉 FIXED HIGH QUALITY PARSING COMPLETE!');
  console.log(`📊 Total projects created: ${finalCount}`);
  console.log(`📈 Projects with real data:`);
  console.log(`   • NPV values: ${withNPV} projects`);
  console.log(`   • IRR values: ${withIRR} projects`);
  console.log(`   • CAPEX values: ${withCAPEX} projects`);
  console.log(`   • Mine Life: ${withMineLife} projects`);
  console.log(`🔗 All projects linked to source EDGAR documents`);
  console.log(`✅ Only projects meeting 30% threshold included`);
  console.log('='.repeat(60));
}

// Run the parser
parseHighQualityProjects().catch(console.error);