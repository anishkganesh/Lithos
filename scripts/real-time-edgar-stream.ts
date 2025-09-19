#!/usr/bin/env node

/**
 * Real-time EDGAR SEC Mining Documents Stream
 * Maximizes throughput at 10 requests/second to continuously display mining document links
 */

interface MiningCompany {
  cik: string;
  name: string;
  ticker: string;
}

class RealTimeEdgarStream {
  private readonly secBase = 'https://www.sec.gov';
  private readonly dataBase = 'https://data.sec.gov';
  private readonly headers: HeadersInit;
  private readonly requestsPerSecond = 10;
  private readonly requestInterval = 100; // 100ms between requests = 10 req/sec

  // Comprehensive list of mining companies for maximum coverage
  private readonly miningCompanies: MiningCompany[] = [
    // Gold & Precious Metals
    { cik: '0001164727', name: 'Newmont', ticker: 'NEM' },
    { cik: '0000831259', name: 'Barrick Gold', ticker: 'GOLD' },
    { cik: '0001053507', name: 'Hecla Mining', ticker: 'HL' },
    { cik: '0000766704', name: 'Coeur Mining', ticker: 'CDE' },
    { cik: '0001748773', name: 'Kinross Gold', ticker: 'KGC' },
    { cik: '0001203464', name: 'Agnico Eagle', ticker: 'AEM' },
    { cik: '0000919859', name: 'Pan American Silver', ticker: 'PAAS' },
    { cik: '0001285785', name: 'SSR Mining', ticker: 'SSRM' },
    { cik: '0001023514', name: 'Gold Fields', ticker: 'GFI' },
    { cik: '0001558336', name: 'Sibanye Stillwater', ticker: 'SBSW' },

    // Base Metals & Copper
    { cik: '0000861878', name: 'Freeport-McMoRan', ticker: 'FCX' },
    { cik: '0001209164', name: 'Southern Copper', ticker: 'SCCO' },
    { cik: '0001590955', name: 'Teck Resources', ticker: 'TECK' },
    { cik: '0000315238', name: 'Alcoa', ticker: 'AA' },
    { cik: '0000008063', name: 'Cleveland-Cliffs', ticker: 'CLF' },
    { cik: '0000001750', name: 'Nucor', ticker: 'NUE' },
    { cik: '0001373835', name: 'United States Steel', ticker: 'X' },
    { cik: '0001638833', name: 'Glencore', ticker: 'GLNCY' },

    // Lithium & Battery Metals
    { cik: '0001618921', name: 'MP Materials', ticker: 'MP' },
    { cik: '0001031296', name: 'Piedmont Lithium', ticker: 'PLL' },
    { cik: '0001713134', name: 'Lithium Americas', ticker: 'LAC' },
    { cik: '0001764925', name: 'Albemarle', ticker: 'ALB' },
    { cik: '0001798562', name: 'Livent', ticker: 'LTHM' },
    { cik: '0001844820', name: 'Standard Lithium', ticker: 'SLI' },
    { cik: '0001865120', name: 'Ioneer', ticker: 'IONR' },

    // Coal & Energy Minerals
    { cik: '0000764180', name: 'Peabody Energy', ticker: 'BTU' },
    { cik: '0001558370', name: 'Warrior Met Coal', ticker: 'HCC' },
    { cik: '0001704715', name: 'Arch Resources', ticker: 'ARCH' },
    { cik: '0001064728', name: 'Alpha Metallurgical', ticker: 'AMR' },
    { cik: '0001111711', name: 'CONSOL Energy', ticker: 'CEIX' },

    // Uranium
    { cik: '0001649989', name: 'Energy Fuels', ticker: 'UUUU' },
    { cik: '0001524906', name: 'Uranium Energy', ticker: 'UEC' },
    { cik: '0001385849', name: 'Denison Mines', ticker: 'DNN' },
    { cik: '0001889106', name: 'Ur-Energy', ticker: 'URG' },

    // Junior Miners & Exploration
    { cik: '0001166036', name: 'US Gold Corp', ticker: 'USAU' },
    { cik: '0001477641', name: 'Nevada Copper', ticker: 'NCU' },
    { cik: '0001639691', name: 'Perpetua Resources', ticker: 'PPTA' },
    { cik: '0001500198', name: 'Northern Dynasty', ticker: 'NAK' },
    { cik: '0001764029', name: 'Vista Gold', ticker: 'VGZ' },
    { cik: '0001640147', name: 'Comstock Mining', ticker: 'LODE' },

    // Diversified Mining
    { cik: '0001368308', name: 'Rio Tinto', ticker: 'RIO' },
    { cik: '0001495048', name: 'Vale SA', ticker: 'VALE' },
    { cik: '0000863069', name: 'BHP Group', ticker: 'BHP' },
    { cik: '0001618553', name: 'Anglo American', ticker: 'NGLOY' },

    // Specialty Minerals
    { cik: '0001856437', name: 'Century Aluminum', ticker: 'CENX' },
    { cik: '0001130310', name: 'Kaiser Aluminum', ticker: 'KALU' },
    { cik: '0000018230', name: 'Compass Minerals', ticker: 'CMP' },
    { cik: '0001075531', name: 'Materion', ticker: 'MTRN' },
  ];

