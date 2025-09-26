#!/usr/bin/env npx tsx
/**
 * Show REAL SEDAR and EDGAR document links from QuoteMedia
 * Focus on technical reports and mining documents
 */

import { config } from 'dotenv';
import { QuoteMediaClient } from '../lib/quotemedia/api-client';

config({ path: '.env.local' });

async function showSedarEdgarLinks() {
  console.log('🔗 REAL SEDAR & EDGAR Document Links from QuoteMedia');
  console.log('=====================================================\n');

  const password = process.env.QUOTEMEDIA_WEBSERVICE_PASSWORD || 'dfbsembl48';
  const client = new QuoteMediaClient(password);

  // CANADIAN COMPANIES (SEDAR) - More likely to have NI 43-101
  console.log('🇨🇦 CANADIAN COMPANIES (SEDAR FILINGS)');
  console.log('========================================\n');

  const canadianCompanies = [
    { symbol: 'IMG.TO', name: 'IAMGOLD Corporation' },
    { symbol: 'AGI.TO', name: 'Alamos Gold' },
    { symbol: 'K.TO', name: 'Kinross Gold' },
    { symbol: 'AEM.TO', name: 'Agnico Eagle' },
    { symbol: 'NG.TO', name: 'NovaGold' },
  ];

  for (const company of canadianCompanies) {
    console.log(`📊 ${company.name} (${company.symbol})`);
    console.log('─'.repeat(80));

    try {
      // Try to get more documents to find technical reports
      const documents = await client.getCompanyFilings({
        symbol: company.symbol,
        limit: 20, // Get more documents to find technical reports
      });

      console.log(`Found ${documents.length} total documents\n`);

      // Look for technical documents
      let technicalCount = 0;
      let shownDocs = 0;
      const maxShow = 3;

      for (const doc of documents) {
        // Check if it might be a technical document
        const formDesc = (doc.formDescription || '').toLowerCase();
        const formType = (doc.formType || '').toLowerCase();

        const isTechnical =
          formDesc.includes('43-101') ||
          formDesc.includes('technical') ||
          formDesc.includes('mineral') ||
          formDesc.includes('resource') ||
          formDesc.includes('reserve') ||
          formDesc.includes('feasibility') ||
          formDesc.includes('preliminary economic') ||
          formDesc.includes('pea') ||
          formType.includes('43-101') ||
          formType.includes('technical');

        // Always show technical reports, or show regular docs if we haven't shown enough
        if (isTechnical || (shownDocs < maxShow && technicalCount === 0)) {
          if (isTechnical) {
            console.log('⭐ TECHNICAL REPORT FOUND! ⭐');
            technicalCount++;
          }

          console.log(`\n📄 Form: ${doc.formType}`);
          console.log(`   Description: ${doc.formDescription}`);
          console.log(`   Date Filed: ${doc.dateFiled}`);
          console.log(`   Company: ${doc.companyName || company.name}`);
          console.log(`   File Size: ${doc.fileSize || 'N/A'}`);
          console.log(`   Pages: ${doc.pages || 'N/A'}`);

          if (doc.pdfLink) {
            console.log(`\n   📥 PDF SEDAR Link:`);
            console.log(`   ${doc.pdfLink}`);
          }

          if (doc.htmlLink) {
            console.log(`\n   🌐 HTML SEDAR Link:`);
            console.log(`   ${doc.htmlLink}`);
          }

          console.log('\n   ' + '─'.repeat(76));
          shownDocs++;

          if (shownDocs >= maxShow && technicalCount > 0) break;
        }
      }

      if (technicalCount === 0) {
        console.log('   ℹ️ No technical reports in recent filings (checked last 20)');
      } else {
        console.log(`\n   ✅ Found ${technicalCount} technical report(s)!`);
      }

      console.log('\n');

    } catch (error) {
      console.error(`   ❌ Error: ${error instanceof Error ? error.message : error}\n`);
    }
  }

  // US COMPANIES (EDGAR)
  console.log('\n🇺🇸 US COMPANIES (EDGAR FILINGS)');
  console.log('==================================\n');

  const usCompanies = [
    { symbol: 'FCX', name: 'Freeport-McMoRan' },
    { symbol: 'NEM', name: 'Newmont Corporation' },
    { symbol: 'CDE', name: 'Coeur Mining' },
    { symbol: 'HL', name: 'Hecla Mining' },
    { symbol: 'RGLD', name: 'Royal Gold' },
  ];

  for (const company of usCompanies) {
    console.log(`📊 ${company.name} (${company.symbol})`);
    console.log('─'.repeat(80));

    try {
      const documents = await client.getCompanyFilings({
        symbol: company.symbol,
        limit: 15,
      });

      console.log(`Found ${documents.length} total documents\n`);

      let shownDocs = 0;
      const maxShow = 2;

      // Focus on 10-K, 10-Q, and 8-K which might contain technical reports
      const importantDocs = documents.filter(doc =>
        ['10-K', '10-Q', '8-K', '20-F'].includes(doc.formType)
      ).slice(0, maxShow);

      if (importantDocs.length === 0) {
        // Show any documents if no important ones found
        importantDocs.push(...documents.slice(0, maxShow));
      }

      for (const doc of importantDocs) {
        console.log(`\n📄 Form: ${doc.formType}`);
        console.log(`   Description: ${doc.formDescription}`);
        console.log(`   Date Filed: ${doc.dateFiled}`);
        console.log(`   Company: ${doc.companyName || company.name}`);
        console.log(`   CIK: ${doc.cik || 'N/A'}`);
        console.log(`   Accession: ${doc.accessionNumber || 'N/A'}`);
        console.log(`   File Size: ${doc.fileSize || 'N/A'}`);
        console.log(`   Pages: ${doc.pages || 'N/A'}`);

        if (doc.pdfLink) {
          console.log(`\n   📥 PDF EDGAR Link:`);
          console.log(`   ${doc.pdfLink}`);
        }

        if (doc.htmlLink) {
          console.log(`\n   🌐 HTML EDGAR Link:`);
          console.log(`   ${doc.htmlLink}`);
        }

        if (doc.xlsLink) {
          console.log(`\n   📊 Excel EDGAR Link:`);
          console.log(`   ${doc.xlsLink}`);
        }

        console.log('\n   ' + '─'.repeat(76));
      }

      console.log('\n');

    } catch (error) {
      console.error(`   ❌ Error: ${error instanceof Error ? error.message : error}\n`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n📝 SUMMARY OF LINKS:');
  console.log('--------------------\n');
  console.log('🇨🇦 SEDAR Links (Canadian):');
  console.log('   • Direct PDF downloads from SEDAR via QuoteMedia proxy');
  console.log('   • HTML versions for web viewing');
  console.log('   • Look for form types: NI 43-101, Technical Report, PEA, Feasibility Study');
  console.log('\n🇺🇸 EDGAR Links (US):');
  console.log('   • SEC filing documents (10-K, 10-Q, 8-K)');
  console.log('   • Excel data exports available');
  console.log('   • Technical Report Summaries often in 10-K exhibits');
  console.log('\n✨ All links include:');
  console.log('   • Your webmasterId (131706) for authentication');
  console.log('   • CDN tokens for fast access');
  console.log('   • Direct download capability with enterprise token');
}

showSedarEdgarLinks().catch(console.error);