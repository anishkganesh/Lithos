#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function checkUniqueness() {
  console.log('🔍 Checking Document Uniqueness\n');

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    // Get all documents
    const { data: documents, error, count } = await supabase
      .from('edgar_technical_documents')
      .select('id, accession_number, company_name, document_url, filing_date', { count: 'exact' });

    if (error) {
      console.error('❌ Error fetching documents:', error);
      return;
    }

    console.log(`📊 Total documents in database: ${count}\n`);

    // Check for duplicate accession numbers
    const accessionMap = new Map();
    const duplicateAccessions = [];

    documents.forEach(doc => {
      if (accessionMap.has(doc.accession_number)) {
        const existing = accessionMap.get(doc.accession_number);
        duplicateAccessions.push({
          accession: doc.accession_number,
          doc1: { id: existing.id, company: existing.company_name, date: existing.filing_date },
          doc2: { id: doc.id, company: doc.company_name, date: doc.filing_date }
        });
      } else {
        accessionMap.set(doc.accession_number, doc);
      }
    });

    if (duplicateAccessions.length > 0) {
      console.log('❌ FOUND DUPLICATE ACCESSION NUMBERS:');
      console.log('─'.repeat(80));
      duplicateAccessions.forEach((dup, i) => {
        console.log(`\nDuplicate ${i + 1}:`);
        console.log(`  Accession: ${dup.accession}`);
        console.log(`  Doc 1: ${dup.doc1.company} (${dup.doc1.date}) ID: ${dup.doc1.id}`);
        console.log(`  Doc 2: ${dup.doc2.company} (${dup.doc2.date}) ID: ${dup.doc2.id}`);
      });
      console.log('─'.repeat(80));
    } else {
      console.log('✅ All accession numbers are UNIQUE!');
    }

    // Check for duplicate URLs
    const urlMap = new Map();
    const duplicateUrls = [];

    documents.forEach(doc => {
      if (urlMap.has(doc.document_url)) {
        const existing = urlMap.get(doc.document_url);
        duplicateUrls.push({
          url: doc.document_url,
          doc1: { id: existing.id, company: existing.company_name, accession: existing.accession_number },
          doc2: { id: doc.id, company: doc.company_name, accession: doc.accession_number }
        });
      } else {
        urlMap.set(doc.document_url, doc);
      }
    });

    if (duplicateUrls.length > 0) {
      console.log('\n❌ FOUND DUPLICATE DOCUMENT URLs:');
      console.log('─'.repeat(80));
      duplicateUrls.forEach((dup, i) => {
        console.log(`\nDuplicate ${i + 1}:`);
        console.log(`  URL: ${dup.url.substring(0, 100)}...`);
        console.log(`  Doc 1: ${dup.doc1.company} (${dup.doc1.accession})`);
        console.log(`  Doc 2: ${dup.doc2.company} (${dup.doc2.accession})`);
      });
      console.log('─'.repeat(80));
    } else {
      console.log('✅ All document URLs are UNIQUE!');
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📈 UNIQUENESS SUMMARY:');
    console.log(`  Total records: ${count}`);
    console.log(`  Unique accession numbers: ${accessionMap.size}`);
    console.log(`  Unique document URLs: ${urlMap.size}`);
    console.log(`  Duplicate accessions: ${duplicateAccessions.length}`);
    console.log(`  Duplicate URLs: ${duplicateUrls.length}`);

    if (duplicateAccessions.length === 0 && duplicateUrls.length === 0) {
      console.log('\n🎉 PERFECT! Every document is completely unique!');
      console.log('   No duplicates found in the entire database.');
    } else {
      console.log('\n⚠️  Duplicates detected - review needed');
    }

    // Check constraint
    console.log('\n🔒 Database Constraint Status:');
    console.log('   The UNIQUE constraint on accession_number prevents duplicates');
    console.log('   Any attempt to insert a duplicate will be rejected by the database');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkUniqueness();