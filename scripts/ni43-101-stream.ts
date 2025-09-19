#!/usr/bin/env node

/**
 * NI 43-101 & SK-1300 Technical Reports Stream
 * Exclusively pulls long-form mining technical documentation with NPV, IRR, and economic data
 * Maximizes throughput at 10 requests/second
 */

interface MiningCompany {
  cik: string;
  name: string;
  ticker: string;
  exchange: 'TSX' | 'NYSE' | 'NASDAQ' | 'ASX' | 'LSE';
}

interface TechnicalReport {
  companyName: string;
  ticker: string;
  reportTitle: string;
  filingDate: string;
  formType: string;
  url: string;
  fileSize: number;
  reportType: 'NI 43-101' | 'SK-1300' | 'Technical Report';
}

class NI43101Stream {
  private readonly secBase = 'https://www.sec.gov';
  private readonly dataBase = 'https://data.sec.gov';
  private readonly headers: HeadersInit;
  private readonly requestsPerSecond = 10;
  private readonly requestInterval = 100; // 100ms = 10 req/sec

  // Focus on companies that file technical reports
  private readonly targetCompanies: MiningCompany[] = [
    // Major producers with frequent technical reports
    { cik: '0001164727', name: 'Newmont', ticker: 'NEM', exchange: 'NYSE' },
    { cik: '0000831259', name: 'Barrick Gold', ticker: 'GOLD', exchange: 'NYSE' },
    { cik: '0000861878', name: 'Freeport-McMoRan', ticker: 'FCX', exchange: 'NYSE' },
    { cik: '0001053507', name: 'Hecla Mining', ticker: 'HL', exchange: 'NYSE' },
    { cik: '0000766704', name: 'Coeur Mining', ticker: 'CDE', exchange: 'NYSE' },
    { cik: '0001285785', name: 'SSR Mining', ticker: 'SSRM', exchange: 'NASDAQ' },
    { cik: '0000919859', name: 'Pan American Silver', ticker: 'PAAS', exchange: 'NASDAQ' },
    { cik: '0001203464', name: 'Agnico Eagle', ticker: 'AEM', exchange: 'NYSE' },

    // Lithium companies (frequent SK-1300 reports)
    { cik: '0001618921', name: 'MP Materials', ticker: 'MP', exchange: 'NYSE' },
    { cik: '0001031296', name: 'Piedmont Lithium', ticker: 'PLL', exchange: 'NASDAQ' },
    { cik: '0001713134', name: 'Lithium Americas', ticker: 'LAC', exchange: 'NYSE' },
    { cik: '0001764925', name: 'Albemarle', ticker: 'ALB', exchange: 'NYSE' },
    { cik: '0001844820', name: 'Standard Lithium', ticker: 'SLI', exchange: 'NYSE' },

    // Copper producers
    { cik: '0001209164', name: 'Southern Copper', ticker: 'SCCO', exchange: 'NYSE' },
    { cik: '0001590955', name: 'Teck Resources', ticker: 'TECK', exchange: 'NYSE' },
    { cik: '0001061768', name: 'Taseko Mines', ticker: 'TGB', exchange: 'NYSE' },

    // Development stage (more technical reports)
    { cik: '0001639691', name: 'Perpetua Resources', ticker: 'PPTA', exchange: 'NASDAQ' },
    { cik: '0001500198', name: 'Northern Dynasty', ticker: 'NAK', exchange: 'NYSE' },
    { cik: '0001649989', name: 'Energy Fuels', ticker: 'UUUU', exchange: 'NYSE' },
    { cik: '0001524906', name: 'Uranium Energy', ticker: 'UEC', exchange: 'NYSE' },
    { cik: '0001385849', name: 'Denison Mines', ticker: 'DNN', exchange: 'NYSE' },
    { cik: '0001166036', name: 'US Gold Corp', ticker: 'USAU', exchange: 'NASDAQ' },
    { cik: '0001477641', name: 'Nevada Copper', ticker: 'NCU', exchange: 'TSX' },
    { cik: '0001865120', name: 'Ioneer', ticker: 'IONR', exchange: 'NASDAQ' },
    { cik: '0001640147', name: 'Comstock Mining', ticker: 'LODE', exchange: 'NYSE' },

    // Canadian cross-listed (NI 43-101 filers)
    { cik: '0001023514', name: 'Gold Fields', ticker: 'GFI', exchange: 'NYSE' },
    { cik: '0001558336', name: 'Sibanye Stillwater', ticker: 'SBSW', exchange: 'NYSE' },
    { cik: '0001748773', name: 'Kinross Gold', ticker: 'KGC', exchange: 'NYSE' },
    { cik: '0001368308', name: 'Rio Tinto', ticker: 'RIO', exchange: 'NYSE' },
    { cik: '0001495048', name: 'Vale SA', ticker: 'VALE', exchange: 'NYSE' },
    { cik: '0000863069', name: 'BHP Group', ticker: 'BHP', exchange: 'NYSE' },

    // REE & Specialty
    { cik: '0001489137', name: 'Rare Element Resources', ticker: 'REEMF', exchange: 'NYSE' },
    { cik: '0001671858', name: 'American Rare Earths', ticker: 'ARRNF', exchange: 'NYSE' },
  ];

