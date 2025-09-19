#!/usr/bin/env node

/**
 * SEC Mining Documents Stream - Operational Reports & Presentations
 * Focuses on actual documents available in SEC filings
 */

interface MiningDocument {
  company: string;
  ticker: string;
  documentType: string;
  filingDate: string;
  formType: string;
  url: string;
  description: string;
}

class SECMiningDocsStream {
  private readonly secBase = 'https://www.sec.gov';
  private readonly dataBase = 'https://data.sec.gov';
  private readonly headers: HeadersInit;

  // Mining companies that actively file with SEC
  private readonly companies = [
    // Major US-listed miners
    { cik: '0000831259', name: 'Freeport-McMoRan', ticker: 'FCX' },
    { cik: '0001618921', name: 'MP Materials', ticker: 'MP' },
    { cik: '0001164727', name: 'Newmont', ticker: 'NEM' },
    { cik: '0001053507', name: 'Hecla Mining', ticker: 'HL' },
    { cik: '0000766704', name: 'Coeur Mining', ticker: 'CDE' },
    { cik: '0000764180', name: 'Peabody Energy', ticker: 'BTU' },
    { cik: '0001558370', name: 'Warrior Met Coal', ticker: 'HCC' },
    { cik: '0000008063', name: 'Cleveland-Cliffs', ticker: 'CLF' },
    { cik: '0000001750', name: 'Nucor', ticker: 'NUE' },
    { cik: '0000315238', name: 'Alcoa', ticker: 'AA' },
    { cik: '0001373835', name: 'United States Steel', ticker: 'X' },
    { cik: '0001649989', name: 'Energy Fuels', ticker: 'UUUU' },
    { cik: '0001524906', name: 'Uranium Energy', ticker: 'UEC' },
    { cik: '0001639691', name: 'Perpetua Resources', ticker: 'PPTA' },
    { cik: '0001500198', name: 'Northern Dynasty', ticker: 'NAK' },
    { cik: '0001704715', name: 'Arch Resources', ticker: 'ARCH' },
    { cik: '0001064728', name: 'Alpha Metallurgical', ticker: 'AMR' },
    { cik: '0001111711', name: 'CONSOL Energy', ticker: 'CEIX' },
    { cik: '0001385849', name: 'Denison Mines', ticker: 'DNN' },
    { cik: '0001889106', name: 'Ur-Energy', ticker: 'URG' },
    { cik: '0001166036', name: 'US Gold Corp', ticker: 'USAU' },
    { cik: '0001640147', name: 'Comstock Mining', ticker: 'LODE' },
    { cik: '0001764029', name: 'Vista Gold', ticker: 'VGZ' },
    { cik: '0001856437', name: 'Century Aluminum', ticker: 'CENX' },
    { cik: '0001130310', name: 'Kaiser Aluminum', ticker: 'KALU' },
    { cik: '0001075531', name: 'Materion', ticker: 'MTRN' },
  ];

  private currentIndex = 0;
  private documentCount = 0;
  private requestCount = 0;
  private startTime = Date.now();
  private processedFilings = new Set<string>();

  constructor() {
    this.headers = {
      'User-Agent': 'Lithos Mining Analytics info@lithos.io',
      'Accept': 'application/json, text/html',
    };
  }

  async start() {
    console.log('⛏️  SEC MINING DOCUMENTS REAL-TIME STREAM');
    console.log('=' .repeat(60));
    console.log('📊 Document Types: 10-K, 10-Q, 8-K, Proxy Statements');
    console.log('📈 Content: Operational Reports, Production Data, Financial Results');
    console.log(`🎯 Monitoring ${this.companies.length} mining companies`);
    console.log('⚡ Target rate: 10 requests/second');
    console.log('=' .repeat(60));
    console.log('');

    this.streamDocuments();
  }

