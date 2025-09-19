#!/usr/bin/env node

/**
 * SEC-Compliant Mining Documents Stream
 * Strictly respects SEC rate limits: max 10 requests/second
 * Implements proper throttling and backoff
 */

class SECCompliantStream {
  private readonly secBase = 'https://www.sec.gov';
  private readonly dataBase = 'https://data.sec.gov';
  private readonly headers: HeadersInit;

  // Rate limiting
  private readonly maxRequestsPerSecond = 8; // Stay well below 10 to be safe
  private readonly requestWindow = 1000; // 1 second window
  private requestTimes: number[] = [];
  private blockedUntil: number = 0;

  // Mining companies
  private readonly companies = [
    { cik: '0000831259', name: 'Freeport-McMoRan', ticker: 'FCX' },
    { cik: '0001618921', name: 'MP Materials', ticker: 'MP' },
    { cik: '0001164727', name: 'Newmont', ticker: 'NEM' },
    { cik: '0001053507', name: 'Hecla Mining', ticker: 'HL' },
    { cik: '0000766704', name: 'Coeur Mining', ticker: 'CDE' },
    { cik: '0000764180', name: 'Peabody Energy', ticker: 'BTU' },
    { cik: '0001649989', name: 'Energy Fuels', ticker: 'UUUU' },
    { cik: '0001524906', name: 'Uranium Energy', ticker: 'UEC' },
    { cik: '0001639691', name: 'Perpetua Resources', ticker: 'PPTA' },
    { cik: '0001704715', name: 'Arch Resources', ticker: 'ARCH' },
  ];

  private currentIndex = 0;
  private documentCount = 0;
  private requestCount = 0;
  private startTime = Date.now();
  private processedFilings = new Set<string>();

  constructor() {
    this.headers = {
      'User-Agent': 'Lithos Mining Analytics info@lithos.io',
      'Accept': 'application/json',
    };
  }

