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
      
      // Create more specific and detailed progress messages
      const commodities = batch.map(q => q.commodity).filter(Boolean)
      const uniqueCommodities = [...new Set(commodities)]
      
      // Determine the data source being searched
      for (const query of batch) {
        let messages: string[] = []
        
        // Map queries to specific data sources with Looki-style messaging
        if (query.query.includes('SEDAR') || query.query.includes('NI 43-101')) {
          messages = [
            '🔍 Accessing SEDAR+ database...',
            '📡 Connecting to Canadian securities filings...',
            '📄 Scanning for NI 43-101 technical reports...'
          ]
        } else if (query.query.includes('EDGAR') || query.query.includes('SEC')) {
          messages = [
            '🔍 Querying SEC EDGAR system...',
            '🇺🇸 Analyzing U.S. mining registrants...',
            '📊 Extracting 10-K and 8-K filings...'
          ]
        } else if (query.query.includes('ASX') || query.query.includes('JORC')) {
          messages = [
            '🔍 Connecting to ASX announcements...',
            '🇦🇺 Processing Australian mining data...',
            '⛏️ Analyzing JORC-compliant resources...'
          ]
        } else if (query.query.includes('LSE')) {
          messages = [
            '🔍 Accessing London Stock Exchange...',
            '🇬🇧 Scanning AIM market updates...',
            '📈 Reviewing regulatory news service...'
          ]
        } else if (query.query.includes('feasibility')) {
          messages = [
            `🔍 Searching ${query.commodity || 'mining'} feasibility studies...`,
            '📊 Analyzing economic assessments...',
            '💎 Extracting project valuations...'
          ]
        } else if (query.query.includes('news') || query.query.includes('announcement')) {
          messages = [
            '🔍 Scanning global mining news...',
            '📰 Checking Mining.com, Kitco, Reuters...',
            '🌐 Aggregating industry updates...'
          ]
        } else if (query.commodity) {
          const comm = query.commodity.charAt(0).toUpperCase() + query.commodity.slice(1)
          messages = [
            `🔍 Searching ${comm} projects worldwide...`,
            `⛏️ Analyzing ${comm} exploration data...`,
            `💎 Processing ${comm} resource estimates...`
          ]
        } else {
          messages = [
            '🔍 Searching technical report databases...',
            '🌐 Scanning global mining repositories...',
            '📊 Analyzing project documentation...'
          ]
        }
        
        // Display messages sequentially like Looki
        for (const msg of messages) {
          updateProgress({
            stage: 'collecting',
            message: msg,
            currentStep: i + batch.indexOf(query) + 1,
            totalSteps: queries.length
          })
          await new Promise(resolve => setTimeout(resolve, 300))
        }
      }

      const batchResults = await Promise.allSettled(
        batch.map(query => this.searchSingleQuery(query))
      )

      // Collect successful results
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.length > 0) {
          allDocuments.push(...result.value)
          
          // Update progress with detailed found documents info
          const commodity = batch[index].commodity || 'mining'
          const docCount = result.value.length
          const query = batch[index]
          
          if (docCount > 0) {
            // Show what type of documents were found
            let docType = 'documents'
            if (query.query.includes('feasibility')) docType = 'feasibility studies'
            else if (query.query.includes('NI 43-101')) docType = 'NI 43-101 reports'
            else if (query.query.includes('JORC')) docType = 'JORC statements'
            else if (query.query.includes('resource')) docType = 'resource updates'
            else if (query.query.includes('PEA')) docType = 'preliminary assessments'
            
            updateProgress({
              stage: 'collecting',
              message: `✨ Discovered ${docCount} ${commodity} ${docType}`,
              currentStep: i + index + 1,
              totalSteps: queries.length
            })
            
            // Show document titles
            for (let j = 0; j < Math.min(2, result.value.length); j++) {
              const doc = result.value[j]
              setTimeout(() => {
                updateProgress({
                  stage: 'collecting',
                  message: `   → ${doc.title.substring(0, 80)}${doc.title.length > 80 ? '...' : ''}`,
                  currentStep: i + index + 1,
                  totalSteps: queries.length
                })
              }, (j + 1) * 150)
            }
          }
        }
      })

      // Stop if we have enough documents
      if (allDocuments.length >= 15) {
        updateProgress({
          stage: 'collecting',
          message: `🎯 Collected ${allDocuments.length} relevant documents - Sufficient data for analysis`,
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
      console.warn(`Search timeout for: ${query.query.substring(0, 50)}...`)
      updateProgress({
        stage: 'collecting',
        message: `⚠️ Skipped query (timeout): ${query.query.substring(0, 40)}..`,
        currentStep: 0,
        totalSteps: 0
      })
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