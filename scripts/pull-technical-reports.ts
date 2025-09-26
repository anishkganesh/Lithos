#!/usr/bin/env npx tsx
/**
 * Pull ACTUAL NI 43-101 and S-K 1300 Technical Reports
 * These are the 100+ page documents with financial data
 */

import { config } from 'dotenv';
import { QuoteMediaClient } from '../lib/quotemedia/api-client';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Mining SIC codes for comprehensive search
const MINING_SIC_CODES = {
  // Metal Mining
  '1000': 'Metal Mining',
  '1010': 'Iron Ores',
  '1020': 'Copper Ores',
  '1030': 'Lead and Zinc Ores',
  '1040': 'Gold and Silver Ores',
  '1041': 'Gold Ores',
  '1044': 'Silver Ores',
  '1050': 'Bauxite and Other Aluminum Ores',
  '1060': 'Ferroalloy Ores',
  '1061': 'Ferroalloy Ores, Except Vanadium',
  '1070': 'Mining Services',
  '1080': 'Metal Mining Services',
  '1090': 'Miscellaneous Metal Ores',
  '1094': 'Uranium-Radium-Vanadium Ores',
  '1099': 'Miscellaneous Metal Ores, NEC',

  // Coal Mining
  '1200': 'Coal Mining',
  '1220': 'Bituminous Coal and Lignite Mining',
  '1221': 'Bituminous Coal and Lignite Surface Mining',
  '1222': 'Bituminous Coal Underground Mining',
  '1231': 'Anthracite Mining',
  '1241': 'Coal Mining Services',

  // Nonmetallic Minerals
  '1400': 'Mining and Quarrying of Nonmetallic Minerals',
  '1420': 'Crushed and Broken Stone',
  '1440': 'Sand and Gravel',
  '1450': 'Clay, Ceramic, and Refractory Minerals',
  '1470': 'Chemical and Fertilizer Mineral Mining',
  '1474': 'Potash, Soda, and Borate Minerals',
  '1475': 'Phosphate Rock',
  '1479': 'Chemical and Fertilizer Mineral Mining, NEC'
};

// Commodity keywords for searching
const COMMODITY_KEYWORDS = [
  // Precious Metals
  'gold', 'silver', 'platinum', 'palladium', 'rhodium',

  // Base Metals
  'copper', 'zinc', 'lead', 'nickel', 'tin', 'aluminum', 'bauxite',

  // Battery/Critical Metals
  'lithium', 'cobalt', 'graphite', 'manganese', 'vanadium',
  'rare earth', 'REE', 'neodymium', 'dysprosium', 'praseodymium',

  // Bulk Commodities
  'iron ore', 'coal', 'potash', 'phosphate', 'uranium',

  // Other
  'molybdenum', 'tungsten', 'antimony', 'bismuth', 'titanium',
  'zirconium', 'niobium', 'tantalum', 'beryllium', 'gallium',
  'germanium', 'indium', 'rhenium', 'scandium', 'tellurium'
];

// Technical report form types to search for
const TECHNICAL_REPORT_FORMS = {
  // Canadian NI 43-101 forms
  CANADA: [
    'NI 43-101',
    'NI43-101',
    '43-101',
    'Technical Report',
    'Preliminary Economic Assessment',
    'PEA',
    'Pre-Feasibility Study',
    'PFS',
    'Feasibility Study',
    'FS',
    'Mineral Resource Estimate',
    'Mineral Reserve Estimate',
    'Updated Resource',
    'Resource Update'
  ],

  // US S-K 1300 forms (typically in 10-K, 8-K exhibits)
  US: [
    'Technical Report Summary',
    'TRS',
    'S-K 1300',
    'SK1300',
    'Initial Assessment',
    'Preliminary Feasibility',
    'Definitive Feasibility',
    'Resource Report',
    'Reserve Report',
    'Property Report',
    'Qualified Person',
    'QP Report'
  ]
};

