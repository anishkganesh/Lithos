#!/usr/bin/env node

const https = require('https');

// QuoteMedia API Configuration
const QUOTEMEDIA_BASE_URL = 'app.quotemedia.com';
const WEBMASTER_ID = '131706';

// US Mining companies
const US_MINING_SYMBOLS = [
  // Major US miners
  'NEM', 'FCX', 'GOLD', 'RGLD', 'HBM', 'CDE', 'HL', 'PAAS', 'WPM',

  // Lithium and battery metals
  'LAC', 'ALB', 'LTHM', 'PLL', 'MP', 'ABML', 'AMBL',

  // Copper companies
  'SCCO', 'TGB', 'TRQ', 'CPPMF',

  // Gold miners
  'AUY', 'KGC', 'AU', 'AGI', 'BTG', 'IAG', 'EGO', 'SBSW', 'SA',

  // Silver miners
  'AG', 'EXK', 'FSM', 'MAG', 'SILV', 'USAS',

  // Small/Mid cap miners
  'GSS', 'MUX', 'GPL', 'AKG', 'GATO', 'GORO', 'DRD'
];

// Technical report form types to look for
const TECHNICAL_FORM_TYPES = ['SK-1300', 'S-K 1300', '10-K', '10-Q', '8-K', 'EX-96.1', 'EX-96.2', 'EX-96.3'];

function makeRequest(symbol) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: QUOTEMEDIA_BASE_URL,
      path: `/data/getCompanyFilings.json?symbol=${symbol}&limit=50&webmasterId=${WEBMASTER_ID}`,
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    };

    https.get(options, (response) => {
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

function isTechnicalDocument(filing) {
  const formType = filing.formtype || '';
  const formDesc = filing.formdescription || '';

  // Check if it contains technical report keywords
  const technicalKeywords = [
    'technical report', 'mineral resource', 'mineral reserve',
    'feasibility', 'mining operations', 'resource estimate',
    'SK-1300', 'EX-96', 'property report'
  ];

  const hasKeyword = technicalKeywords.some(keyword =>
    formDesc.toLowerCase().includes(keyword) ||
    formType.toLowerCase().includes(keyword.toLowerCase())
  );

  // Check if it's a specific technical form type
  const isTechnicalForm = TECHNICAL_FORM_TYPES.some(type =>
    formType.toUpperCase().includes(type.toUpperCase())
  );

  return hasKeyword || isTechnicalForm;
}

async function fetchSECDocuments() {
  console.log('🚀 SEC EDGAR DOCUMENT FETCHER (via QuoteMedia API)');
  console.log('=' + '='.repeat(60));
  console.log(`📋 Scanning ${US_MINING_SYMBOLS.length} US mining companies`);
  console.log('=' + '='.repeat(60));

  const allDocuments = [];
  let processedCompanies = 0;
  let totalDocuments = 0;

  for (const symbol of US_MINING_SYMBOLS) {
    processedCompanies++;
    console.log(`\n[${processedCompanies}/${US_MINING_SYMBOLS.length}] Fetching filings for ${symbol}...`);

    try {
      const response = await makeRequest(symbol);

      if (!response || !response.results || !response.results.filings) {
        console.log(`   ⚠️  No filings found for ${symbol}`);
        continue;
      }

      const filings = response.results.filings;
      const companyName = filings.equityinfo?.longname || symbol;
      const filingsArray = Array.isArray(filings.filing) ? filings.filing : [filings.filing].filter(Boolean);

      console.log(`   📄 Found ${filingsArray.length} total filings`);

      // Filter for technical documents
      const technicalDocs = [];

      for (const filing of filingsArray) {
        // Check if it's a technical document or contains exhibits
        if (isTechnicalDocument(filing) || filing.formtype?.includes('EX-')) {
          const doc = {
            company: companyName,
            symbol: symbol,
            formType: filing.formtype,
            description: filing.formdescription,
            dateFiled: filing.datefiled,
            pages: filing.pages,
            htmlLink: filing.htmllink,
            pdfLink: filing.pdflink
          };

          technicalDocs.push(doc);
          allDocuments.push(doc);
          totalDocuments++;
        }
      }

      if (technicalDocs.length > 0) {
        console.log(`   ✅ Found ${technicalDocs.length} technical documents:`);

        // Show first 3 technical docs for this company
        technicalDocs.slice(0, 3).forEach(doc => {
          console.log(`      📎 ${doc.formType}: ${doc.description}`);
          console.log(`         Date: ${doc.dateFiled} | Pages: ${doc.pages}`);
          console.log(`         PDF: ${doc.pdfLink}`);
        });
      } else {
        console.log(`   ⚠️  No technical documents found`);
      }

    } catch (error) {
      console.log(`   ❌ Error fetching ${symbol}: ${error.message}`);
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log('\n' + '='.repeat(60));
  console.log(`📊 SUMMARY`);
  console.log('=' + '='.repeat(60));
  console.log(`✅ Companies scanned: ${processedCompanies}`);
  console.log(`📄 Total technical documents found: ${totalDocuments}`);

  if (allDocuments.length > 0) {
    console.log('\n🔗 SAMPLE TECHNICAL REPORT LINKS:');
    console.log('=' + '='.repeat(60));

    // Show up to 20 document links
    const samplesToShow = Math.min(20, allDocuments.length);

    for (let i = 0; i < samplesToShow; i++) {
      const doc = allDocuments[i];
      console.log(`\n${i + 1}. ${doc.company} (${doc.symbol})`);
      console.log(`   Type: ${doc.formType} - ${doc.description}`);
      console.log(`   Date: ${doc.dateFiled}`);
      console.log(`   📄 PDF Link: ${doc.pdfLink || 'N/A'}`);
      console.log(`   🌐 HTML Link: ${doc.htmlLink || 'N/A'}`);
    }

    // Export to JSON file
    const fs = require('fs');
    const outputPath = 'sec-edgar-technical-documents.json';

    fs.writeFileSync(outputPath, JSON.stringify(allDocuments, null, 2));
    console.log(`\n✅ Exported ${allDocuments.length} documents to ${outputPath}`);
  }

  return allDocuments;
}

// Run the fetcher
fetchSECDocuments().catch(console.error);