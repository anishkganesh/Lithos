#!/usr/bin/env node

/**
 * Fast EX-96 Technical Report Stream
 * Optimized for speed - prints links immediately
 */

class FastEX96Stream {
  private readonly headers: HeadersInit;
  private documentsFound = new Set<string>();
  private totalDocuments = 0;
  private requestCount = 0;

  // All known mining CIKs
  private readonly miningCIKs = [
    '0001263364', '0001049659', '0001072772', '0001618921', '0001639691',
    '0001649989', '0001524906', '0001500198', '0001166036', '0001640147',
    '0001885448', '0001844820', '0001865120', '0001798562', '0001764925',
    '0001031296', '0001713134', '0001856437', '0001764029', '0001385849',
    '0001889106', '0001704715', '0001064728', '0001111711', '0000831259',
    '0001164727', '0001053507', '0000766704', '0000764180', '0001558370',
    '0000008063', '0000001750', '0000315238', '0001373835', '0001285785',
    '0000919859', '0001203464', '0001023514', '0001558336', '0001748773',
    '0001590955', '0001061768', '0001209164', '0001489137', '0001671858',
    '0001368308', '0001495048', '0000863069', '0001530804', '0001086600',
    '0001163302', '0001524741', '0000082020', '0001011509', '0001421461',
    '0001691303', '0001888654', '0001770561', '0001407583', '0001576873',
    '0000903419', '0001054905', '0001711375', '0001519469', '0001487718',
    '0002035304', '0001684688', '0001567900', '0000795800', '0001701051',
    '0001861371', '0002055012', '0002036973'
  ];

  constructor() {
    this.headers = {
      'User-Agent': 'Lithos Mining Analytics info@lithos.io',
      'Accept': 'application/json',
    };
  }

  async start() {
    console.log('⚡ FAST EX-96 TECHNICAL REPORT STREAM');
    console.log('=' .repeat(60));
    console.log('📊 Extracting SK-1300 Technical Reports');
    console.log('🔄 Maximum speed extraction');
    console.log(`🎯 Scanning ${this.miningCIKs.length} companies in parallel`);
    console.log('=' .repeat(60));
    console.log('');

    // Process in batches for maximum speed
    await this.processBatches();
  }

  private async processBatches() {
    const batchSize = 5; // Process 5 companies at once

    for (let i = 0; i < this.miningCIKs.length; i += batchSize) {
      const batch = this.miningCIKs.slice(i, i + batchSize);

      // Process batch in parallel
      const promises = batch.map(cik => this.scanCompany(cik));
      await Promise.allSettled(promises);

      // Small delay between batches to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`\n✅ Scan complete: ${this.totalDocuments} EX-96 documents found`);
    console.log('Restarting scan for new filings...\n');

    // Restart scan
    await this.processBatches();
  }

  private async scanCompany(cik: string) {
    const paddedCik = cik.padStart(10, '0');
    const submissionsUrl = `https://data.sec.gov/submissions/CIK${paddedCik}.json`;

    try {
      const response = await fetch(submissionsUrl, { headers: this.headers });
      this.requestCount++;

      if (!response.ok) return;

      const data = await response.json();
      const companyName = data.name || 'Unknown';
      const recent = data.filings?.recent;

      if (!recent) return;

      // Process all filings in parallel
      const filingPromises = [];
      const limit = Math.min(20, recent.accessionNumber?.length || 0); // Check last 20 filings

      for (let i = 0; i < limit; i++) {
        const formType = recent.form[i];

        // Only check relevant forms
        if (['8-K', '10-K', '10-K/A', '10-Q', 'S-1', 'S-1/A', 'F-1', '20-F', '40-F', '20FR12B', '6-K'].includes(formType)) {
          const filingDate = recent.filingDate[i];
          const accession = recent.accessionNumber[i];

          filingPromises.push(this.checkFiling(cik, companyName, accession, formType, filingDate));
        }
      }

      // Check all filings in parallel
      await Promise.allSettled(filingPromises);

    } catch (error) {
      // Silent fail
    }
  }

  private async checkFiling(
    cik: string,
    companyName: string,
    accession: string,
    formType: string,
    filingDate: string
  ) {
    const accessionClean = accession.replace(/-/g, '');
    const indexUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionClean}/index.json`;

    try {
      const response = await fetch(indexUrl, { headers: this.headers });
      this.requestCount++;

      if (!response.ok) return;

      const indexData = await response.json();
      const items = indexData.directory?.item || [];

      // Quick scan for EX-96 files
      for (const item of items) {
        const name = (item.name || '').toLowerCase();

        // Fast check - just look at filename
        if ((name.includes('ex-96') || name.includes('ex96') ||
             name.includes('ex-95') || name.includes('ex95') ||
             name.includes('ex_96') || name.includes('ex_95')) &&
            (name.endsWith('.htm') || name.endsWith('.html'))) {

          const exhibitUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionClean}/${item.name}`;

          // New document found
          if (!this.documentsFound.has(exhibitUrl)) {
            this.documentsFound.add(exhibitUrl);
            this.totalDocuments++;

            // PRINT IMMEDIATELY - just the URL for speed
            console.log(`[${this.totalDocuments}] ${exhibitUrl}`);
          }
        }
      }
    } catch (error) {
      // Silent fail
    }
  }
}

// Start the fast stream
const stream = new FastEX96Stream();
stream.start().catch(console.error);