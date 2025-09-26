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

// Comprehensive extraction patterns
const EXTRACTION_PATTERNS = {
  npv: [
    /NPV[\s\S]{0,50}\$[\d,]+(?:\.?\d*)\s*(?:million|billion|M|B)/gi,
    /Net\s+Present\s+Value[\s\S]{0,50}\$[\d,]+(?:\.?\d*)\s*(?:million|billion|M|B)/gi,
    /after[\s-]*tax\s+NPV[\s\S]{0,50}\$[\d,]+(?:\.?\d*)\s*(?:million|billion|M|B)/gi,
    /\$[\d,]+(?:\.?\d*)\s*(?:million|billion|M|B)[\s\S]{0,30}NPV/gi,
    /NPV[^$]{0,50}\$[\d,]+(?:\.?\d*)\s*[mM]/gi,
    /US\$[\d,]+(?:\.?\d*)\s*(?:million|billion|M|B)[\s\S]{0,30}NPV/gi
  ],
  irr: [
    /IRR[\s\S]{0,50}[\d]+(?:\.?\d*)\s*%/gi,
    /Internal\s+Rate\s+of\s+Return[\s\S]{0,50}[\d]+(?:\.?\d*)\s*%/gi,
    /after[\s-]*tax\s+IRR[\s\S]{0,50}[\d]+(?:\.?\d*)\s*%/gi,
    /[\d]+(?:\.?\d*)\s*%[\s\S]{0,30}IRR/gi,
    /IRR[^%]{0,50}[\d]+(?:\.?\d*)\s*%/gi
  ],
  capex: [
    /(?:initial\s+)?(?:capital|CAPEX|CapEx)[\s\S]{0,50}\$[\d,]+(?:\.?\d*)\s*(?:million|billion|M|B)/gi,
    /\$[\d,]+(?:\.?\d*)\s*(?:million|billion|M|B)[\s\S]{0,30}(?:capital|CAPEX)/gi,
    /capital\s+(?:cost|expenditure)[\s\S]{0,50}\$[\d,]+(?:\.?\d*)\s*(?:million|billion|M|B)/gi,
    /pre[\s-]*production\s+capital[\s\S]{0,50}\$[\d,]+(?:\.?\d*)\s*(?:million|billion|M|B)/gi,
    /US\$[\d,]+(?:\.?\d*)\s*(?:million|billion|M|B)[\s\S]{0,30}(?:capital|CAPEX)/gi
  ],
  opex: [
    /(?:operating|OPEX|OpEx)[\s\S]{0,50}\$[\d,]+(?:\.?\d*)\s*(?:\/t|per\s+tonne|\/oz|per\s+ounce)/gi,
    /\$[\d,]+(?:\.?\d*)\s*(?:\/t|per\s+tonne|\/oz|per\s+ounce)[\s\S]{0,30}(?:operating|OPEX)/gi,
    /operating\s+(?:cost|expenditure)[\s\S]{0,50}\$[\d,]+(?:\.?\d*)/gi,
    /cash\s+cost[\s\S]{0,50}\$[\d,]+(?:\.?\d*)\s*(?:\/t|per\s+tonne|\/oz|per\s+ounce)/gi
  ],
  aisc: [
    /AISC[\s\S]{0,50}\$[\d,]+(?:\.?\d*)\s*(?:\/oz|per\s+ounce|\/t|per\s+tonne)/gi,
    /All[\s-]*in[\s-]*Sustaining[\s-]*Cost[\s\S]{0,50}\$[\d,]+(?:\.?\d*)/gi,
    /\$[\d,]+(?:\.?\d*)\s*(?:\/oz|per\s+ounce|\/t|per\s+tonne)[\s\S]{0,30}AISC/gi,
    /sustaining\s+cost[\s\S]{0,50}\$[\d,]+(?:\.?\d*)/gi
  ],
  payback: [
    /payback[\s\S]{0,50}[\d]+(?:\.?\d*)\s*years?/gi,
    /[\d]+(?:\.?\d*)\s*years?\s+payback/gi,
    /payback\s+period[\s\S]{0,50}[\d]+(?:\.?\d*)\s*years?/gi,
    /capital\s+payback[\s\S]{0,50}[\d]+(?:\.?\d*)\s*years?/gi
  ],
  mineLife: [
    /(?:mine|project)\s+life[\s\S]{0,50}[\d]+(?:\.?\d*)\s*years?/gi,
    /[\d]+(?:\.?\d*)\s*years?\s+(?:mine|project)\s+life/gi,
    /(?:LOM|life\s+of\s+mine)[\s\S]{0,50}[\d]+(?:\.?\d*)\s*years?/gi,
    /[\d]+(?:\.?\d*)\s*[-\s]?year\s+(?:mine|project)/gi,
    /operating\s+life[\s\S]{0,50}[\d]+(?:\.?\d*)\s*years?/gi
  ],
  production: [
    /(?:annual\s+)?production[\s\S]{0,50}[\d,]+(?:\.?\d*)\s*(?:tonnes?|tons?|tpa|tpd|oz|ounces?)\s*(?:per\s+(?:year|annum))?/gi,
    /[\d,]+(?:\.?\d*)\s*(?:tonnes?|tons?|tpa|tpd|oz|ounces?)\s*(?:per\s+(?:year|annum))[\s\S]{0,30}production/gi,
    /throughput[\s\S]{0,50}[\d,]+(?:\.?\d*)\s*(?:tonnes?|tons?|tpa|tpd)/gi,
    /processing\s+capacity[\s\S]{0,50}[\d,]+(?:\.?\d*)\s*(?:tonnes?|tons?|tpa|tpd)/gi,
    /[\d,]+(?:\.?\d*)\s*(?:million\s+)?(?:tonnes?|tons?)\s*(?:per\s+(?:year|annum))/gi
  ],
  grade: [
    /(?:average\s+)?grade[\s\S]{0,50}[\d]+(?:\.?\d*)\s*(?:g\/t|gpt|%|ppm|oz\/t|opt)/gi,
    /[\d]+(?:\.?\d*)\s*(?:g\/t|gpt|%|ppm|oz\/t|opt)[\s\S]{0,30}(?:grade|head\s+grade)/gi,
    /(?:head\s+)?grade[\s\S]{0,50}[\d]+(?:\.?\d*)\s*(?:g\/t|gpt|%|ppm)/gi,
    /[\d]+(?:\.?\d*)\s*(?:g\/t|gpt)\s+(?:gold|silver|Au|Ag)/gi,
    /[\d]+(?:\.?\d*)\s*%\s+(?:copper|nickel|lithium|Cu|Ni|Li)/gi
  ],
  recovery: [
    /(?:metallurgical\s+)?recovery[\s\S]{0,50}[\d]+(?:\.?\d*)\s*%/gi,
    /[\d]+(?:\.?\d*)\s*%[\s\S]{0,30}recovery/gi,
    /(?:overall\s+)?recovery[\s\S]{0,50}[\d]+(?:\.?\d*)\s*%/gi,
    /extraction[\s\S]{0,50}[\d]+(?:\.?\d*)\s*%/gi,
    /[\d]+(?:\.?\d*)\s*%\s+(?:recovery|extraction)/gi
  ],
  resources: [
    /(?:measured\s+(?:and|&)\s+indicated|M&I)[\s\S]{0,50}[\d,]+(?:\.?\d*)\s*(?:Mt|million\s+tonnes?|Moz|million\s+ounces?)/gi,
    /(?:inferred\s+)?resources?[\s\S]{0,50}[\d,]+(?:\.?\d*)\s*(?:Mt|million\s+tonnes?|Moz|million\s+ounces?)/gi,
    /[\d,]+(?:\.?\d*)\s*(?:Mt|million\s+tonnes?|Moz|million\s+ounces?)[\s\S]{0,30}resources?/gi,
    /total\s+resources?[\s\S]{0,50}[\d,]+(?:\.?\d*)\s*(?:Mt|million\s+tonnes?|Moz|million\s+ounces?)/gi
  ],
  projectName: [
    /(?:the\s+)?([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s+(?:Project|Mine|Property|Deposit|Operation)/gi,
    /(?:Project|Mine|Property|Deposit|Operation)[\s:]+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)/gi,
    /(?:technical\s+report\s+(?:on|for)\s+(?:the\s+)?)([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)/gi,
    /([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s+(?:Gold|Copper|Silver|Lithium|Nickel|Uranium)\s+(?:Project|Mine)/gi
  ],
  commodity: [
    /primary\s+commodity[\s:]+(\w+)/gi,
    /(?:gold|Gold|GOLD)\s+(?:project|mine|deposit)/gi,
    /(?:copper|Copper|COPPER)\s+(?:project|mine|deposit)/gi,
    /(?:lithium|Lithium|LITHIUM)\s+(?:project|mine|deposit)/gi,
    /(?:silver|Silver|SILVER)\s+(?:project|mine|deposit)/gi,
    /(?:nickel|Nickel|NICKEL)\s+(?:project|mine|deposit)/gi,
    /(?:uranium|Uranium|URANIUM)\s+(?:project|mine|deposit)/gi
  ]
};

// Extract value from matched string
function extractNumericValue(match, isPercentage = false, isMillions = true) {
  if (!match) return null;

  // Extract numeric part
  const numMatch = match.match(/[\d,]+\.?\d*/);
  if (!numMatch) return null;

  let value = parseFloat(numMatch[0].replace(/,/g, ''));

  // Convert billions to millions if needed
  if (isMillions && /billion|B/i.test(match)) {
    value *= 1000;
  }

  // Handle production units
  if (/oz|ounces?/i.test(match) && /production|throughput/i.test(match)) {
    // Convert ounces to tonnes (rough conversion for gold)
    value = value / 32150;
  }

  return value;
}

// Extract data using regex patterns
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
      .replace(/\s+/g, ' ')
      .trim();

    console.log(`   Document size: ${text.length} characters`);

    // Extract all data points
    const extracted = {};
    let foundCount = 0;
    const totalFields = 12; // Number of data fields we're extracting

    // Financial metrics
    for (const [key, patterns] of Object.entries(EXTRACTION_PATTERNS)) {
      if (key === 'projectName' || key === 'commodity') continue; // Skip non-numeric fields for now

      for (const pattern of patterns) {
        const matches = text.match(pattern);
        if (matches && matches.length > 0) {
          const match = matches[0];
          let value = null;

          if (key === 'irr' || key === 'recovery') {
            value = extractNumericValue(match, true, false);
          } else if (key === 'mineLife' || key === 'payback') {
            value = extractNumericValue(match, false, false);
          } else if (key === 'grade') {
            value = extractNumericValue(match, false, false);
          } else {
            value = extractNumericValue(match);
          }

          if (value !== null && value > 0) {
            extracted[key] = value;
            foundCount++;
            console.log(`   ✓ Found ${key}: ${value}`);
            break;
          }
        }
      }
    }

    // Extract project name
    let projectName = null;
    for (const pattern of EXTRACTION_PATTERNS.projectName) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        projectName = matches[1] || matches[0];
        projectName = projectName.replace(/\s+(?:Project|Mine|Property|Deposit|Operation)$/i, '').trim();
        if (projectName && projectName.length > 2) {
          console.log(`   ✓ Found project name: ${projectName}`);
          break;
        }
      }
    }

    // Extract commodity
    let commodity = 'Gold'; // Default
    const commodityMap = {
      'gold': 'Gold',
      'copper': 'Copper',
      'lithium': 'Lithium',
      'silver': 'Silver',
      'nickel': 'Nickel',
      'uranium': 'Uranium',
      'cobalt': 'Cobalt',
      'zinc': 'Zinc',
      'lead': 'Lead',
      'platinum': 'Platinum'
    };

    for (const [searchTerm, commodityName] of Object.entries(commodityMap)) {
      const regex = new RegExp(searchTerm, 'gi');
      if (regex.test(text)) {
        commodity = commodityName;
        console.log(`   ✓ Found commodity: ${commodity}`);
        break;
      }
    }

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
            1. A clean, professional project name (no long numbers or codes)
            2. A brief 1-2 sentence description of the project

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
            Production: ${extracted.production || 0} tonnes/year`
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
  console.log('🚀 HIGH QUALITY EDGAR PARSER - 100 Projects with Real Data');
  console.log('='.repeat(60));
  console.log('📋 Strategy:');
  console.log('   • Regex extraction for all financial metrics');
  console.log('   • 30% threshold requirement');
  console.log('   • AI only for project names and descriptions');
  console.log('   • Target: 100 high-quality projects');
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
  console.log('🎉 HIGH QUALITY PARSING COMPLETE!');
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