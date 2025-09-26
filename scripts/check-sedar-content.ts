#!/usr/bin/env npx tsx
/**
 * Check what SEDAR/Canadian content we have from QuoteMedia
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Canadian mining companies
const CANADIAN_COMPANIES = ['CCJ', 'DNN', 'NXE', 'FCU', 'TECK', 'IVN', 'AEM', 'KGC', 'WPM', 'FNV'];

async function checkSEDARContent() {
  console.log('🔍 CHECKING QUOTEMEDIA CONTENT FOR SEDAR/CANADIAN DOCUMENTS');
  console.log('='.repeat(70));

  // Check quotemedia_links table
  const { data: links, count } = await supabase
    .from('quotemedia_links')
    .select('*', { count: 'exact' })
    .in('symbol', CANADIAN_COMPANIES)
    .order('filing_date', { ascending: false });

  console.log(`\n📊 Total filings for Canadian companies: ${count || 0}`);

  if (links && links.length > 0) {
    // Analyze form types
    const formTypeCounts = new Map<string, number>();
    const technicalDocs = [];
    const canadianForms = [];

    for (const link of links) {
      const formType = link.form_type || '';
      const description = (link.form_description || '').toLowerCase();

      // Count form types
      formTypeCounts.set(formType, (formTypeCounts.get(formType) || 0) + 1);

      // Check for Canadian-specific forms
      if (['40-F', '6-K', '20-F', 'F-10', 'F-1', 'F-3', 'F-4', 'F-8', 'F-9', 'F-80'].includes(formType)) {
        canadianForms.push(link);
      }

      // Check for technical report indicators
      if (description.includes('43-101') ||
          description.includes('ni 43-101') ||
          description.includes('technical report') ||
          description.includes('mineral resource') ||
          description.includes('mineral reserve') ||
          description.includes('feasibility') ||
          description.includes('pea') ||
          description.includes('preliminary economic')) {
        technicalDocs.push(link);
      }
    }

    console.log('\n📋 FORM TYPES BREAKDOWN:');
    const sortedForms = Array.from(formTypeCounts.entries()).sort((a, b) => b[1] - a[1]);
    for (const [form, cnt] of sortedForms.slice(0, 15)) {
      const isCanadianForm = ['40-F', '6-K', '20-F'].includes(form);
      console.log(`   ${form}: ${cnt} filings ${isCanadianForm ? '🇨🇦 (Canadian cross-listing)' : ''}`);
    }

    console.log(`\n🇨🇦 CANADIAN-SPECIFIC FORMS: ${canadianForms.length} documents`);
    if (canadianForms.length > 0) {
      console.log('\nSample Canadian forms:');
      for (const doc of canadianForms.slice(0, 5)) {
        console.log(`   ${doc.symbol} - ${doc.form_type} (${doc.filing_date})`);
        console.log(`      ${doc.form_description?.substring(0, 100)}`);
      }
    }

    console.log(`\n⛏️ TECHNICAL REPORT MENTIONS: ${technicalDocs.length} documents`);
    if (technicalDocs.length > 0) {
      console.log('\nDocuments mentioning technical reports:');
      for (const doc of technicalDocs.slice(0, 5)) {
        console.log(`   ${doc.symbol} - ${doc.form_type} (${doc.filing_date})`);
        console.log(`      ${doc.form_description?.substring(0, 100)}`);
        if (doc.pdf_link) {
          console.log(`      PDF: ${doc.pdf_link}`);
        }
      }
    }

    // Check specific companies
    console.log('\n📊 DOCUMENTS BY COMPANY:');
    for (const symbol of CANADIAN_COMPANIES) {
      const companyDocs = links.filter(l => l.symbol === symbol);
      if (companyDocs.length > 0) {
        const formTypes = new Set(companyDocs.map(d => d.form_type));
        console.log(`   ${symbol}: ${companyDocs.length} filings`);
        console.log(`      Forms: ${Array.from(formTypes).join(', ')}`);
      }
    }
  } else {
    console.log('\n❌ No documents found for Canadian companies in quotemedia_links table');
  }

  // Check projects table for Canadian projects
  const { data: projects, count: projectCount } = await supabase
    .from('projects')
    .select('*', { count: 'exact' })
    .eq('country', 'Canada');

  console.log(`\n🏗️ CANADIAN PROJECTS IN DATABASE: ${projectCount || 0}`);
  if (projects && projects.length > 0) {
    console.log('\nSample Canadian projects:');
    for (const project of projects.slice(0, 5)) {
      console.log(`   ${project.project_name} (${project.company_name})`);
      console.log(`      ${project.primary_commodity} - ${project.stage}`);
      if (project.technical_report_url) {
        console.log(`      Technical Report: ${project.technical_report_url}`);
      }
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('📊 SUMMARY:');
  console.log('='.repeat(70));
  console.log('\n✅ WHAT QUOTEMEDIA HAS PROVIDED:');
  console.log('   • SEC filings for Canadian companies cross-listed on US exchanges');
  console.log('   • 40-F Annual Reports (Canadian companies filing with SEC)');
  console.log('   • 6-K Current Reports (foreign issuer reports)');
  console.log('   • Standard SEC forms (10-K, 10-Q, 8-K) for dual-listed companies');

  console.log('\n❌ WHAT QUOTEMEDIA DOES NOT HAVE:');
  console.log('   • Direct SEDAR/SEDAR+ filings');
  console.log('   • NI 43-101 technical reports (these are on SEDAR+)');
  console.log('   • Annual Information Forms (AIF) from SEDAR');
  console.log('   • Canadian MD&A documents from SEDAR');
  console.log('   • Material change reports from SEDAR');

  console.log('\n💡 KEY FINDING:');
  console.log('   QuoteMedia is an SEC/EDGAR data provider.');
  console.log('   For SEDAR documents, you need direct SEDAR+ API access.');
  console.log('='.repeat(70));
}

checkSEDARContent().catch(console.error);