async function pullTechnicalReports() {
  console.log('🔍 PULLING NI 43-101 & S-K 1300 TECHNICAL REPORTS');
  console.log('==================================================\n');

  const password = process.env.QUOTEMEDIA_WEBSERVICE_PASSWORD || 'dfbsembl48';
  const client = new QuoteMediaClient(password);

  // Mining companies known to have technical reports
  const targetCompanies = [
    // Major Gold Producers
    { symbol: 'NEM', name: 'Newmont', commodity: 'gold' },
    { symbol: 'GOLD', name: 'Barrick Gold', commodity: 'gold' },
    { symbol: 'AEM', name: 'Agnico Eagle', commodity: 'gold' },
    { symbol: 'KGC', name: 'Kinross Gold', commodity: 'gold' },
    { symbol: 'AU', name: 'AngloGold Ashanti', commodity: 'gold' },
    { symbol: 'AGI', name: 'Alamos Gold', commodity: 'gold' },
    { symbol: 'EGO', name: 'Eldorado Gold', commodity: 'gold' },

    // Copper Producers
    { symbol: 'FCX', name: 'Freeport-McMoRan', commodity: 'copper' },
    { symbol: 'SCCO', name: 'Southern Copper', commodity: 'copper' },
    { symbol: 'TRQ', name: 'Turquoise Hill', commodity: 'copper' },
    { symbol: 'ERO', name: 'Ero Copper', commodity: 'copper' },

    // Lithium Producers
    { symbol: 'LAC', name: 'Lithium Americas', commodity: 'lithium' },
    { symbol: 'LTHM', name: 'Livent', commodity: 'lithium' },
    { symbol: 'PLL', name: 'Piedmont Lithium', commodity: 'lithium' },
    { symbol: 'SGML', name: 'Sigma Lithium', commodity: 'lithium' },

    // Silver Producers
    { symbol: 'PAAS', name: 'Pan American Silver', commodity: 'silver' },
    { symbol: 'CDE', name: 'Coeur Mining', commodity: 'silver' },
    { symbol: 'HL', name: 'Hecla Mining', commodity: 'silver' },
    { symbol: 'FSM', name: 'Fortuna Silver', commodity: 'silver' },

    // Base Metals
    { symbol: 'TECK', name: 'Teck Resources', commodity: 'copper/zinc' },
    { symbol: 'LUN', name: 'Lundin Mining', commodity: 'copper/zinc' },
    { symbol: 'HBM', name: 'Hudbay Minerals', commodity: 'copper/zinc' },

    // Uranium
    { symbol: 'CCJ', name: 'Cameco', commodity: 'uranium' },
    { symbol: 'DNN', name: 'Denison Mines', commodity: 'uranium' },
    { symbol: 'UEC', name: 'Uranium Energy', commodity: 'uranium' },

    // REE/Critical Minerals
    { symbol: 'MP', name: 'MP Materials', commodity: 'rare_earth' },
    { symbol: 'UUUU', name: 'Energy Fuels', commodity: 'uranium/ree' },
  ];

  let totalReports = 0;
  const technicalReports: any[] = [];

  console.log('📊 Searching for technical reports with financial data...\n');

  // Suppress extra logs
  const originalLog = console.log;
  const suppressLogs = () => { console.log = () => {}; };
  const restoreLogs = () => { console.log = originalLog; };

  for (const company of targetCompanies) {
    process.stdout.write(`Scanning ${company.symbol} (${company.commodity})...`);

    try {
      suppressLogs();
      // Get more historical documents to find technical reports
      const documents = await client.getCompanyFilings({
        symbol: company.symbol,
        limit: 50, // Get last 50 documents to find technical reports
      });
      restoreLogs();

      let foundTechnical = false;

      for (const doc of documents) {
        const desc = (doc.formDescription || '').toLowerCase();
        const formType = doc.formType?.toUpperCase() || '';

        // Check for technical report indicators
        const isTechnicalReport =
          // NI 43-101 indicators
          desc.includes('43-101') ||
          desc.includes('technical report') ||
          desc.includes('feasibility') ||
          desc.includes('economic assessment') ||
          desc.includes('mineral resource') ||
          desc.includes('mineral reserve') ||
          desc.includes('pea') ||
          // S-K 1300 indicators
          desc.includes('technical report summary') ||
          desc.includes('trs') ||
          desc.includes('1300') ||
          desc.includes('qualified person') ||
          // Check if it's a substantial document
          (formType === '10-K' && doc.pages && doc.pages > 100) ||
          (formType === '8-K' && desc.includes('exhibit') && desc.includes('report')) ||
          (formType === '6-K' && desc.includes('technical')) ||
          (formType === '40-F' && doc.pages && doc.pages > 150);

        // Also check file size for large documents
        const fileSize = doc.fileSize || '';
        const isLargeDoc =
          fileSize.includes('MB') ||
          (doc.pages && doc.pages > 100);

        if (isTechnicalReport && isLargeDoc) {
          foundTechnical = true;
          totalReports++;

          const report = {
            symbol: company.symbol,
            company_name: company.name,
            commodity: company.commodity,
            form_type: doc.formType,
            description: doc.formDescription,
            date_filed: doc.dateFiled,
            file_size: fileSize,
            pages: doc.pages,
            pdf_link: doc.pdfLink,
            html_link: doc.htmlLink,
            filing_id: doc.filingId,
            accession: doc.accessionNumber
          };

          technicalReports.push(report);

          // Store in database
          await supabase
            .from('edgar_technical_documents')
            .upsert({
              filing_id: doc.filingId,
              accession_number: doc.accessionNumber,
              symbol: company.symbol,
              company_name: company.name,
              form_type: doc.formType,
              form_description: doc.formDescription,
              form_group: doc.formGroup,
              country: 'US',
              date_filed: doc.dateFiled,
              pdf_link: doc.pdfLink,
              html_link: doc.htmlLink,
              file_size: fileSize,
              page_count: doc.pages,
              is_technical_report: true,
              report_type: determineReportType(desc),
              commodity_types: [company.commodity],
              processing_status: 'identified',
              metadata: {
                commodity: company.commodity,
                is_large_document: true,
                likely_contains_financials: true
              }
            }, {
              onConflict: 'filing_id'
            });

          break; // Found one for this company, move to next
        }
      }

      process.stdout.write(foundTechnical ? ' ✅\n' : ' ❌\n');

    } catch (error) {
      process.stdout.write(' ⚠️\n');
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n📊 TECHNICAL REPORTS FOUND:');
  console.log('===========================\n');

  if (technicalReports.length > 0) {
    // Group by commodity
    const byComm = technicalReports.reduce((acc, r) => {
      if (!acc[r.commodity]) acc[r.commodity] = [];
      acc[r.commodity].push(r);
      return acc;
    }, {} as any);

    for (const [commodity, reports] of Object.entries(byComm)) {
      console.log(`\n🏷️ ${commodity.toUpperCase()} PROJECTS:`);
      console.log('─'.repeat(50));

      for (const report of reports as any[]) {
        console.log(`\n📄 ${report.company_name} (${report.symbol})`);
        console.log(`   Report Type: ${report.form_type} - ${report.description}`);
        console.log(`   Date: ${report.date_filed}`);
        console.log(`   Size: ${report.file_size} | Pages: ${report.pages || 'N/A'}`);
        console.log(`   \n   📥 PDF (Technical Report):`);
        console.log(`   ${report.pdf_link}`);
      }
    }

    console.log('\n\n✅ SUMMARY:');
    console.log('───────────');
    console.log(`Total Technical Reports Found: ${totalReports}`);
    console.log(`Companies with Reports: ${new Set(technicalReports.map(r => r.symbol)).size}`);
    console.log(`Commodities Covered: ${Object.keys(byComm).join(', ')}`);

    console.log('\n💰 These documents contain:');
    console.log('• CAPEX & OPEX estimates');
    console.log('• NPV & IRR calculations');
    console.log('• Resource & Reserve estimates');
    console.log('• Mine life & Production rates');
    console.log('• All-in Sustaining Costs (AISC)');
    console.log('• Payback periods');
    console.log('• Sensitivity analyses');

  } else {
    console.log('No large technical reports found in recent filings.');
    console.log('\nTo find more technical reports:');
    console.log('1. Search deeper history (increase limit)');
    console.log('2. Search by specific form types');
    console.log('3. Look for annual reports (10-K, 20-F, 40-F)');
  }
}

function determineReportType(description: string): string {
  const desc = description.toLowerCase();

  if (desc.includes('43-101')) return 'NI 43-101';
  if (desc.includes('preliminary economic assessment')) return 'PEA';
  if (desc.includes('pre-feasibility')) return 'Pre-Feasibility Study';
  if (desc.includes('feasibility study')) return 'Feasibility Study';
  if (desc.includes('resource estimate')) return 'Resource Estimate';
  if (desc.includes('reserve estimate')) return 'Reserve Estimate';
  if (desc.includes('technical report summary')) return 'S-K 1300 TRS';
  if (desc.includes('initial assessment')) return 'Initial Assessment';

  return 'Technical Report';
}

pullTechnicalReports().catch(console.error);