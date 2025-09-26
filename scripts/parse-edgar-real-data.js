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

async function extractRealDataFromDocument(doc) {
  try {
    console.log(`\n📄 Parsing document from ${doc.company_name}...`);

    // Fetch the actual document HTML
    const response = await fetch(doc.document_url);
    const html = await response.text();

    // Extract text content, focusing on tables and numeric data
    const text = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim();

    // Use GPT-4 to extract real project data
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a mining industry expert extracting REAL data from technical reports.

          Extract the following information FROM THE TEXT:
          1. Project name(s) - actual project names mentioned
          2. Commodity type(s) - what minerals/metals are being mined
          3. NPV (Net Present Value) - look for "$X million" or "NPV of $X"
          4. IRR (Internal Rate of Return) - look for "X%" or "IRR of X%"
          5. CAPEX (Capital Expenditure) - look for capital costs in millions
          6. Mine Life - look for "X years" mine life
          7. Annual Production - tonnes per year
          8. Grade - ore grade (g/t for gold, % for base metals)
          9. Location - actual location/jurisdiction mentioned

          IMPORTANT RULES:
          - Only extract values that are EXPLICITLY stated in the text
          - If a value is not found, return null for that field
          - Look for tables with financial data
          - Extract actual numbers, not estimates or ranges unless that's all that's available
          - Return a JSON object with the extracted data

          Example output:
          {
            "projects": [
              {
                "project_name": "Actual Project Name",
                "commodity": "Gold",
                "npv_millions": 250.5,
                "irr_percent": 22.3,
                "capex_millions": 180.0,
                "mine_life_years": 12,
                "annual_production": 150000,
                "grade": 1.2,
                "grade_unit": "g/t",
                "location": "Nevada, USA"
              }
            ]
          }`
        },
        {
          role: "user",
          content: `Extract mining project data from this technical report. Here's the text (first 15000 chars):

${text.substring(0, 15000)}`
        }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
      max_tokens: 2000
    });

    const result = JSON.parse(completion.choices[0].message.content);
    console.log(`   ✅ Extracted ${result.projects?.length || 0} projects with real data`);

    return result.projects || [];

  } catch (error) {
    console.error(`   ❌ Error parsing document: ${error.message}`);
    return [];
  }
}

async function testParser() {
  console.log('🔬 TESTING REAL DATA PARSER');
  console.log('=' + '='.repeat(60));

  // Get a few EDGAR documents to test
  console.log('\n📚 Fetching sample EDGAR documents...');
  const { data: documents, error: fetchError } = await supabase
    .from('edgar_technical_documents')
    .select('*')
    .order('filing_date', { ascending: false })
    .limit(5); // Test with 5 documents

  if (fetchError) {
    console.error('Error fetching documents:', fetchError);
    return;
  }

  console.log(`✅ Found ${documents.length} documents to test\n`);

  let totalExtracted = 0;
  const allProjects = [];

  // Parse each document
  for (const doc of documents) {
    const projects = await extractRealDataFromDocument(doc);

    for (const project of projects) {
      // Create a clean project record
      const cleanProject = {
        project_name: project.project_name || `${doc.company_name} Project`,
        company_name: doc.company_name,
        primary_commodity: project.commodity || 'Unknown',

        // Financial metrics - use actual extracted values or 0
        post_tax_npv_usd_m: project.npv_millions || 0,
        irr_percent: project.irr_percent || 0,
        capex_usd_m: project.capex_millions || 0,
        mine_life_years: project.mine_life_years || 0,

        // Production metrics
        annual_production_tonnes: project.annual_production || 0,
        resource_grade: project.grade || 0,
        resource_grade_unit: project.grade_unit || '',

        // Location
        jurisdiction: project.location?.split(',')[0] || 'Unknown',
        country: project.location?.split(',')[1]?.trim() || 'Unknown',

        // Source document
        technical_report_url: doc.document_url,
        technical_report_date: doc.filing_date,

        // Metadata
        data_source: 'SEC EDGAR',
        extraction_confidence: 0.95,
        processing_status: 'completed'
      };

      allProjects.push(cleanProject);
      totalExtracted++;

      // Display extracted data
      console.log(`\n📊 Project: ${cleanProject.project_name}`);
      console.log(`   Company: ${cleanProject.company_name}`);
      console.log(`   Commodity: ${cleanProject.primary_commodity}`);

      if (cleanProject.post_tax_npv_usd_m > 0) {
        console.log(`   💰 NPV: $${cleanProject.post_tax_npv_usd_m}M`);
      }
      if (cleanProject.irr_percent > 0) {
        console.log(`   📈 IRR: ${cleanProject.irr_percent}%`);
      }
      if (cleanProject.capex_usd_m > 0) {
        console.log(`   💵 CAPEX: $${cleanProject.capex_usd_m}M`);
      }
      if (cleanProject.mine_life_years > 0) {
        console.log(`   ⏱️  Mine Life: ${cleanProject.mine_life_years} years`);
      }
      if (cleanProject.annual_production_tonnes > 0) {
        console.log(`   ⚒️  Production: ${cleanProject.annual_production_tonnes.toLocaleString()} tonnes/year`);
      }
      if (cleanProject.resource_grade > 0) {
        console.log(`   🎯 Grade: ${cleanProject.resource_grade} ${cleanProject.resource_grade_unit}`);
      }
      console.log(`   📍 Location: ${cleanProject.jurisdiction}, ${cleanProject.country}`);
      console.log(`   🔗 Source: ${cleanProject.technical_report_url}`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 PARSING TEST RESULTS:');
  console.log(`✅ Total projects extracted: ${totalExtracted}`);
  console.log(`📄 Documents processed: ${documents.length}`);

  // Count projects with real data
  const withNPV = allProjects.filter(p => p.post_tax_npv_usd_m > 0).length;
  const withIRR = allProjects.filter(p => p.irr_percent > 0).length;
  const withCAPEX = allProjects.filter(p => p.capex_usd_m > 0).length;
  const withMineLife = allProjects.filter(p => p.mine_life_years > 0).length;

  console.log(`\n📈 Projects with real data:`);
  console.log(`   NPV values: ${withNPV}`);
  console.log(`   IRR values: ${withIRR}`);
  console.log(`   CAPEX values: ${withCAPEX}`);
  console.log(`   Mine Life values: ${withMineLife}`);

  console.log('\n💡 Note: Many EDGAR documents may not contain detailed financial data.');
  console.log('   Technical reports with full feasibility studies will have more complete data.');
  console.log('='.repeat(60));
}

// Run the test
testParser().catch(console.error);