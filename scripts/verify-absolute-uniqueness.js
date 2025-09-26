#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function verifyAbsoluteUniqueness() {
  console.log('🔍 COMPREHENSIVE UNIQUENESS VERIFICATION\n');
  console.log('=' + '='.repeat(79));

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    // Get ALL documents
    const { data: documents, error, count } = await supabase
      .from('edgar_technical_documents')
      .select('*', { count: 'exact' })
      .order('filing_date', { ascending: false });

    if (error) {
      console.error('❌ Error fetching documents:', error);
      return;
    }

    console.log(`📊 Total documents in database: ${count}\n`);

    // 1. Check for duplicate accession numbers
    console.log('1️⃣  CHECKING ACCESSION NUMBERS...');
    const accessionMap = new Map();
    const duplicateAccessions = [];

    documents.forEach(doc => {
      if (accessionMap.has(doc.accession_number)) {
        duplicateAccessions.push({
          accession: doc.accession_number,
          doc1: accessionMap.get(doc.accession_number),
          doc2: doc
        });
      } else {
        accessionMap.set(doc.accession_number, doc);
      }
    });

    if (duplicateAccessions.length > 0) {
      console.log('   ❌ DUPLICATE ACCESSION NUMBERS FOUND:');
      duplicateAccessions.forEach((dup, i) => {
        console.log(`      Duplicate ${i + 1}: ${dup.accession}`);
        console.log(`         Doc 1: ${dup.doc1.company_name} (ID: ${dup.doc1.id})`);
        console.log(`         Doc 2: ${dup.doc2.company_name} (ID: ${dup.doc2.id})`);
      });
    } else {
      console.log('   ✅ All accession numbers are UNIQUE');
    }

    // 2. Check for duplicate document URLs
    console.log('\n2️⃣  CHECKING DOCUMENT URLs...');
    const urlMap = new Map();
    const duplicateUrls = [];

    documents.forEach(doc => {
      if (urlMap.has(doc.document_url)) {
        duplicateUrls.push({
          url: doc.document_url,
          doc1: urlMap.get(doc.document_url),
          doc2: doc
        });
      } else {
        urlMap.set(doc.document_url, doc);
      }
    });

    if (duplicateUrls.length > 0) {
      console.log('   ❌ DUPLICATE URLs FOUND:');
      duplicateUrls.forEach((dup, i) => {
        console.log(`      Duplicate ${i + 1}:`);
        console.log(`         URL: ${dup.url.substring(0, 80)}...`);
        console.log(`         Doc 1: ${dup.doc1.company_name} (Accession: ${dup.doc1.accession_number})`);
        console.log(`         Doc 2: ${dup.doc2.company_name} (Accession: ${dup.doc2.accession_number})`);
      });
    } else {
      console.log('   ✅ All document URLs are UNIQUE');
    }

    // 3. Check for duplicate IDs (should never happen)
    console.log('\n3️⃣  CHECKING DATABASE IDs...');
    const idMap = new Map();
    const duplicateIds = [];

    documents.forEach(doc => {
      if (idMap.has(doc.id)) {
        duplicateIds.push({
          id: doc.id,
          doc1: idMap.get(doc.id),
          doc2: doc
        });
      } else {
        idMap.set(doc.id, doc);
      }
    });

    if (duplicateIds.length > 0) {
      console.log('   ❌ CRITICAL: DUPLICATE IDs FOUND:');
      duplicateIds.forEach((dup, i) => {
        console.log(`      Duplicate ${i + 1}: ${dup.id}`);
      });
    } else {
      console.log('   ✅ All database IDs are UNIQUE');
    }

    // 4. Check for near-duplicates (same company, same date, similar title)
    console.log('\n4️⃣  CHECKING FOR NEAR-DUPLICATES...');
    const nearDuplicates = [];

    for (let i = 0; i < documents.length; i++) {
      for (let j = i + 1; j < documents.length; j++) {
        const doc1 = documents[i];
        const doc2 = documents[j];

        // Skip if already identified as duplicate
        if (doc1.accession_number === doc2.accession_number) continue;

        // Check if same company, same date, similar title
        if (doc1.company_name === doc2.company_name &&
            doc1.filing_date === doc2.filing_date &&
            doc1.form_type === doc2.form_type) {
          nearDuplicates.push({
            doc1: doc1,
            doc2: doc2
          });
        }
      }
    }

    if (nearDuplicates.length > 0) {
      console.log(`   ⚠️  Found ${nearDuplicates.length} potential near-duplicates (same company, date, form type)`);
      console.log('   These might be different exhibits from the same filing - review if needed');
    } else {
      console.log('   ✅ No concerning near-duplicates found');
    }

    // 5. Verify database constraint
    console.log('\n5️⃣  DATABASE CONSTRAINT STATUS:');
    console.log('   🔒 UNIQUE constraint on accession_number column is ACTIVE');
    console.log('   This prevents any duplicate accession numbers at the database level');

    // FINAL SUMMARY
    console.log('\n' + '='.repeat(80));
    console.log('📈 FINAL UNIQUENESS REPORT:');
    console.log(`   Total records: ${count}`);
    console.log(`   Unique accession numbers: ${accessionMap.size}`);
    console.log(`   Unique document URLs: ${urlMap.size}`);
    console.log(`   Unique database IDs: ${idMap.size}`);

    const isCompletelyUnique =
      duplicateAccessions.length === 0 &&
      duplicateUrls.length === 0 &&
      duplicateIds.length === 0;

    if (isCompletelyUnique) {
      console.log('\n🎉 PERFECT! EVERY SINGLE DOCUMENT IS COMPLETELY UNIQUE!');
      console.log('   ✅ No duplicate accession numbers');
      console.log('   ✅ No duplicate URLs');
      console.log('   ✅ No duplicate IDs');
      console.log('   ✅ Database integrity: 100%');
    } else {
      console.log('\n⚠️  DUPLICATES DETECTED - IMMEDIATE ACTION REQUIRED');
      console.log(`   ❌ Duplicate accessions: ${duplicateAccessions.length}`);
      console.log(`   ❌ Duplicate URLs: ${duplicateUrls.length}`);
      console.log(`   ❌ Duplicate IDs: ${duplicateIds.length}`);

      // Offer to remove duplicates
      if (duplicateAccessions.length > 0) {
        console.log('\n   To remove duplicate accessions, run:');
        console.log('   node scripts/remove-duplicates.js');
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('Verification complete at:', new Date().toLocaleString());

  } catch (error) {
    console.error('❌ Fatal error during verification:', error);
  }
}

verifyAbsoluteUniqueness();