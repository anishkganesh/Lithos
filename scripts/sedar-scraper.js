#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const https = require('https');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// QuoteMedia API Configuration
const QUOTEMEDIA_BASE_URL = 'https://app.quotemedia.com/data';
const WEBMASTER_ID = '131706'; // Your webmaster ID
const QUOTEMEDIA_AUTH = {
  username: 'qmediaguest@gmail.com',
  password: 'welcome'
};

// Canadian mining companies (TSX and TSX-V listed)
const CANADIAN_MINING_SYMBOLS = [
  // Major Canadian miners
  'ABX', 'AEM', 'K', 'IMG', 'YRI', 'EDV', 'WDO', 'LUG', 'DPM', 'NGT',
  'AR', 'SVM', 'MAG', 'EQX', 'SSRM', 'CXB', 'BTO', 'FR', 'AGI', 'MND',

  // Mid-tier miners
  'TXG', 'OGC', 'NGD', 'AUMN', 'SEA', 'OSK', 'TMR', 'MOZ', 'LUC', 'GCM',
  'ORE', 'SMF', 'PRG', 'CG', 'ARG', 'USA', 'AMM', 'TML', 'AOT', 'EDM',

  // Lithium & Battery Metals
  'LAC', 'FL', 'CRE', 'LI', 'PE', 'AVL', 'RCK', 'SLI', 'PWM', 'TTX',

  // Copper
  'CS', 'NCU', 'MIN', 'CUM', 'DNT', 'VMS', 'NOM', 'CUU', 'WRN', 'NPK',

  // Nickel & Cobalt
  'NCP', 'FPX', 'NIM', 'CNX', 'CNC', 'GIGA', 'TSO', 'SPC', 'NICO', 'CCW',

  // Uranium
  'CCO', 'DML', 'NXE', 'FCU', 'GLO', 'UEX', 'FMC', 'SYH', 'PTU', 'AAZ',

  // Rare Earths
  'UCU', 'AVL', 'MDL', 'RES', 'CCD', 'REE', 'VML', 'DEFN', 'SMY', 'MRT'
];

