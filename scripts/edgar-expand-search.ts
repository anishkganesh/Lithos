#!/usr/bin/env node

import { config } from 'dotenv'
import { resolve } from 'path'
import axios from 'axios'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

import { supabaseService } from '../lib/supabase-service'
import { format, subYears } from 'date-fns'

class ExpandedEDGARScraper {
  private existingAccessions: Set<string>
  private totalDocuments: number = 0
  private newDocuments: number = 0
  private startTime: Date
  private targetNewDocs: number = 1000

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

    console.log('🚀 EXPANDED EDGAR Scraper - Finding 1000+ NEW Documents')
    console.log(`📊 Starting with ${this.totalDocuments} existing documents`)
    console.log(`🎯 Target: ${this.targetNewDocs} NEW documents from the last 3 years\n`)
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
          'User-Agent': 'Lithos Expanded Search (expand@lithos.com)',
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

    for (const hit of hits) {
      if (this.newDocuments >= this.targetNewDocs) {
        console.log('\n🎯 TARGET REACHED! Found 1000+ new documents')
        return newCount
      }

      const source = hit._source
      const [adsh, filename] = hit._id ? hit._id.split(':') : ['', '']
      const accessionNumber = source.adsh || adsh

      if (!accessionNumber || this.existingAccessions.has(accessionNumber)) {
        continue
      }

      // Broader search - include any document that mentions mining/minerals
      const text = JSON.stringify(source).toLowerCase()

      // Much broader keywords INCLUDING specific metals/commodities
      const resourceKeywords = [
        'mining', 'mineral', 'mine', 'ore', 'metal', 'resource',
        'exploration', 'drill', 'deposit', 'reserve', 'extraction',
        'project', 'property', 'development', 'production',
        'feasibility', 'assessment', 'technical', 'estimate',
        'commodity', 'processing', 'operation', 'facility',
        // Specific metals and commodities
        'lithium', 'copper', 'gold', 'silver', 'nickel', 'cobalt',
        'uranium', 'rare earth', 'zinc', 'iron', 'aluminum', 'platinum',
        'palladium', 'manganese', 'vanadium', 'tungsten', 'tin',
        'molybdenum', 'graphite', 'coal', 'potash', 'phosphate',
        // Technical standards
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

      // Check if document exists first
      const { data: existing } = await supabaseService
        .from('edgar_technical_documents')
        .select('id')
        .eq('accession_number', accessionNumber)
        .single()

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
          form_type: source.form || 'Mining Document',
          document_url: documentUrl,
          document_title: source.description || filename || 'Mining Related Document',
          exhibit_number: hit._id?.includes('ex') ? 'EX' : null,
          file_size_bytes: source.size || 0,
          sic_code: source.sics?.[0],
          is_processed: false
        })

