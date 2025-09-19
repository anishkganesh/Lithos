#!/usr/bin/env node

/**
 * Alternative sources for mining technical documents
 * Uses multiple sources to avoid SEC rate limits
 */

class MiningDocsAlternative {
  private documentCount = 0;

  async start() {
    console.log('⛏️  ALTERNATIVE MINING DOCUMENTS SOURCES');
    console.log('=' .repeat(60));
    console.log('📊 Getting legitimate mining technical reports from multiple sources');
    console.log('=' .repeat(60));
    console.log('');

    // 1. Direct company investor relations pages (no rate limits)
    await this.getDirectCompanyDocs();

    // 2. SEDAR+ for Canadian companies (better for NI 43-101)
    await this.getSedarDocs();

    // 3. ASX for Australian companies
    await this.getASXDocs();

    // 4. Use cached/known direct links
    await this.getKnownDirectLinks();
  }

  async getDirectCompanyDocs() {
    console.log('\n📁 DIRECT COMPANY INVESTOR RELATIONS LINKS');
    console.log('-' .repeat(40));

    const companyIRPages = [
      // These are direct links to investor relations pages - no SEC rate limits!
      {
        company: 'Freeport-McMoRan',
        ticker: 'FCX',
        irUrl: 'https://investors.fcx.com/investors/news-releases/default.aspx',
        reportsUrl: 'https://investors.fcx.com/investors/financial-information/quarterly-results/default.aspx',
        description: 'Quarterly presentations with production data and economics'
      },
      {
        company: 'Newmont',
        ticker: 'NEM',
        irUrl: 'https://www.newmont.com/investors/news-release/default.aspx',
        reportsUrl: 'https://www.newmont.com/investors/financial-reports/default.aspx',
        description: 'Technical reports and reserve statements'
      },
      {
        company: 'MP Materials',
        ticker: 'MP',
        irUrl: 'https://investors.mpmaterials.com/news-events/press-releases',
        reportsUrl: 'https://investors.mpmaterials.com/financial-information/quarterly-results',
        description: 'Rare earth production and project updates'
      },
      {
        company: 'Hecla Mining',
        ticker: 'HL',
        irUrl: 'https://www.hecla-mining.com/investors/news-releases/',
        reportsUrl: 'https://www.hecla-mining.com/investors/financial-reports/',
        description: 'Silver/gold production reports and mine plans'
      },
      {
        company: 'Energy Fuels',
        ticker: 'UUUU',
        irUrl: 'https://www.energyfuels.com/news-release',
        reportsUrl: 'https://www.energyfuels.com/financial-reports',
        description: 'Uranium and rare earth technical reports'
      },
      {
        company: 'Perpetua Resources',
        ticker: 'PPTA',
        irUrl: 'https://perpetuaresources.com/news/',
        reportsUrl: 'https://perpetuaresources.com/stibnite-gold-project/feasibility-study/',
        description: 'Stibnite Gold Project feasibility study with NPV/IRR'
      },
      {
        company: 'Northern Dynasty',
        ticker: 'NAK',
        irUrl: 'https://www.northerndynastyminerals.com/news/',
        reportsUrl: 'https://www.northerndynastyminerals.com/pebble-project/technical-reports/',
        description: 'Pebble Project technical reports with detailed economics'
      }
    ];

    for (const company of companyIRPages) {
      this.documentCount++;
      console.log(`\n📄 [${this.documentCount}] ${company.company} (${company.ticker})`);
      console.log(`   Investor Relations: ${company.irUrl}`);
      console.log(`   Technical Reports: ${company.reportsUrl}`);
      console.log(`   Content: ${company.description}`);
    }
  }

  async getSedarDocs() {
    console.log('\n\n📁 SEDAR+ FILINGS (Canadian - Best for NI 43-101)');
    console.log('-' .repeat(40));

    const sedarCompanies = [
      {
        company: 'Barrick Gold',
        ticker: 'ABX.TO',
        sedarProfile: 'https://www.sedarplus.ca/landingpage/#!/profiles/public/widgetProfileSearch/Barrick%20Gold',
        description: 'NI 43-101 technical reports for all mines'
      },
      {
        company: 'Teck Resources',
        ticker: 'TECK.B.TO',
        sedarProfile: 'https://www.sedarplus.ca/landingpage/#!/profiles/public/widgetProfileSearch/Teck%20Resources',
        description: 'Copper, zinc, coal technical reports'
      },
      {
        company: 'First Quantum',
        ticker: 'FM.TO',
        sedarProfile: 'https://www.sedarplus.ca/landingpage/#!/profiles/public/widgetProfileSearch/First%20Quantum',
        description: 'Copper mine feasibility studies'
      },
      {
        company: 'Lundin Mining',
        ticker: 'LUN.TO',
        sedarProfile: 'https://www.sedarplus.ca/landingpage/#!/profiles/public/widgetProfileSearch/Lundin%20Mining',
        description: 'Base metals technical reports'
      },
      {
        company: 'Osisko Mining',
        ticker: 'OSK.TO',
        sedarProfile: 'https://www.sedarplus.ca/landingpage/#!/profiles/public/widgetProfileSearch/Osisko%20Mining',
        description: 'Gold project PEAs and feasibility studies'
      }
    ];

    console.log('ℹ️  SEDAR+ requires manual navigation but has ALL NI 43-101 reports');
    console.log('   Look for: "Technical Report", "NI 43-101", "Feasibility Study", "PEA"');

    for (const company of sedarCompanies) {
      this.documentCount++;
      console.log(`\n📄 [${this.documentCount}] ${company.company} (${company.ticker})`);
      console.log(`   SEDAR+ Profile: ${company.sedarProfile}`);
      console.log(`   Content: ${company.description}`);
    }
  }

