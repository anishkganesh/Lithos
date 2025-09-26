import { EDGARApiClient } from './edgar-api-client'
import { supabaseService } from '../../supabase-service'
import axios from 'axios'
import * as cheerio from 'cheerio'

interface EDGARDocument {
  cik: string
  companyName: string
  ticker?: string
  filingDate: string
  accessionNumber: string
  formType: string
  documentUrl: string
  documentTitle?: string
  exhibitNumber?: string
  fileSizeBytes?: number
  sicCode?: string
  primaryCommodity?: string
  commodities?: string[]
  projectNames?: string[]
}

interface ScraperProgress {
  total: number
  processed: number
  errors: number
  currentCompany?: string
  status: string
}

export class EDGARScraperV2 {
  private client: EDGARApiClient
  private progressCallback?: (progress: ScraperProgress) => void
  private currentRunId?: string

  // Commodity keywords for classification
  private readonly COMMODITY_PATTERNS = new Map<string, RegExp>([
    ['Lithium', /\b(lithium|Li2O|LCE|spodumene|petalite|lepidolite)\b/i],
    ['Copper', /\b(copper|Cu|chalcopyrite|bornite|chalcocite)\b/i],
    ['Nickel', /\b(nickel|Ni|pentlandite|garnierite|laterite)\b/i],
    ['Cobalt', /\b(cobalt|Co|cobaltite|erythrite)\b/i],
    ['Gold', /\b(gold|Au|aurum)\b/i],
    ['Silver', /\b(silver|Ag|argentum)\b/i],
    ['Uranium', /\b(uranium|U3O8|yellowcake|uraninite)\b/i],
    ['Rare Earths', /\b(rare earth|REE|neodymium|dysprosium|praseodymium|cerium|lanthanum|yttrium)\b/i],
    ['Graphite', /\b(graphite|carbon|graphene)\b/i],
    ['Vanadium', /\b(vanadium|V2O5|vanadinite)\b/i],
    ['Manganese', /\b(manganese|Mn|pyrolusite|rhodochrosite)\b/i],
    ['Tin', /\b(tin|Sn|cassiterite)\b/i],
    ['Tungsten', /\b(tungsten|W|wolframite|scheelite)\b/i],
    ['Molybdenum', /\b(molybdenum|Mo|molybdenite)\b/i],
  ])

  constructor(progressCallback?: (progress: ScraperProgress) => void) {
    this.client = new EDGARApiClient()
    this.progressCallback = progressCallback
  }

  private reportProgress(progress: ScraperProgress) {
    if (this.progressCallback) {
      this.progressCallback(progress)
    }
  }

  async startScraperRun(runType: string, searchParams: any): Promise<string> {
    const { data: run, error } = await supabaseService
      .from('edgar_scraper_runs')
      .insert({
        run_type: runType,
        status: 'running',
        search_query: searchParams.q || 'EX-96.1',
        sic_codes: searchParams.sics,
        commodities: searchParams.commodities,
        date_from: searchParams.dateFrom,
        date_to: searchParams.dateTo
      })
      .select()
      .single()

    if (error) throw error
    this.currentRunId = run.id
    return run.id
  }

  async completeScraperRun(runId: string, stats: any, errorDetails?: any) {
    await supabaseService
      .from('edgar_scraper_runs')
      .update({
        status: errorDetails ? 'failed' : 'completed',
        total_filings_found: stats.total,
        filings_processed: stats.processed,
        documents_extracted: stats.documents,
        errors_count: stats.errors,
        completed_at: new Date().toISOString(),
        error_details: errorDetails
      })
      .eq('id', runId)
  }