  private async streamDocuments() {
    while (true) {
      const company = this.companies[this.currentIndex];

      try {
        await this.checkCompanyFilings(company);
      } catch (error) {
        // Silent fail to maintain speed
      }

      this.currentIndex = (this.currentIndex + 1) % this.companies.length;

      // Show progress every full rotation
      if (this.currentIndex === 0) {
        const elapsed = (Date.now() - this.startTime) / 1000;
        const rate = this.requestCount / elapsed;
        console.log(`\n⏱️  Progress: ${this.requestCount} requests | ${rate.toFixed(1)} req/sec | ${this.documentCount} documents found\n`);
      }

      // Rate limiting: 100ms = 10 req/sec
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  private async checkCompanyFilings(company: any) {
    this.requestCount++;

    const submissionsUrl = `${this.dataBase}/submissions/CIK${company.cik.padStart(10, '0')}.json`;
    const response = await fetch(submissionsUrl, { headers: this.headers });

    if (!response.ok) return;

    const data = await response.json();
    const recent = data.filings?.recent;

    if (!recent) return;

    // Check most recent 10 filings
    const limit = Math.min(10, recent.accessionNumber?.length || 0);

    for (let i = 0; i < limit; i++) {
      const formType = recent.form[i];
      const filingDate = recent.filingDate[i];
      const accession = recent.accessionNumber[i];
      const primaryDoc = recent.primaryDocument?.[i];
      const primaryDocDesc = recent.primaryDocDescription?.[i];

      const filingId = `${company.cik}_${accession}`;

      // Skip if already processed
      if (this.processedFilings.has(filingId)) continue;

      // Focus on substantial filings
      if (!['10-K', '10-K/A', '10-Q', '8-K', 'DEF 14A', 'DEFA14A', '20-F', '40-F'].includes(formType)) {
        continue;
      }

      // Build document URL
      const accessionClean = accession.replace(/-/g, '');
      let documentUrl = '';
      let documentType = '';
      let description = primaryDocDesc || formType;

      // For 10-K and 10-Q, the main document contains operational data
      if (formType.includes('10-K') || formType.includes('10-Q')) {
        documentUrl = `${this.secBase}/Archives/edgar/data/${company.cik}/${accessionClean}/${primaryDoc || `${company.ticker.toLowerCase()}-${filingDate.replace(/-/g, '')}.htm`}`;
        documentType = formType.includes('10-K') ? 'Annual Report' : 'Quarterly Report';
        description = `${documentType} - Contains production data, reserves, financial metrics`;
      }
      // For 8-K, check if it's an earnings release or investor presentation
      else if (formType === '8-K') {
        documentUrl = `${this.secBase}/Archives/edgar/data/${company.cik}/${accessionClean}/${primaryDoc}`;
        documentType = 'Current Report';

        // Check for specific 8-K items (earnings, presentations)
        if (primaryDocDesc?.toLowerCase().includes('earning') ||
            primaryDocDesc?.toLowerCase().includes('result')) {
          description = 'Earnings Release - Financial results and operational metrics';
        } else if (primaryDocDesc?.toLowerCase().includes('presentation') ||
                   primaryDocDesc?.toLowerCase().includes('investor')) {
          description = 'Investor Presentation - May contain NPV, IRR, project economics';
        } else {
          description = '8-K Filing - Material event or announcement';
        }
      }
      // Proxy statements often contain executive compensation tied to operational metrics
      else if (formType.includes('DEF')) {
        documentUrl = `${this.secBase}/Archives/edgar/data/${company.cik}/${accessionClean}/${primaryDoc}`;
        documentType = 'Proxy Statement';
        description = 'Annual meeting proxy - Governance and operational goals';
      }
      // Foreign filers
      else if (formType === '20-F' || formType === '40-F') {
        documentUrl = `${this.secBase}/Archives/edgar/data/${company.cik}/${accessionClean}/${primaryDoc}`;
        documentType = 'Foreign Annual Report';
        description = 'Annual report for foreign issuer - Full operational review';
      }

      if (documentUrl) {
        this.documentCount++;
        this.processedFilings.add(filingId);

        // Display the document
        console.log(`\n📄 [${this.documentCount}] MINING DOCUMENT`);
        console.log(`   Company: ${company.name} (${company.ticker})`);
        console.log(`   Type: ${documentType} (${formType})`);
        console.log(`   Filed: ${filingDate}`);
        console.log(`   Description: ${description}`);
        console.log(`   URL: ${documentUrl}`);

        // Also check for exhibits in 8-K filings (presentations are often exhibits)
        if (formType === '8-K') {
          await this.checkForExhibits(company, accession, filingDate);
        }
      }
    }
  }

  private async checkForExhibits(company: any, accession: string, filingDate: string) {
    this.requestCount++;

    const accessionClean = accession.replace(/-/g, '');
    const indexUrl = `${this.secBase}/Archives/edgar/data/${company.cik}/${accessionClean}/index.json`;

    try {
      const response = await fetch(indexUrl, { headers: this.headers });

      if (!response.ok) return;

      const data = await response.json();
      const items = data.directory?.item || [];

      // Look for substantial exhibits
      const exhibits = items.filter((item: any) => {
        const name = item.name.toLowerCase();
        const size = item.size || 0;

        return size > 500000 && // > 500KB - likely substantial content
               (name.includes('ex-99') || name.includes('ex99') ||
                name.includes('ex-10') || name.includes('ex10')) &&
               (name.endsWith('.htm') || name.endsWith('.html') || name.endsWith('.pdf'));
      });

      for (const exhibit of exhibits.slice(0, 2)) {
        const exhibitUrl = `${this.secBase}/Archives/edgar/data/${company.cik}/${accessionClean}/${exhibit.name}`;
        const sizeMB = ((exhibit.size || 0) / 1024 / 1024).toFixed(1);

        this.documentCount++;

        console.log(`\n📎 [${this.documentCount}] EXHIBIT DOCUMENT`);
        console.log(`   Company: ${company.name} (${company.ticker})`);
        console.log(`   Type: Exhibit to 8-K`);
        console.log(`   Filed: ${filingDate}`);
        console.log(`   File: ${exhibit.name} (${sizeMB} MB)`);
        console.log(`   Description: ${exhibit.description || 'Likely presentation or detailed report'}`);
        console.log(`   URL: ${exhibitUrl}`);
      }
    } catch (error) {
      // Silent fail
    }
  }
}

// Start the stream
const stream = new SECMiningDocsStream();
stream.start().catch(console.error);