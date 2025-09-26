#!/usr/bin/env node

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

// Import after env vars are loaded
import { EDGARScraperV2 } from '../lib/mining-agent/scrapers/edgar-scraper-v2'
import { supabaseService } from '../lib/supabase-service'
import { format, subDays } from 'date-fns'

interface ScraperConfig {
  mode: 'initial' | 'incremental' | 'backfill'
  daysBack?: number
  commodities?: string[]
  tickers?: string[]
  limit?: number
}

async function runScraper(config: ScraperConfig) {
  console.log(`🚀 Starting EDGAR scraper in ${config.mode} mode...`)

  const scraper = new EDGARScraperV2((progress) => {
    console.log(
      `📊 Progress: ${progress.processed}/${progress.total} processed | ` +
      `${progress.errors} errors | ${progress.status}`
    )
  })

  try {
    let params: any = {
      commodities: config.commodities,
      tickers: config.tickers,
      limit: config.limit
    }

    switch (config.mode) {
      case 'initial':
        // Scrape all historical data (last 5 years)
        params.dateFrom = format(subDays(new Date(), 365 * 5), 'yyyy-MM-dd')
        params.dateTo = format(new Date(), 'yyyy-MM-dd')
        console.log(`📅 Scraping from ${params.dateFrom} to ${params.dateTo}`)
        break

      case 'incremental':
        // Scrape recent data (last N days)
        const daysBack = config.daysBack || 7
        params.dateFrom = format(subDays(new Date(), daysBack), 'yyyy-MM-dd')
        params.dateTo = format(new Date(), 'yyyy-MM-dd')
        console.log(`📅 Scraping last ${daysBack} days: ${params.dateFrom} to ${params.dateTo}`)
        break

      case 'backfill':
        // Specific date range for backfilling
        if (!config.daysBack) {
          throw new Error('daysBack is required for backfill mode')
        }
        params.dateFrom = format(subDays(new Date(), config.daysBack + 30), 'yyyy-MM-dd')
        params.dateTo = format(subDays(new Date(), config.daysBack), 'yyyy-MM-dd')
        console.log(`📅 Backfilling: ${params.dateFrom} to ${params.dateTo}`)
        break
    }

    // Run the scraper
    await scraper.scrapeEX96Documents(params)

    // Get statistics
    const { data: stats } = await supabaseService
      .from('edgar_technical_documents')
      .select('count', { count: 'exact' })

    console.log(`✅ Scraping completed! Total documents in database: ${stats?.[0]?.count || 0}`)

    // Check for unprocessed documents
    const { data: unprocessed } = await supabaseService
      .from('edgar_technical_documents')
      .select('count', { count: 'exact' })
      .eq('is_processed', false)

    console.log(`📝 Unprocessed documents: ${unprocessed?.[0]?.count || 0}`)

  } catch (error) {
    console.error('❌ Scraper error:', error)
    process.exit(1)
  }
}

// Parse command line arguments
async function main() {
  const args = process.argv.slice(2)
  const mode = args[0] as ScraperConfig['mode'] || 'incremental'

  const config: ScraperConfig = {
    mode,
    daysBack: parseInt(args[1] || '7'),
    limit: parseInt(process.env.SCRAPER_LIMIT || '100')
  }

  // Parse commodities if provided
  if (process.env.SCRAPER_COMMODITIES) {
    config.commodities = process.env.SCRAPER_COMMODITIES.split(',')
  }

  // Parse tickers if provided
  if (process.env.SCRAPER_TICKERS) {
    config.tickers = process.env.SCRAPER_TICKERS.split(',')
  }

  await runScraper(config)
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...')
  process.exit(0)
})

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
}

export { runScraper }