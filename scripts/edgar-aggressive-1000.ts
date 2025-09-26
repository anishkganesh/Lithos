#!/usr/bin/env node

import { config } from 'dotenv'
import { resolve } from 'path'
import axios from 'axios'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

import { supabaseService } from '../lib/supabase-service'
import { format, subMonths, subYears } from 'date-fns'

class AggressiveEDGARScraper {
  private existingAccessions: Set<string>
  private targetCount: number = 1000
  private totalDocuments: number = 0
  private newDocuments: number = 0
  private startTime: Date

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

    console.log('🚀 Aggressive EDGAR Scraper - Target: 1000 Documents')
    console.log(`📊 Starting with ${this.totalDocuments} existing documents`)
    console.log(`🎯 Need ${this.targetCount - this.totalDocuments} more documents\n`)
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
        size: '100' // Max batch size
      })

      const response = await axios.get(`${searchUrl}?${searchParams}`, {
        headers: {
          'User-Agent': 'Lithos Mining Analytics (aggressive@lithos.com)',
          'Accept': 'application/json'
        },
        timeout: 30000
      })

      await new Promise(resolve => setTimeout(resolve, 150))
      return response.data?.hits?.hits || []
    } catch (error) {
      return []
    }
  }

  async processHits(hits: any[]): Promise<number> {
    let newCount = 0

    for (const hit of hits) {
      if (this.totalDocuments >= this.targetCount) break

      const source = hit._source
      const [adsh, filename] = hit._id ? hit._id.split(':') : ['', '']
      const accessionNumber = source.adsh || adsh

      if (!accessionNumber || this.existingAccessions.has(accessionNumber)) {
        continue
      }

      // Check if it's mining-related
      const text = JSON.stringify(source).toLowerCase()
      const miningKeywords = ['mining', 'mineral', 'ore', 'lithium', 'copper', 'gold', 'silver',
                               'nickel', 'uranium', 'rare earth', 'cobalt', 'zinc', 'iron',
                               'coal', 'quarry', 'extraction', 'exploration', 'drill']

      if (!miningKeywords.some(keyword => text.includes(keyword))) {
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

      const { error } = await supabaseService
        .from('edgar_technical_documents')
        .upsert({
          cik,
          company_name: companyName,
          ticker,
          filing_date: source.filing_date || new Date().toISOString().split('T')[0],
          accession_number: accessionNumber,
          form_type: source.form || 'Technical Report',
          document_url: documentUrl,
          document_title: source.description || 'Technical Report',
          exhibit_number: hit._id?.includes('ex') ? 'EX' : null,
          file_size_bytes: source.size || 0,
          sic_code: source.sics?.[0],
          is_processed: false
        }, {
          onConflict: 'accession_number',
          ignoreDuplicates: true
        })

      if (!error) {
        this.existingAccessions.add(accessionNumber)
        this.totalDocuments++
        this.newDocuments++
        newCount++

        if (this.newDocuments % 10 === 0) {
          console.log(`📊 Progress: ${this.totalDocuments}/1000 | New: ${this.newDocuments}`)
        }
      }
    }

    return newCount
  }

  async run() {
    await this.initialize()

    if (this.totalDocuments >= this.targetCount) {
      console.log('✅ Already have 1000+ documents!')
      return
    }

    // Strategy 1: Search for various exhibit types
    const exhibitQueries = [
      'EX-96.1', 'EX-96.2', 'EX-96.3', // Technical report exhibits
      'EX-99.1 AND technical AND report', // Press releases with technical reports
      'EX-99.2 AND mineral AND resource', // Other exhibits with mineral data
      'technical report summary', // Direct search
      'mineral resource estimate', // Resource reports
      'preliminary economic assessment', // PEA reports
      'feasibility study', // DFS reports
      'NI 43-101', // Canadian standard
      'SK-1300', // US standard
      'JORC', // Australian standard
    ]

    // Search through the last 10 years
    const endDate = new Date()
    const startDate = subYears(endDate, 10)

    for (let year = 0; year < 10; year++) {
      if (this.totalDocuments >= this.targetCount) break

      const yearEnd = subYears(endDate, year)
      const yearStart = subYears(endDate, year + 1)

      console.log(`\n📅 Searching ${format(yearStart, 'yyyy')}...`)

      for (const query of exhibitQueries) {
        if (this.totalDocuments >= this.targetCount) break

        console.log(`   🔍 Query: "${query}"`)

        for (let offset = 0; offset < 500; offset += 100) {
          const hits = await this.searchEDGAR(
            query,
            format(yearStart, 'yyyy-MM-dd'),
            format(yearEnd, 'yyyy-MM-dd'),
            offset
          )

          if (hits.length === 0) break

          const newCount = await this.processHits(hits)
          if (newCount === 0) break // No new documents in this batch
        }
      }
    }

    // Final summary
    const elapsed = Math.floor((Date.now() - this.startTime.getTime()) / 1000)

    console.log('\n' + '='.repeat(60))
    console.log('✅ Scraping Complete!')
    console.log(`📊 Total documents: ${this.totalDocuments}`)
    console.log(`📈 New documents added: ${this.newDocuments}`)
    console.log(`⏱️  Time elapsed: ${Math.floor(elapsed / 60)}m ${elapsed % 60}s`)

    if (this.totalDocuments >= this.targetCount) {
      console.log('\n🎉 SUCCESS: Reached 1000+ unique documents!')
    } else {
      console.log(`\n⚠️  Found ${this.totalDocuments} documents (${this.targetCount - this.totalDocuments} short of target)`)
      console.log('   Consider expanding search criteria or date range')
    }
  }
}

// Run the aggressive scraper
async function main() {
  const scraper = new AggressiveEDGARScraper()

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