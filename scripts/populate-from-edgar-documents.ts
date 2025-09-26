#!/usr/bin/env npx tsx
/**
 * Populate quotemedia_links from existing EDGAR documents
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Critical minerals keywords
const CRITICAL_MINERALS = [
  'lithium', 'cobalt', 'nickel', 'graphite', 'manganese',
  'rare earth', 'neodymium', 'dysprosium', 'praseodymium',
  'copper', 'uranium', 'vanadium', 'tin', 'tungsten',
  'tantalum', 'antimony', 'magnesium', 'gallium', 'germanium',
  'indium', 'tellurium', 'platinum', 'palladium', 'rhodium'
];

const FINANCIAL_METRICS = [
  'npv', 'net present value', 'irr', 'internal rate',
  'capex', 'capital expenditure', 'opex', 'operating cost',
  'aisc', 'all-in sustaining', 'mine life', 'production',
  'resource', 'reserve', 'feasibility', 'pea', 'pfs', 'dfs',
  'grade', 'recovery', 'throughput', 'strip ratio'
];

function calculateDocumentScore(doc: any): number {
  let score = 0;
  const text = (doc.description + ' ' + doc.filing_type + ' ' + (doc.title || '')).toLowerCase();

  // Check for critical minerals
  let mineralCount = 0;
  for (const mineral of CRITICAL_MINERALS) {
    if (text.includes(mineral)) {
      mineralCount++;
    }
  }
  score += Math.min(mineralCount * 0.5, 2.5);

  // Check for financial metrics
  let metricCount = 0;
  for (const metric of FINANCIAL_METRICS) {
    if (text.includes(metric)) {
      metricCount++;
    }
  }
  score += Math.min(metricCount * 0.3, 3);

  // Filing type bonus
  if (doc.filing_type === '10-K' || doc.filing_type === '40-F' || doc.filing_type === '20-F') {
    score += 1.5;
  } else if (doc.filing_type === '8-K' || doc.filing_type === '6-K') {
    score += 0.8;
  }

  // Technical report keywords
  if (text.includes('43-101') || text.includes('ni 43-101')) score += 2;
  if (text.includes('sk-1300') || text.includes('sk 1300')) score += 2;
  if (text.includes('jorc')) score += 1.5;
  if (text.includes('technical report')) score += 1.5;
  if (text.includes('mineral')) score += 0.5;

  return Math.min(score, 9.9);
}

async function populateFromEdgarDocuments() {
  console.log('🚀 Populating quotemedia_links from EDGAR documents');
  console.log('='.repeat(60));

  try {
    // Get high-quality EDGAR documents
    const { data: edgarDocs, error } = await supabase
      .from('edgar_documents')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      console.error('Error fetching EDGAR documents:', error);
      return;
    }

    if (!edgarDocs || edgarDocs.length === 0) {
      console.log('No EDGAR documents found');
      return;
    }

    console.log(`Found ${edgarDocs.length} EDGAR documents to analyze\n`);

    let inserted = 0;
    let skipped = 0;

    for (const doc of edgarDocs) {
      const score = calculateDocumentScore(doc);

      // Only insert if score is good enough
      if (score < 2) {
        skipped++;
        continue;
      }

      // Detect financial metrics
      const text = (doc.description + ' ' + doc.filing_type + ' ' + (doc.title || '')).toLowerCase();

      const linkData = {
        symbol: doc.ticker || 'UNKNOWN',
        company_name: doc.company_name || doc.ticker || 'Unknown Company',
        filing_id: `edgar_${doc.accession_number || doc.id}`,
        filing_date: doc.filing_date || doc.created_at,
        form_type: doc.filing_type,
        form_description: doc.description?.substring(0, 500),
        pdf_link: doc.document_url || `https://www.sec.gov/Archives/edgar/data/${doc.cik}/${doc.accession_number?.replace(/-/g, '')}/${doc.accession_number}.pdf`,
        html_link: doc.html_url || null,
        file_size: 1000000, // Default 1MB
        has_capex: text.includes('capex') || text.includes('capital expenditure'),
        has_npv: text.includes('npv') || text.includes('net present value'),
        has_irr: text.includes('irr') || text.includes('internal rate'),
        has_mine_life: text.includes('mine life') || text.includes('life of mine'),
        has_production: text.includes('production') || text.includes('throughput'),
        financial_metrics_count: FINANCIAL_METRICS.filter(m => text.includes(m)).length,
        document_quality_score: score,
        created_at: new Date().toISOString()
      };

      const { error: insertError } = await supabase
        .from('quotemedia_links')
        .upsert(linkData, {
          onConflict: 'filing_id'
        });

      if (insertError) {
        console.error(`Error inserting ${doc.ticker}:`, insertError.message);
      } else {
        inserted++;
        console.log(`✅ ${doc.ticker} - ${doc.filing_type} (Score: ${score.toFixed(1)})`);
      }

      // Stop at 100
      if (inserted >= 80) {
        console.log('\n🎯 Reached 80 additional documents!');
        break;
      }
    }

    // Final count
    const { count } = await supabase
      .from('quotemedia_links')
      .select('*', { count: 'exact', head: true });

    console.log('\n' + '='.repeat(60));
    console.log('🏁 POPULATION COMPLETE!');
    console.log(`📄 Documents Analyzed: ${edgarDocs.length}`);
    console.log(`✅ Documents Inserted: ${inserted}`);
    console.log(`⏭️ Documents Skipped: ${skipped}`);
    console.log(`📊 Total in Database: ${count}`);

    if (count && count >= 100) {
      console.log('\n🎉 SUCCESS: 100+ documents in quotemedia_links table!');
    }

  } catch (error) {
    console.error('Fatal error:', error);
  }
}

populateFromEdgarDocuments().catch(console.error);