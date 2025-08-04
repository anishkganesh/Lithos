import { SEDARScraper } from './scrapers/sedar-scraper'
import { EDGARScraper } from './scrapers/edgar-scraper'
import { LSEScraper } from './scrapers/lse-scraper'
import { ASXScraper } from './scrapers/asx-scraper'
import { DocumentProcessor } from './document-processor'
import { updateProgress, resetProgress } from './progress-tracker'
import PQueue from 'p-queue'

export interface ScrapingResult {
  source: string
  documentsFound: number
  projectsCreated: number
  projectsUpdated: number
  errors: string[]
}

export class MiningAgentOrchestrator {
  private scrapers: Array<{
    name: string
    scraper: any
  }>
  private processor: DocumentProcessor
  private queue: PQueue

  constructor() {
    this.scrapers = [
      { name: 'SEDAR', scraper: new SEDARScraper() },
      { name: 'EDGAR', scraper: new EDGARScraper() },
      { name: 'LSE', scraper: new LSEScraper() },
      { name: 'ASX', scraper: new ASXScraper() }
    ]
    this.processor = new DocumentProcessor()
    this.queue = new PQueue({ concurrency: 2 }) // Process 2 documents at a time
  }

  async run(): Promise<ScrapingResult[]> {
    resetProgress()
    const results: ScrapingResult[] = []

    try {
      // Step 1: Collect documents from all sources
      updateProgress({
        stage: 'collecting',
        message: 'Scanning data sources for new technical reports...',
        totalSteps: this.scrapers.length,
        currentStep: 0
      })

      const allDocuments = []
      for (let i = 0; i < this.scrapers.length; i++) {
        const { name, scraper } = this.scrapers[i]
        
        updateProgress({
          stage: 'collecting',
          message: `Scanning ${name} for new documents...`,
          totalSteps: this.scrapers.length,
          currentStep: i + 1
        })

        try {
          const documents = await scraper.fetchLatestDocuments()
          allDocuments.push(...documents.map(doc => ({ ...doc, source: name })))
        } catch (error) {
          console.error(`Error scraping ${name}:`, error)
          results.push({
            source: name,
            documentsFound: 0,
            projectsCreated: 0,
            projectsUpdated: 0,
            errors: [error instanceof Error ? error.message : 'Unknown error']
          })
        }
      }

      // Step 2: Process documents
      updateProgress({
        stage: 'processing',
        message: `Processing ${allDocuments.length} documents...`,
        totalSteps: allDocuments.length,
        currentStep: 0
      })

      const processingResults = await Promise.all(
        allDocuments.map((doc, index) => 
          this.queue.add(async () => {
            updateProgress({
              stage: 'processing',
              message: `Processing document ${index + 1} of ${allDocuments.length}: ${doc.title || 'Unknown'}`,
              totalSteps: allDocuments.length,
              currentStep: index + 1
            })

            try {
              const result = await this.processor.processDocument(doc)
              return { source: doc.source, result }
            } catch (error) {
              console.error(`Error processing document:`, error)
              return { 
                source: doc.source, 
                result: { 
                  success: false, 
                  error: error instanceof Error ? error.message : 'Unknown error' 
                } 
              }
            }
          })
        )
      )

      // Step 3: Aggregate results by source
      const resultsBySource = new Map<string, ScrapingResult>()
      
      for (const { source, result } of processingResults) {
        if (!resultsBySource.has(source)) {
          resultsBySource.set(source, {
            source,
            documentsFound: 0,
            projectsCreated: 0,
            projectsUpdated: 0,
            errors: []
          })
        }

        const sourceResult = resultsBySource.get(source)!
        sourceResult.documentsFound++

        if (result.success) {
          if (result.action === 'created') {
            sourceResult.projectsCreated++
          } else if (result.action === 'updated') {
            sourceResult.projectsUpdated++
          }
        } else {
          sourceResult.errors.push(result.error || 'Unknown error')
        }
      }

      // Step 4: Complete
      updateProgress({
        stage: 'completed',
        message: 'Mining agent completed successfully',
        totalSteps: allDocuments.length,
        currentStep: allDocuments.length
      })

      return Array.from(resultsBySource.values())
    } catch (error) {
      updateProgress({
        stage: 'error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        totalSteps: 0,
        currentStep: 0
      })
      throw error
    }
  }
} 