  /**
   * Enforces rate limiting before making a request
   */
  private async enforceRateLimit() {
    const now = Date.now();

    // Check if we're in a blocked period
    if (this.blockedUntil > now) {
      const waitTime = this.blockedUntil - now;
      console.log(`⏸️  Rate limit cooldown: waiting ${(waitTime / 1000).toFixed(1)}s...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    // Remove requests older than 1 second
    this.requestTimes = this.requestTimes.filter(time => now - time < this.requestWindow);

    // If we've hit the limit, wait
    if (this.requestTimes.length >= this.maxRequestsPerSecond) {
      const oldestRequest = this.requestTimes[0];
      const waitTime = this.requestWindow - (now - oldestRequest) + 50; // Add 50ms buffer

      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      // Clean up old requests again
      this.requestTimes = this.requestTimes.filter(time => Date.now() - time < this.requestWindow);
    }

    // Record this request
    this.requestTimes.push(Date.now());
  }

  /**
   * Make a rate-limited request to SEC
   */
  private async secFetch(url: string): Promise<Response | null> {
    try {
      await this.enforceRateLimit();
      this.requestCount++;

      const response = await fetch(url, { headers: this.headers });

      // Check for rate limit response
      if (response.status === 429 || response.status === 503) {
        console.log('⚠️  Rate limit hit! Backing off for 10 minutes...');
        this.blockedUntil = Date.now() + (10 * 60 * 1000); // 10 minutes
        return null;
      }

      return response;
    } catch (error) {
      console.log('❌ Request failed:', error);
      return null;
    }
  }

  async start() {
    console.log('⛏️  SEC-COMPLIANT MINING DOCUMENTS STREAM');
    console.log('=' .repeat(60));
    console.log('✅ Respecting SEC rate limits: max 8 req/sec');
    console.log('📊 Document Types: 10-K, 10-Q, 8-K with exhibits');
    console.log(`🎯 Monitoring ${this.companies.length} mining companies`);
    console.log('⏸️  Automatic backoff on rate limit detection');
    console.log('=' .repeat(60));
    console.log('');

    await this.streamDocuments();
  }

  private async streamDocuments() {
    while (true) {
      const company = this.companies[this.currentIndex];

      try {
        await this.checkCompanyFilings(company);
      } catch (error) {
        console.log('Error processing company:', error);
      }

      this.currentIndex = (this.currentIndex + 1) % this.companies.length;

      // Show progress
      if (this.currentIndex === 0) {
        const elapsed = (Date.now() - this.startTime) / 1000;
        const rate = this.requestCount / elapsed;
        console.log(`\n📊 Progress: ${this.requestCount} requests | ${rate.toFixed(1)} req/sec | ${this.documentCount} documents\n`);
      }

      // Add delay between companies to stay well under limit
      await new Promise(resolve => setTimeout(resolve, 200)); // 200ms between companies
    }
  }

  private async checkCompanyFilings(company: any) {
    const submissionsUrl = `${this.dataBase}/submissions/CIK${company.cik.padStart(10, '0')}.json`;
    const response = await this.secFetch(submissionsUrl);

    if (!response || !response.ok) return;

    const data = await response.json();
    const recent = data.filings?.recent;

    if (!recent) return;

    // Check only most recent 5 filings to minimize requests
    const limit = Math.min(5, recent.accessionNumber?.length || 0);

    for (let i = 0; i < limit; i++) {
      const formType = recent.form[i];
      const filingDate = recent.filingDate[i];
      const accession = recent.accessionNumber[i];
      const primaryDoc = recent.primaryDocument?.[i];
      const primaryDocDesc = recent.primaryDocDescription?.[i];

      const filingId = `${company.cik}_${accession}`;

      // Skip if already processed
      if (this.processedFilings.has(filingId)) continue;

      // Focus on most important filings
      if (!['10-K', '10-K/A', '10-Q', '8-K'].includes(formType)) {
        continue;
      }

      const accessionClean = accession.replace(/-/g, '');
      let documentUrl = '';
      let documentType = '';
      let description = primaryDocDesc || formType;

      if (formType.includes('10-K')) {
        documentUrl = `${this.secBase}/Archives/edgar/data/${company.cik}/${accessionClean}/${primaryDoc}`;
        documentType = 'Annual Report';
        description = 'Annual Report - Production data, reserves, NPV/IRR in MD&A';
      } else if (formType.includes('10-Q')) {
        documentUrl = `${this.secBase}/Archives/edgar/data/${company.cik}/${accessionClean}/${primaryDoc}`;
        documentType = 'Quarterly Report';
        description = 'Quarterly Report - Production updates, financial metrics';
      } else if (formType === '8-K') {
        documentUrl = `${this.secBase}/Archives/edgar/data/${company.cik}/${accessionClean}/${primaryDoc}`;
        documentType = 'Current Report';

        // Check for earnings or presentations
        const lowerDesc = (primaryDocDesc || '').toLowerCase();
        if (lowerDesc.includes('earning') || lowerDesc.includes('result')) {
          description = 'Earnings Release - Operational and financial results';

          // For earnings, also check for presentation exhibits
          await this.checkFor8KExhibits(company, accession, filingDate);
        } else if (lowerDesc.includes('presentation') || lowerDesc.includes('investor')) {
          description = 'Investor Presentation - May contain project economics';
        }
      }

      if (documentUrl) {
        this.documentCount++;
        this.processedFilings.add(filingId);

        console.log(`\n📄 [${this.documentCount}] MINING DOCUMENT`);
        console.log(`   Company: ${company.name} (${company.ticker})`);
        console.log(`   Type: ${documentType} (${formType})`);
        console.log(`   Filed: ${filingDate}`);
        console.log(`   Description: ${description}`);
        console.log(`   URL: ${documentUrl}`);
      }
    }
  }

  private async checkFor8KExhibits(company: any, accession: string, filingDate: string) {
    const accessionClean = accession.replace(/-/g, '');
    const indexUrl = `${this.secBase}/Archives/edgar/data/${company.cik}/${accessionClean}/index.json`;

    const response = await this.secFetch(indexUrl);

    if (!response || !response.ok) return;

    const data = await response.json();
    const items = data.directory?.item || [];

    // Look for presentation exhibits only
    const presentationExhibits = items.filter((item: any) => {
      const name = item.name.toLowerCase();
      const desc = (item.description || '').toLowerCase();
      const size = item.size || 0;

      return size > 500000 && // > 500KB
             (name.includes('ex-99') || name.includes('ex99')) &&
             (name.endsWith('.htm') || name.endsWith('.html') || name.endsWith('.pdf')) &&
             (desc.includes('presentation') || desc.includes('slide') || desc.includes('investor'));
    });

    for (const exhibit of presentationExhibits.slice(0, 1)) { // Only first exhibit
      const exhibitUrl = `${this.secBase}/Archives/edgar/data/${company.cik}/${accessionClean}/${exhibit.name}`;
      const sizeMB = ((exhibit.size || 0) / 1024 / 1024).toFixed(1);

      this.documentCount++;

      console.log(`\n📎 [${this.documentCount}] INVESTOR PRESENTATION`);
      console.log(`   Company: ${company.name} (${company.ticker})`);
      console.log(`   Filed: ${filingDate}`);
      console.log(`   File: ${exhibit.name} (${sizeMB} MB)`);
      console.log(`   Description: ${exhibit.description || 'Investor presentation - likely contains project economics'}`);
      console.log(`   URL: ${exhibitUrl}`);
    }
  }
}

// Start the stream
const stream = new SECCompliantStream();
stream.start().catch(console.error);