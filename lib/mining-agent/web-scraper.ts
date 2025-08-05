import FirecrawlApp from '@mendable/firecrawl-js'
import { MiningQuery } from './query-generator'
import { updateProgress } from './progress-tracker'

export interface ScrapedDocument {
  url: string
  title: string
  content: string
  query: MiningQuery
}

export class MiningWebScraper {
  private firecrawl: FirecrawlApp
  private maxResultsPerQuery = 2
  private searchTimeout = 15000

  constructor() {
    this.firecrawl = new FirecrawlApp({ 
      apiKey: process.env.FIRECRAWL_API_KEY!
    })
  }

  async scrapeWithQueries(queries: MiningQuery[]): Promise<ScrapedDocument[]> {
    const allDocuments: ScrapedDocument[] = []
    const batchSize = 5 // Process 5 queries in parallel
    
    // Process queries in batches
    for (let i = 0; i < queries.length; i += batchSize) {
      const batch = queries.slice(i, i + batchSize)
      
      // Create more specific progress messages
      const commodities = batch.map(q => q.commodity).filter(Boolean)
      const uniqueCommodities = [...new Set(commodities)]
      
      if (uniqueCommodities.length > 0) {
        updateProgress({
          stage: 'collecting',
          message: `Searching for ${uniqueCommodities.join(', ')} projects...`,
          currentStep: i + 1,
          totalSteps: queries.length
        })
      } else if (batch[0].category === 'technical-reports') {
        updateProgress({
          stage: 'collecting',
          message: `Scanning technical report databases...`,
          currentStep: i + 1,
          totalSteps: queries.length
        })
      } else if (batch[0].category === 'regional') {
        updateProgress({
          stage: 'collecting',
          message: `Searching regional mining news...`,
          currentStep: i + 1,
          totalSteps: queries.length
        })
      } else {
        updateProgress({
          stage: 'collecting',
          message: `Searching mining databases... (${i + 1}/${queries.length})`,
          currentStep: i + 1,
          totalSteps: queries.length
        })
      }

      const batchResults = await Promise.allSettled(
        batch.map(query => this.searchSingleQuery(query))
      )

      // Collect successful results
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.length > 0) {
          allDocuments.push(...result.value)
          
          // Update progress with found documents
          const commodity = batch[index].commodity || 'mining'
          const docCount = result.value.length
          updateProgress({
            stage: 'collecting',
            message: `Found ${docCount} ${commodity} project${docCount > 1 ? 's' : ''}...`,
            currentStep: i + index + 1,
            totalSteps: queries.length
          })
        }
      })

      // Stop if we have enough documents
      if (allDocuments.length >= 15) {
        updateProgress({
          stage: 'collecting',
          message: `Found ${allDocuments.length} documents total`,
          currentStep: queries.length,
          totalSteps: queries.length
        })
        break
      }
    }

    return allDocuments
  }

  private async searchSingleQuery(query: MiningQuery): Promise<ScrapedDocument[]> {
    try {
      const searchResults = await Promise.race([
        this.firecrawl.search(query.query, {
          limit: this.maxResultsPerQuery,
          scrapeOptions: {
            formats: ['markdown'],
            timeout: 10000,
            waitFor: 500,
            includeTags: ['article', 'main', 'section', 'div', 'p'],
            excludeTags: ['nav', 'header', 'footer', 'aside', 'script', 'style', 'advertisement']
          }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Search timeout')), this.searchTimeout)
        )
      ]) as any

      if (!searchResults.success || !searchResults.data) {
        return []
      }

      // Extract documents from search results
      const documents: ScrapedDocument[] = []
      
      for (const result of searchResults.data) {
        if (result.markdown && this.isRelevantContent(result.markdown)) {
          documents.push({
            url: result.url || query.query,
            title: result.title || 'Mining Project Update',
            content: result.markdown,
            query
          })
        }
      }

      return documents
    } catch (error) {
      console.error(`Search failed for query: ${query.query}`, error)
      return []
    }
  }

  private isRelevantContent(content: string): boolean {
    const miningKeywords = [
      'mining', 'resource', 'ore', 'mineral', 'feasibility',
      'exploration', 'production', 'reserve', 'tonnage',
      'grade', 'NPV', 'IRR', 'capex', 'opex'
    ]

    const irrelevantKeywords = [
      'fashion', 'clothing', 'retail', 'restaurant',
      'real estate', 'insurance', 'banking'
    ]

    const contentLower = content.toLowerCase()
    
    // Must have at least 2 mining keywords
    const miningMatches = miningKeywords.filter(kw => 
      contentLower.includes(kw)
    ).length

    // Should not have irrelevant keywords
    const hasIrrelevant = irrelevantKeywords.some(kw => 
      contentLower.includes(kw)
    )

    return miningMatches >= 2 && !hasIrrelevant
  }
} 