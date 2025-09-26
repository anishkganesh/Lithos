#!/usr/bin/env npx tsx
/**
 * Parse EX-96.1 technical reports with fixed database precision handling
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Financial terms regex patterns
const FINANCIAL_PATTERNS = {
  capex: /(?:capital\s+cost|capex|initial\s+capital|capital\s+expenditure)[^\d]*?([\d,]+(?:\.\d+)?)\s*(?:million|M|\$M)/gi,
  npvPostTax: /(?:post[\s-]?tax\s+NPV|after[\s-]?tax\s+NPV|NPV[\s\w]*?after[\s-]?tax)[^\d]*?\$?([\d,]+(?:\.\d+)?)\s*(?:million|M|\$M)/gi,
  irr: /(?:IRR|internal\s+rate\s+of\s+return)[^\d]*?([\d,]+(?:\.\d+)?)\s*%/gi,
  mineLife: /(?:mine\s+life|life\s+of\s+mine|LOM)[^\d]*?([\d,]+(?:\.\d+)?)\s*(?:years?|yr)/gi,
  production: /(?:annual\s+production|production\s+rate|yearly\s+production)[^\d]*?([\d,]+(?:\.\d+)?)\s*(?:tonnes?|tons?|mt|kt|Mlbs?|klbs?|oz|koz|Moz)/gi,
};

async function fetchDocumentContent(url: string): Promise<string | null> {
  try {
    console.log(`  📄 Fetching: ${url.substring(0, 80)}...`);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MiningDataExtractor/1.0)'
      }
    });

    if (!response.ok) {
      console.log(`  ❌ Failed to fetch: ${response.status}`);
      return null;
    }

    const html = await response.text();

    // Remove HTML tags and excessive whitespace
    const text = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&[^;]+;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return text;
  } catch (error) {
    console.error(`  ❌ Error fetching document:`, error);
    return null;
  }
}

function extractWithRegex(text: string) {
  const extracted: any = {};

  // Extract values using regex patterns
  for (const [key, pattern] of Object.entries(FINANCIAL_PATTERNS)) {
    const matches = [...text.matchAll(pattern)];
    if (matches.length > 0) {
      const value = parseFloat(matches[0][1].replace(/,/g, ''));

      switch(key) {
        case 'capex':
          extracted.capex_usd_m = value;
          break;
        case 'npvPostTax':
          extracted.post_tax_npv_usd_m = value;
          break;
        case 'irr':
          // Cap IRR at 99.99% to fit database precision
          extracted.irr_percent = Math.min(value, 99.99);
          break;
        case 'mineLife':
          extracted.mine_life_years = value;
          break;
        case 'production':
          extracted.annual_production_tonnes = value;
          break;
      }
    }
  }

  return extracted;
}

async function processDocument(doc: any): Promise<void> {
  console.log(`\n📊 Processing: ${doc.company_name} - ${doc.form_type}`);

  // Fetch document content
  const content = await fetchDocumentContent(doc.document_url);
  if (!content) {
    console.log('  ⚠️ Could not fetch content, skipping...');
    return;
  }

  console.log(`  📏 Document length: ${content.length} chars`);

  // Extract with regex
  console.log('  🔍 Extracting financial data...');
  const regexData = extractWithRegex(content);

  // Check if we have meaningful data
  const hasData = regexData.capex_usd_m || regexData.post_tax_npv_usd_m ||
                  regexData.irr_percent || regexData.mine_life_years;

  if (!hasData) {
    console.log('  ⚠️ No financial data extracted, skipping...');
    return;
  }

  const projectName = `${doc.company_name} - ${doc.project_names?.[0] || doc.form_type}`;

  console.log('  ✅ Extracted data:', {
    project: projectName,
    capex: regexData.capex_usd_m,
    npv: regexData.post_tax_npv_usd_m,
    irr: regexData.irr_percent,
    mineLife: regexData.mine_life_years
  });

  // Upsert to projects table
  const { error } = await supabase
    .from('projects')
    .upsert({
      project_name: projectName,
      company_name: doc.company_name,
      primary_commodity: doc.primary_commodity?.toLowerCase(),
      capex_usd_m: regexData.capex_usd_m,
      post_tax_npv_usd_m: regexData.post_tax_npv_usd_m,
      irr_percent: regexData.irr_percent,
      mine_life_years: regexData.mine_life_years,
      annual_production_tonnes: regexData.annual_production_tonnes,
      technical_report_url: doc.document_url,
      technical_report_date: doc.filing_date,
      data_source: 'EDGAR_EX96',
      extraction_confidence: 75,
      processing_status: 'completed',
      last_scraped_at: new Date().toISOString()
    }, {
      onConflict: 'project_name,company_name',
      ignoreDuplicates: false
    })
    .select();

  if (error) {
    console.error('  ❌ Database error:', error.message);
  } else {
    console.log('  ✅ Saved to database');
  }
}

async function main() {
  console.log('🚀 PARSING EX-96.1 TECHNICAL REPORTS (FIXED)');
  console.log('='.repeat(70));

  try {
    // Fetch EX-96.1 documents from edgar_technical_documents
    console.log('\n📚 Fetching EX-96.1 documents...');
    const { data: documents, error } = await supabase
      .from('edgar_technical_documents')
      .select('*')
      .eq('exhibit_number', 'EX-96.1')
      .order('filing_date', { ascending: false })
      .limit(20); // Process first 20 for demonstration

    if (error) {
      console.error('❌ Database error:', error);
      return;
    }

    console.log(`✅ Found ${documents?.length || 0} EX-96.1 documents`);

    if (!documents || documents.length === 0) {
      console.log('⚠️ No documents to process');
      return;
    }

    // Process documents sequentially
    let successCount = 0;
    for (const doc of documents) {
      await processDocument(doc);
      successCount++;

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n' + '='.repeat(70));
    console.log(`✅ EXTRACTION COMPLETE! Processed ${successCount} documents`);

    // Show summary of what was added
    console.log('\n📊 Verifying data in projects table...');
    const { data: projects, error: queryError } = await supabase
      .from('projects')
      .select('project_name, company_name, capex_usd_m, irr_percent')
      .eq('data_source', 'EDGAR_EX96')
      .limit(10);

    if (!queryError && projects && projects.length > 0) {
      console.log(`\n✅ Successfully added ${projects.length} projects to database:`);
      projects.forEach((p, i) => {
        console.log(`${i + 1}. ${p.project_name}`);
        if (p.capex_usd_m) console.log(`   CAPEX: $${p.capex_usd_m}M`);
        if (p.irr_percent) console.log(`   IRR: ${p.irr_percent}%`);
      });
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Execute
main().catch(console.error);