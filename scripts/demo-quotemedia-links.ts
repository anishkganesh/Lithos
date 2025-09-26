#!/usr/bin/env npx tsx
/**
 * Demonstration of QuoteMedia link extraction for NI 43-101 and technical documents
 * Shows the exact links that would be pulled from the API
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

// Sample response from QuoteMedia API (what we would receive)
const SAMPLE_CANADIAN_RESPONSE = {
  results: {
    copyright: "Copyright (c) 2025 QuoteMedia, Inc.",
    count: 3,
    filings: {
      symbolstring: "AGI.TO",
      key: {
        symbol: "AGI.TO",
        exchange: "TSX",
        cusip: "011532108",
        isin: "CA0115321089"
      },
      equityinfo: {
        longname: "Alamos Gold Inc.",
        shortname: "AGI"
      },
      issuerNumber: "00002563",
      filing: [
        {
          filingId: "SEDAR-2024-43101-001",
          formtype: "NI 43-101",
          formdescription: "Technical Report - Updated Mineral Resource and Reserve Estimate",
          formgroup: "Continuous Disclosure",
          datefiled: "2024-03-15",
          accessionNumber: "00002563-24-000125",
          pages: 285,
          fileSize: "45.2 MB",
          htmllink: "https://app.quotemedia.com/data/downloadFiling?webmasterId=131706&ref=SEDAR2024001&type=HTML&symbol=AGI.TO&companyName=Alamos+Gold+Inc.&formType=NI+43-101&formDescription=Technical+Report+-+Updated+Mineral+Resource+and+Reserve+Estimate&dateFiled=2024-03-15",
          pdflink: "https://app.quotemedia.com/data/downloadFiling?webmasterId=131706&ref=SEDAR2024001&type=PDF&symbol=AGI.TO&companyName=Alamos+Gold+Inc.&formType=NI+43-101&formDescription=Technical+Report+-+Updated+Mineral+Resource+and+Reserve+Estimate&dateFiled=2024-03-15",
          doclink: null,
          xlslink: null
        },
        {
          filingId: "SEDAR-2024-PEA-002",
          formtype: "NI 43-101",
          formdescription: "Preliminary Economic Assessment - Lynn Lake Gold Project",
          formgroup: "Continuous Disclosure",
          datefiled: "2024-02-28",
          accessionNumber: "00002563-24-000098",
          pages: 198,
          fileSize: "32.1 MB",
          htmllink: "https://app.quotemedia.com/data/downloadFiling?webmasterId=131706&ref=SEDAR2024002&type=HTML&symbol=AGI.TO&companyName=Alamos+Gold+Inc.&formType=NI+43-101&formDescription=Preliminary+Economic+Assessment+-+Lynn+Lake+Gold+Project&dateFiled=2024-02-28",
          pdflink: "https://app.quotemedia.com/data/downloadFiling?webmasterId=131706&ref=SEDAR2024002&type=PDF&symbol=AGI.TO&companyName=Alamos+Gold+Inc.&formType=NI+43-101&formDescription=Preliminary+Economic+Assessment+-+Lynn+Lake+Gold+Project&dateFiled=2024-02-28",
          doclink: null,
          xlslink: null
        },
        {
          filingId: "SEDAR-2024-FS-003",
          formtype: "NI 43-101",
          formdescription: "Feasibility Study Update - Island Gold Mine Expansion",
          formgroup: "Continuous Disclosure",
          datefiled: "2024-01-20",
          accessionNumber: "00002563-24-000045",
          pages: 412,
          fileSize: "68.3 MB",
          htmllink: "https://app.quotemedia.com/data/downloadFiling?webmasterId=131706&ref=SEDAR2024003&type=HTML&symbol=AGI.TO&companyName=Alamos+Gold+Inc.&formType=NI+43-101&formDescription=Feasibility+Study+Update+-+Island+Gold+Mine+Expansion&dateFiled=2024-01-20",
          pdflink: "https://app.quotemedia.com/data/downloadFiling?webmasterId=131706&ref=SEDAR2024003&type=PDF&symbol=AGI.TO&companyName=Alamos+Gold+Inc.&formType=NI+43-101&formDescription=Feasibility+Study+Update+-+Island+Gold+Mine+Expansion&dateFiled=2024-01-20",
          doclink: null,
          xlslink: null
        }
      ]
    }
  }
};

const SAMPLE_US_RESPONSE = {
  results: {
    copyright: "Copyright (c) 2025 QuoteMedia, Inc.",
    count: 2,
    filings: {
      symbolstring: "FCX",
      key: {
        symbol: "FCX",
        exchange: "NYSE",
        cusip: "35671D857",
        isin: "US35671D8570"
      },
      equityinfo: {
        longname: "Freeport-McMoRan Inc.",
        shortname: "FCX"
      },
      cik: "0000831259",
      filing: [
        {
          filingId: "EDGAR-2024-10K-FCX",
          formtype: "10-K",
          formdescription: "Annual report [Section 13 and 15(d), not S-K Item 405]",
          formgroup: "Annual Reports",
          datefiled: "2024-02-22",
          accessionNumber: "0000831259-24-000015",
          period: "2023-12-31",
          pages: 184,
          fileSize: "12.4 MB",
          htmllink: "https://app.quotemedia.com/data/downloadFiling?webmasterId=131706&ref=117295847&type=HTML&symbol=FCX&companyName=Freeport-McMoRan+Inc.&formType=10-K&formDescription=Annual+report&dateFiled=2024-02-22&CK=831259",
          pdflink: "https://app.quotemedia.com/data/downloadFiling?webmasterId=131706&ref=117295847&type=PDF&symbol=FCX&companyName=Freeport-McMoRan+Inc.&formType=10-K&formDescription=Annual+report&dateFiled=2024-02-22&CK=831259",
          doclink: "https://app.quotemedia.com/data/downloadFiling?webmasterId=131706&ref=117295847&type=DOC&symbol=FCX&companyName=Freeport-McMoRan+Inc.&formType=10-K&formDescription=Annual+report&dateFiled=2024-02-22&CK=831259",
          xlslink: "https://app.quotemedia.com/data/downloadFiling?webmasterId=131706&ref=117295847&type=XLS&symbol=FCX&companyName=Freeport-McMoRan+Inc.&formType=10-K&formDescription=Annual+report&dateFiled=2024-02-22&CK=831259",
          xbrllink: "https://app.quotemedia.com/data/downloadFiling?webmasterId=131706&ref=117295847&type=XBRL&symbol=FCX&companyName=Freeport-McMoRan+Inc.&formType=10-K&formDescription=Annual+report&dateFiled=2024-02-22"
        },
        {
          filingId: "EDGAR-2024-8K-FCX-TRS",
          formtype: "8-K",
          formdescription: "Current report - Technical Report Summary for Grasberg Mine",
          formgroup: "8K",
          datefiled: "2024-03-10",
          accessionNumber: "0000831259-24-000022",
          period: "2024-03-10",
          pages: 156,
          fileSize: "28.7 MB",
          htmllink: "https://app.quotemedia.com/data/downloadFiling?webmasterId=131706&ref=117356892&type=HTML&symbol=FCX&companyName=Freeport-McMoRan+Inc.&formType=8-K&formDescription=Current+report+-+Technical+Report+Summary&dateFiled=2024-03-10&CK=831259",
          pdflink: "https://app.quotemedia.com/data/downloadFiling?webmasterId=131706&ref=117356892&type=PDF&symbol=FCX&companyName=Freeport-McMoRan+Inc.&formType=8-K&formDescription=Current+report+-+Technical+Report+Summary&dateFiled=2024-03-10&CK=831259",
          doclink: null,
          xlslink: null
        }
      ]
    }
  }
};

function demonstrateLinks() {
  console.log('🔗 QuoteMedia Technical Document Links Demonstration');
  console.log('====================================================\n');

  console.log('📍 CANADIAN (SEDAR) NI 43-101 REPORTS');
  console.log('--------------------------------------\n');

  const canadianFilings = SAMPLE_CANADIAN_RESPONSE.results.filings.filing;

  canadianFilings.forEach((filing, index) => {
    console.log(`${index + 1}. ${filing.formdescription}`);
    console.log(`   Company: ${SAMPLE_CANADIAN_RESPONSE.results.filings.equityinfo.longname}`);
    console.log(`   Symbol: ${SAMPLE_CANADIAN_RESPONSE.results.filings.symbolstring}`);
    console.log(`   Date Filed: ${filing.datefiled}`);
    console.log(`   File Size: ${filing.fileSize}`);
    console.log(`   Pages: ${filing.pages}`);
    console.log(`   \n   📄 PDF Link:`);
    console.log(`   ${filing.pdflink}`);
    console.log(`   \n   🌐 HTML Link:`);
    console.log(`   ${filing.htmllink}`);
    console.log('\n   ---\n');
  });

  console.log('\n📍 US (EDGAR) TECHNICAL REPORTS');
  console.log('--------------------------------\n');

  const usFilings = SAMPLE_US_RESPONSE.results.filings.filing;

  usFilings.forEach((filing, index) => {
    console.log(`${index + 1}. ${filing.formdescription}`);
    console.log(`   Company: ${SAMPLE_US_RESPONSE.results.filings.equityinfo.longname}`);
    console.log(`   Symbol: ${SAMPLE_US_RESPONSE.results.filings.symbolstring}`);
    console.log(`   CIK: ${SAMPLE_US_RESPONSE.results.filings.cik}`);
    console.log(`   Date Filed: ${filing.datefiled}`);
    console.log(`   File Size: ${filing.fileSize}`);
    console.log(`   Pages: ${filing.pages}`);
    console.log(`   \n   📄 PDF Link:`);
    console.log(`   ${filing.pdflink}`);
    console.log(`   \n   🌐 HTML Link:`);
    console.log(`   ${filing.htmllink}`);
    if (filing.xbrllink) {
      console.log(`   \n   📊 XBRL Link:`);
      console.log(`   ${filing.xbrllink}`);
    }
    console.log('\n   ---\n');
  });

  console.log('🔍 HOW THESE LINKS WORK:');
  console.log('------------------------\n');
  console.log('1. Each link includes your webmasterId (131706) for authentication');
  console.log('2. PDF links can have "&attached=true" added for direct download');
  console.log('3. Links require Bearer token authentication in the header');
  console.log('4. The API returns direct QuoteMedia URLs that proxy to the original documents\n');

  console.log('💾 DATABASE STORAGE:');
  console.log('--------------------\n');
  console.log('These links and metadata would be stored in edgar_technical_documents table with:');
  console.log('• filing_id: Unique identifier (e.g., "SEDAR-2024-43101-001")');
  console.log('• pdf_link: Direct link to PDF document');
  console.log('• html_link: Web viewable version');
  console.log('• is_technical_report: true for NI 43-101 and TRS documents');
  console.log('• report_type: "NI 43-101", "PEA", "Feasibility Study", etc.');
  console.log('• commodity_types: Extracted from document (gold, copper, etc.)');
  console.log('• Processing status tracking\n');

  console.log('📡 API CALL EXAMPLE:');
  console.log('-------------------\n');
  console.log('const client = new QuoteMediaClient(webservicePassword);');
  console.log('const documents = await client.getNI43101Reports({');
  console.log('  symbol: "AGI.TO",');
  console.log('  startDate: "2024-01-01",');
  console.log('  limit: 10');
  console.log('});');
  console.log('\n// Documents are automatically filtered for technical reports');
  console.log('// and stored in the database with all links preserved\n');

  console.log('✅ Ready to fetch real documents once QUOTEMEDIA_WEBSERVICE_PASSWORD is set!');
}

// Run demonstration
demonstrateLinks();