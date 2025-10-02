import axios, { AxiosInstance } from 'axios'

// SEC EDGAR API configuration
const SEC_BASE_URL = 'https://data.sec.gov'
const SEC_ARCHIVES_URL = 'https://www.sec.gov/Archives/edgar/data'
const USER_AGENT = 'Lithos Mining Analytics contact@lithos.ai' // SEC requires a user agent

// Mining-related SIC codes
export const MINING_SIC_CODES = [
  '1000', // Metal Mining
  '1040', // Gold And Silver Ores
  '1090', // Miscellaneous Metal Ores
  '1220', // Bituminous Coal & Lignite Mining
  '1311', // Crude Petroleum & Natural Gas
  '1400', // Mining & Quarrying of Nonmetallic Minerals
  '1440', // Sand & Gravel
  '1470', // Chemical & Fertilizer Mineral Mining
  '1499', // Miscellaneous Nonmetallic Minerals
]

// Critical minerals and commodities list
export const CRITICAL_COMMODITIES = [
  // Battery metals
  'lithium', 'cobalt', 'nickel', 'graphite', 'manganese',
  // Rare earth elements
  'neodymium', 'dysprosium', 'praseodymium', 'terbium', 'europium',
  'yttrium', 'lanthanum', 'cerium', 'samarium', 'gadolinium',
  // Precious metals
  'gold', 'silver', 'platinum', 'palladium', 'rhodium',
  // Base metals
  'copper', 'zinc', 'lead', 'tin', 'aluminum', 'iron',
  // Critical minerals
  'uranium', 'vanadium', 'tungsten', 'molybdenum', 'titanium',
  'tantalum', 'niobium', 'beryllium', 'gallium', 'germanium',
  'indium', 'tellurium', 'antimony', 'bismuth', 'chromium',
  // Other strategic minerals
  'potash', 'phosphate', 'bauxite', 'fluorspar', 'barite'
]

interface SECFiling {
  cik: string
  entityName: string
  form: string
  filingDate: string
  accessionNumber: string
  primaryDocument: string
  primaryDocDescription: string
  items?: string[]
}

interface Exhibit96Document {
  cik: string
  companyName: string
  formType: string
  filingDate: string
  accessionNumber: string
  documentUrl: string
  exhibitNumber: string
  description: string
  fileSize?: number
  projectName?: string
  commodities?: string[]
}

export class SECEdgarClient {
  private client: AxiosInstance
  private rateLimitDelay = 100 // 100ms between requests (10 requests/second max)
  private lastRequestTime = 0