  private currentIndex = 0;
  private processedReports = new Set<string>();
  private technicalReportsFound = 0;
  private startTime = Date.now();
  private requestCount = 0;

  constructor() {
    this.headers = {
      'User-Agent': 'Lithos Mining Analytics info@lithos.io',
      'Accept': 'application/json',
    };
  }

  async start() {
    console.log('⛏️  NI 43-101 & SK-1300 TECHNICAL REPORTS STREAM');
    console.log('=' .repeat(60));
    console.log('📊 Targeting long-form technical documentation only');
    console.log('💎 NPV, IRR, Resource Estimates, Feasibility Studies');
    console.log(`🎯 Monitoring ${this.targetCompanies.length} mining companies`);
    console.log('⚡ Maximum rate: 10 requests/second');
    console.log('=' .repeat(60));
    console.log('');

    this.streamTechnicalReports();
  }

  private async streamTechnicalReports() {
    while (true) {
      const company = this.targetCompanies[this.currentIndex];

      try {
        const reports = await this.checkCompanyFilings(company);

        for (const report of reports) {
          this.displayTechnicalReport(report);
        }

        // If no reports found, show we're still searching
        if (reports.length === 0 && this.currentIndex % 10 === 0) {
          const elapsed = (Date.now() - this.startTime) / 1000;
          const requestRate = this.requestCount / elapsed;
          console.log(`⏳ Searching... ${this.requestCount} requests made | ${requestRate.toFixed(1)} req/sec | ${this.technicalReportsFound} reports found`);
        }
      } catch (error) {
        // Silent fail
      }

      this.currentIndex = (this.currentIndex + 1) % this.targetCompanies.length;

      // Rate limiting to maintain 10 req/sec
      await new Promise(resolve => setTimeout(resolve, this.requestInterval));
    }
  }

  private async checkCompanyFilings(company: MiningCompany): Promise<TechnicalReport[]> {
    const reports: TechnicalReport[] = [];

    try {
      this.requestCount++;

      // Get recent submissions
      const submissionsUrl = `${this.dataBase}/submissions/CIK${company.cik.padStart(10, '0')}.json`;
      const response = await fetch(submissionsUrl, { headers: this.headers });

      if (!response.ok) return reports;

      const data = await response.json();
      const recent = data.filings?.recent;

      if (!recent) return reports;

      // Look for forms that contain technical reports
      const relevantForms = ['8-K', '10-K', '10-K/A', '10-Q', '20-F', '40-F', '6-K', 'S-1', 'S-1/A', 'F-1', 'F-1/A'];

      // Check recent filings (last 20)
      const limit = Math.min(20, recent.accessionNumber?.length || 0);

      for (let i = 0; i < limit; i++) {
        const formType = recent.form[i];

        if (!relevantForms.includes(formType)) continue;

        const accession = recent.accessionNumber[i];
        const filingDate = recent.filingDate[i];
        const reportId = `${company.cik}_${accession}`;

        // Skip if already processed
        if (this.processedReports.has(reportId)) continue;

        // Check filing for technical reports
        const technicalDocs = await this.extractTechnicalDocuments(
          company, accession, formType, filingDate
        );

        if (technicalDocs.length > 0) {
          reports.push(...technicalDocs);
          this.processedReports.add(reportId);
        }
      }
    } catch (error) {
      // Silent fail to maintain speed
    }

    return reports;
  }

