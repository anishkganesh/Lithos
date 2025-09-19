import { MiningProject } from '@/lib/types/mining-types';

export interface EdgarReport {
  id: string;
  companyName: string;
  cik: string;
  ticker: string;
  formType: string;
  filingDate: string;
  reportTitle: string;
  pdfUrl: string;
  fileSize: number;
  discoveredAt: Date;
}

export class EdgarSecScraper {
  private readonly secBase = 'https://www.sec.gov';
  private readonly dataBase = 'https://data.sec.gov';
  private readonly headers: HeadersInit;
  private miningCiks = new Set<string>();
  private knownReports = new Set<string>();
  private checkInterval = 60000; // 60 seconds
  private isMonitoring = false;
  private monitorTimeout?: NodeJS.Timeout;
  private onNewReport?: (report: EdgarReport) => void;

  constructor(companyEmail = 'info@lithos.io', companyName = 'Lithos Mining Analytics') {
    this.headers = {
      'User-Agent': `${companyName} ${companyEmail}`,
      'Accept': 'application/json',
    };

    // Initialize with known mining companies
    this.initKnownMiningCompanies();
  }

  private initKnownMiningCompanies() {
    // Major mining companies with CIK numbers
    const knownMining = new Map([
      ['0001164727', { name: 'Newmont', ticker: 'NEM' }],
      ['0000831259', { name: 'Barrick Gold', ticker: 'GOLD' }],
      ['0000861878', { name: 'Freeport-McMoRan', ticker: 'FCX' }],
      ['0001618921', { name: 'MP Materials', ticker: 'MP' }],
      ['0001053507', { name: 'Hecla Mining', ticker: 'HL' }],
      ['0000766704', { name: 'Coeur Mining', ticker: 'CDE' }],
      ['0001031296', { name: 'Piedmont Lithium', ticker: 'PLL' }],
      ['0001713134', { name: 'Lithium Americas', ticker: 'LAC' }],
      ['0001639691', { name: 'Perpetua Resources', ticker: 'PPTA' }],
      ['0000315238', { name: 'Alcoa', ticker: 'AA' }],
      ['0001166036', { name: 'US Gold Corp', ticker: 'USAU' }],
      ['0001477641', { name: 'Nevada Copper', ticker: 'NCU' }],
      ['0000008063', { name: 'Cleveland-Cliffs', ticker: 'CLF' }],
      ['0001558370', { name: 'Warrior Met Coal', ticker: 'HCC' }],
      ['0000764180', { name: 'Peabody Energy', ticker: 'BTU' }],
      ['0001209164', { name: 'Southern Copper', ticker: 'SCCO' }],
      ['0000001750', { name: 'Nucor', ticker: 'NUE' }],
      ['0001590955', { name: 'Teck Resources', ticker: 'TECK' }],
      ['0001368308', { name: 'Rio Tinto', ticker: 'RIO' }],
      ['0001495048', { name: 'Vale SA', ticker: 'VALE' }],
    ]);

    knownMining.forEach((_, cik) => {
      this.miningCiks.add(cik.padStart(10, '0'));
    });
  }