  private currentCompanyIndex = 0;
  private processedFilings = new Set<string>();
  private documentCount = 0;
  private startTime = Date.now();

  constructor() {
    this.headers = {
      'User-Agent': 'Lithos Mining Analytics info@lithos.io',
      'Accept': 'application/json',
    };
  }

  async start() {
    console.log('🚀 REAL-TIME EDGAR MINING DOCUMENTS STREAM');
    console.log('=' .repeat(60));
    console.log('⚡ Maximum throughput: 10 requests/second');
    console.log(`📊 Monitoring ${this.miningCompanies.length} mining companies`);
    console.log('🔄 Continuous rotation through all companies');
    console.log('=' .repeat(60));
    console.log('');

    // Start the high-speed stream
    this.streamDocuments();
  }

  private async streamDocuments() {
    while (true) {
      const company = this.miningCompanies[this.currentCompanyIndex];

      try {
        // Fetch submissions for current company
        const submissionsUrl = `${this.dataBase}/submissions/CIK${company.cik.padStart(10, '0')}.json`;
        const response = await fetch(submissionsUrl, { headers: this.headers });

        if (response.ok) {
          const data = await response.json();
          const recent = data.filings?.recent;

          if (recent && recent.accessionNumber) {
            // Process multiple recent filings in parallel
            const filingsToCheck = Math.min(5, recent.accessionNumber.length);

            for (let i = 0; i < filingsToCheck; i++) {
              const accession = recent.accessionNumber[i];
              const formType = recent.form[i];
              const filingDate = recent.filingDate[i];
              const filingId = `${company.cik}_${accession}`;

              // Skip if already processed
              if (this.processedFilings.has(filingId)) continue;

              // Check for mining-relevant forms
              if (['8-K', '10-K', '10-K/A', '10-Q', 'S-1', 'S-1/A', '20-F', '40-F', '6-K', 'DEF 14A'].includes(formType)) {
                // Quick check for technical documents
                const accessionClean = accession.replace(/-/g, '');
                const indexUrl = `${this.secBase}/Archives/edgar/data/${company.cik}/${accessionClean}/index.json`;

                // Make the request
                const indexResponse = await fetch(indexUrl, { headers: this.headers });

                if (indexResponse.ok) {
                  const indexData = await indexResponse.json();
                  const items = indexData.directory?.item || [];

                  for (const item of items) {
                    const name = (item.name || '').toLowerCase();
                    const desc = (item.description || '').toLowerCase();

                    // Look for mining technical documents
                    if (this.isMiningDocument(name, desc)) {
                      const docUrl = `${this.secBase}/Archives/edgar/data/${company.cik}/${accessionClean}/${item.name}`;

                      this.documentCount++;
                      const elapsed = (Date.now() - this.startTime) / 1000;
                      const rate = this.documentCount / elapsed;

                      // Real-time display
                      console.log(`\n📄 [${this.documentCount}] MINING DOCUMENT FOUND!`);
                      console.log(`   Company: ${company.name} (${company.ticker})`);
                      console.log(`   Form: ${formType} | Filed: ${filingDate}`);
                      console.log(`   Document: ${item.description || item.name}`);
                      console.log(`   URL: ${docUrl}`);
                      console.log(`   ⚡ Rate: ${rate.toFixed(2)} docs/sec | Total: ${this.documentCount} documents`);
                    }
                  }

                  this.processedFilings.add(filingId);
                }
              }
            }
          }
        }
      } catch (error) {
        // Silent fail to maintain speed
      }

      // Move to next company (round-robin)
      this.currentCompanyIndex = (this.currentCompanyIndex + 1) % this.miningCompanies.length;

      // Maintain 10 requests/second rate
      await new Promise(resolve => setTimeout(resolve, this.requestInterval));
    }
  }

  private isMiningDocument(name: string, desc: string): boolean {
    // Comprehensive mining document indicators
    const documentIndicators = [
      // Technical report exhibits
      'ex-96', 'ex96', 'ex-99', 'ex99',
      // Report types
      'technical report', 'feasibility study', 'preliminary economic assessment',
      'pea report', 'pre-feasibility', 'prefeasibility',
      // Resource/Reserve reports
      'mineral resource', 'mineral reserve', 'resource estimate', 'reserve estimate',
      'resource report', 'reserve report', 'ore reserve',
      // SK-1300 / NI 43-101
      'sk-1300', 'sk 1300', 'ni 43-101', 'ni43-101', '43-101',
      // Mining specific
      'mine plan', 'mining study', 'metallurgical', 'drill results',
      'exploration report', 'geology report', 'geotechnical',
      // Economic studies
      'economic analysis', 'cash flow model', 'npv analysis',
      // Environmental & Permitting
      'environmental impact', 'eis report', 'permitting report',
      // Production reports
      'production report', 'quarterly production', 'annual production',
      // Other relevant
      'independent technical', 'qualified person', 'competent person',
      'mineral property', 'mining property', 'mineral project'
    ];

    const fullText = `${name} ${desc}`;
    return documentIndicators.some(indicator => fullText.includes(indicator));
  }
}

// Start the stream
const stream = new RealTimeEdgarStream();
stream.start().catch(console.error);