  private async extractTechnicalDocuments(
    company: MiningCompany,
    accession: string,
    formType: string,
    filingDate: string
  ): Promise<TechnicalReport[]> {
    const reports: TechnicalReport[] = [];
    const accessionClean = accession.replace(/-/g, '');

    try {
      this.requestCount++;

      const indexUrl = `${this.secBase}/Archives/edgar/data/${company.cik}/${accessionClean}/index.json`;
      const response = await fetch(indexUrl, { headers: this.headers });

      if (!response.ok) return reports;

      const indexData = await response.json();
      const items = indexData.directory?.item || [];

      for (const item of items) {
        const name = (item.name || '').toLowerCase();
        const desc = (item.description || '').toLowerCase();
        const size = item.size || 0;

        // Skip images and small files
        if (name.endsWith('.jpg') || name.endsWith('.jpeg') ||
            name.endsWith('.png') || name.endsWith('.gif')) continue;

        // Skip files under 100KB (likely not technical reports)
        if (size < 100000) continue;

        // Check for technical report indicators
        if (this.isTechnicalReport(name, desc, size)) {
          const url = `${this.secBase}/Archives/edgar/data/${company.cik}/${accessionClean}/${item.name}`;

          // Determine report type
          let reportType: 'NI 43-101' | 'SK-1300' | 'Technical Report' = 'Technical Report';

          if (desc.includes('43-101') || desc.includes('ni 43-101') ||
              (company.exchange === 'TSX' && desc.includes('technical report'))) {
            reportType = 'NI 43-101';
          } else if (desc.includes('sk-1300') || desc.includes('sk 1300') ||
                     name.includes('ex-96') || name.includes('ex96')) {
            reportType = 'SK-1300';
          }

          reports.push({
            companyName: company.name,
            ticker: company.ticker,
            reportTitle: this.cleanReportTitle(item.description || item.name),
            filingDate,
            formType,
            url,
            fileSize: size,
            reportType
          });
        }
      }
    } catch (error) {
      // Silent fail
    }

    return reports;
  }

  private isTechnicalReport(name: string, desc: string, size: number): boolean {
    const fullText = `${name} ${desc}`.toLowerCase();

    // Must be HTML or PDF
    if (!name.endsWith('.htm') && !name.endsWith('.html') && !name.endsWith('.pdf')) {
      return false;
    }

    // Strong indicators of technical reports with economic data
    const strongIndicators = [
      // Regulatory standards
      'ni 43-101', 'ni43-101', '43-101',
      'sk-1300', 'sk 1300',
      'jorc', 'samrec',

      // Report types that contain NPV/IRR
      'feasibility study', 'pre-feasibility', 'prefeasibility',
      'preliminary economic assessment', 'pea report',
      'definitive feasibility', 'dfs report',
      'bankable feasibility', 'bfs report',

      // Economic indicators
      'economic analysis', 'economic assessment',
      'npv analysis', 'net present value',
      'irr analysis', 'internal rate of return',
      'cash flow model', 'financial model',
      'capital cost', 'operating cost', 'opex', 'capex',

      // Resource/Reserve reports (often include economics)
      'mineral resource estimate', 'mineral reserve estimate',
      'resource and reserve', 'ore reserve',
      'measured and indicated', 'proven and probable',

      // Exhibit numbers for technical reports
      'exhibit 96', 'ex-96', 'ex96',
      'exhibit 99.1', 'ex-99.1', 'ex99.1',
      'exhibit 99.2', 'ex-99.2', 'ex99.2',

      // Technical report titles
      'technical report on the',
      'independent technical report',
      'qualified person', 'competent person',
      'qp report', 'cp report'
    ];

    // Check for strong indicators
    const hasStrongIndicator = strongIndicators.some(indicator => fullText.includes(indicator));

    // For large files (>1MB), also accept general technical reports
    const isLargeReport = size > 1000000 && (
      fullText.includes('technical report') ||
      fullText.includes('mineral') ||
      fullText.includes('mining study')
    );

    return hasStrongIndicator || isLargeReport;
  }

  private cleanReportTitle(title: string): string {
    // Clean up the report title
    return title
      .replace(/\.htm[l]?$/i, '')
      .replace(/\.pdf$/i, '')
      .replace(/^ex[-\d.]+[-_]/i, '')
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
      .substring(0, 100);
  }

  private displayTechnicalReport(report: TechnicalReport) {
    this.technicalReportsFound++;
    const elapsed = (Date.now() - this.startTime) / 1000;
    const rate = this.technicalReportsFound / elapsed;
    const requestRate = this.requestCount / elapsed;
    const sizeMB = (report.fileSize / 1024 / 1024).toFixed(2);

    console.log(`\n📑 [${this.technicalReportsFound}] ${report.reportType} FOUND!`);
    console.log(`   Company: ${report.companyName} (${report.ticker})`);
    console.log(`   Title: ${report.reportTitle}`);
    console.log(`   Filed: ${report.filingDate} | Form: ${report.formType}`);
    console.log(`   Size: ${sizeMB} MB`);
    console.log(`   URL: ${report.url}`);
    console.log(`   ⚡ Rates: ${rate.toFixed(2)} reports/sec | ${requestRate.toFixed(1)} API calls/sec`);
  }
}

// Start the stream
const stream = new NI43101Stream();
stream.start().catch(console.error);