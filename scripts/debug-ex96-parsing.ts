#!/usr/bin/env npx tsx
/**
 * Debug EX-96.1 document parsing - show actual content and find numbers
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabase = createClient(
  'https://dfxauievbyqwcynwtvib.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmeGF1aWV2Ynlxd2N5bnd0dmliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Nzg0ODI2MSwiZXhwIjoyMDYzNDI0MjYxfQ.Gs2NX-UUKtXvW3a9_h49ATSDzvpsfJdja6tt1bCkyjc'
);

async function debugParsing() {
  console.log('🔍 DEBUG EX-96.1 PARSING');
  console.log('='.repeat(70));

  // Get one specific EX-96.1 document that should have financial data
  // Let's try MP Materials which is a known mining company
  const { data: documents, error } = await supabase
    .from('edgar_technical_documents')
    .select('*')
    .eq('exhibit_number', 'EX-96.1')
    .ilike('company_name', '%MP Materials%')
    .limit(1);

  if (!documents || documents.length === 0) {
    // Try another known mining company
    const { data: altDocs } = await supabase
      .from('edgar_technical_documents')
      .select('*')
      .eq('exhibit_number', 'EX-96.1')
      .ilike('company_name', '%UR-ENERGY%')
      .limit(1);

    if (altDocs && altDocs.length > 0) {
      documents.push(altDocs[0]);
    }
  }

  if (!documents || documents.length === 0) {
    console.log('No suitable test document found. Getting first EX-96.1...');
    const { data: anyDoc } = await supabase
      .from('edgar_technical_documents')
      .select('*')
      .eq('exhibit_number', 'EX-96.1')
      .order('filing_date', { ascending: false })
      .limit(1);

    if (anyDoc && anyDoc.length > 0) {
      documents.push(anyDoc[0]);
    }
  }

  if (!documents || documents.length === 0) {
    console.log('❌ No EX-96.1 documents found');
    return;
  }

  const doc = documents[0];
  console.log(`\n📄 Document: ${doc.company_name}`);
  console.log(`📅 Filing Date: ${doc.filing_date}`);
  console.log(`🔗 URL: ${doc.document_url}\n`);

  // Fetch the HTML
  console.log('📥 Downloading HTML...');
  const response = await fetch(doc.document_url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });

  if (!response.ok) {
    console.log(`❌ Failed to fetch: ${response.status}`);
    return;
  }

  const html = await response.text();
  console.log(`✅ Downloaded ${html.length} characters\n`);

  // Save raw HTML for inspection
  const htmlFile = `/tmp/ex96_debug_${doc.company_name.replace(/[^a-zA-Z0-9]/g, '_')}.html`;
  fs.writeFileSync(htmlFile, html);
  console.log(`💾 Saved raw HTML to: ${htmlFile}\n`);

  // Clean HTML to text
  const text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

  // Save cleaned text
  const textFile = `/tmp/ex96_debug_${doc.company_name.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
  fs.writeFileSync(textFile, text);
  console.log(`💾 Saved cleaned text to: ${textFile}`);
  console.log(`📊 Text length: ${text.length} characters\n`);

  // Search for financial keywords in the text
  console.log('🔍 SEARCHING FOR FINANCIAL DATA IN TEXT:\n');
  console.log('='.repeat(70));

  // Search for NPV
  console.log('\n📈 NPV SEARCH:');
  const npvSearches = [
    /NPV[^a-zA-Z]/gi,
    /net\s+present\s+value/gi,
    /\$[\d,]+\s*(?:million|M|billion|B)/gi
  ];

  for (const pattern of npvSearches) {
    const matches = text.matchAll(pattern);
    let count = 0;
    for (const match of matches) {
      if (count < 3) {
        const start = Math.max(0, match.index! - 100);
        const end = Math.min(text.length, match.index! + match[0].length + 100);
        console.log(`\nMatch: "${match[0]}"`);
        console.log(`Context: ...${text.substring(start, end)}...`);
      }
      count++;
    }
    if (count > 0) {
      console.log(`\nTotal matches for pattern ${pattern}: ${count}`);
    }
  }

  // Search for CAPEX
  console.log('\n💰 CAPEX SEARCH:');
  const capexSearches = [
    /capital\s+(?:cost|expenditure)/gi,
    /CAPEX/gi,
    /initial\s+capital/gi,
    /development\s+capital/gi,
    /construction\s+capital/gi
  ];

  for (const pattern of capexSearches) {
    const matches = text.matchAll(pattern);
    let count = 0;
    for (const match of matches) {
      if (count < 3) {
        const start = Math.max(0, match.index! - 100);
        const end = Math.min(text.length, match.index! + match[0].length + 100);
        console.log(`\nMatch: "${match[0]}"`);
        console.log(`Context: ...${text.substring(start, end)}...`);
      }
      count++;
    }
    if (count > 0) {
      console.log(`\nTotal matches for pattern ${pattern}: ${count}`);
    }
  }

  // Search for IRR
  console.log('\n📊 IRR SEARCH:');
  const irrSearches = [
    /IRR[^a-zA-Z]/gi,
    /internal\s+rate\s+of\s+return/gi,
    /[\d.]+\s*%/g
  ];

  for (const pattern of irrSearches) {
    const matches = text.matchAll(pattern);
    let count = 0;
    for (const match of matches) {
      if (count < 5) {
        const start = Math.max(0, match.index! - 50);
        const end = Math.min(text.length, match.index! + match[0].length + 50);
        const context = text.substring(start, end);
        // Only show percentage matches that might be IRR
        if (pattern.toString().includes('%') &&
            (context.toLowerCase().includes('irr') ||
             context.toLowerCase().includes('return') ||
             context.toLowerCase().includes('rate'))) {
          console.log(`\nMatch: "${match[0]}"`);
          console.log(`Context: ...${context}...`);
        } else if (!pattern.toString().includes('%')) {
          console.log(`\nMatch: "${match[0]}"`);
          console.log(`Context: ...${context}...`);
        }
      }
      count++;
    }
    if (count > 0 && !pattern.toString().includes('%')) {
      console.log(`\nTotal matches for pattern ${pattern}: ${count}`);
    }
  }

  // Look for tables or structured data
  console.log('\n📋 LOOKING FOR TABLES:');
  const tableIndicators = [
    /economic\s+results/gi,
    /financial\s+analysis/gi,
    /key\s+metrics/gi,
    /summary\s+of\s+results/gi,
    /economic\s+analysis/gi,
    /project\s+economics/gi
  ];

  for (const pattern of tableIndicators) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const start = Math.max(0, match.index! - 50);
      const end = Math.min(text.length, match.index! + 500);
      console.log(`\n🎯 Found: "${match[0]}"`);
      console.log(`Context:\n${text.substring(start, end)}\n`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('📁 Files saved for manual inspection:');
  console.log(`   HTML: ${htmlFile}`);
  console.log(`   Text: ${textFile}`);
  console.log('\n👉 Open these files to see the actual content and find where the numbers are.');
}

debugParsing().catch(console.error);