// NI 43-101 related form descriptions to look for
const TECHNICAL_REPORT_KEYWORDS = [
  'NI 43-101',
  'Technical Report',
  'Mineral Resource',
  'Mineral Reserve',
  'Preliminary Economic Assessment',
  'PEA',
  'Feasibility Study',
  'Pre-Feasibility',
  'Resource Estimate',
  'Reserve Estimate',
  'Metallurgical',
  'Mining Study'
];

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${QUOTEMEDIA_AUTH.username}:${QUOTEMEDIA_AUTH.password}`).toString('base64');

    https.get(url, {
      headers: {
        'Authorization': `Basic ${auth}`
      }
    }, (response) => {
      let data = '';

      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

async function fetchCompanyFilings(symbol) {
  const url = `${QUOTEMEDIA_BASE_URL}/getCompanyFilings.json?symbol=${symbol}&country=CA&limit=250&webmasterId=${WEBMASTER_ID}&lang=en`;

  try {
    const response = await makeRequest(url);
    return response;
  } catch (error) {
    console.error(`Error fetching filings for ${symbol}:`, error.message);
    return null;
  }
}

function isTechnicalReport(filing) {
  const formDesc = filing.formdescription || '';
  const formType = filing.formtype || '';

  // Check if it's a technical report
  return TECHNICAL_REPORT_KEYWORDS.some(keyword =>
    formDesc.toLowerCase().includes(keyword.toLowerCase()) ||
    formType.toLowerCase().includes(keyword.toLowerCase())
  );
}

async function scrapeSedarDocuments() {
  console.log('🚀 SEDAR NI 43-101 TECHNICAL DOCUMENTATION SCRAPER');
  console.log('=' + '='.repeat(60));
  console.log(`📋 Scanning ${CANADIAN_MINING_SYMBOLS.length} Canadian mining companies`);
  console.log('=' + '='.repeat(60));

  const technicalReports = [];
  let processedCompanies = 0;

  for (const symbol of CANADIAN_MINING_SYMBOLS) {
    processedCompanies++;
    console.log(`\n[${processedCompanies}/${CANADIAN_MINING_SYMBOLS.length}] Fetching filings for ${symbol}...`);

    const response = await fetchCompanyFilings(symbol);

    if (!response || !response.results || !response.results.filings) {
      console.log(`   ⚠️  No filings found for ${symbol}`);
      continue;
    }

    const filings = response.results.filings;
    const companyName = filings.equityinfo?.longname || symbol;
    const filingsArray = Array.isArray(filings.filing) ? filings.filing : [filings.filing].filter(Boolean);

    let technicalReportsFound = 0;

    for (const filing of filingsArray) {
      if (isTechnicalReport(filing)) {
        technicalReportsFound++;

        const report = {
          company_name: companyName,
          ticker: symbol,
          exchange: 'TSX',
          form_type: filing.formtype,
          form_description: filing.formdescription,
          filing_date: filing.datefiled,
          document_url: filing.pdflink || filing.htmllink,
          pages: parseInt(filing.pages) || 0,
          source: 'SEDAR'
        };

        technicalReports.push(report);

        console.log(`   ✅ Found NI 43-101: ${filing.formdescription}`);
        console.log(`      Date: ${filing.datefiled}`);
        console.log(`      Pages: ${filing.pages}`);
      }
    }

    if (technicalReportsFound > 0) {
      console.log(`   📊 Found ${technicalReportsFound} technical reports for ${symbol}`);
    } else {
      console.log(`   ⚠️  No technical reports found for ${symbol}`);
    }

    // Rate limiting - be respectful to the API
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n' + '='.repeat(60));
  console.log(`📊 SUMMARY: Found ${technicalReports.length} NI 43-101 technical reports`);
  console.log('='.repeat(60));

  if (technicalReports.length > 0) {
    console.log('\n📝 Sample of discovered technical reports:\n');

    // Show first 10 reports
    technicalReports.slice(0, 10).forEach((report, index) => {
      console.log(`${index + 1}. ${report.company_name} (${report.ticker})`);
      console.log(`   Report: ${report.form_description}`);
      console.log(`   Date: ${report.filing_date}`);
      console.log(`   URL: ${report.document_url}\n`);
    });

    // Now populate the database
    console.log('=' + '='.repeat(60));
    console.log('💾 POPULATING SUPABASE DATABASE');
    console.log('=' + '='.repeat(60));

    let inserted = 0;
    let duplicates = 0;

    for (const report of technicalReports) {
      // Check if document already exists
      const { data: existing } = await supabase
        .from('edgar_technical_documents')
        .select('id')
        .eq('document_url', report.document_url)
        .single();

      if (existing) {
        duplicates++;
        continue;
      }

      // Insert new document
      const { error } = await supabase
        .from('edgar_technical_documents')
        .insert({
          company_name: report.company_name,
          ticker: report.ticker,
          exchange: report.exchange,
          form_type: report.form_type,
          form_description: report.form_description,
          filing_date: report.filing_date,
          document_url: report.document_url,
          source: report.source
        });

      if (!error) {
        inserted++;
        if (inserted % 10 === 0) {
          console.log(`   ✅ Inserted ${inserted} documents...`);
        }
      } else {
        console.error(`   ❌ Error inserting ${report.ticker}:`, error.message);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ COMPLETE!`);
    console.log(`   📊 Total technical reports found: ${technicalReports.length}`);
    console.log(`   ✅ Successfully inserted: ${inserted}`);
    console.log(`   ⚠️  Duplicates skipped: ${duplicates}`);
    console.log('='.repeat(60));
  }
}

// Run the scraper
scrapeSedarDocuments().catch(console.error);