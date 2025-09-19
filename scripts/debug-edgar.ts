#!/usr/bin/env node

/**
 * Debug script to see what documents are actually available
 */

async function debugEdgar() {
  const headers = {
    'User-Agent': 'Lithos Mining Analytics info@lithos.io',
    'Accept': 'application/json',
  };

  // Test with a known mining company that should have reports
  const testCompanies = [
    { cik: '0001618921', name: 'MP Materials' },
    { cik: '0001164727', name: 'Newmont' },
    { cik: '0000831259', name: 'Barrick Gold' },
  ];

  for (const company of testCompanies) {
    console.log(`\n🔍 Checking ${company.name} (CIK: ${company.cik})`);
    console.log('=' .repeat(60));

    try {
      // Get recent submissions
      const submissionsUrl = `https://data.sec.gov/submissions/CIK${company.cik.padStart(10, '0')}.json`;
      const response = await fetch(submissionsUrl, { headers });

      if (!response.ok) {
        console.log('❌ Failed to fetch submissions');
        continue;
      }

      const data = await response.json();
      const recent = data.filings?.recent;

      if (!recent) {
        console.log('❌ No recent filings found');
        continue;
      }

      console.log(`✅ Found ${recent.accessionNumber.length} recent filings\n`);

      // Check first 5 filings in detail
      const limit = Math.min(5, recent.accessionNumber.length);

      for (let i = 0; i < limit; i++) {
        const formType = recent.form[i];
        const filingDate = recent.filingDate[i];
        const accession = recent.accessionNumber[i];
        const primaryDoc = recent.primaryDocument?.[i];

        console.log(`📄 Filing ${i + 1}:`);
        console.log(`   Form: ${formType}`);
        console.log(`   Date: ${filingDate}`);
        console.log(`   Accession: ${accession}`);
        console.log(`   Primary Doc: ${primaryDoc || 'N/A'}`);

        // Get filing details
        const accessionClean = accession.replace(/-/g, '');
        const indexUrl = `https://www.sec.gov/Archives/edgar/data/${company.cik}/${accessionClean}/index.json`;

        const indexResponse = await fetch(indexUrl, { headers });

        if (indexResponse.ok) {
          const indexData = await indexResponse.json();
          const items = indexData.directory?.item || [];

          console.log(`   Files in filing: ${items.length}`);

          // Show all exhibit files
          const exhibits = items.filter(item => {
            const name = item.name.toLowerCase();
            return name.includes('ex-') || name.includes('ex_') ||
                   name.includes('exhibit') || name.includes('.pdf') ||
                   (name.includes('.htm') && !name.includes('index'));
          });

          if (exhibits.length > 0) {
            console.log(`   📎 Exhibits found:`);
            for (const ex of exhibits.slice(0, 5)) {
              const sizeMB = ((ex.size || 0) / 1024 / 1024).toFixed(2);
              console.log(`      - ${ex.name} (${sizeMB} MB): ${ex.description || 'No description'}`);
            }
          }
        }

        console.log('');

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      }

    } catch (error) {
      console.log(`❌ Error: ${error}`);
    }
  }
}

debugEdgar().catch(console.error);