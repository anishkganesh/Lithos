import axios, { AxiosInstance } from 'axios'
import pLimit from 'p-limit'

interface EDGARSearchParams {
  q?: string
  category?: string
  forms?: string[]
  ciks?: string[]
  sics?: string[]
  dateFrom?: string
  dateTo?: string
  entityName?: string
  tickers?: string[]
}

interface EDGARFiling {
  cik: string
  entityName: string
  ticker?: string
  accessionNumber: string
  filingDate: string
  reportDate?: string
  form: string
  size: number
  primaryDocument: string
  primaryDocDescription: string
  items: string
  sicCode?: string
  sicDescription?: string
}

interface EDGARDocument {
  sequence: string
  description: string
  documentUrl: string
  type: string
  size?: string
}

interface SearchResults {
  total: { value: number; relation: string }
  filings: EDGARFiling[]
}

export class EDGARApiClient {
  private api: AxiosInstance
  private rateLimiter: ReturnType<typeof pLimit>
  private readonly BASE_URL = 'https://data.sec.gov'
  private readonly ARCHIVES_URL = 'https://www.sec.gov/Archives/edgar/data'
  private readonly SEARCH_API = 'https://efts.sec.gov/LATEST/search-index'

  // Mining-related SIC codes
  private readonly MINING_SIC_CODES = [
    '1000', // Metal Mining
    '1040', // Gold and Silver Ores
    '1044', // Silver Ores
    '1090', // Miscellaneous Metal Ores
    '1094', // Uranium-Radium-Vanadium Ores
    '1099', // Miscellaneous Metal Ores, NEC
    '1400', // Mining and Quarrying of Nonmetallic Minerals
    '1455', // Kaolin and Ball Clay
    '1459', // Clay, Ceramic, and Refractory Minerals, NEC
    '1479', // Chemical and Fertilizer Mineral Mining, NEC
    '1499', // Miscellaneous Nonmetallic Minerals, Except Fuels
    '3330', // Primary Production of Aluminum
    '3339', // Primary Smelting and Refining of Nonferrous Metals
    '3350', // Rolling, Drawing, and Extruding of Nonferrous Metals
    '3356', // Rolling, Drawing, and Extruding of Nonferrous Metals, NEC
    '3357', // Drawing and Insulating of Nonferrous Wire
    '3360', // Nonferrous Foundries (Castings)
    '3369', // Nonferrous Foundries, Except Aluminum and Copper
  ]

  // Critical minerals keywords for filtering
  private readonly CRITICAL_MINERALS = [
    'lithium', 'cobalt', 'nickel', 'graphite', 'manganese',
    'rare earth', 'neodymium', 'dysprosium', 'praseodymium',
    'copper', 'aluminum', 'tin', 'tungsten', 'vanadium',
    'uranium', 'molybdenum', 'antimony', 'magnesium',
    'platinum', 'palladium', 'zinc', 'silver', 'gold'
  ]

  constructor() {
    // Rate limit to 10 requests per second as per SEC guidelines
    this.rateLimiter = pLimit(10)

    this.api = axios.create({
      headers: {
        'User-Agent': 'Lithos Mining Analytics (contact@lithos.com)',
        'Accept-Encoding': 'gzip, deflate',
        'Accept': 'application/json'
      },
      timeout: 30000
    })

    // Add delay between requests to be respectful
    this.api.interceptors.request.use(
      config => {
        return new Promise(resolve => {
          setTimeout(() => resolve(config), 100) // 100ms delay between requests
        })
      }
    )
  }

  async searchFilings(params: EDGARSearchParams): Promise<SearchResults> {
    return this.rateLimiter(async () => {
      try {
        const searchParams = new URLSearchParams()

        // Build search query for EX-96.1 technical reports
        if (params.q) {
          searchParams.append('q', params.q)
        } else {
          searchParams.append('q', 'EX-96.1')
        }

        if (params.category) {
          searchParams.append('category', params.category)
        }

        if (params.forms && params.forms.length > 0) {
          searchParams.append('forms', params.forms.join(','))
        }

        if (params.ciks && params.ciks.length > 0) {
          searchParams.append('ciks', params.ciks.join(','))
        }

        if (params.sics && params.sics.length > 0) {
          searchParams.append('sics', params.sics.join(','))
        } else {
          // Default to mining SIC codes
          searchParams.append('sics', this.MINING_SIC_CODES.join(','))
        }

        if (params.dateFrom) {
          searchParams.append('dateRange', 'custom')
          searchParams.append('startdt', params.dateFrom)
          if (params.dateTo) {
            searchParams.append('enddt', params.dateTo)
          }
        }

        if (params.entityName) {
          searchParams.append('entityName', params.entityName)
        }

        if (params.tickers && params.tickers.length > 0) {
          searchParams.append('tickers', params.tickers.join(','))
        }

        const response = await this.api.get(this.SEARCH_API, {
          params: searchParams
        })

        const data = response.data

        // Parse the response
        const filings: EDGARFiling[] = data.hits?.hits?.map((hit: any) => {
          // The ID format is ADSH:filename, so we extract the ADSH
          const [adsh, filename] = hit._id ? hit._id.split(':') : ['', '']

          return {
            cik: hit._source.ciks?.[0],
            entityName: hit._source.display_names?.[0],
            ticker: hit._source.tickers?.[0],
            accessionNumber: hit._source.adsh || adsh,
            filingDate: hit._source.filing_date,
            reportDate: hit._source.period_of_report,
            form: hit._source.form,
            size: hit._source.size,
            primaryDocument: filename || hit._source.file_name,
            primaryDocDescription: hit._source.description,
            items: hit._source.items,
            sicCode: hit._source.sics?.[0],
            sicDescription: hit._source.sic_description
          }
        }) || []

        return {
          total: data.hits?.total || { value: 0, relation: 'eq' },
          filings
        }
      } catch (error) {
        console.error('Error searching EDGAR filings:', error)
        throw error
      }
    })
  }

