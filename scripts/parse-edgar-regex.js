#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Extract numbers with units from text
function extractValue(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      // Extract the numeric value
      const numStr = match[0].replace(/[^\d.-]/g, '');
      const value = parseFloat(numStr);
      if (!isNaN(value)) {
        return value;
      }
    }
  }
  return null;
}

async function extractDataWithRegex(doc) {
  try {
    console.log(`\n📄 Parsing document from ${doc.company_name}...`);

    // Fetch the actual document HTML
    const response = await fetch(doc.document_url);
    const html = await response.text();

    // Extract text content
    const text = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim();

    // Define patterns for extracting financial data
    const patterns = {
      npv: [
        /NPV[\s\S]{0,20}\$[\d,]+\.?\d*\s*[mM]illion/gi,
        /Net\s+Present\s+Value[\s\S]{0,20}\$[\d,]+\.?\d*\s*[mM]/gi,
        /NPV\s*[:=]\s*\$[\d,]+\.?\d*/gi,
        /\$[\d,]+\.?\d*\s*[mM]illion\s*NPV/gi,
        /NPV\s+of\s+\$[\d,]+\.?\d*\s*[mM]/gi
      ],
      irr: [
        /IRR[\s\S]{0,20}[\d]+\.?\d*\s*%/gi,
        /Internal\s+Rate\s+of\s+Return[\s\S]{0,20}[\d]+\.?\d*\s*%/gi,
        /IRR\s*[:=]\s*[\d]+\.?\d*\s*%/gi,
        /[\d]+\.?\d*\s*%\s*IRR/gi
      ],
      capex: [
        /CAPEX[\s\S]{0,20}\$[\d,]+\.?\d*\s*[mM]illion/gi,
        /Capital\s+[cC]ost[\s\S]{0,20}\$[\d,]+\.?\d*\s*[mM]/gi,
        /Initial\s+Capital[\s\S]{0,20}\$[\d,]+\.?\d*\s*[mM]/gi,
        /CAPEX\s*[:=]\s*\$[\d,]+\.?\d*/gi
      ],
      mineLife: [
        /[mM]ine\s+[lL]ife[\s\S]{0,20}[\d]+\.?\d*\s*years/gi,
        /[\d]+\.?\d*\s*year\s+mine\s+life/gi,
        /[lL]ife\s+of\s+[mM]ine[\s\S]{0,20}[\d]+\.?\d*\s*years/gi,
        /LOM[\s\S]{0,10}[\d]+\.?\d*\s*years/gi
      ],
      production: [
        /[\d,]+\.?\d*\s*tonnes?\s*per\s*year/gi,
        /[\d,]+\.?\d*\s*tpa/gi,
        /annual\s+production[\s\S]{0,20}[\d,]+\.?\d*\s*tonnes/gi,
        /[\d,]+\.?\d*\s*oz\s*per\s*year/gi,
        /[\d,]+\.?\d*\s*ounces\s*per\s*year/gi
      ],
      grade: [
        /[\d]+\.?\d*\s*g\/t\s+[gG]old/gi,
        /[\d]+\.?\d*\s*%\s+[cC]opper/gi,
        /[\d]+\.?\d*\s*%\s+[nN]ickel/gi,
        /[gG]rade[\s\S]{0,10}[\d]+\.?\d*\s*g\/t/gi,
        /[gG]rade[\s\S]{0,10}[\d]+\.?\d*\s*%/gi
      ]
    };

    const extractedData = {
      npv: null,
      irr: null,
      capex: null,
      mineLife: null,
      production: null,
      grade: null
    };

    // Search for each type of data
    for (const [key, patternList] of Object.entries(patterns)) {
      for (const pattern of patternList) {
        const matches = text.match(pattern);
        if (matches && matches.length > 0) {
          // Extract numeric value from the match
          const match = matches[0];
          console.log(`   Found ${key}: ${match}`);

          if (key === 'npv' || key === 'capex') {
            // Extract millions value
            const numMatch = match.match(/[\d,]+\.?\d*/);
            if (numMatch) {
              const value = parseFloat(numMatch[0].replace(/,/g, ''));
              extractedData[key] = value;
              break;
            }
          } else if (key === 'irr') {
            // Extract percentage
            const numMatch = match.match(/[\d]+\.?\d*/);
            if (numMatch) {
              extractedData[key] = parseFloat(numMatch[0]);
              break;
            }
          } else if (key === 'mineLife') {
            // Extract years
            const numMatch = match.match(/[\d]+\.?\d*/);
            if (numMatch) {
              extractedData[key] = parseFloat(numMatch[0]);
              break;
            }
          } else if (key === 'production') {
            // Extract tonnes/ounces
            const numMatch = match.match(/[\d,]+\.?\d*/);
            if (numMatch) {
              const value = parseFloat(numMatch[0].replace(/,/g, ''));
              // Convert ounces to tonnes if needed (rough conversion for gold)
              if (match.toLowerCase().includes('oz') || match.toLowerCase().includes('ounce')) {
                extractedData[key] = Math.round(value / 32150); // oz to tonnes for gold
              } else {
                extractedData[key] = value;
              }
              break;
            }
          } else if (key === 'grade') {
            const numMatch = match.match(/[\d]+\.?\d*/);
            if (numMatch) {
              extractedData[key] = parseFloat(numMatch[0]);
              break;
            }
          }
        }
      }
    }

    // Look for project names
    const projectNamePatterns = [
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:Project|Mine|Property|Deposit)/g,
      /(?:Project|Mine|Property):\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g
    ];

    let projectName = null;
    for (const pattern of projectNamePatterns) {
      const match = text.match(pattern);
      if (match) {
        projectName = match[1] || match[0];
        projectName = projectName.replace(/\s+(?:Project|Mine|Property|Deposit)$/i, '').trim();
        break;
      }
    }

    // Look for commodity type
    const commodityPatterns = [
      /(?:gold|Gold|GOLD)/,
      /(?:copper|Copper|COPPER)/,
      /(?:lithium|Lithium|LITHIUM)/,
      /(?:silver|Silver|SILVER)/,
      /(?:nickel|Nickel|NICKEL)/,
      /(?:uranium|Uranium|URANIUM)/,
      /(?:cobalt|Cobalt|COBALT)/
    ];

    let commodity = 'Unknown';
    for (const pattern of commodityPatterns) {
      if (pattern.test(text)) {
        commodity = pattern.source.split('|')[1] || pattern.source.split('|')[0];
        commodity = commodity.charAt(0).toUpperCase() + commodity.slice(1).toLowerCase();
        break;
      }
    }

    console.log(`   ✅ Extracted data for ${projectName || doc.company_name}`);

    return {
      project_name: projectName || `${doc.company_name} Project`,
      commodity: commodity,
      npv: extractedData.npv,
      irr: extractedData.irr,
      capex: extractedData.capex,
      mineLife: extractedData.mineLife,
      production: extractedData.production,
      grade: extractedData.grade
    };

  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function testRegexParser() {
  console.log('🔬 TESTING REGEX DATA PARSER (No API Required)');
  console.log('=' + '='.repeat(60));

  // Get EDGAR documents to test
  console.log('\n📚 Fetching EDGAR documents...');
  const { data: documents, error: fetchError } = await supabase
    .from('edgar_technical_documents')
    .select('*')
    .order('filing_date', { ascending: false })
    .limit(10); // Test with 10 documents

  if (fetchError) {
    console.error('Error fetching documents:', fetchError);
    return;
  }

  console.log(`✅ Found ${documents.length} documents to test\n`);

  const projectsWithData = [];
  let successCount = 0;

  // Parse each document
  for (const doc of documents) {
    const data = await extractDataWithRegex(doc);

    if (data) {
      const hasRealData = data.npv || data.irr || data.capex || data.mineLife;

      const project = {
        project_name: data.project_name,
        company_name: doc.company_name,
        primary_commodity: data.commodity,
        post_tax_npv_usd_m: data.npv || 0,
        irr_percent: data.irr || 0,
        capex_usd_m: data.capex || 0,
        mine_life_years: data.mineLife || 0,
        annual_production_tonnes: data.production || 0,
        resource_grade: data.grade || 0,
        technical_report_url: doc.document_url,
        has_real_data: hasRealData
      };

      projectsWithData.push(project);

      if (hasRealData) {
        successCount++;
        console.log(`\n   📊 EXTRACTED REAL DATA:`);
        if (data.npv) console.log(`      NPV: $${data.npv}M`);
        if (data.irr) console.log(`      IRR: ${data.irr}%`);
        if (data.capex) console.log(`      CAPEX: $${data.capex}M`);
        if (data.mineLife) console.log(`      Mine Life: ${data.mineLife} years`);
        if (data.production) console.log(`      Production: ${data.production} tonnes/year`);
        if (data.grade) console.log(`      Grade: ${data.grade}`);
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 PARSING RESULTS:');
  console.log(`✅ Documents processed: ${documents.length}`);
  console.log(`📈 Documents with financial data: ${successCount}`);

  const withNPV = projectsWithData.filter(p => p.post_tax_npv_usd_m > 0).length;
  const withIRR = projectsWithData.filter(p => p.irr_percent > 0).length;
  const withCAPEX = projectsWithData.filter(p => p.capex_usd_m > 0).length;

  console.log(`\n📊 Data extraction summary:`);
  console.log(`   NPV values found: ${withNPV}`);
  console.log(`   IRR values found: ${withIRR}`);
  console.log(`   CAPEX values found: ${withCAPEX}`);

  if (successCount === 0) {
    console.log('\n⚠️  No financial data found in these documents.');
    console.log('   This might be because:');
    console.log('   1. Documents are announcements/news rather than technical reports');
    console.log('   2. Financial data is in tables/images that need different parsing');
    console.log('   3. Documents use different terminology than our patterns');
  }

  console.log('='.repeat(60));
}

// Run the test
testRegexParser().catch(console.error);