  async identifyAllMiningCompanies(): Promise<Set<string>> {
    console.log('🔍 Identifying all mining companies in SEC database...');

    try {
      // Fetch company tickers
      const tickersUrl = `${this.secBase}/files/company_tickers.json`;
      const response = await fetch(tickersUrl, { headers: this.headers });

      if (response.ok) {
        const data = await response.json();

        // Check each company for mining SIC codes
        for (const [, company] of Object.entries(data)) {
          const cik = String((company as any).cik_str).padStart(10, '0');
          const name = (company as any).title;
          const ticker = (company as any).ticker;

          if (await this.isMiningCompany(cik)) {
            this.miningCiks.add(cik);
            console.log(`  ✅ Found mining company: ${name} (${ticker})`);
          }

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } catch (error) {
      console.error('Error fetching company list:', error);
    }

    console.log(`📊 Total mining companies identified: ${this.miningCiks.size}`);
    return this.miningCiks;
  }

  private async isMiningCompany(cik: string): Promise<boolean> {
    try {
      const submissionsUrl = `${this.dataBase}/submissions/CIK${cik}.json`;
      const response = await fetch(submissionsUrl, { headers: this.headers });

      if (response.ok) {
        const data = await response.json();
        const sic = data.sic || '';
        const sicDesc = (data.sicDescription || '').toLowerCase();

        // Mining SIC codes
        if (sic) {
          const sicNum = parseInt(sic);
          // 1000-1099: Metal mining
          // 1200-1299: Coal mining
          // 1400-1499: Nonmetallic minerals
          if ((sicNum >= 1000 && sicNum <= 1099) ||
              (sicNum >= 1200 && sicNum <= 1299) ||
              (sicNum >= 1400 && sicNum <= 1499)) {
            return true;
          }
        }

        // Check description for mining keywords
        const miningKeywords = ['mining', 'gold', 'copper', 'lithium', 'coal', 'mineral', 'metal', 'iron ore', 'nickel', 'uranium'];
        if (miningKeywords.some(keyword => sicDesc.includes(keyword))) {
          return true;
        }
      }
    } catch (error) {
      console.error(`Error checking CIK ${cik}:`, error);
    }

    return false;
  }

  async checkLatestFilings(cik: string): Promise<EdgarReport[]> {
    const newReports: EdgarReport[] = [];

    try {
      const submissionsUrl = `${this.dataBase}/submissions/CIK${cik}.json`;
      const response = await fetch(submissionsUrl, { headers: this.headers });

      if (!response.ok) return [];

      const data = await response.json();
      const recent = data.filings?.recent;
      const companyName = data.name || 'Unknown';
      const ticker = data.tickers?.[0] || '';

      if (!recent) return [];

      // Check recent filings (last 10)
      const limit = Math.min(10, recent.accessionNumber?.length || 0);

      for (let i = 0; i < limit; i++) {
        const formType = recent.form[i];
        const filingDate = recent.filingDate[i];
        const accession = recent.accessionNumber[i];

        // Skip if we've already seen this filing
        const filingId = `${cik}_${accession}`;
        if (this.knownReports.has(filingId)) {
          continue;
        }

        // Check forms that typically contain technical reports
        const relevantForms = ['8-K', '10-K', '10-K/A', 'S-1', 'S-1/A', '20-F', '40-F', '6-K'];
        if (relevantForms.includes(formType)) {
          const reports = await this.extractTechnicalReports(
            cik, accession, formType, filingDate, companyName, ticker
          );

          if (reports.length > 0) {
            newReports.push(...reports);
            this.knownReports.add(filingId);
          }
        }
      }
    } catch (error) {
      console.error(`Error checking CIK ${cik}:`, error);
    }

    return newReports;
  }

  private async extractTechnicalReports(
    cik: string,
    accession: string,
    formType: string,
    filingDate: string,
    companyName: string,
    ticker: string
  ): Promise<EdgarReport[]> {
    const reports: EdgarReport[] = [];
    const accessionClean = accession.replace(/-/g, '');

    // Get filing index
    const indexUrl = `${this.secBase}/Archives/edgar/data/${cik}/${accessionClean}/index.json`;

    try {
      const response = await fetch(indexUrl, { headers: this.headers });

      if (!response.ok) return [];

      const indexData = await response.json();
      const items = indexData.directory?.item || [];

      for (const item of items) {
        const name = (item.name || '').toLowerCase();
        const desc = (item.description || '').toLowerCase();

        // Technical report indicators
        const isTechnical =
          name.includes('ex-96') || name.includes('ex96') ||  // SK-1300 exhibit
          name.includes('ex-99') || name.includes('ex99') ||  // Alternative exhibit
          desc.includes('technical report') ||
          desc.includes('sk-1300') || desc.includes('sk 1300') ||
          desc.includes('resource estimate') ||
          desc.includes('feasibility study') ||
          desc.includes('preliminary economic assessment') ||
          desc.includes('mineral resource') ||
          desc.includes('mineral reserve');

        if (isTechnical && (name.includes('.pdf') || name.includes('.htm'))) {
          const pdfUrl = `${this.secBase}/Archives/edgar/data/${cik}/${accessionClean}/${item.name}`;

          const report: EdgarReport = {
            id: `${cik}_${accession}_${item.name}`,
            companyName,
            cik,
            ticker,
            formType,
            filingDate,
            reportTitle: item.description || 'Technical Report',
            pdfUrl,
            fileSize: item.size || 0,
            discoveredAt: new Date()
          };

          reports.push(report);
        }
      }
    } catch (error) {
      console.error(`Error extracting from ${accession}:`, error);
    }

    return reports;
  }

  async startMonitoring(callback?: (report: EdgarReport) => void) {
    this.onNewReport = callback;
    this.isMonitoring = true;

    console.log('🚀 Starting real-time SEC monitoring...');
    console.log(`⏱️  Checking every ${this.checkInterval / 1000} seconds`);

    // Initial identification of mining companies if not done
    if (this.miningCiks.size === 0) {
      await this.identifyAllMiningCompanies();
    }

    this.monitorLoop();
  }

  private async monitorLoop() {
    if (!this.isMonitoring) return;

    const timestamp = new Date().toISOString();
    console.log(`\n[${timestamp}] Checking for new reports...`);

    let newReportsFound = 0;

    // Check each mining company
    for (const cik of this.miningCiks) {
      const reports = await this.checkLatestFilings(cik);

      for (const report of reports) {
        console.log('\n🆕 NEW TECHNICAL REPORT FOUND!');
        console.log(`  Company: ${report.companyName} (${report.ticker})`);
        console.log(`  Filed: ${report.filingDate}`);
        console.log(`  Type: ${report.formType}`);
        console.log(`  URL: ${report.pdfUrl}`);

        // Trigger callback if provided
        if (this.onNewReport) {
          this.onNewReport(report);
        }

        newReportsFound++;
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (newReportsFound === 0) {
      console.log('  No new reports found');
    } else {
      console.log(`\n✅ Found ${newReportsFound} new technical reports!`);
    }

    // Schedule next check
    this.monitorTimeout = setTimeout(() => this.monitorLoop(), this.checkInterval);
  }

  stopMonitoring() {
    this.isMonitoring = false;
    if (this.monitorTimeout) {
      clearTimeout(this.monitorTimeout);
    }
    console.log('🛑 Monitoring stopped');
  }

  async getRecentReports(limit = 20): Promise<EdgarReport[]> {
    const allReports: EdgarReport[] = [];

    // Check recent filings from all known mining companies
    for (const cik of this.miningCiks) {
      const reports = await this.checkLatestFilings(cik);
      allReports.push(...reports);

      if (allReports.length >= limit) break;

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Sort by filing date (newest first)
    return allReports
      .sort((a, b) => new Date(b.filingDate).getTime() - new Date(a.filingDate).getTime())
      .slice(0, limit);
  }
}