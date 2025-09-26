#!/usr/bin/env node

import { config } from 'dotenv'
import { resolve } from 'path'
import axios from 'axios'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

import { supabaseService } from '../lib/supabase-service'
import { format, subYears } from 'date-fns'

class UltimateEDGARScraper {
  private existingAccessions: Set<string>
  private totalDocuments: number = 0
  private newDocuments: number = 0
  private startTime: Date
  private targetCount: number = 10000 // Go big!
  private noNewDocsStreak: number = 0

  constructor() {
    this.existingAccessions = new Set()
    this.startTime = new Date()
  }

  async initialize() {
    const { data: existingDocs, count } = await supabaseService
      .from('edgar_technical_documents')
      .select('accession_number', { count: 'exact' })

    this.existingAccessions = new Set(existingDocs?.map(d => d.accession_number) || [])
    this.totalDocuments = count || 0

    console.log('🚀 ULTIMATE EDGAR Scraper - Collecting ALL Available Documents')
    console.log(`📊 Starting with ${this.totalDocuments} existing documents`)
    console.log(`🎯 Target: As many as we can find!\n`)
  }

  async searchEDGAR(query: string, dateFrom: string, dateTo: string, offset: number = 0): Promise<any[]> {
    try {
      const searchUrl = 'https://efts.sec.gov/LATEST/search-index'
      const searchParams = new URLSearchParams({
        q: query,
        dateRange: 'custom',
        startdt: dateFrom,
        enddt: dateTo,
        from: String(offset),
        size: '100'
      })

      const response = await axios.get(`${searchUrl}?${searchParams}`, {
        headers: {
          'User-Agent': 'Lithos Ultimate Scraper (ultimate@lithos.com)',
          'Accept': 'application/json'
        },
        timeout: 30000
      })

      await new Promise(resolve => setTimeout(resolve, 100))
      return response.data?.hits?.hits || []
    } catch (error) {
      return []
    }
  }

  async processHits(hits: any[]): Promise<number> {
    let newCount = 0
    let actuallyNew = 0

    for (const hit of hits) {
      const source = hit._source
      const [adsh, filename] = hit._id ? hit._id.split(':') : ['', '']
      const accessionNumber = source.adsh || adsh

      if (!accessionNumber || this.existingAccessions.has(accessionNumber)) {
        continue
      }

      // Very broad mining/resource filter
      const text = JSON.stringify(source).toLowerCase()
      const resourceKeywords = [
        'mining', 'mineral', 'ore', 'metal', 'resource', 'exploration',
        'drill', 'deposit', 'reserve', 'extraction', 'quarry', 'mine',
        'lithium', 'copper', 'gold', 'silver', 'nickel', 'cobalt',
        'uranium', 'rare earth', 'zinc', 'iron', 'aluminum', 'platinum',
        'palladium', 'manganese', 'vanadium', 'tungsten', 'tin',
        'molybdenum', 'graphite', 'coal', 'potash', 'phosphate',
        'technical report', 'feasibility', 'resource estimate',
        'ni 43-101', 'sk-1300', 'jorc', 'pea', 'dfs', 'pfs'
      ]

      if (!resourceKeywords.some(keyword => text.includes(keyword))) {
        continue
      }

      const cik = source.ciks?.[0] || ''
      const formattedCik = cik.padStart(10, '0')
      const formattedAccession = accessionNumber.replace(/-/g, '')

      const documentUrl = `https://www.sec.gov/Archives/edgar/data/${formattedCik}/${formattedAccession}/${filename || 'document.htm'}`

      const companyInfo = source.display_names?.[0] || ''
      const companyName = companyInfo.split('(')[0].trim()
      const tickerMatch = companyInfo.match(/\(([^)]+)\)/)
      const ticker = tickerMatch ? tickerMatch[1].split(',')[0].trim() : null

      // First check if document exists
      const { data: existing } = await supabaseService
        .from('edgar_technical_documents')
        .select('id')
        .eq('accession_number', accessionNumber)
        .single()

      // If it already exists, skip it
      if (existing) {
        this.existingAccessions.add(accessionNumber)
        continue
      }

      // Insert new document
      const { error } = await supabaseService
        .from('edgar_technical_documents')
        .insert({
          cik,
          company_name: companyName,
          ticker,
          filing_date: source.filing_date || new Date().toISOString().split('T')[0],
          accession_number: accessionNumber,
          form_type: source.form || 'Technical Document',
          document_url: documentUrl,
          document_title: source.description || 'Mining Document',
          exhibit_number: hit._id?.includes('ex') ? 'EX' : null,
          file_size_bytes: source.size || 0,
          sic_code: source.sics?.[0],
          is_processed: false
        })

      if (!error) {
        this.existingAccessions.add(accessionNumber)
        this.totalDocuments++
        this.newDocuments++
        actuallyNew++

        if (this.newDocuments % 50 === 0) {
          this.printProgress()
        }
      } else if (error && !error.message?.includes('duplicate')) {
        console.log(`\n⚠️ Error inserting: ${error.message}`)
      }
    }

