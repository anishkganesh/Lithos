#!/usr/bin/env node

/**
 * Check exhibits in recent filings
 */

async function checkExhibits() {
  const headers = {
    'User-Agent': 'Lithos Mining Analytics info@lithos.io',
    'Accept': 'application/json',
  };

  // Check Barrick Gold's recent 10-Q (should have exhibits)
  const accession = '0000831259-25-000031';
  const cik = '0000831259';
  const accessionClean = accession.replace(/-/g, '');

  console.log(`📊 Checking Barrick Gold 10-Q Filing`);
  console.log(`Accession: ${accession}`);
  console.log('=' .repeat(60));

  const indexUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionClean}/index.json`;

  try {
    const response = await fetch(indexUrl, { headers });

    if (!response.ok) {
      console.log('❌ Failed to fetch filing index');
      return;
    }

    const data = await response.json();
    const items = data.directory?.item || [];

    console.log(`\n✅ Found ${items.length} files in this filing\n`);

    // Group files by type
    const exhibits = items.filter(item => {
      const name = item.name.toLowerCase();
      return name.includes('ex-') || name.includes('ex_') ||
             name.startsWith('exhibit');
    });

    const htmlFiles = items.filter(item =>
      item.name.toLowerCase().endsWith('.htm') ||
      item.name.toLowerCase().endsWith('.html')
    );

    const pdfFiles = items.filter(item =>
      item.name.toLowerCase().endsWith('.pdf')
    );

    console.log(`📎 File Types:`);
    console.log(`   HTML/HTM files: ${htmlFiles.length}`);
    console.log(`   PDF files: ${pdfFiles.length}`);
    console.log(`   Exhibit files: ${exhibits.length}`);
    console.log('');

    // Show all files with size > 100KB
    const largeFiles = items.filter(item => (item.size || 0) > 100000);

    console.log(`📄 Large Files (>100KB):`);
    for (const file of largeFiles) {
      const sizeMB = ((file.size || 0) / 1024 / 1024).toFixed(2);
      const url = `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionClean}/${file.name}`;

      console.log(`\n   File: ${file.name}`);
      console.log(`   Size: ${sizeMB} MB`);
      console.log(`   Description: ${file.description || 'No description'}`);
      console.log(`   URL: ${url}`);
    }

    // Now check a different type of filing - MP Materials
    console.log('\n\n' + '=' .repeat(60));
    console.log(`📊 Checking MP Materials Recent Filings for Technical Reports`);
    console.log('=' .repeat(60));

    const mpCik = '0001618921';
    const submissionsUrl = `https://data.sec.gov/submissions/CIK${mpCik.padStart(10, '0')}.json`;
    const subResponse = await fetch(submissionsUrl, { headers });

    if (subResponse.ok) {
      const subData = await subResponse.json();
      const recent = subData.filings?.recent;

      // Look for 8-K and 10-K filings (most likely to have technical reports)
      for (let i = 0; i < Math.min(20, recent.accessionNumber.length); i++) {
        const formType = recent.form[i];

        if (formType === '8-K' || formType === '10-K' || formType === '10-K/A') {
          const accNum = recent.accessionNumber[i];
          const date = recent.filingDate[i];
          const accClean = accNum.replace(/-/g, '');

          const fileIndexUrl = `https://www.sec.gov/Archives/edgar/data/${mpCik}/${accClean}/index.json`;
          const fileResponse = await fetch(fileIndexUrl, { headers });

          if (fileResponse.ok) {
            const fileData = await fileResponse.json();
            const fileItems = fileData.directory?.item || [];

            // Look for technical report indicators
            const techReports = fileItems.filter(item => {
              const name = item.name.toLowerCase();
              const desc = (item.description || '').toLowerCase();
              const size = item.size || 0;

              return size > 500000 && // > 500KB
                     (name.includes('ex-96') || name.includes('ex96') ||
                      name.includes('ex-99') || name.includes('ex99') ||
                      desc.includes('technical') || desc.includes('mineral') ||
                      desc.includes('feasibility') || desc.includes('resource'));
            });

            if (techReports.length > 0) {
              console.log(`\n🎯 Found potential technical reports in ${formType} (${date}):`);
              for (const report of techReports) {
                const sizeMB = ((report.size || 0) / 1024 / 1024).toFixed(2);
                const url = `https://www.sec.gov/Archives/edgar/data/${mpCik}/${accClean}/${report.name}`;
                console.log(`   - ${report.name} (${sizeMB} MB)`);
                console.log(`     ${report.description || 'No description'}`);
                console.log(`     URL: ${url}`);
              }
            }
          }

          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }

  } catch (error) {
    console.log(`❌ Error: ${error}`);
  }
}

checkExhibits().catch(console.error);