  async getFilingDocuments(cik: string, accessionNumber: string): Promise<EDGARDocument[]> {
    return this.rateLimiter(async () => {
      try {
        // Format CIK (pad with zeros to 10 digits)
        const formattedCik = cik.padStart(10, '0')

        // Format accession number (remove dashes)
        const formattedAccession = accessionNumber ? accessionNumber.replace(/-/g, '') : ''

        // Construct URL to filing detail
        const url = `${this.BASE_URL}/submissions/CIK${formattedCik}.json`

        // First, get company submissions
        const response = await this.api.get(url)
        const submissions = response.data

        // Find the specific filing
        const filingIndex = submissions.filings?.recent?.accessionNumber?.indexOf(accessionNumber)

        if (filingIndex === -1) {
          throw new Error('Filing not found')
        }

        // Get filing documents from index file
        const indexUrl = `${this.ARCHIVES_URL}/${formattedCik}/${formattedAccession}/${accessionNumber}-index.json`
        const indexResponse = await this.api.get(indexUrl)

        const documents: EDGARDocument[] = indexResponse.data.directory?.item?.map((item: any) => ({
          sequence: item.sequence || '',
          description: item.description || '',
          documentUrl: `${this.ARCHIVES_URL}/${formattedCik}/${formattedAccession}/${item.name}`,
          type: item.type || '',
          size: item.size
        })) || []

        // Filter for EX-96.1 documents
        return documents.filter(doc =>
          doc.type?.includes('EX-96.1') ||
          doc.description?.toLowerCase().includes('technical report') ||
          doc.description?.toLowerCase().includes('ni 43-101') ||
          doc.description?.toLowerCase().includes('sk-1300')
        )
      } catch (error) {
        console.error('Error getting filing documents:', error)
        throw error
      }
    })
  }

  async getTechnicalReportUrls(params: EDGARSearchParams): Promise<string[]> {
    try {
      const results = await this.searchFilings({
        ...params,
        q: 'EX-96.1', // Specifically search for technical report exhibits
        category: 'form-cat1'
      })

      const documentUrls: string[] = []

      // Process each filing to get document URLs
      for (const filing of results.filings) {
        try {
          const documents = await this.getFilingDocuments(filing.cik, filing.accessionNumber)

          for (const doc of documents) {
            if (doc.documentUrl && doc.documentUrl.endsWith('.htm')) {
              documentUrls.push(doc.documentUrl)
            }
          }
        } catch (error) {
          console.error(`Error processing filing ${filing.accessionNumber}:`, error)
        }
      }

      return documentUrls
    } catch (error) {
      console.error('Error getting technical report URLs:', error)
      throw error
    }
  }

  async searchByMineralCommodity(commodity: string, dateFrom?: string, dateTo?: string): Promise<SearchResults> {
    const searchQuery = `EX-96.1 AND (${commodity} OR "${commodity} mine" OR "${commodity} project")`

    return this.searchFilings({
      q: searchQuery,
      category: 'form-cat1',
      sics: this.MINING_SIC_CODES,
      dateFrom,
      dateTo
    })
  }

  async searchByCompanyTicker(ticker: string): Promise<SearchResults> {
    return this.searchFilings({
      q: 'EX-96.1',
      category: 'form-cat1',
      tickers: [ticker],
      sics: this.MINING_SIC_CODES
    })
  }

  getMiningRelatedSicCodes(): string[] {
    return this.MINING_SIC_CODES
  }

  getCriticalMineralsKeywords(): string[] {
    return this.CRITICAL_MINERALS
  }
}