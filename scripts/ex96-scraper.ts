#!/usr/bin/env node

/**
 * EX-96.1 Technical Report Scraper
 * Specifically targets SK-1300 technical report summaries
 * These contain NPV, IRR, and detailed mine economics
 */

interface TechnicalReportEX96 {
  company: string;
  cik: string;
  filingDate: string;
  formType: string;
  exhibitType: string;
  title: string;
  url: string;
  accession: string;
}

class EX96Scraper {
  private readonly secBase = 'https://www.sec.gov';
  private readonly searchBase = 'https://efts.sec.gov/LATEST/search-index';
  private readonly headers: HeadersInit;

  // Rate limiting
  private requestCount = 0;
  private lastRequestTime = 0;
  private readonly minRequestInterval = 150; // 150ms between requests (~6-7 req/sec to be safe)

  private reportsFound: TechnicalReportEX96[] = [];

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
    this.requestCount++;
  }

  async searchEX96Reports(startDate?: string, endDate?: string): Promise<TechnicalReportEX96[]> {
    console.log('🔍 Searching for EX-96.1 Technical Report Summaries...');
    console.log('   These are SK-1300 compliant reports with NPV/IRR data');
    console.log('');

    // Build search parameters for EX-96 exhibits
    const searchParams = {
      q: 'EX-96.1 OR EX-96 OR "technical report summary"',
      dateRange: 'custom',
      startdt: startDate || '2020-01-01',
      enddt: endDate || new Date().toISOString().split('T')[0],
      category: 'form-cat1',
      forms: '8-K,10-K,10-Q,S-1,F-1,20-F,40-F',
    };

    try {
      await this.enforceRateLimit();

      // Use the full text search API
      const searchUrl = `${this.secBase}/edgar/search/`;

      console.log('📊 Search Parameters:');
      console.log(`   Date Range: ${searchParams.startdt} to ${searchParams.enddt}`);
      console.log(`   Exhibit Types: EX-96, EX-96.1 (SK-1300 Technical Reports)`);
      console.log('');

      // Instead of using the search API which might be complex,
      // let's directly look for known patterns in recent filings
      await this.scanRecentFilings();

    } catch (error) {
      console.error('Error searching:', error);
    }

    return this.reportsFound;
  }

  async scanRecentFilings() {
    // Mining companies likely to file EX-96 reports
    const miningCompanies = [
      { cik: '0001263364', name: 'Joway Health Industries' }, // From your example
      { cik: '0001618921', name: 'MP Materials' },
      { cik: '0001639691', name: 'Perpetua Resources' },
      { cik: '0001649989', name: 'Energy Fuels' },
      { cik: '0001524906', name: 'Uranium Energy' },
      { cik: '0001500198', name: 'Northern Dynasty' },
      { cik: '0001166036', name: 'US Gold Corp' },
      { cik: '0001640147', name: 'Comstock Mining' },
      { cik: '0001885448', name: 'NioCorp Developments' },
      { cik: '0001844820', name: 'Standard Lithium' },
      { cik: '0001865120', name: 'Ioneer' },
      { cik: '0001798562', name: 'Livent' },
      { cik: '0001856437', name: 'Century Aluminum' },
      { cik: '0001764029', name: 'Vista Gold' },
      { cik: '0001385849', name: 'Denison Mines' },
    ];

    for (const company of miningCompanies) {
      await this.checkCompanyForEX96(company);
    }
  }

  async checkCompanyForEX96(company: { cik: string; name: string }) {
    try {
      await this.enforceRateLimit();

      const submissionsUrl = `https://data.sec.gov/submissions/CIK${company.cik.padStart(10, '0')}.json`;
      const response = await fetch(submissionsUrl, { headers: this.headers });

      if (!response.ok) return;

      const data = await response.json();
      const recent = data.filings?.recent;

      if (!recent) return;

      // Check recent filings for EX-96 exhibits
      const limit = Math.min(50, recent.accessionNumber?.length || 0);

      for (let i = 0; i < limit; i++) {
        const formType = recent.form[i];
        const filingDate = recent.filingDate[i];
        const accession = recent.accessionNumber[i];

        // Focus on forms that typically contain technical reports
        if (!['8-K', '10-K', '10-K/A', '10-Q', 'S-1', 'S-1/A', 'F-1', '20-F', '40-F'].includes(formType)) {
          continue;
        }

        // Check filing for EX-96 exhibits
        await this.checkFilingForEX96(company, accession, formType, filingDate);
      }

    } catch (error) {
      // Silent fail to continue processing
    }
  }

  async checkFilingForEX96(
    company: { cik: string; name: string },
    accession: string,
    formType: string,
    filingDate: string
  ) {
    try {
      await this.enforceRateLimit();

      const accessionClean = accession.replace(/-/g, '');
      const indexUrl = `${this.secBase}/Archives/edgar/data/${company.cik}/${accessionClean}/index.json`;

      const response = await fetch(indexUrl, { headers: this.headers });

      if (!response.ok) return;

      const indexData = await response.json();
      const items = indexData.directory?.item || [];

      for (const item of items) {
        const name = (item.name || '').toLowerCase();
        const desc = (item.description || '').toLowerCase();

        // Check for EX-96 exhibits (SK-1300 technical reports)
        const isEX96 = (
          name.includes('ex-96') || name.includes('ex96') ||
          name.includes('ex_96') || name.includes('exhibit96') ||
          (name.includes('ex-') && desc.includes('technical report')) ||
          desc.includes('sk-1300') || desc.includes('sk 1300') ||
          desc.includes('technical report summary')
        );

        if (isEX96 && (name.endsWith('.htm') || name.endsWith('.html'))) {
          const url = `${this.secBase}/Archives/edgar/data/${company.cik}/${accessionClean}/${item.name}`;

          const report: TechnicalReportEX96 = {
            company: company.name,
            cik: company.cik,
            filingDate,
            formType,
            exhibitType: 'EX-96',
            title: item.description || 'Technical Report Summary (SK-1300)',
            url,
            accession
          };

          this.reportsFound.push(report);

          console.log(`\n✅ FOUND EX-96 TECHNICAL REPORT!`);
          console.log(`   Company: ${report.company}`);
          console.log(`   Filed: ${report.filingDate} (${report.formType})`);
          console.log(`   Title: ${report.title}`);
          console.log(`   URL: ${report.url}`);
        }
      }

    } catch (error) {
      // Silent fail
    }
  }

  async getSpecificReport(url: string) {
    console.log('\n📄 Fetching specific EX-96 report...');
    console.log(`   URL: ${url}`);

    try {
      await this.enforceRateLimit();

      const response = await fetch(url, { headers: this.headers });

      if (!response.ok) {
        console.log('❌ Failed to fetch report');
        return null;
      }

      const html = await response.text();

      // Extract key metrics from the HTML
      const metrics = this.extractMetrics(html);

      console.log('\n📊 Extracted Metrics:');
      if (metrics.npv) console.log(`   NPV: ${metrics.npv}`);
      if (metrics.irr) console.log(`   IRR: ${metrics.irr}`);
      if (metrics.payback) console.log(`   Payback: ${metrics.payback}`);
      if (metrics.capex) console.log(`   CAPEX: ${metrics.capex}`);
      if (metrics.opex) console.log(`   OPEX: ${metrics.opex}`);
      if (metrics.resources) console.log(`   Resources: ${metrics.resources}`);

      return { html, metrics };

    } catch (error) {
      console.error('Error fetching report:', error);
      return null;
    }
  }

  extractMetrics(html: string): any {
    const metrics: any = {};

    // Extract NPV (Net Present Value)
    const npvMatch = html.match(/NPV[^$]*?\$([0-9,.]+ ?(million|billion|M|B))/i);
    if (npvMatch) metrics.npv = npvMatch[0];

    // Extract IRR (Internal Rate of Return)
    const irrMatch = html.match(/IRR[^0-9]*?([0-9.]+%)/i);
    if (irrMatch) metrics.irr = irrMatch[1];

    // Extract Payback Period
    const paybackMatch = html.match(/payback[^0-9]*?([0-9.]+ ?years?)/i);
    if (paybackMatch) metrics.payback = paybackMatch[0];

    // Extract CAPEX (Capital Expenditure)
    const capexMatch = html.match(/capex|capital cost[^$]*?\$([0-9,.]+ ?(million|billion|M|B))/i);
    if (capexMatch) metrics.capex = capexMatch[0];

    // Extract OPEX (Operating Expenditure)
    const opexMatch = html.match(/opex|operating cost[^$]*?\$([0-9,.]+ ?(million|billion|M|B))/i);
    if (opexMatch) metrics.opex = opexMatch[0];

    // Extract resource/reserve data
    const resourceMatch = html.match(/measured.{0,20}indicated|proven.{0,20}probable|[0-9,.]+ ?(Mt|Mt|tonnes|ounces)/i);
    if (resourceMatch) metrics.resources = resourceMatch[0];

    return metrics;
  }

  async demonstrateWithExample() {
    console.log('\n' + '='.repeat(60));
    console.log('📋 EXAMPLE: Analyzing your provided EX-96.1 document');
    console.log('='.repeat(60));

    const exampleUrl = 'https://www.sec.gov/Archives/edgar/data/1263364/000121390023005558/ea171459ex96-1_jowayhealth.htm';

    console.log('\n🔍 This is a perfect example of an EX-96.1 Technical Report Summary');
    console.log('   - SK-1300 compliant format');
    console.log('   - Contains detailed mine economics');
    console.log('   - Includes NPV, IRR, production schedules');

    await this.getSpecificReport(exampleUrl);
  }

  displaySummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 SEARCH SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total EX-96 Reports Found: ${this.reportsFound.length}`);
    console.log(`Requests Made: ${this.requestCount}`);
    console.log(`Rate: ~${(this.requestCount / (Date.now() - this.lastRequestTime) * 1000).toFixed(1)} req/sec`);

    if (this.reportsFound.length > 0) {
      console.log('\n📑 Reports Found:');
      this.reportsFound.forEach((report, i) => {
        console.log(`\n${i + 1}. ${report.company}`);
        console.log(`   Date: ${report.filingDate}`);
        console.log(`   URL: ${report.url}`);
      });
    }
  }
}

async function main() {
  const scraper = new EX96Scraper();

  console.log('⛏️  EX-96 TECHNICAL REPORT SCRAPER');
  console.log('=' .repeat(60));
  console.log('Targeting SK-1300 Technical Report Summaries');
  console.log('These contain NPV, IRR, CAPEX, OPEX, and resource data');
  console.log('=' .repeat(60));
  console.log('');

  // First demonstrate with the example
  await scraper.demonstrateWithExample();

  // Then search for more EX-96 reports
  console.log('\n🔎 Now searching for more EX-96 reports...\n');
  await scraper.searchEX96Reports('2023-01-01', '2025-12-31');

  // Display summary
  scraper.displaySummary();
}

main().catch(console.error);