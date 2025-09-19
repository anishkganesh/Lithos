#!/usr/bin/env node

/**
 * Real-time EX-96 Technical Report Stream
 * Prints links immediately as they're found
 */

class RealtimeEX96Stream {
  private readonly headers: HeadersInit;
  private readonly minRequestInterval = 125; // 8 requests/second
  private lastRequestTime = 0;
  private documentsFound = new Set<string>();
  private totalDocuments = 0;

  // Extended list of mining company CIKs
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

  private currentIndex = 0;

  constructor() {
    this.headers = {
      'User-Agent': 'Lithos Mining Analytics info@lithos.io',
      'Accept': 'application/json',
    };
  }

  private async enforceRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  async start() {
    console.log('⛏️  REAL-TIME EX-96 TECHNICAL REPORT STREAM');
    console.log('=' .repeat(60));
    console.log('📊 Extracting SK-1300 Technical Reports with NPV/IRR');
    console.log('🔄 Links printed immediately as found');
    console.log(`🎯 Scanning ${this.miningCIKs.length} mining companies`);
    console.log('=' .repeat(60));
    console.log('');

    // Start continuous scanning
    await this.continuousScan();
  }

  private async continuousScan() {
    while (true) {
      const cik = this.miningCIKs[this.currentIndex];

      try {
        // Check this company's filings
        await this.scanCompany(cik);
      } catch (error) {
        // Silent fail, continue to next
      }

      // Move to next company
      this.currentIndex = (this.currentIndex + 1) % this.miningCIKs.length;

      // Show progress every full cycle
      if (this.currentIndex === 0 && this.totalDocuments > 0) {
        console.log(`\n⏱️  Completed full cycle: ${this.totalDocuments} documents found\n`);
      }
    }
  }

  private async scanCompany(cik: string) {
    await this.enforceRateLimit();

    const paddedCik = cik.padStart(10, '0');
    const submissionsUrl = `https://data.sec.gov/submissions/CIK${paddedCik}.json`;

    try {
      const response = await fetch(submissionsUrl, { headers: this.headers });
      if (!response.ok) return;

      const data = await response.json();
      const companyName = data.name || 'Unknown';
      const recent = data.filings?.recent;

      if (!recent) return;

      // Check recent filings (up to 50)
      const limit = Math.min(50, recent.accessionNumber?.length || 0);

      for (let i = 0; i < limit; i++) {
        const formType = recent.form[i];
        const filingDate = recent.filingDate[i];
        const accession = recent.accessionNumber[i];

        // Only check forms that might have technical reports
        if (['8-K', '10-K', '10-K/A', '10-Q', 'S-1', 'S-1/A', 'F-1', 'F-1/A', '20-F', '40-F', 'DEF 14A', '10-12B', '20FR12B', '6-K', '425'].includes(formType)) {
          await this.checkFiling(cik, companyName, accession, formType, filingDate);
        }
      }
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
    await this.enforceRateLimit();

    const accessionClean = accession.replace(/-/g, '');
    const indexUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionClean}/index.json`;

    try {
      const response = await fetch(indexUrl, { headers: this.headers });
      if (!response.ok) return;

      const indexData = await response.json();
      const items = indexData.directory?.item || [];

      for (const item of items) {
        const name = (item.name || '').toLowerCase();
        const desc = (item.description || '').toLowerCase();

        // Check for EX-96 exhibits (or EX-95 which are also technical reports)
        const isEX96 = (
          name.includes('ex-96') || name.includes('ex96') ||
          name.includes('ex_96') || name.includes('exhibit96') ||
          name.includes('ex-95') || name.includes('ex95') ||
          (name.includes('ex-99') && (desc.includes('technical') || desc.includes('sk-1300'))) ||
          desc.includes('technical report summary') ||
          desc.includes('sk-1300') || desc.includes('sk 1300')
        );

        if (isEX96 && (name.endsWith('.htm') || name.endsWith('.html'))) {
          const exhibitUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionClean}/${item.name}`;

          // Check if new document
          if (!this.documentsFound.has(exhibitUrl)) {
            this.documentsFound.add(exhibitUrl);
            this.totalDocuments++;

            // PRINT IMMEDIATELY
            console.log(`\n✅ [${this.totalDocuments}] ${exhibitUrl}`);
            console.log(`   Company: ${companyName}`);
            console.log(`   Form: ${formType} | Date: ${filingDate}`);
          }
        }
      }
    } catch (error) {
      // Silent fail
    }
  }
}

// Start the stream
const stream = new RealtimeEX96Stream();
stream.start().catch(console.error);