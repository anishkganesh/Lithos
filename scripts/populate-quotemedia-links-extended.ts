#!/usr/bin/env npx tsx
/**
 * Extended QuoteMedia Links population - targeting 100+ documents
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const QUOTEMEDIA_BASE_URL = 'https://app.quotemedia.com/data';
const WMID = '131706';
const PASSWORD = 'dfbsembl48';

// Extended list of critical minerals companies
const CRITICAL_MINERALS_COMPANIES = [
  // Lithium leaders
  'LAC', 'ALB', 'SQM', 'PLL', 'SGML', 'LTHM', 'LILM', 'ALTAF', 'PMETF', 'CYDVF',
  'OROCF', 'ILHMF', 'SPMTF', 'LTUM', 'LIT', 'ALLIF', 'EEMMF', 'AMLI', 'ARRLF',
  // Cobalt & Nickel majors
  'VALE', 'BHP', 'NILSY', 'GLNCY', 'FTSSF', 'CMCL', 'SHLM', 'LBRMF', 'EDVMF', 'NCMGF',
  'RDSMY', 'MNNGF', 'AACRF', 'LGSUF', 'IGO', 'BNT', 'PNPL', 'WYNNF', 'TMCX',
  // Copper producers
  'FCX', 'SCCO', 'TECK', 'HBM', 'ERO', 'CS', 'FM', 'IVN', 'WRN', 'NCU', 'TRQ', 'TGB',
  'OCANF', 'CPPRQ', 'RCLMF', 'NGLOY', 'AAUKF', 'SOLG', 'TRPRF', 'AZC', 'OTMN',
  // Rare Earth elements
  'MP', 'LYSCF', 'TMRC', 'REEMF', 'ARRNF', 'UURAF', 'AVL', 'GRSM', 'METEF', 'UAMY',
  'ILMN', 'ALKM', 'AVARF', 'VMSRF', 'RARF', 'HNCKF', 'ALKMF', 'UCU', 'ALIMF',
  // Uranium sector
  'CCJ', 'DNN', 'NXE', 'UEC', 'UUUU', 'URG', 'PALAF', 'FCUUF', 'BNNLF', 'GVDNF',
  'UROY', 'GXU', 'URA', 'URNM', 'FORSF', 'ELVUF', 'EU', 'BAMLF', 'MEGUF', 'CVVUF',
  // Precious metals
  'NEM', 'GOLD', 'AEM', 'KGC', 'FNV', 'WPM', 'AG', 'PAAS', 'CDE', 'HL', 'FSM', 'EXK',
  'AGI', 'IAG', 'NGD', 'EGO', 'BTG', 'OR', 'AUY', 'AU', 'NST', 'EVN', 'SBSW',
  // Graphite companies
  'GMEXF', 'PHNMF', 'SYAAF', 'GPHOF', 'ASPNF', 'NOVA', 'NGXXF', 'GVDNF', 'MLNXF',
  'FNLPF', 'CBALF', 'SRA', 'NMGRD', 'VORCY', 'ZENYF', 'MAGE', 'GRPEF', 'APMGF',
  // Vanadium players
  'VNMOF', 'VVNRF', 'LGORF', 'SBMIF', 'VRBFF', 'APHIF', 'TMT', 'PWN', 'ATVVF',
  // Manganese
  'CYDVF', 'TIMRR', 'GDLNF', 'OMH', 'MNGTF', 'MMNDF', 'GMOFF', 'EMN', 'MRAAF',
  // Tin & Tungsten
  'AFMJF', 'MLXEF', 'ITP', 'TIN', 'VMSRF', 'WLBMF', 'TGW', 'CYDVF', 'TTMZF',
  // Zinc & Lead
  'CZNC', 'ZHEMF', 'VEDL', 'ADMLF', 'OZMLF', 'GALMF', 'SVRZF', 'AZMNF', 'ZHRO'
];

const FINANCIAL_TERMS = [
  'capex', 'capital expenditure', 'capital cost',
  'npv', 'net present value', 'post-tax npv', 'pre-tax npv',
  'irr', 'internal rate of return', 'post-tax irr', 'pre-tax irr',
  'mine life', 'project life', 'lom', 'life of mine',
  'annual production', 'production rate', 'throughput', 'capacity',
  'opex', 'operating cost', 'operating expense', 'cash cost',
  'aisc', 'all-in sustaining cost', 'all in sustaining',
  'payback', 'payback period',
  'resource', 'reserve', 'measured', 'indicated', 'inferred',
  'grade', 'ore grade', 'cut-off grade', 'head grade',
  'strip ratio', 'recovery rate', 'metallurgical', 'recovery',
  'feasibility', 'pfs', 'dfs', 'pea', 'preliminary economic',
  'ni 43-101', 'sk-1300', 'jorc', 'mineral resource', 'ore reserve'
];

async function getToken(): Promise<string> {
  const response = await fetch(`${QUOTEMEDIA_BASE_URL}/authenticate.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `webmasterId=${WMID}&webservicePassword=${PASSWORD}`
  });

  const data = await response.json();
  if (!data.token) throw new Error('Failed to get token');
  return data.token;
}

async function fetchCompanyFilings(symbol: string, token: string): Promise<any[]> {
  const url = `${QUOTEMEDIA_BASE_URL}/getCompanyFilings.json?` +
    `webmasterId=${WMID}&token=${token}&symbol=${symbol}&limit=30`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!data.results?.filing) return [];

    return data.results.filing.filter((doc: any) => {
      const type = doc.formType?.toLowerCase() || '';
      const desc = doc.formDescription?.toLowerCase() || '';
      const size = parseInt(doc.fileSize || '0');

      const isRelevantType =
        type.includes('10-k') ||
        type.includes('10-q') ||
        type.includes('20-f') ||
        type.includes('40-f') ||
        type.includes('8-k') ||
        type.includes('6-k') ||
        type.includes('ex-99') ||
        type.includes('def 14') ||
        type.includes('proxy');

      const isRelevantDesc =
        desc.includes('technical') ||
        desc.includes('43-101') ||
        desc.includes('sk-1300') ||
        desc.includes('feasibility') ||
        desc.includes('pea') ||
        desc.includes('pfs') ||
        desc.includes('dfs') ||
        desc.includes('mineral') ||
        desc.includes('resource') ||
        desc.includes('reserve') ||
        desc.includes('metallurgical') ||
        desc.includes('production') ||
        desc.includes('economic');

      // Accept smaller documents with technical keywords
      const isLargeDoc = size > 100000;
      const hasTechKeywords = isRelevantDesc;

      return (isRelevantType || isRelevantDesc) && (isLargeDoc || hasTechKeywords);
    });
  } catch (error) {
    console.error(`  ❌ Error fetching ${symbol}:`, error);
    return [];
  }
}

function analyzeDocument(doc: any): {
  financialMetricsCount: number;
  hasCapex: boolean;
  hasNpv: boolean;
  hasIrr: boolean;
  hasMineLife: boolean;
  hasProduction: boolean;
  documentQualityScore: number
} {
  const text = (doc.formDescription || '').toLowerCase() + ' ' + (doc.formType || '').toLowerCase();

  let metricsFound = 0;
  let hasCapex = false;
  let hasNpv = false;
  let hasIrr = false;
  let hasMineLife = false;
  let hasProduction = false;

  // Enhanced scoring based on document type and keywords
  for (const term of FINANCIAL_TERMS) {
    if (text.includes(term)) {
      metricsFound++;

      if (term.includes('capex') || term.includes('capital')) hasCapex = true;
      if (term.includes('npv')) hasNpv = true;
      if (term.includes('irr')) hasIrr = true;
      if (term.includes('mine life') || term.includes('lom')) hasMineLife = true;
      if (term.includes('production') || term.includes('throughput')) hasProduction = true;
    }
  }

  const size = parseInt(doc.fileSize || '0');
  const sizeScore = Math.min(size / 5000000, 1) * 0.25; // Up to 25% for size
  const metricsScore = Math.min(metricsFound / 5, 1) * 0.25; // Up to 25% for metrics

  // Type score
  let typeScore = 0;
  const desc = doc.formDescription?.toLowerCase() || '';
  if (desc.includes('43-101') || desc.includes('sk-1300')) typeScore = 0.5;
  else if (desc.includes('feasibility') || desc.includes('pea')) typeScore = 0.4;
  else if (desc.includes('technical') || desc.includes('mineral')) typeScore = 0.3;
  else if (doc.formType === '10-K' || doc.formType === '40-F') typeScore = 0.2;
  else typeScore = 0.1;

  const documentQualityScore = Math.min((sizeScore + metricsScore + typeScore) * 10, 9.9);

  return {
    financialMetricsCount: metricsFound,
    hasCapex,
    hasNpv,
    hasIrr,
    hasMineLife,
    hasProduction,
    documentQualityScore
  };
}

async function populateQuoteMediaLinks() {
  console.log('🚀 Extended QuoteMedia Links Population');
  console.log('='.repeat(60));
  console.log('Target: 100+ high-quality technical documents\n');

  const startTime = Date.now();
  let totalDocuments = 0;
  let insertedDocuments = 0;
  let skippedCompanies = 0;

  try {
    console.log('🔑 Getting QuoteMedia token...');
    const token = await getToken();
    console.log('✅ Token acquired\n');

    // Check how many documents we already have
    const { count: existingCount } = await supabase
      .from('quotemedia_links')
      .select('*', { count: 'exact', head: true });

    console.log(`📊 Starting count: ${existingCount} documents\n`);

    for (const symbol of CRITICAL_MINERALS_COMPANIES) {
      // Stop if we have enough documents
      if (insertedDocuments >= 100) {
        console.log('\n🎯 Reached 100+ documents target!');
        break;
      }

      console.log(`📊 Processing ${symbol}...`);

      const filings = await fetchCompanyFilings(symbol, token);

      if (filings.length === 0) {
        skippedCompanies++;
        console.log(`  ⏭️ No relevant documents found`);
        continue;
      }

      console.log(`  📄 Found ${filings.length} technical documents`);

      // Process up to 5 best documents per company
      let companyDocs = 0;
      for (const doc of filings.slice(0, 5)) {
        totalDocuments++;

        const pdfLink = doc.pdfLink || doc.htmlLink || '';
        if (!pdfLink) continue;

        const analysis = analyzeDocument(doc);

        // Lower threshold to get more documents
        if (analysis.financialMetricsCount < 1 && analysis.documentQualityScore < 3) {
          console.log(`  ❌ ${doc.formType} - Low quality (score: ${analysis.documentQualityScore.toFixed(1)})`);
          continue;
        }

        const linkData = {
          symbol: symbol,
          company_name: doc.companyName || symbol,
          filing_id: `${symbol}_${doc.filingDate}_${doc.formType}_${doc.accessionNumber || Math.random()}`,
          filing_date: doc.filingDate,
          form_type: doc.formType,
          form_description: doc.formDescription?.substring(0, 500),
          pdf_link: pdfLink,
          html_link: doc.htmlLink || null,
          file_size: parseInt(doc.fileSize || '0'),
          has_capex: analysis.hasCapex,
          has_npv: analysis.hasNpv,
          has_irr: analysis.hasIrr,
          has_mine_life: analysis.hasMineLife,
          has_production: analysis.hasProduction,
          financial_metrics_count: analysis.financialMetricsCount,
          document_quality_score: analysis.documentQualityScore,
          created_at: new Date().toISOString()
        };

        const { error } = await supabase
          .from('quotemedia_links')
          .upsert(linkData, {
            onConflict: 'filing_id'
          });

        if (error) {
          console.error(`  ❌ Failed to insert: ${error.message}`);
        } else {
          insertedDocuments++;
          companyDocs++;
          console.log(`  ✅ ${doc.formType} - Score: ${analysis.documentQualityScore.toFixed(1)}, Metrics: ${analysis.financialMetricsCount}`);
        }
      }

      if (companyDocs > 0) {
        console.log(`  ✨ Added ${companyDocs} documents from ${symbol}`);
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    }

  } catch (error) {
    console.error('Fatal error:', error);
  }

  // Final statistics
  const { count } = await supabase
    .from('quotemedia_links')
    .select('*', { count: 'exact', head: true });

  const elapsed = Math.round((Date.now() - startTime) / 1000);

  console.log('\n' + '='.repeat(60));
  console.log('🏁 EXTENDED POPULATION COMPLETE!');
  console.log(`⏱️ Time: ${elapsed} seconds`);
  console.log(`📊 Companies Processed: ${CRITICAL_MINERALS_COMPANIES.length - skippedCompanies}`);
  console.log(`⏭️ Companies Skipped: ${skippedCompanies}`);
  console.log(`📄 Documents Analyzed: ${totalDocuments}`);
  console.log(`✅ Documents Inserted: ${insertedDocuments}`);
  console.log(`📊 Total in Database: ${count}`);

  if (count && count >= 100) {
    console.log('\n🎉 SUCCESS: 100+ documents target achieved!');
  }
}

populateQuoteMediaLinks().catch(console.error);