  async getASXDocs() {
    console.log('\n\n📁 ASX ANNOUNCEMENTS (Australian)');
    console.log('-' .repeat(40));

    const asxCompanies = [
      {
        company: 'BHP Group',
        ticker: 'BHP',
        asxUrl: 'https://www.bhp.com/investors/annual-reporting',
        description: 'Operational reviews with production data and costs'
      },
      {
        company: 'Rio Tinto',
        ticker: 'RIO',
        asxUrl: 'https://www.riotinto.com/en/invest/financial-news-and-performance',
        description: 'Mine-by-mine production reports and development studies'
      },
      {
        company: 'Fortescue',
        ticker: 'FMG',
        asxUrl: 'https://www.fortescue.com/investors',
        description: 'Iron ore feasibility studies and expansions'
      },
      {
        company: 'Pilbara Minerals',
        ticker: 'PLS',
        asxUrl: 'https://www.pilbaraminerals.com.au/investors/',
        description: 'Lithium project technical studies'
      },
      {
        company: 'IGO Limited',
        ticker: 'IGO',
        asxUrl: 'https://www.igo.com.au/investors/',
        description: 'Lithium and nickel technical reports'
      }
    ];

    for (const company of asxCompanies) {
      this.documentCount++;
      console.log(`\n📄 [${this.documentCount}] ${company.company} (${company.ticker})`);
      console.log(`   ASX/Company URL: ${company.asxUrl}`);
      console.log(`   Content: ${company.description}`);
    }
  }

  async getKnownDirectLinks() {
    console.log('\n\n📁 KNOWN RECENT TECHNICAL REPORTS (Direct Links)');
    console.log('-' .repeat(40));

    const knownReports = [
      {
        company: 'Perpetua Resources',
        title: 'Stibnite Gold Project Feasibility Study 2020',
        url: 'https://perpetuaresources.com/wp-content/uploads/2021/01/Stibnite_Gold_Project_FS_Technical_Report.pdf',
        metrics: 'NPV: $1.3B @ 5%, IRR: 35.8%',
        size: '~400 pages'
      },
      {
        company: 'Northern Dynasty',
        title: 'Pebble Project Preliminary Economic Assessment 2021',
        url: 'https://www.northerndynastyminerals.com/site/assets/files/4804/ndm_-_pebble_project_pea_-_feb_22_2021_final.pdf',
        metrics: 'NPV: $2.3B @ 7%, IRR: 15.8%',
        size: '~500 pages'
      },
      {
        company: 'MP Materials',
        title: 'Mountain Pass Mine and Processing Facility Report',
        url: 'https://investors.mpmaterials.com/financial-information/sec-filings',
        metrics: 'Stage II expansion economics included',
        size: 'Various technical exhibits'
      },
      {
        company: 'Energy Fuels',
        title: 'White Mesa Mill Technical Report',
        url: 'https://www.energyfuels.com/white-mesa-mill',
        metrics: 'Uranium and REE processing economics',
        size: 'Technical specifications available'
      },
      {
        company: 'Hecla Mining',
        title: 'Lucky Friday Mine Technical Report',
        url: 'https://www.hecla-mining.com/wp-content/uploads/2021/03/Lucky-Friday-Technical-Report.pdf',
        metrics: 'Silver/lead/zinc mine economics',
        size: 'NI 43-101 compliant'
      }
    ];

    for (const report of knownReports) {
      this.documentCount++;
      console.log(`\n📑 [${this.documentCount}] TECHNICAL REPORT`);
      console.log(`   Company: ${report.company}`);
      console.log(`   Title: ${report.title}`);
      console.log(`   URL: ${report.url}`);
      console.log(`   Metrics: ${report.metrics}`);
      console.log(`   Size: ${report.size}`);
    }

    console.log('\n\n' + '=' .repeat(60));
    console.log('💡 TIPS TO AVOID SEC RATE LIMITS:');
    console.log('=' .repeat(60));
    console.log('1. Wait 10-15 minutes for the block to clear');
    console.log('2. Use company IR sites directly (no rate limits)');
    console.log('3. Access SEDAR+ for Canadian NI 43-101 reports');
    console.log('4. Use ASX for Australian mining companies');
    console.log('5. Consider using a rotating proxy service');
    console.log('6. Download reports during off-peak hours (nights/weekends)');
    console.log('7. Cache documents locally to avoid repeat requests');
  }
}

// Start the alternative sources
const alternative = new MiningDocsAlternative();
alternative.start().catch(console.error);