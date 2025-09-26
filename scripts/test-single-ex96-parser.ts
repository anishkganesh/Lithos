#!/usr/bin/env npx tsx
/**
 * Test parser for ONE EX-96.1 document with correct patterns
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://dfxauievbyqwcynwtvib.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmeGF1aWV2Ynlxd2N5bnd0dmliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Nzg0ODI2MSwiZXhwIjoyMDYzNDI0MjYxfQ.Gs2NX-UUKtXvW3a9_h49ATSDzvpsfJdja6tt1bCkyjc'
);

async function testSingleParser() {
  console.log('🔍 TESTING SINGLE EX-96.1 PARSER');
  console.log('='.repeat(70));

  // Get MP Materials document
  const { data: documents } = await supabase
    .from('edgar_technical_documents')
    .select('*')
    .eq('exhibit_number', 'EX-96.1')
    .ilike('company_name', '%MP Materials%')
    .limit(1);

  if (!documents || documents.length === 0) {
    console.log('No document found');
    return;
  }

  const doc = documents[0];
  console.log(`\n📄 Document: ${doc.company_name}`);
  console.log(`🔗 URL: ${doc.document_url}`);

  // Fetch the document
  console.log('\n📥 Fetching document...');
  const response = await fetch(doc.document_url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });

  const html = await response.text();
  console.log(`✅ Downloaded ${html.length} characters`);

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
    .replace(/\s+/g, ' ')
    .trim();

  console.log('\n📊 EXTRACTING FINANCIAL DATA:');
  console.log('='.repeat(70));

  const extracted: any = {};

  // Extract NPV - Look for the specific pattern we found
  console.log('\n🔍 Looking for NPV...');

  // Pattern 1: "After Tax Free Cash Flow US$ (million) X NPV at 6% US$ (million) Y"
  const npvPattern1 = /After\s+Tax\s+Free\s+Cash\s+Flow\s+US\$\s*\([^)]*\)\s*([\d,]+)\s+NPV\s+at\s+\d+%\s+US\$\s*\([^)]*\)\s*([\d,]+)/i;
  const npvMatch1 = text.match(npvPattern1);
  if (npvMatch1) {
    const npvValue = parseFloat(npvMatch1[2].replace(/,/g, ''));
    console.log(`  ✅ Found After-Tax NPV: $${npvValue} million`);
    extracted.post_tax_npv_usd_m = npvValue;
  }

  // Pattern 2: Try simpler pattern
  if (!extracted.post_tax_npv_usd_m) {
    const npvPattern2 = /NPV\s+at\s+\d+%\s+US\$\s*\([^)]*million[^)]*\)\s*([\d,]+)/gi;
    const matches = [...text.matchAll(npvPattern2)];
    if (matches.length > 0) {
      // Look for the after-tax one (usually the second NPV mentioned)
      for (const match of matches) {
        const context = text.substring(Math.max(0, match.index! - 50), match.index!);
        if (context.toLowerCase().includes('after') || context.toLowerCase().includes('tax')) {
          const npvValue = parseFloat(match[1].replace(/,/g, ''));
          console.log(`  ✅ Found After-Tax NPV: $${npvValue} million`);
          extracted.post_tax_npv_usd_m = npvValue;
          break;
        }
      }
    }
  }

  // Extract Mine Life
  console.log('\n🔍 Looking for Mine Life...');
  const mineLifePattern = /mine\s+life[^0-9]*?(\d+)\s*years?/i;
  const mineLifeMatch = text.match(mineLifePattern);
  if (mineLifeMatch) {
    const years = parseFloat(mineLifeMatch[1]);
    console.log(`  ✅ Found Mine Life: ${years} years`);
    extracted.mine_life_years = years;
  }

  // Extract Production (look for REO production)
  console.log('\n🔍 Looking for Annual Production...');
  const productionPattern = /(?:annual|average)\s+(?:REO\s+)?production[^0-9]*?([\d,]+)\s*(?:metric\s+)?(?:tonnes?|tons?|mt)/i;
  const productionMatch = text.match(productionPattern);
  if (productionMatch) {
    const tonnes = parseFloat(productionMatch[1].replace(/,/g, ''));
    console.log(`  ✅ Found Annual Production: ${tonnes} tonnes`);
    extracted.annual_production_tonnes = tonnes;
  }

  // Extract Grade
  console.log('\n🔍 Looking for Grade...');
  const gradePattern = /(?:average\s+)?(?:REO\s+)?grade[^0-9]*?([\d.]+)\s*%/i;
  const gradeMatch = text.match(gradePattern);
  if (gradeMatch) {
    const grade = parseFloat(gradeMatch[1]);
    console.log(`  ✅ Found Grade: ${grade}%`);
    extracted.resource_grade = grade;
    extracted.resource_grade_unit = '%';
  }

  // Extract Total Ore/Resources
  console.log('\n🔍 Looking for Total Resources...');
  const resourcePattern = /(?:total\s+)?(?:mineral\s+)?(?:reserves?|resources?)[^0-9]*?([\d,]+)\s*(?:million\s+)?(?:metric\s+)?(?:tonnes?|tons?|mt)/i;
  const resourceMatch = text.match(resourcePattern);
  if (resourceMatch) {
    let tonnes = parseFloat(resourceMatch[1].replace(/,/g, ''));
    if (resourceMatch[0].toLowerCase().includes('million')) {
      tonnes = tonnes * 1000000;
    }
    console.log(`  ✅ Found Total Resources: ${tonnes} tonnes`);
    extracted.total_resource_tonnes = tonnes;
  }

  // Look for Capital Cost info
  console.log('\n🔍 Looking for Capital Costs...');
  const capexPattern = /(?:sustaining\s+)?capital[^0-9]*?\$?([\d,]+)\s*million/i;
  const capexMatch = text.match(capexPattern);
  if (capexMatch) {
    const capex = parseFloat(capexMatch[1].replace(/,/g, ''));
    console.log(`  ✅ Found Capital: $${capex} million`);
    extracted.capex_usd_m = capex;
  }

  // If it's an existing mine, there might be no initial capex
  if (!extracted.capex_usd_m && text.includes('no initial capital')) {
    console.log(`  ℹ️ Note: Existing mine - no initial capital required`);
    extracted.capex_usd_m = 0;
  }

  console.log('\n' + '='.repeat(70));
  console.log('📋 EXTRACTED VALUES:');
  console.log(JSON.stringify(extracted, null, 2));

  // Now save to database if we have data
  if (Object.keys(extracted).length > 0) {
    const projectData = {
      project_name: 'Mountain Pass Mine',
      company_name: doc.company_name,
      country: 'USA',
      jurisdiction: 'California',
      primary_commodity: 'Rare Earths',
      stage: 'Production',
      capex_usd_m: extracted.capex_usd_m || null,
      post_tax_npv_usd_m: extracted.post_tax_npv_usd_m || null,
      irr_percent: null, // Not relevant for existing mine
      mine_life_years: extracted.mine_life_years || null,
      annual_production_tonnes: extracted.annual_production_tonnes || null,
      resource_grade: extracted.resource_grade || null,
      resource_grade_unit: extracted.resource_grade_unit || null,
      technical_report_url: doc.document_url,
      technical_report_date: doc.filing_date,
      data_source: 'EDGAR_EX96',
      extraction_confidence: 9.0,
      processing_status: 'completed',
      project_description: 'Only operating rare earth mine in the United States',
      last_scraped_at: new Date().toISOString()
    };

    console.log('\n💾 SAVING TO DATABASE:');
    console.log(JSON.stringify(projectData, null, 2));

    const { error } = await supabase
      .from('projects')
      .upsert(projectData, {
        onConflict: 'project_name,company_name',
        ignoreDuplicates: false
      });

    if (error) {
      console.error('❌ Database error:', error);
    } else {
      console.log('✅ Successfully saved to database!');
    }
  }
}

testSingleParser().catch(console.error);