#!/usr/bin/env npx tsx

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

async function findEX96Documents() {
  console.log('🔍 Searching for EX-96.1 technical reports...\n');

  const { data, error } = await supabase
    .from('edgar_technical_documents')
    .select('*')
    .eq('exhibit_number', 'EX-96.1')
    .order('filing_date', { ascending: false })
    .limit(20);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('⚠️ No EX-96.1 documents found');
    console.log('\n📊 Searching for any technical documents...');

    const { data: anyDocs, error: anyError } = await supabase
      .from('edgar_technical_documents')
      .select('exhibit_number, count')
      .limit(10);

    if (anyDocs && anyDocs.length > 0) {
      console.log('Found these exhibit types:');
      const exhibitTypes = new Set(anyDocs.map(d => d.exhibit_number));
      exhibitTypes.forEach(type => console.log(`  - ${type}`));
    }
    return;
  }

  console.log(`✅ Found ${data.length} EX-96.1 documents:\n`);

  data.forEach((doc, i) => {
    console.log(`${i + 1}. ${doc.company_name} (${doc.ticker || 'N/A'})`);
    console.log(`   📅 Filing Date: ${doc.filing_date}`);
    console.log(`   📄 Form Type: ${doc.form_type}`);
    console.log(`   📁 Accession: ${doc.accession_number}`);
    console.log(`   🏗️ Projects: ${doc.project_names?.join(', ') || 'N/A'}`);
    console.log(`   ⛏️ Commodity: ${doc.primary_commodity || 'N/A'}`);
    console.log(`   🔗 URL: ${doc.document_url}`);
    console.log(`   📊 Status: ${doc.processing_status || 'unprocessed'}`);
    console.log();
  });

  // Show first URL for extraction
  if (data[0]) {
    console.log('═'.repeat(70));
    console.log('📌 First document URL for extraction:');
    console.log(data[0].document_url);
  }
}

findEX96Documents().catch(console.error);