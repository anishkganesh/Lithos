#!/usr/bin/env node

import { config } from 'dotenv'
import { resolve } from 'path'
import axios from 'axios'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

import { supabaseService } from '../lib/supabase-service'
import { format, subMonths } from 'date-fns'

interface ScraperStats {
  totalDocuments: number
  newThisRun: number
  duplicatesSkipped: number
  errors: number
  startTime: Date
  currentRange?: string
}

class ContinuousEDGARScraper {
  private stats: ScraperStats
  private existingAccessions: Set<string>
  private targetCount: number = 1000
  private batchSize: number = 25
  private requestDelay: number = 200 // ms between requests

  constructor() {
    this.stats = {
      totalDocuments: 0,
      newThisRun: 0,
      duplicatesSkipped: 0,
      errors: 0,
      startTime: new Date()
    }
    this.existingAccessions = new Set()
  }

  async initialize() {
    // Load existing documents
    const { data: existingDocs, count } = await supabaseService
      .from('edgar_technical_documents')
      .select('accession_number', { count: 'exact' })

    this.existingAccessions = new Set(existingDocs?.map(d => d.accession_number) || [])
    this.stats.totalDocuments = count || 0

    console.log('🚀 Continuous EDGAR Scraper - Target: 1000 Documents')
    console.log(`📊 Starting with ${this.stats.totalDocuments} existing documents`)
    console.log(`🎯 Need ${this.targetCount - this.stats.totalDocuments} more documents\n`)
  }

  async searchEDGAR(dateFrom: string, dateTo: string, offset: number = 0): Promise<any[]> {
    try {
      const searchUrl = 'https://efts.sec.gov/LATEST/search-index'
      const searchParams = new URLSearchParams({
        q: 'EX-96.1',
        dateRange: 'custom',
        category: 'form-cat1',
        startdt: dateFrom,
        enddt: dateTo,
        from: String(offset),
        size: String(this.batchSize)
      })

      // Add SIC codes for mining companies
      const miningSics = '1000,1040,1090,1094,1099,1400,1220,1221,1231,1241,1311,1381,1382,1389'
      searchParams.append('sics', miningSics)

      const response = await axios.get(`${searchUrl}?${searchParams}`, {
        headers: {
          'User-Agent': 'Lithos Mining Analytics (continuous@lithos.com)',
          'Accept': 'application/json'
        },
        timeout: 30000
      })

      await new Promise(resolve => setTimeout(resolve, this.requestDelay))

      return response.data?.hits?.hits || []
    } catch (error: any) {
      console.error(`❌ Search error: ${error.message}`)
      this.stats.errors++
      return []
    }
  }

