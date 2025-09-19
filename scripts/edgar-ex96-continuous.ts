#!/usr/bin/env node

/**
 * Continuous EX-96 Technical Report Extractor
 * Uses SEC EDGAR full-text search API to find ALL EX-96 documents
 * Runs continuously and extracts hundreds of documents
 */

interface EX96Document {
  cik: string;
  companyName: string;
  filingDate: string;
  formType: string;
  accessionNumber: string;
  fileNumber: string;
  exhibitUrl: string;
}

class ContinuousEX96Extractor {
  private readonly headers: HeadersInit;
  private readonly minRequestInterval = 125; // 8 requests/second max
  private lastRequestTime = 0;
  private documentsFound = new Set<string>(); // Track unique documents
  private totalDocuments = 0;
  private startTime = Date.now();
  private isRunning = true;

  constructor() {
    this.headers = {
      'User-Agent': 'Lithos Mining Analytics info@lithos.io',
      'Accept': 'application/json',
    };

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      this.shutdown();
    });
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
    console.log('⛏️  CONTINUOUS EX-96 TECHNICAL REPORT EXTRACTOR');
    console.log('=' .repeat(60));
    console.log('📊 Extracting ALL SK-1300 Technical Report Summaries');
    console.log('🔄 Runs continuously until stopped (Ctrl+C)');
    console.log('⚡ Target: Hundreds of technical reports with NPV/IRR');
    console.log('=' .repeat(60));
    console.log('');

    // Run multiple extraction methods in parallel
    await Promise.all([
      this.extractViaFullTextSearch(),
      this.extractFromKnownMiningCompanies(),
      this.extractFromRecentFilings()
    ]);
  }

  async extractViaFullTextSearch() {
    console.log('🔍 Method 1: Full-text search for EX-96 documents...\n');

    // Search terms that find EX-96 documents
    const searchQueries = [
      'EX-96.1',
      'EX-96.2',
      'EX-96.3',
      '"technical report summary"',
      '"SK-1300" AND "mineral"',
      '"feasibility study" AND exhibit',
      '"preliminary economic assessment"',
      '"mineral resource estimate"',
      '"mineral reserve"',
      '"net present value" AND mining',
      '"internal rate of return" AND mining'
    ];

    for (const query of searchQueries) {
      if (!this.isRunning) break;

      await this.searchEdgar(query);
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second between different searches
    }
  }

  async searchEdgar(searchTerm: string) {
    try {
      await this.enforceRateLimit();

      // Using the EDGAR full-text search endpoint
      const encodedQuery = encodeURIComponent(searchTerm);
      const searchUrl = `https://efts.sec.gov/LATEST/search-index?q=${encodedQuery}&dateRange=all&category=form-cat1&locationType=located&locationCode=all`;

      const response = await fetch(searchUrl, { headers: this.headers });

      if (!response.ok) {
        console.log(`⚠️  Search failed for: ${searchTerm}`);
        return;
      }

      const data = await response.json();
      const hits = data.hits?.hits || [];

      for (const hit of hits) {
        await this.processSearchHit(hit);
      }

    } catch (error) {
      // Continue on error
    }
  }

  async processSearchHit(hit: any) {
    const source = hit._source || {};
    const cik = source.ciks?.[0];
    const companyName = source.display_names?.[0];
    const filingDate = source.file_date;
    const formType = source.form;
    const accessionNumber = source.adsh;

    if (!cik || !accessionNumber) return;

    // Check for EX-96 exhibits in this filing
    await this.checkFilingForEX96(cik, companyName, accessionNumber, formType, filingDate);
  }

  async extractFromKnownMiningCompanies() {
    console.log('🔍 Method 2: Scanning known mining companies...\n');

    // Extended list of mining companies
    const miningCIKs = [
      '0001263364', // Joway Health
      '0001049659', // Various mining companies
      '0001072772', // Various mining companies
      '0001618921', // MP Materials
      '0001639691', // Perpetua Resources
      '0001649989', // Energy Fuels
      '0001524906', // Uranium Energy
      '0001500198', // Northern Dynasty
      '0001166036', // US Gold Corp
      '0001640147', // Comstock Mining
      '0001885448', // NioCorp Developments
      '0001844820', // Standard Lithium
      '0001865120', // Ioneer
      '0001798562', // Livent
      '0001764925', // Albemarle
      '0001031296', // Piedmont Lithium
      '0001713134', // Lithium Americas
      '0001856437', // Century Aluminum
      '0001764029', // Vista Gold
      '0001385849', // Denison Mines
      '0001889106', // Ur-Energy
      '0001704715', // Arch Resources
      '0001064728', // Alpha Metallurgical
      '0001111711', // CONSOL Energy
      '0000831259', // Freeport-McMoRan
      '0001164727', // Newmont
      '0001053507', // Hecla Mining
      '0000766704', // Coeur Mining
      '0000764180', // Peabody Energy
      '0001558370', // Warrior Met Coal
      '0000008063', // Cleveland-Cliffs
      '0000001750', // Nucor
      '0000315238', // Alcoa
      '0001373835', // United States Steel
      '0001285785', // SSR Mining
      '0000919859', // Pan American Silver
      '0001203464', // Agnico Eagle
      '0001023514', // Gold Fields
      '0001558336', // Sibanye Stillwater
      '0001748773', // Kinross Gold
      '0001590955', // Teck Resources
      '0001061768', // Taseko Mines
      '0001209164', // Southern Copper
      '0001489137', // Rare Element Resources
      '0001671858', // American Rare Earths
      '0001368308', // Rio Tinto ADR
      '0001495048', // Vale ADR
      '0000863069', // BHP ADR
    ];

    for (const cik of miningCIKs) {
      if (!this.isRunning) break;

      await this.scanCompanyFilings(cik);
    }
  }

  async scanCompanyFilings(cik: string) {
    try {
      await this.enforceRateLimit();

      const paddedCik = cik.padStart(10, '0');
      const submissionsUrl = `https://data.sec.gov/submissions/CIK${paddedCik}.json`;

      const response = await fetch(submissionsUrl, { headers: this.headers });

      if (!response.ok) return;

      const data = await response.json();
      const companyName = data.name;
      const recent = data.filings?.recent;

      if (!recent) return;

      // Scan all recent filings (up to 100)
      const limit = Math.min(100, recent.accessionNumber?.length || 0);

      for (let i = 0; i < limit; i++) {
        if (!this.isRunning) break;

        const formType = recent.form[i];
        const filingDate = recent.filingDate[i];
        const accession = recent.accessionNumber[i];

        // Check relevant forms
        if (['8-K', '10-K', '10-K/A', '10-Q', 'S-1', 'S-1/A', 'F-1', 'F-1/A', '20-F', '40-F', 'DEF 14A'].includes(formType)) {
          await this.checkFilingForEX96(cik, companyName, accession, formType, filingDate);
        }
      }

    } catch (error) {
      // Continue on error
    }
  }

  async checkFilingForEX96(
    cik: string,
    companyName: string,
    accession: string,
    formType: string,
    filingDate: string
  ) {
    try {
      await this.enforceRateLimit();

      const accessionClean = accession.replace(/-/g, '');
      const indexUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionClean}/index.json`;

      const response = await fetch(indexUrl, { headers: this.headers });

      if (!response.ok) return;

      const indexData = await response.json();
      const items = indexData.directory?.item || [];

      for (const item of items) {
        const name = (item.name || '').toLowerCase();
        const desc = (item.description || '').toLowerCase();

        // Check for EX-96 exhibits (any variation)
        const isEX96 = (
          name.includes('ex-96') || name.includes('ex96') ||
          name.includes('ex_96') || name.includes('exhibit96') ||
          name.includes('ex-95') || name.includes('ex95') || // Sometimes filed as EX-95
          name.includes('ex-99') && (desc.includes('technical report') || desc.includes('sk-1300')) ||
          desc.includes('technical report summary') ||
          desc.includes('sk-1300') || desc.includes('sk 1300')
        );

        if (isEX96 && (name.endsWith('.htm') || name.endsWith('.html'))) {
          const exhibitUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionClean}/${item.name}`;

          // Check if we've already found this document
          if (!this.documentsFound.has(exhibitUrl)) {
            this.documentsFound.add(exhibitUrl);
            this.totalDocuments++;

            // Display the found document
            this.displayDocument({
              cik,
              companyName: companyName || 'Unknown Company',
              filingDate,
              formType,
              accessionNumber: accession,
              fileNumber: item.name,
              exhibitUrl
            });
          }
        }
      }

    } catch (error) {
      // Continue on error
    }
  }

  async extractFromRecentFilings() {
    console.log('🔍 Method 3: Monitoring recent SEC filings...\n');

    while (this.isRunning) {
      await this.checkLatestFilings();
      await new Promise(resolve => setTimeout(resolve, 60000)); // Check every minute
    }
  }

  async checkLatestFilings() {
    try {
      await this.enforceRateLimit();

      // Get latest filings feed
      const latestUrl = 'https://data.sec.gov/submissions/recent.json';
      const response = await fetch(latestUrl, { headers: this.headers });

      if (!response.ok) return;

      const data = await response.json();
      const filings = data.filings || [];

      for (const filing of filings.slice(0, 50)) { // Check first 50 recent
        if (!this.isRunning) break;

        const cik = filing.cik;
        const companyName = filing.companyName;
        const formType = filing.form;
        const filingDate = filing.filingDate;
        const accession = filing.accessionNumber;

        // Check if it might contain technical reports
        if (['8-K', '10-K', '10-K/A', '10-Q', 'S-1', 'S-1/A', 'F-1', '20-F', '40-F'].includes(formType)) {
          await this.checkFilingForEX96(cik, companyName, accession, formType, filingDate);
        }
      }

    } catch (error) {
      // Continue on error
    }
  }

  displayDocument(doc: EX96Document) {
    const elapsed = (Date.now() - this.startTime) / 1000;
    const rate = this.totalDocuments / (elapsed / 60); // docs per minute

    console.log(`\n✅ [${this.totalDocuments}] EX-96 TECHNICAL REPORT`);
    console.log(`   Company: ${doc.companyName}`);
    console.log(`   CIK: ${doc.cik}`);
    console.log(`   Filed: ${doc.filingDate} (${doc.formType})`);
    console.log(`   URL: ${doc.exhibitUrl}`);
    console.log(`   ⚡ Rate: ${rate.toFixed(1)} docs/min | Total: ${this.totalDocuments} documents`);
  }

  shutdown() {
    this.isRunning = false;

    console.log('\n\n' + '=' .repeat(60));
    console.log('📊 EXTRACTION SUMMARY');
    console.log('=' .repeat(60));

    const elapsed = (Date.now() - this.startTime) / 1000;
    const minutes = Math.floor(elapsed / 60);
    const seconds = Math.floor(elapsed % 60);

    console.log(`Total EX-96 Documents Found: ${this.totalDocuments}`);
    console.log(`Unique Documents: ${this.documentsFound.size}`);
    console.log(`Runtime: ${minutes}m ${seconds}s`);
    console.log(`Average Rate: ${(this.totalDocuments / (elapsed / 60)).toFixed(1)} documents/minute`);

    console.log('\n📁 All document URLs saved to: edgar-ex96-urls.txt');

    // Save all URLs to file
    const fs = require('fs');
    const urls = Array.from(this.documentsFound).join('\n');
    fs.writeFileSync('edgar-ex96-urls.txt', urls);

    process.exit(0);
  }
}

// Start the continuous extractor
const extractor = new ContinuousEX96Extractor();
extractor.start().catch(console.error);