      if (!error) {
        this.existingAccessions.add(accessionNumber)
        this.totalDocuments++
        this.newDocuments++
        newCount++

        if (this.newDocuments % 25 === 0) {
          this.printProgress()
        }
      }
    }

    return newCount
  }

  printProgress() {
    const elapsed = Math.floor((Date.now() - this.startTime.getTime()) / 1000)
    const rate = this.newDocuments / (elapsed || 1)

    console.log(
      `📊 Total: ${this.totalDocuments} | NEW FOUND: ${this.newDocuments}/${this.targetNewDocs} | ` +
      `Rate: ${rate.toFixed(1)}/sec | Time: ${Math.floor(elapsed / 60)}m ${elapsed % 60}s`
    )
  }

  async run() {
    await this.initialize()

    // Expanded query list - more general terms to find new documents
    const queries = [
      // General mining forms
      '8-K AND mining',
      '10-K AND mining',
      '10-Q AND mineral',
      '20-F AND resource',
      '40-F AND mining',

      // Broader exhibit searches
      'EX-99 AND mining',
      'EX-99 AND mineral',
      'EX-99 AND resource',
      'EX-10 AND mining',
      'EX-4 AND mining',

      // Project-related terms
      'mining project',
      'mineral project',
      'exploration project',
      'development project',
      'mining property',
      'mineral property',

      // Operations and production
      'mining operations',
      'mineral production',
      'ore processing',
      'mining facility',
      'processing plant',

      // Financial and technical
      'mining financial',
      'mineral economics',
      'mining valuation',
      'resource valuation',
      'mining investment',

      // Agreements and contracts
      'mining agreement',
      'offtake agreement',
      'joint venture mining',
      'mining acquisition',
      'mining merger',

      // Updates and reports
      'mining update',
      'exploration update',
      'production update',
      'quarterly mining',
      'annual mining report',

      // Specific mining types
      'open pit',
      'underground mine',
      'heap leach',
      'in-situ recovery',
      'placer mining',

      // Environmental and regulatory
      'mining permit',
      'environmental mining',
      'reclamation plan',
      'closure plan mining',
      'mining compliance',

      // Commodity-specific but broader
      'base metals',
      'precious metals',
      'industrial minerals',
      'strategic minerals',
      'critical minerals',
      'battery materials',
      'energy minerals'
    ]

    const endDate = new Date()
    const startDate = subYears(endDate, 3)

    console.log(`\n📅 Searching ${format(startDate, 'yyyy')} to ${format(endDate, 'yyyy')}`)
    console.log('🔍 Using expanded search criteria to find NEW documents\n')

    // Search year by year with all queries
    for (let yearsBack = 0; yearsBack < 3; yearsBack++) {
      if (this.newDocuments >= this.targetNewDocs) break

      const yearEnd = subYears(endDate, yearsBack)
      const yearStart = subYears(endDate, yearsBack + 1)
      const year = yearEnd.getFullYear()

      console.log(`\n📅 === Searching ${year} ===`)

      for (const query of queries) {
        if (this.newDocuments >= this.targetNewDocs) break

        console.log(`🔍 Trying: "${query}"`)

        let offset = 0
        let hasMore = true
        let queryNewDocs = 0

        while (offset < 10000 && hasMore) {
          if (this.newDocuments >= this.targetNewDocs) break

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

          const newCount = await this.processHits(hits)
          queryNewDocs += newCount

          // If we're finding new docs, keep going deeper
          if (newCount > 0) {
            console.log(`  ✅ Found ${newCount} new docs (Total new: ${this.newDocuments})`)
          }

          offset += 100
        }

        if (queryNewDocs > 0) {
          console.log(`  → Query total: ${queryNewDocs} new documents`)
        }
      }
    }

    // Final summary
    const elapsed = Math.floor((Date.now() - this.startTime.getTime()) / 1000)

    console.log('\n' + '='.repeat(80))
    console.log('✅ EXPANDED SEARCH COMPLETE!')
    console.log(`📊 Total documents in database: ${this.totalDocuments}`)
    console.log(`🆕 NEW documents found and added: ${this.newDocuments}`)
    console.log(`⏱️  Total time: ${Math.floor(elapsed / 60)} minutes ${elapsed % 60} seconds`)
    console.log(`⚡ Average rate: ${(this.newDocuments / (elapsed || 1)).toFixed(2)} documents/second`)

    if (this.newDocuments >= this.targetNewDocs) {
      console.log('\n🎉 SUCCESS! Found 1000+ new unique documents!')
    } else {
      console.log(`\n📈 Found ${this.newDocuments} new documents (searching for more...`)
      console.log('   Consider expanding search terms or date range')
    }
  }
}

// Run the expanded scraper
async function main() {
  const scraper = new ExpandedEDGARScraper()

  try {
    await scraper.run()
  } catch (error) {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  }
}

process.on('SIGINT', () => {
  console.log('\n\n🛑 Stopping scraper...')
  process.exit(0)
})

main().catch(console.error)