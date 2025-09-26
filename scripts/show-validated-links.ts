#!/usr/bin/env npx tsx
/**
 * Show the validated QuoteMedia links that would be stored
 */

import { config } from 'dotenv';
import { QuoteMediaClient } from '../lib/quotemedia/api-client';
import {
  validateFinancialMetrics,
  extractProjectNames,
  extractCommodities,
  calculateDocumentQuality
} from '../lib/quotemedia/financial-metrics-validator';

config({ path: '.env.local' });

async function showValidatedLinks() {
  console.log('🔗 VALIDATED QUOTEMEDIA LINKS FOR DATABASE');
  console.log('===========================================\n');

  const password = process.env.QUOTEMEDIA_WEBSERVICE_PASSWORD || 'dfbsembl48';
  const client = new QuoteMediaClient(password);

  // Test with a few key companies
  const testCompanies = [
    { symbol: 'AEM', name: 'Agnico Eagle', commodity: 'gold' },
    { symbol: 'FCX', name: 'Freeport-McMoRan', commodity: 'copper' },
    { symbol: 'LAC', name: 'Lithium Americas', commodity: 'lithium' },
    { symbol: 'CCJ', name: 'Cameco', commodity: 'uranium' },
    { symbol: 'MP', name: 'MP Materials', commodity: 'rare_earth' }
  ];

  const validatedLinks = [];

  // Suppress logs
  const originalLog = console.log;
  const suppressLogs = () => { console.log = () => {}; };
  const restoreLogs = () => { console.log = originalLog; };

  for (const company of testCompanies) {
    suppressLogs();
    try {
      const documents = await client.getCompanyFilings({
        symbol: company.symbol,
        limit: 10
      });

      for (const doc of documents) {
        // Calculate quality score
        const qualityScore = calculateDocumentQuality(doc);

        // Validate financial metrics
        const validation = validateFinancialMetrics({
          description: doc.formDescription || '',
          formType: doc.formType,
          pages: doc.pages,
          fileSize: doc.fileSize
        });

        // Check if meets criteria
        const meetsBasicCriteria =
          doc.pdfLink &&
          doc.pages && doc.pages >= 50 &&
          qualityScore >= 40;

        const hasFinancialIndicators =
          validation.confidence >= 30 ||
          validation.foundMetrics.length >= 2 ||
          doc.pages >= 100;

        if (meetsBasicCriteria && hasFinancialIndicators) {
          validatedLinks.push({
            company,
            doc,
            qualityScore,
            validation,
            projectNames: extractProjectNames(doc.formDescription || ''),
            commodities: extractCommodities(doc.formDescription || '')
          });
          break; // One per company for demo
        }
      }
    } catch (error) {
      // Skip
    }
    restoreLogs();
  }

  // Display validated links
  console.log(`📊 Found ${validatedLinks.length} documents that meet validation criteria:\n`);

  for (const link of validatedLinks) {
    console.log('═'.repeat(80));
    console.log(`\n🏢 ${link.company.name} (${link.company.symbol})`);
    console.log(`   Commodity: ${link.company.commodity}`);
    console.log(`   Document: ${link.doc.formType} - ${link.doc.formDescription}`);
    console.log(`   Date Filed: ${link.doc.dateFiled}`);
    console.log(`   Size: ${link.doc.fileSize} | Pages: ${link.doc.pages}`);

    console.log(`\n   📈 Validation Results:`);
    console.log(`   • Quality Score: ${link.qualityScore}/100`);
    console.log(`   • Confidence: ${link.validation.confidence}%`);
    console.log(`   • Financial Metrics Found: ${link.validation.foundMetrics.length}`);

    if (link.validation.foundMetrics.length > 0) {
      console.log(`   • Detected Metrics: ${link.validation.foundMetrics.join(', ')}`);
    }

    if (link.projectNames.length > 0) {
      console.log(`   • Project Names: ${link.projectNames.join(', ')}`);
    }

    if (link.commodities.length > 0) {
      console.log(`   • Commodities: ${link.commodities.join(', ')}`);
    }

    console.log(`\n   📥 PDF Link:`);
    console.log(`   ${link.doc.pdfLink}`);

    if (link.doc.htmlLink) {
      console.log(`\n   🌐 HTML Link:`);
      console.log(`   ${link.doc.htmlLink}`);
    }

    if (link.doc.xlsLink) {
      console.log(`\n   📊 Excel Link:`);
      console.log(`   ${link.doc.xlsLink}`);
    }

    // Show what would be stored in database
    console.log(`\n   💾 Database Record:`);
    console.log(`   {`);
    console.log(`     filing_id: "${link.doc.filingId || `${link.company.symbol}-${link.doc.dateFiled}`}"`);
    console.log(`     symbol: "${link.company.symbol}"`);
    console.log(`     company_name: "${link.company.name}"`);
    console.log(`     form_type: "${link.doc.formType}"`);
    console.log(`     filing_date: "${link.doc.dateFiled}"`);
    console.log(`     page_count: ${link.doc.pages}`);
    console.log(`     pdf_link: "${link.doc.pdfLink?.substring(0, 60)}..."`);
    console.log(`     primary_commodity: "${link.company.commodity}"`);
    console.log(`     financial_metrics_count: ${link.validation.foundMetrics.length}`);
    console.log(`     document_quality_score: ${link.qualityScore}`);
    console.log(`     validation_confidence: ${link.validation.confidence}`);
    console.log(`     is_technical_report: ${link.validation.hasRequiredMetrics}`);
    console.log(`   }`);
  }

  console.log('\n' + '═'.repeat(80));
  console.log('\n✅ These links would be stored in the quotemedia_links table');
  console.log('📝 SQL to create table: supabase/migrations/006_create_quotemedia_links.sql');
  console.log('\n🔍 Key Features:');
  console.log('   • Only stores documents with financial indicators');
  console.log('   • Minimum 50 pages to ensure substantial content');
  console.log('   • Quality score based on size, type, and content');
  console.log('   • Tracks which financial metrics are present');
  console.log('   • Links to PDF, HTML, and Excel versions');
}

showValidatedLinks().catch(console.error);