  async processDocument(hit: any): Promise<boolean> {
    try {
      const source = hit._source
      const [adsh, filename] = hit._id ? hit._id.split(':') : ['', '']
      const accessionNumber = source.adsh || adsh

      // Skip if we already have this document
      if (this.existingAccessions.has(accessionNumber)) {
        this.stats.duplicatesSkipped++
        return false
      }

      // Extract document info
      const cik = source.ciks?.[0] || ''
      const formattedCik = cik.padStart(10, '0')
      const formattedAccession = accessionNumber.replace(/-/g, '')

      const documentUrl = `https://www.sec.gov/Archives/edgar/data/${formattedCik}/${formattedAccession}/${filename || 'document.htm'}`

      // Extract basic metadata
      const companyInfo = source.display_names?.[0] || ''
      const companyName = companyInfo.split('(')[0].trim()
      const tickerMatch = companyInfo.match(/\(([^)]+)\)/)
      const ticker = tickerMatch ? tickerMatch[1].split(',')[0].trim() : null

      // Save to database
      const { error } = await supabaseService
        .from('edgar_technical_documents')
        .upsert({
          cik,
          company_name: companyName,
          ticker,
          filing_date: source.filing_date || new Date().toISOString().split('T')[0],
          accession_number: accessionNumber,
          form_type: source.form || 'EX-96.1',
          document_url: documentUrl,
          document_title: source.description || 'Technical Report',
          exhibit_number: 'EX-96.1',
          file_size_bytes: source.size || 0,
          sic_code: source.sics?.[0],
          is_processed: false,
          created_at: new Date().toISOString()
        }, {
          onConflict: 'accession_number',
          ignoreDuplicates: true
        })

      if (!error) {
        this.existingAccessions.add(accessionNumber)
        this.stats.newThisRun++
        this.stats.totalDocuments++
        return true
      }

      return false
    } catch (error) {
      this.stats.errors++
      return false
    }
  }

  async scrapeRange(dateFrom: string, dateTo: string): Promise<number> {
    let offset = 0
    let newInRange = 0
    let hasMore = true

    this.stats.currentRange = `${dateFrom} to ${dateTo}`

    while (hasMore && this.stats.totalDocuments < this.targetCount) {
      const hits = await this.searchEDGAR(dateFrom, dateTo, offset)

      if (hits.length === 0) {
        hasMore = false
        break
      }

      let newInBatch = 0
      for (const hit of hits) {
        const isNew = await this.processDocument(hit)
        if (isNew) newInBatch++

        // Progress update every 10 documents
        if (this.stats.newThisRun % 10 === 0) {
          this.printProgress()
        }

        if (this.stats.totalDocuments >= this.targetCount) {
          console.log('\n🎯 Target reached!')
          return newInRange
        }
      }

      newInRange += newInBatch
      offset += this.batchSize

      // If no new documents in this batch, try next date range
      if (newInBatch === 0) {
        hasMore = false
      }
    }

    return newInRange
  }

  printProgress() {
    const elapsed = Math.floor((Date.now() - this.stats.startTime.getTime()) / 1000)
    const rate = this.stats.newThisRun / (elapsed || 1)
    const remaining = this.targetCount - this.stats.totalDocuments
    const eta = remaining / rate

    process.stdout.write(
      `\r📊 Progress: ${this.stats.totalDocuments}/${this.targetCount} | ` +
      `New: ${this.stats.newThisRun} | ` +
      `Skipped: ${this.stats.duplicatesSkipped} | ` +
      `Rate: ${rate.toFixed(1)}/sec | ` +
      `ETA: ${Math.ceil(eta / 60)}min | ` +
      `Range: ${this.stats.currentRange}`
    )
  }

  async run() {
    await this.initialize()

    if (this.stats.totalDocuments >= this.targetCount) {
      console.log('✅ Already have 1000+ documents!')
      return
    }

    // Generate date ranges going backwards from today
    const ranges: Array<{from: string, to: string}> = []
    const today = new Date()

    // Create monthly ranges for the last 5 years
    for (let monthsBack = 0; monthsBack < 60; monthsBack++) {
      const endDate = subMonths(today, monthsBack)
      const startDate = subMonths(endDate, 1)

      ranges.push({
        from: format(startDate, 'yyyy-MM-dd'),
        to: format(endDate, 'yyyy-MM-dd')
      })
    }

    // Process each range
    for (const range of ranges) {
      if (this.stats.totalDocuments >= this.targetCount) {
        break
      }

      console.log(`\n📅 Scanning ${range.from} to ${range.to}`)
      const newDocs = await this.scrapeRange(range.from, range.to)

      if (newDocs === 0) {
        console.log(' - No new documents')
      } else {
        console.log(` - Added ${newDocs} new documents`)
      }
    }

    // Final summary
    console.log('\n\n' + '='.repeat(60))
    console.log('✅ Scraping Complete!')
    console.log(`📊 Total documents: ${this.stats.totalDocuments}`)
    console.log(`📈 New documents added: ${this.stats.newThisRun}`)
    console.log(`⏭️  Duplicates skipped: ${this.stats.duplicatesSkipped}`)
    console.log(`❌ Errors: ${this.stats.errors}`)

    const elapsed = Math.floor((Date.now() - this.stats.startTime.getTime()) / 1000)
    console.log(`⏱️  Time elapsed: ${Math.floor(elapsed / 60)}m ${elapsed % 60}s`)

    // Get company count
    const { data: companies } = await supabaseService
      .from('edgar_technical_documents')
      .select('company_name')
      .not('company_name', 'is', null)

    const uniqueCompanies = new Set(companies?.map(c => c.company_name))
    console.log(`🏢 Unique companies: ${uniqueCompanies.size}`)

    if (this.stats.totalDocuments >= this.targetCount) {
      console.log('\n🎉 SUCCESS: Reached 1000+ unique documents!')
    }
  }
}

// Run the continuous scraper
async function main() {
  const scraper = new ContinuousEDGARScraper()

  try {
    await scraper.run()
  } catch (error) {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Stopping scraper...')
  process.exit(0)
})

main().catch(console.error)