  async scrapeEX96Documents(params: {
    dateFrom?: string
    dateTo?: string
    commodities?: string[]
    tickers?: string[]
    limit?: number
  }): Promise<void> {
    const runId = await this.startScraperRun('incremental', params)

    const stats = {
      total: 0,
      processed: 0,
      documents: 0,
      errors: 0
    }

    try {
      // Search for EX-96.1 filings
      const searchResults = await this.client.searchFilings({
        q: 'EX-96.1',
        category: 'form-cat1',
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
        tickers: params.tickers
      })

      stats.total = searchResults.total.value

      this.reportProgress({
        total: stats.total,
        processed: 0,
        errors: 0,
        status: 'Starting document extraction...'
      })

      const filingsToProcess = params.limit
        ? searchResults.filings.slice(0, params.limit)
        : searchResults.filings

      for (const filing of filingsToProcess) {
        try {
          this.reportProgress({
            total: stats.total,
            processed: stats.processed,
            errors: stats.errors,
            currentCompany: filing.entityName,
            status: `Processing ${filing.entityName}...`
          })

          // For EX-96.1 documents, we already have the document URL from the search
          // Construct the direct URL to the technical report
          const documents = []
          if (filing.accessionNumber && filing.primaryDocument) {
            const formattedCik = filing.cik.padStart(10, '0')
            const formattedAccession = filing.accessionNumber.replace(/-/g, '')

            documents.push({
              sequence: '1',
              description: 'Technical Report Summary (EX-96.1)',
              documentUrl: `https://www.sec.gov/Archives/edgar/data/${formattedCik}/${formattedAccession}/${filing.primaryDocument}`,
              type: 'EX-96.1',
              size: String(filing.size || 0)
            })
          }

          for (const doc of documents) {
            if (doc.documentUrl && doc.documentUrl.endsWith('.htm')) {
              try {
                // Extract document metadata
                const docData = await this.extractDocumentMetadata(doc.documentUrl)

                // Prepare document record
                const edgarDoc: EDGARDocument = {
                  cik: filing.cik,
                  companyName: filing.entityName,
                  ticker: filing.ticker,
                  filingDate: filing.filingDate || new Date().toISOString().split('T')[0],
                  accessionNumber: filing.accessionNumber,
                  formType: filing.form,
                  documentUrl: doc.documentUrl,
                  documentTitle: doc.description,
                  exhibitNumber: doc.type,
                  fileSizeBytes: parseInt(doc.size || '0'),
                  sicCode: filing.sicCode,
                  primaryCommodity: docData.primaryCommodity,
                  commodities: docData.commodities,
                  projectNames: docData.projectNames
                }

                // Save to database
                await this.saveDocumentToDatabase(edgarDoc)
                stats.documents++
              } catch (docError) {
                console.error(`Error processing document ${doc.documentUrl}:`, docError)
                stats.errors++
              }
            }
          }

          stats.processed++
        } catch (filingError) {
          console.error(`Error processing filing ${filing.accessionNumber}:`, filingError)
          stats.errors++
        }

        // Update progress
        this.reportProgress({
          total: stats.total,
          processed: stats.processed,
          errors: stats.errors,
          currentCompany: filing.entityName,
          status: `Processed ${stats.processed} of ${stats.total} filings`
        })
      }

      await this.completeScraperRun(runId, stats)

      this.reportProgress({
        total: stats.total,
        processed: stats.processed,
        errors: stats.errors,
        status: 'Scraping completed'
      })
    } catch (error) {
      await this.completeScraperRun(runId, stats, { message: String(error) })
      throw error
    }
  }

  async extractDocumentMetadata(url: string): Promise<{
    primaryCommodity?: string
    commodities: string[]
    projectNames: string[]
  }> {
    try {
      // Fetch document content
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Lithos Mining Analytics (contact@lithos.com)'
        },
        timeout: 30000
      })

      const $ = cheerio.load(response.data)

      // Remove script and style elements
      $('script, style').remove()

      const text = $('body').text() || $.root().text()

      // Extract commodities
      const commodities: string[] = []
      let primaryCommodity: string | undefined

      for (const [commodity, pattern] of this.COMMODITY_PATTERNS.entries()) {
        if (pattern.test(text)) {
          commodities.push(commodity)
          if (!primaryCommodity) {
            primaryCommodity = commodity
          }
        }
      }

      // Extract project names (simple heuristic - look for "Project" mentions)
      const projectNames: string[] = []
      const projectPattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:Project|Mine|Deposit|Property)/g
      let match

      while ((match = projectPattern.exec(text)) !== null) {
        const projectName = match[1].trim()
        if (projectName.length > 3 && projectName.length < 50 && !projectNames.includes(projectName)) {
          projectNames.push(projectName)
          if (projectNames.length >= 10) break // Limit to 10 project names
        }
      }

      return {
        primaryCommodity,
        commodities,
        projectNames
      }
    } catch (error) {
      console.error('Error extracting document metadata:', error)
      return {
        commodities: [],
        projectNames: []
      }
    }
  }

  async saveDocumentToDatabase(doc: EDGARDocument): Promise<void> {
    try {
      // Use upsert to handle duplicates gracefully
      const { error } = await supabaseService
        .from('edgar_technical_documents')
        .upsert({
          cik: doc.cik,
          company_name: doc.companyName,
          ticker: doc.ticker,
          filing_date: doc.filingDate,
          accession_number: doc.accessionNumber,
          form_type: doc.formType,
          document_url: doc.documentUrl,
          document_title: doc.documentTitle,
          exhibit_number: doc.exhibitNumber,
          file_size_bytes: doc.fileSizeBytes,
          sic_code: doc.sicCode,
          primary_commodity: doc.primaryCommodity,
          commodities: doc.commodities,
          project_names: doc.projectNames,
          is_processed: false,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'accession_number',
          ignoreDuplicates: false  // Update if exists
        })

      if (error) {
        console.error('Error saving document:', error)
        throw error
      }
    } catch (error) {
      console.error('Error saving document to database:', error)
      throw error
    }
  }

  async scrapeByMineralCommodity(
    commodity: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<void> {
    const results = await this.client.searchByMineralCommodity(commodity, dateFrom, dateTo)

    await this.scrapeEX96Documents({
      dateFrom,
      dateTo,
      commodities: [commodity]
    })
  }

  async scrapeByCompanyTicker(ticker: string): Promise<void> {
    await this.scrapeEX96Documents({
      tickers: [ticker]
    })
  }

  async getUnprocessedDocuments(limit: number = 100): Promise<any[]> {
    const { data, error } = await supabaseService
      .from('edgar_technical_documents')
      .select('*')
      .eq('is_processed', false)
      .limit(limit)

    if (error) throw error
    return data || []
  }

  async markDocumentAsProcessed(documentId: string, extractionErrors?: string): Promise<void> {
    await supabaseService
      .from('edgar_technical_documents')
      .update({
        is_processed: true,
        processed_at: new Date().toISOString(),
        extraction_errors: extractionErrors
      })
      .eq('id', documentId)
  }
}