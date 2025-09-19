#!/usr/bin/env node

/**
 * Find real technical reports from known mining companies
 */

async function findRealReports() {
  const headers = {
    'User-Agent': 'Lithos Mining Analytics info@lithos.io',
    'Accept': 'application/json',
  };

  // These are actual mining companies with correct CIKs
  const miningCompanies = [
    { cik: '0000861878', name: 'Freeport-McMoRan', ticker: 'FCX' },
    { cik: '0001618921', name: 'MP Materials', ticker: 'MP' },
    { cik: '0001164727', name: 'Newmont', ticker: 'NEM' },
    { cik: '0001053507', name: 'Hecla Mining', ticker: 'HL' },
    { cik: '0000766704', name: 'Coeur Mining', ticker: 'CDE' },
  ];

  console.log('🔍 SEARCHING FOR REAL TECHNICAL REPORTS');
  console.log('=' .repeat(60));

  let totalReportsFound = 0;

  for (const company of miningCompanies) {
    console.log(`\n📊 ${company.name} (${company.ticker})`);
    console.log('-' .repeat(40));

    try {
      const submissionsUrl = `https://data.sec.gov/submissions/CIK${company.cik.padStart(10, '0')}.json`;
      const response = await fetch(submissionsUrl, { headers });

      if (!response.ok) continue;

      const data = await response.json();
      const recent = data.filings?.recent;

      if (!recent) continue;

      // Search through recent filings
      const limit = Math.min(100, recent.accessionNumber.length);
      let companyReports = 0;

      for (let i = 0; i < limit; i++) {
        const formType = recent.form[i];
        const filingDate = recent.filingDate[i];
        const accession = recent.accessionNumber[i];

        // Focus on forms that typically contain technical reports
        if (!['8-K', '10-K', '10-K/A', '10-Q', '20-F', '40-F', 'S-1', 'S-1/A', 'DEF 14A', 'DEFA14A'].includes(formType)) {
          continue;
        }

        const accessionClean = accession.replace(/-/g, '');
        const indexUrl = `https://www.sec.gov/Archives/edgar/data/${company.cik}/${accessionClean}/index.json`;

        try {
          const indexResponse = await fetch(indexUrl, { headers });

          if (!indexResponse.ok) continue;

          const indexData = await indexResponse.json();
          const items = indexData.directory?.item || [];

          for (const item of items) {
            const name = (item.name || '').toLowerCase();
            const desc = (item.description || '').toLowerCase();
            const size = item.size || 0;

            // Skip small files and images
            if (size < 50000) continue;
            if (name.endsWith('.jpg') || name.endsWith('.jpeg') ||
                name.endsWith('.png') || name.endsWith('.gif') ||
                name.endsWith('.xml') || name.endsWith('.xsd')) continue;

            // Look for technical report patterns
            const isTechnicalReport = (
              // Exhibit numbers for technical reports
              name.includes('ex-96') || name.includes('ex96') ||
              name.includes('ex-99') || name.includes('ex99') ||
              name.includes('ex-10') || name.includes('ex10') ||

              // Technical report keywords in description
              desc.includes('technical report') ||
              desc.includes('feasibility') ||
              desc.includes('mineral resource') ||
              desc.includes('mineral reserve') ||
              desc.includes('ni 43-101') || desc.includes('43-101') ||
              desc.includes('sk-1300') || desc.includes('sk 1300') ||
              desc.includes('preliminary economic assessment') ||
              desc.includes('pea') ||
              desc.includes('mine plan') ||
              desc.includes('resource estimate') ||

              // Large HTML/PDF files that might be reports
              (size > 1000000 && (name.endsWith('.htm') || name.endsWith('.html') || name.endsWith('.pdf')) &&
               (desc.includes('report') || desc.includes('assessment') || desc.includes('study')))
            );

            if (isTechnicalReport) {
              const url = `https://www.sec.gov/Archives/edgar/data/${company.cik}/${accessionClean}/${item.name}`;
              const sizeMB = (size / 1024 / 1024).toFixed(2);

              totalReportsFound++;
              companyReports++;

              console.log(`\n✅ TECHNICAL REPORT #${totalReportsFound}`);
              console.log(`   Form: ${formType} | Date: ${filingDate}`);
              console.log(`   File: ${item.name}`);
              console.log(`   Description: ${item.description || 'Technical Report'}`);
              console.log(`   Size: ${sizeMB} MB`);
              console.log(`   URL: ${url}`);
            }
          }
        } catch (error) {
          // Skip errors
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (companyReports === 0) {
        console.log('   No technical reports found in recent filings');
      } else {
        console.log(`\n   Total for ${company.name}: ${companyReports} reports`);
      }

    } catch (error) {
      console.log(`   Error: ${error}`);
    }
  }

  console.log('\n' + '=' .repeat(60));
  console.log(`📊 TOTAL TECHNICAL REPORTS FOUND: ${totalReportsFound}`);
  console.log('=' .repeat(60));
}

findRealReports().catch(console.error);