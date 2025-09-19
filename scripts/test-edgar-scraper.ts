#!/usr/bin/env node

/**
 * Test script for EDGAR SEC scraper
 * Run with: npm run test:edgar
 */

import { EdgarSecScraper } from '../lib/mining-agent/scrapers/edgar-sec-scraper';

async function testEdgarScraper() {
  console.log('='.repeat(60));
  console.log('SEC MINING DOCUMENTS REAL-TIME MONITOR TEST');
  console.log('='.repeat(60));
  console.log('✅ NO API KEY REQUIRED - 100% FREE');
  console.log('✅ Testing with real SEC filings');
  console.log('='.repeat(60));
  console.log('');

  const scraper = new EdgarSecScraper();

  // Test 1: Fetch recent reports
  console.log('📊 TEST 1: Fetching recent mining technical reports...\n');

  try {
    const recentReports = await scraper.getRecentReports(10);

    if (recentReports.length === 0) {
      console.log('No recent reports found. Checking specific companies...\n');

      // Test with specific mining companies
      const testCiks = [
        '0001164727', // Newmont
        '0000831259', // Barrick Gold
        '0000861878', // Freeport-McMoRan
        '0001618921', // MP Materials
      ];

      for (const cik of testCiks) {
        console.log(`Checking CIK ${cik}...`);
        const reports = await scraper.checkLatestFilings(cik.padStart(10, '0'));

        if (reports.length > 0) {
          console.log(`Found ${reports.length} reports:`);
          reports.forEach((report, index) => {
            console.log(`\n📄 Report ${index + 1}:`);
            console.log(`  Company: ${report.companyName} (${report.ticker})`);
            console.log(`  Filed: ${report.filingDate}`);
            console.log(`  Form: ${report.formType}`);
            console.log(`  Title: ${report.reportTitle}`);
            console.log(`  URL: ${report.pdfUrl}`);
            console.log(`  Size: ${(report.fileSize / 1024 / 1024).toFixed(2)} MB`);
          });
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } else {
      console.log(`✅ Found ${recentReports.length} recent technical reports:\n`);

      recentReports.forEach((report, index) => {
        console.log(`📄 Report ${index + 1}:`);
        console.log(`  Company: ${report.companyName} (${report.ticker})`);
        console.log(`  Filed: ${report.filingDate}`);
        console.log(`  Form: ${report.formType}`);
        console.log(`  Title: ${report.reportTitle}`);
        console.log(`  URL: ${report.pdfUrl}`);
        console.log(`  Size: ${(report.fileSize / 1024 / 1024).toFixed(2)} MB`);
        console.log('');
      });
    }

    // Test 2: Real-time monitoring (5 minutes test)
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST 2: Starting real-time monitoring (5-minute test)...');
    console.log('='.repeat(60) + '\n');

    let reportsFound = 0;
    const startTime = Date.now();
    const testDuration = 5 * 60 * 1000; // 5 minutes

    scraper.startMonitoring((report) => {
      reportsFound++;
      console.log('\n🆕 NEW TECHNICAL REPORT DETECTED!');
      console.log(`  #${reportsFound}: ${report.companyName} - ${report.reportTitle}`);
      console.log(`  Filed: ${report.filingDate}`);
      console.log(`  URL: ${report.pdfUrl}`);
    });

    // Wait for test duration
    await new Promise(resolve => {
      const checkInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, testDuration - elapsed);

        if (remaining === 0) {
          clearInterval(checkInterval);
          resolve(undefined);
        } else {
          const minutes = Math.floor(remaining / 60000);
          const seconds = Math.floor((remaining % 60000) / 1000);
          process.stdout.write(`\r⏱️  Monitoring... ${minutes}:${seconds.toString().padStart(2, '0')} remaining`);
        }
      }, 1000);
    });

    scraper.stopMonitoring();

    console.log('\n\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Initial reports found: ${recentReports.length}`);
    console.log(`✅ New reports during monitoring: ${reportsFound}`);
    console.log('✅ Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testEdgarScraper().catch(console.error);