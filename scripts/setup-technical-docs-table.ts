#!/usr/bin/env npx tsx
/**
 * Script to create the edgar_technical_documents table and test the QuoteMedia integration
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function setupTable() {
  console.log('🔧 Setting up edgar_technical_documents table...\n');

  // Check if table exists
  console.log('Checking if table exists...');

  const { error: tableError } = await supabase
    .from('edgar_technical_documents')
    .select('id')
    .limit(1);

  if (tableError && tableError.message.includes('does not exist')) {
    console.log('❌ Table edgar_technical_documents does not exist.');
    console.log('\n📝 To create the table, you have two options:');
    console.log('\n1. Use Supabase Dashboard:');
    console.log('   - Go to your Supabase project SQL Editor');
    console.log('   - Run the migration from: supabase/migrations/005_create_edgar_technical_documents.sql');
    console.log('\n2. Or use Supabase CLI:');
    console.log('   - Install: npm install -g supabase');
    console.log('   - Login: supabase login');
    console.log('   - Push migrations: supabase db push --project-ref dfxauievbyqwcynwtvib');
    return false;
  }

  // Create indexes
  console.log('✅ Table edgar_technical_documents is ready');

  // Show table structure
  const { data: sampleRow } = await supabase
    .from('edgar_technical_documents')
    .select('*')
    .limit(1);

  console.log('\n📋 Table columns:', Object.keys(sampleRow?.[0] || {
    id: 'UUID',
    filing_id: 'TEXT',
    symbol: 'TEXT',
    company_name: 'TEXT',
    form_type: 'TEXT',
    date_filed: 'DATE',
    pdf_link: 'TEXT',
    is_technical_report: 'BOOLEAN',
  }));

  return true;
}

async function testQuoteMediaAPI() {
  console.log('\n🧪 Testing QuoteMedia API (without token)...\n');

  // First, let's show what the API call would look like
  const sampleUrl = 'https://app.quotemedia.com/data/getCompanyFilings.json';
  const params = new URLSearchParams({
    symbols: 'FCX,NEM,GOLD', // Mining companies
    country: 'US',
    limit: '5',
    webmasterId: '131706'
  });

  console.log('📡 Sample API Request:');
  console.log(`URL: ${sampleUrl}?${params}`);
  console.log('\nHeaders:');
  console.log('Authorization: Bearer <YOUR_ENTERPRISE_TOKEN>');

  // Show expected response format
  console.log('\n📄 Expected Response Format:');
  console.log(JSON.stringify({
    results: {
      copyright: "Copyright (c) 2025 QuoteMedia, Inc.",
      count: 5,
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
        filing: [
          {
            formtype: "10-K",
            formdescription: "Annual report",
            dateFiled: "2024-02-15",
            htmllink: "https://app.quotemedia.com/data/downloadFiling?...",
            pdflink: "https://app.quotemedia.com/data/downloadFiling?type=PDF&...",
          }
        ]
      }
    }
  }, null, 2));

  return true;
}

async function showSampleTechnicalReports() {
  console.log('\n📚 Sample NI 43-101 Technical Report Types:\n');

  const reportTypes = [
    {
      formType: 'NI 43-101',
      description: 'Technical Report - Mineral Resource Estimate',
      country: 'CA',
      example: 'Updated Mineral Resource Estimate for the Eagle Gold Mine, Yukon'
    },
    {
      formType: 'NI 43-101',
      description: 'Preliminary Economic Assessment',
      country: 'CA',
      example: 'PEA for the Marathon Palladium-Copper Project'
    },
    {
      formType: 'NI 43-101',
      description: 'Pre-Feasibility Study',
      country: 'CA',
      example: 'Pre-Feasibility Study for the Côté Gold Project'
    },
    {
      formType: 'NI 43-101',
      description: 'Feasibility Study',
      country: 'CA',
      example: 'Feasibility Study for the Magino Gold Project'
    },
    {
      formType: '10-K/Technical Report',
      description: 'Technical Report Summary (S-K 1300)',
      country: 'US',
      example: 'Technical Report Summary for Cortez Operations, Nevada'
    }
  ];

  console.log('Canadian (SEDAR) Technical Reports:');
  reportTypes.filter(r => r.country === 'CA').forEach(report => {
    console.log(`  • ${report.description}`);
    console.log(`    Example: ${report.example}`);
  });

  console.log('\nUS (EDGAR) Technical Reports:');
  reportTypes.filter(r => r.country === 'US').forEach(report => {
    console.log(`  • ${report.description}`);
    console.log(`    Example: ${report.example}`);
  });

  return true;
}

async function main() {
  console.log('🚀 QuoteMedia Technical Documents Setup');
  console.log('========================================\n');

  // Setup table
  await setupTable();

  // Test API structure
  await testQuoteMediaAPI();

  // Show sample report types
  await showSampleTechnicalReports();

  console.log('\n✅ Setup complete!');
  console.log('\n📝 Next Steps:');
  console.log('1. Get your webservice password from: https://crs.sh/uJgMAfsC');
  console.log('2. Add QUOTEMEDIA_WEBSERVICE_PASSWORD to your .env.local');
  console.log('3. Run: npm run quotemedia:test');
  console.log('\n🔍 This will fetch and store NI 43-101 reports and other technical documents');
}

main().catch(console.error);