    return actuallyNew
  }

  printProgress() {
    const elapsed = Math.floor((Date.now() - this.startTime.getTime()) / 1000)
    const rate = this.newDocuments / (elapsed || 1)

    process.stdout.write(
      `\r📊 Total: ${this.totalDocuments} | New this run: ${this.newDocuments} | ` +
      `Rate: ${rate.toFixed(1)}/sec | Time: ${Math.floor(elapsed / 60)}m ${elapsed % 60}s`
    )
  }

  async run() {
    await this.initialize()

    // Comprehensive search queries
    const queries = [
      // Technical report exhibits
      'EX-96.1', 'EX-96.2', 'EX-96.3', 'EX-96',
      'EX-99.1 AND (technical OR mineral OR resource)',
      'EX-99.2 AND (mining OR mineral)',
      'EX-99 AND technical report',

      // Direct technical report searches
      'technical report summary',
      'mineral resource estimate',
      'mineral reserve estimate',
      'preliminary economic assessment',
      'pre-feasibility study',
      'feasibility study',
      'definitive feasibility study',

      // Standards
      'NI 43-101', 'ni43-101', 'ni 43 101',
      'SK-1300', 'sk1300', 'S-K 1300',
      'JORC', 'jorc code',
      'SAMREC', 'PERC',

      // Mining terms
      'measured AND indicated AND inferred',
      'proven AND probable reserves',
      'life of mine',
      'all-in sustaining costs',
      'cutoff grade',
      'strip ratio',
      'recovery rate',

      // Commodities
      'lithium AND resource',
      'copper AND reserves',
      'gold AND feasibility',
      'silver AND technical',
      'nickel AND mineral',
      'uranium AND resource',
      'rare earth AND estimate',
      'cobalt AND mining',
      'graphite AND deposit',
      'vanadium AND project'
    ]

    // Search ONLY the past 3 years (2022-2025) for recent, relevant documents
    const currentYear = new Date().getFullYear()
    const yearsToSearch = 3

    console.log(`\n📆 Focusing on RECENT documents (${currentYear - yearsToSearch + 1}-${currentYear})`)
    console.log('🎯 Exhaustive search of all mining-related technical documents\n')

    // Search year by year, most recent first
    for (let yearsBack = 0; yearsBack < yearsToSearch; yearsBack++) {
      const yearEnd = subYears(new Date(), yearsBack)
      const yearStart = subYears(new Date(), yearsBack + 1)
      const year = yearEnd.getFullYear()

      console.log(`\n\n📅 === EXHAUSTIVELY SEARCHING ${year} ===`)
      let yearTotal = 0

      for (const query of queries) {
        console.log(`\n🔍 Query: "${query.substring(0, 50)}..."`)

        let totalForQuery = 0
        let hasMore = true
        let consecutiveEmptyBatches = 0

        // Search up to 50,000 results per query (500 pages of 100)
        for (let offset = 0; offset < 50000 && hasMore; offset += 100) {
          const hits = await this.searchEDGAR(
            query,
            format(yearStart, 'yyyy-MM-dd'),
            format(yearEnd, 'yyyy-MM-dd'),
            offset
          )

          if (hits.length === 0) {
            consecutiveEmptyBatches++
            if (consecutiveEmptyBatches > 3) {
              hasMore = false
              break
            }
            continue
          }

          consecutiveEmptyBatches = 0
          const newCount = await this.processHits(hits)
          totalForQuery += newCount

          // Keep going even if no new docs - there might be more later
          if (newCount === 0) {
            this.noNewDocsStreak++
          } else {
            this.noNewDocsStreak = 0
            yearTotal += newCount
          }

          this.printProgress()
        }

        if (totalForQuery > 0) {
          console.log(` → Added ${totalForQuery} new documents from this query`)
        }
      }

      console.log(`\n📊 Year ${year} Total: ${yearTotal} new documents`)

      // Continue even if no new documents - be exhaustive
      if (yearTotal === 0) {
        console.log('⚠️  No new documents in this year, but continuing search...')
      }
    }

    // After main search, do additional commodity-specific deep dives
    console.log('\n\n🔬 === DEEP DIVE: COMMODITY-SPECIFIC SEARCHES ===')

    const deepDiveQueries = [
      // Critical minerals with variations
      'lithium AND (carbonate OR hydroxide OR spodumene)',
      'graphite AND (flake OR synthetic OR battery)',
      'cobalt AND (sulfate OR oxide OR hydroxide)',
      'nickel AND (laterite OR sulfide OR battery)',
      'manganese AND (oxide OR battery OR steel)',

      // Rare earth elements
      'neodymium', 'dysprosium', 'terbium', 'praseodymium',
      'europium', 'yttrium', 'lanthanum', 'cerium',

      // Battery metals combinations
      'battery AND metals AND production',
      'cathode AND materials AND supply',
      'anode AND graphite AND production',

      // Technical report variations
      'qualified person AND resource',
      'competent person AND reserves',
      'bankable feasibility study',
      'independent technical report',
      'metallurgical test work',
      'pilot plant AND results'
    ]

    for (const query of deepDiveQueries) {
      console.log(`\n🔬 Deep dive: "${query.substring(0, 50)}..."`)

      // Search all 3 years for each deep dive query
      for (let yearsBack = 0; yearsBack < yearsToSearch; yearsBack++) {
        const yearEnd = subYears(new Date(), yearsBack)
        const yearStart = subYears(new Date(), yearsBack + 1)

        let offset = 0
        let hasMore = true

        while (offset < 1000 && hasMore) {
          const hits = await this.searchEDGAR(
            query,
            format(yearStart, 'yyyy-MM-dd'),
            format(yearEnd, 'yyyy-MM-dd'),
            offset
          )

          if (hits.length === 0) {
            hasMore = false
            break
          }

          await this.processHits(hits)
          offset += 100
          this.printProgress()
        }
      }
    }

    // Final summary
    const elapsed = Math.floor((Date.now() - this.startTime.getTime()) / 1000)

    console.log('\n\n' + '='.repeat(80))
    console.log('🏁 ULTIMATE SCRAPING COMPLETE!')
    console.log(`📊 Total documents in database: ${this.totalDocuments}`)
    console.log(`📈 New documents added this run: ${this.newDocuments}`)
    console.log(`⏱️  Total time: ${Math.floor(elapsed / 60)} minutes ${elapsed % 60} seconds`)
    console.log(`⚡ Average rate: ${(this.newDocuments / (elapsed || 1)).toFixed(2)} documents/second`)

    // Get company count
    const { data: companies } = await supabaseService
      .from('edgar_technical_documents')
      .select('company_name')
      .not('company_name', 'is', null)

    const uniqueCompanies = new Set(companies?.map(c => c.company_name))
    console.log(`🏢 Total unique companies: ${uniqueCompanies.size}`)

    if (this.totalDocuments >= 2000) {
      console.log('\n🎉 MILESTONE: Over 2000 unique technical documents collected!')
    }

    console.log('\n💡 Tip: Run again later to catch newly filed documents')
  }
}

// Run the ultimate scraper
async function main() {
  const scraper = new UltimateEDGARScraper()

  try {
    await scraper.run()
  } catch (error) {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  }
}

process.on('SIGINT', () => {
  console.log('\n\n🛑 Stopping scraper gracefully...')
  process.exit(0)
})

main().catch(console.error)