  constructor() {
    this.client = axios.create({
      baseURL: SEC_BASE_URL,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate'
      },
      timeout: 30000 // 30 second timeout
    })
  }

  private async enforceRateLimit() {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    if (timeSinceLastRequest < this.rateLimitDelay) {
      await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay - timeSinceLastRequest))
    }
    this.lastRequestTime = Date.now()
  }

  /**
   * Search for company submissions by CIK or ticker
   */
  async getCompanySubmissions(cikOrTicker: string): Promise<any> {
    await this.enforceRateLimit()
    
    // Pad CIK to 10 digits if it's a number
    const identifier = /^\d+$/.test(cikOrTicker) 
      ? cikOrTicker.padStart(10, '0')
      : cikOrTicker.toUpperCase()
    
    try {
      const response = await this.client.get(`/submissions/CIK${identifier}.json`)
      return response.data
    } catch (error: any) {
      console.error(`Error fetching submissions for ${identifier}:`, error.message)
      throw error
    }
  }

  /**
   * Get recent filings for all companies (uses RSS feed)
   */
  async getRecentFilings(formTypes: string[] = ['8-K', '10-K', '10-Q'], startDate?: Date): Promise<SECFiling[]> {
    await this.enforceRateLimit()
    
    const filings: SECFiling[] = []
    
    // Use the company tickers endpoint to get recent filings
    try {
      const response = await axios.get('https://www.sec.gov/files/company_tickers.json', {
        headers: { 'User-Agent': USER_AGENT }
      })
      
      const companies = Object.values(response.data) as any[]
      
      // Filter for mining companies based on SIC codes (this would need enhancement)
      // For now, we'll search for all and filter later
      
      console.log(`Found ${companies.length} total companies`)
      
      return filings
    } catch (error: any) {
      console.error('Error fetching recent filings:', error.message)
      throw error
    }
  }

  /**
   * Search for Exhibit 96.1 documents in a specific filing
   */
  async findExhibit96Documents(accessionNumber: string, cik: string): Promise<Exhibit96Document[]> {
    await this.enforceRateLimit()
    
    const documents: Exhibit96Document[] = []
    
    try {
      // Format the accession number (remove dashes)
      const formattedAccession = accessionNumber.replace(/-/g, '')
      
      // Construct the filing index URL
      const indexUrl = `${SEC_ARCHIVES_URL}/${cik.padStart(10, '0')}/${formattedAccession}/${accessionNumber}-index.json`
      
      const response = await axios.get(indexUrl, {
        headers: { 'User-Agent': USER_AGENT }
      })
      
      const filing = response.data
      
      // Look for Exhibit 96 documents
      if (filing.directory && filing.directory.item) {
        for (const item of filing.directory.item) {
          // Check if this is an Exhibit 96.1 or 96.2
          if (item.name && (item.name.includes('ex96') || item.description?.toLowerCase().includes('technical report'))) {
            const doc: Exhibit96Document = {
              cik: cik,
              companyName: filing.companyName || '',
              formType: filing.form || '',
              filingDate: filing.filingDate || '',
              accessionNumber: accessionNumber,
              documentUrl: `${SEC_ARCHIVES_URL}/${cik.padStart(10, '0')}/${formattedAccession}/${item.name}`,
              exhibitNumber: this.extractExhibitNumber(item.name, item.description),
              description: item.description || '',
              fileSize: item.size || 0,
              commodities: this.extractCommodities(item.description || '')
            }
            
            documents.push(doc)
          }
        }
      }
    } catch (error: any) {
      console.error(`Error finding Exhibit 96 documents for ${accessionNumber}:`, error.message)
    }
    
    return documents
  }

  /**
   * Extract exhibit number from filename or description
   */
  private extractExhibitNumber(filename: string, description: string): string {
    // Try to extract from filename first (ex96-1.htm, ex961.htm, etc.)
    const filenameMatch = filename.match(/ex(\d+[-.]?\d*)/i)
    if (filenameMatch) {
      return filenameMatch[1].replace('-', '.')
    }
    
    // Try description
    const descMatch = description.match(/exhibit\s*(\d+\.?\d*)/i)
    if (descMatch) {
      return descMatch[1]
    }
    
    return '96.1' // Default
  }

  /**
   * Extract commodities from text
   */
  private extractCommodities(text: string): string[] {
    const found: string[] = []
    const lowerText = text.toLowerCase()
    
    for (const commodity of CRITICAL_COMMODITIES) {
      if (lowerText.includes(commodity)) {
        found.push(commodity)
      }
    }
    
    return [...new Set(found)] // Remove duplicates
  }

  /**
   * Bulk search for mining company filings with Exhibit 96.1
   */
  async searchMiningFilings(
    startDate: Date,
    endDate: Date = new Date(),
    onProgress?: (message: string, progress: number) => void
  ): Promise<Exhibit96Document[]> {
    const allDocuments: Exhibit96Document[] = []
    
    try {
      // First, get list of all companies
      const companiesResponse = await axios.get('https://www.sec.gov/files/company_tickers.json', {
        headers: { 'User-Agent': USER_AGENT }
      })
      
      const companies = Object.values(companiesResponse.data) as any[]
      
      // Filter for potential mining companies (by ticker patterns, will need refinement)
      const miningKeywords = ['gold', 'silver', 'mining', 'metals', 'copper', 'lithium', 'uranium', 'coal', 'resources', 'minerals']
      const potentialMiningCompanies = companies.filter((company: any) => {
        const name = company.title?.toLowerCase() || ''
        const ticker = company.ticker?.toLowerCase() || ''
        return miningKeywords.some(keyword => name.includes(keyword) || ticker.includes(keyword))
      })
      
      console.log(`Found ${potentialMiningCompanies.length} potential mining companies`)
      onProgress?.(`Found ${potentialMiningCompanies.length} potential mining companies`, 10)
      
      // Process each company
      for (let i = 0; i < potentialMiningCompanies.length; i++) {
        const company = potentialMiningCompanies[i]
        const progress = 10 + (i / potentialMiningCompanies.length) * 80
        
        onProgress?.(`Processing ${company.title} (${i + 1}/${potentialMiningCompanies.length})`, progress)
        
        try {
          // Get company submissions
          const submissions = await this.getCompanySubmissions(company.cik_str.toString())
          
          if (submissions && submissions.filings && submissions.filings.recent) {
            // Filter filings by date and form type
            const relevantFilings = submissions.filings.recent.accessionNumber
              .map((acc: string, idx: number) => ({
                accessionNumber: acc,
                filingDate: submissions.filings.recent.filingDate[idx],
                form: submissions.filings.recent.form[idx],
                primaryDocument: submissions.filings.recent.primaryDocument[idx],
                primaryDocDescription: submissions.filings.recent.primaryDocDescription[idx]
              }))
              .filter((filing: any) => {
                const filingDate = new Date(filing.filingDate)
                return filingDate >= startDate && 
                       filingDate <= endDate &&
                       ['8-K', '10-K', '10-Q', '20-F', '40-F'].includes(filing.form)
              })
            
            // Check each filing for Exhibit 96.1
            for (const filing of relevantFilings) {
              const exhibits = await this.findExhibit96Documents(
                filing.accessionNumber,
                company.cik_str.toString()
              )
              
              if (exhibits.length > 0) {
                console.log(`Found ${exhibits.length} Exhibit 96 documents in ${filing.form} for ${company.title}`)
                allDocuments.push(...exhibits)
              }
            }
          }
        } catch (error) {
          console.error(`Error processing ${company.title}:`, error)
        }
        
        // Small delay between companies
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      onProgress?.(`Completed. Found ${allDocuments.length} Exhibit 96.1 documents`, 100)
      
    } catch (error: any) {
      console.error('Error in bulk search:', error.message)
      throw error
    }
    
    return allDocuments
  }
}
