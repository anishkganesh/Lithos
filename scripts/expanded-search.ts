#!/usr/bin/env node

/**
 * Expanded search for any mining-related substantial documents
 */

async function expandedSearch() {
  const headers = {
    'User-Agent': 'Lithos Mining Analytics info@lithos.io',
    'Accept': 'application/json',
  };

  const miningCompanies = [
    { cik: '0000861878', name: 'Freeport-McMoRan', ticker: 'FCX' },
    { cik: '0001618921', name: 'MP Materials', ticker: 'MP' },
    { cik: '0001164727', name: 'Newmont', ticker: 'NEM' },
  ];

  console.log('🔍 EXPANDED SEARCH FOR MINING DOCUMENTS');
  console.log('Looking for: Investor presentations, operational reports, production data');
  console.log('=' .repeat(60));

  let totalDocumentsFound = 0;

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

      // Check most recent 20 filings
      const limit = Math.min(20, recent.accessionNumber.length);

      for (let i = 0; i < limit; i++) {
        const formType = recent.form[i];
        const filingDate = recent.filingDate[i];
        const accession = recent.accessionNumber[i];
        const primaryDoc = recent.primaryDocument?.[i];

        // Skip insider trading forms
        if (formType === '4' || formType === '144' || formType === '3' || formType === '5') continue;

        const accessionClean = accession.replace(/-/g, '');
        const indexUrl = `https://www.sec.gov/Archives/edgar/data/${company.cik}/${accessionClean}/index.json`;

        try {
          const indexResponse = await fetch(indexUrl, { headers });

          if (!indexResponse.ok) continue;

          const indexData = await indexResponse.json();
          const items = indexData.directory?.item || [];

          // Show primary document first if it's substantial
          if (primaryDoc) {
            const primaryItem = items.find(item => item.name === primaryDoc);
            if (primaryItem && primaryItem.size > 100000) {
              const url = `https://www.sec.gov/Archives/edgar/data/${company.cik}/${accessionClean}/${primaryItem.name}`;
              const sizeMB = (primaryItem.size / 1024 / 1024).toFixed(2);

              console.log(`\n📄 ${formType} Filing (${filingDate})`);
              console.log(`   Primary: ${primaryItem.name} (${sizeMB} MB)`);
              console.log(`   URL: ${url}`);
              totalDocumentsFound++;
            }
          }

          // Look for exhibits (any substantial ones)
          const exhibits = items.filter(item => {
            const name = item.name.toLowerCase();
            const size = item.size || 0;

            return size > 100000 && // > 100KB
                   !name.endsWith('.xml') &&
                   !name.endsWith('.xsd') &&
                   !name.endsWith('.jpg') &&
                   !name.endsWith('.jpeg') &&
                   !name.endsWith('.png') &&
                   !name.endsWith('.gif') &&
                   (name.includes('ex-') || name.includes('ex_') ||
                    name.includes('exhibit'));
          });

          if (exhibits.length > 0) {
            for (const exhibit of exhibits.slice(0, 3)) {
              const url = `https://www.sec.gov/Archives/edgar/data/${company.cik}/${accessionClean}/${exhibit.name}`;
              const sizeMB = (exhibit.size / 1024 / 1024).toFixed(2);

              console.log(`   Exhibit: ${exhibit.name} (${sizeMB} MB)`);
              console.log(`   Desc: ${exhibit.description || 'No description'}`);
              console.log(`   URL: ${url}`);
              totalDocumentsFound++;
            }
          }
        } catch (error) {
          // Skip errors
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      }

    } catch (error) {
      console.log(`   Error: ${error}`);
    }
  }

  console.log('\n' + '=' .repeat(60));
  console.log(`📊 TOTAL DOCUMENTS FOUND: ${totalDocumentsFound}`);
  console.log('=' .repeat(60));

  // Now let's try SEDAR+ for Canadian companies (they have more technical reports)
  console.log('\n💡 Note: Most technical reports (NI 43-101) are filed on SEDAR+ for Canadian companies');
  console.log('   SEC filings typically contain operational updates and financial reports');
}

expandedSearch().catch(console.error);