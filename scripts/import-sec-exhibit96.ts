#!/usr/bin/env node

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { SECEdgarClient, CRITICAL_COMMODITIES } from '../lib/sec-edgar/client'
import path from 'path'

// Load environment variables
config({ path: path.join(__dirname, '..', '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

interface ImportStats {
  totalChecked: number
  newDocumentsFound: number
  documentsImported: number
  documentsFailed: number
  duplicatesSkipped: number
}

class SECImporter {
  private client: SECEdgarClient
  private stats: ImportStats
  private runId: string | null = null

  constructor() {
    this.client = new SECEdgarClient()
    this.stats = {
      totalChecked: 0,
      newDocumentsFound: 0,
      documentsImported: 0,
      documentsFailed: 0,
      duplicatesSkipped: 0
    }
  }

  /**
   * Initialize import run tracking
   */
  async initializeRun(runType: string, dateFrom: Date, dateTo: Date): Promise<void> {
    const { data, error } = await supabase
      .from('sec_import_runs')
      .insert({
        run_type: runType,
        status: 'running',
        date_from: dateFrom.toISOString().split('T')[0],
        date_to: dateTo.toISOString().split('T')[0],
        triggered_by: 'script'
      })
      .select('id')
      .single()

    if (error) {
      console.error('Error creating import run:', error)
      throw error
    }

    this.runId = data.id
    console.log(`Import run initialized with ID: ${this.runId}`)
  }

  /**
   * Update run statistics
   */
  async updateRunStats(status?: string): Promise<void> {
    if (!this.runId) return

    const update: any = {
      total_filings_checked: this.stats.totalChecked,
      new_documents_found: this.stats.newDocumentsFound,
      documents_imported: this.stats.documentsImported,
      documents_failed: this.stats.documentsFailed
    }

    if (status) {
      update.status = status
      if (status === 'completed' || status === 'failed') {
        update.completed_at = new Date().toISOString()
      }
    }

    await supabase
      .from('sec_import_runs')
      .update(update)
      .eq('id', this.runId)
  }

  /**
   * Check if document already exists
   */
  async documentExists(accessionNumber: string): Promise<boolean> {
    const { count, error } = await supabase
      .from('sec_technical_reports')
      .select('id', { count: 'exact', head: true })
      .eq('accession_number', accessionNumber)

    if (error) {
      console.error('Error checking document existence:', error)
      return false
    }

    return (count || 0) > 0
  }

  /**
   * Save document to database
   */
  async saveDocument(doc: any): Promise<void> {
    try {
      // Check if already exists
      if (await this.documentExists(doc.accessionNumber)) {
        this.stats.duplicatesSkipped++
        console.log(`Skipping duplicate: ${doc.accessionNumber}`)
        return
      }

      // Extract primary commodity
      const primaryCommodity = doc.commodities && doc.commodities.length > 0 
        ? doc.commodities[0] 
        : null

      // Prepare document for insertion
      const dbDoc = {
        cik: doc.cik,
        company_name: doc.companyName,
        form_type: doc.formType,
        filing_date: doc.filingDate,
        accession_number: doc.accessionNumber,
        document_url: doc.documentUrl,
        exhibit_number: doc.exhibitNumber,
        document_description: doc.description,
        file_size: doc.fileSize,
        project_name: doc.projectName,
        commodities: doc.commodities || [],
        primary_commodity: primaryCommodity,
        status: 'pending_parse'
      }

      const { error } = await supabase
        .from('sec_technical_reports')
        .insert(dbDoc)

      if (error) {
        console.error(`Error saving document ${doc.accessionNumber}:`, error)
        this.stats.documentsFailed++
      } else {
        console.log(`✓ Saved: ${doc.companyName} - ${doc.filingDate} - ${doc.exhibitNumber}`)
        this.stats.documentsImported++
      }
    } catch (error) {
      console.error(`Error processing document:`, error)
      this.stats.documentsFailed++
    }
  }

  /**
   * Run the import process
   */
  async run(startDate: Date, endDate: Date): Promise<void> {
    console.log('='.repeat(60))
    console.log('SEC EXHIBIT 96.1 IMPORT')
    console.log('='.repeat(60))
    console.log(`Date Range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`)
    console.log('Starting import...\n')

    try {
      // Initialize run tracking
      await this.initializeRun('bulk', startDate, endDate)

      // Search for documents
      const documents = await this.client.searchMiningFilings(
        startDate,
        endDate,
        (message, progress) => {
          console.log(`[${Math.round(progress)}%] ${message}`)
          this.stats.totalChecked++
          if (progress % 10 === 0) {
            this.updateRunStats() // Update periodically
          }
        }
      )

      this.stats.newDocumentsFound = documents.length
      console.log(`\nFound ${documents.length} Exhibit 96.1 documents`)

      // Save documents to database
      console.log('\nSaving to database...')
      for (const doc of documents) {
        await this.saveDocument(doc)
      }

      // Final stats update
      await this.updateRunStats('completed')

      // Print summary
      console.log('\n' + '='.repeat(60))
      console.log('IMPORT SUMMARY')
      console.log('='.repeat(60))
      console.log(`Total Filings Checked: ${this.stats.totalChecked}`)
      console.log(`New Documents Found: ${this.stats.newDocumentsFound}`)
      console.log(`Documents Imported: ${this.stats.documentsImported}`)
      console.log(`Documents Failed: ${this.stats.documentsFailed}`)
      console.log(`Duplicates Skipped: ${this.stats.duplicatesSkipped}`)
      console.log('='.repeat(60))

    } catch (error) {
      console.error('Import failed:', error)
      await this.updateRunStats('failed')
      throw error
    }
  }
}

// Main execution
async function main() {
  const importer = new SECImporter()

  // Parse command line arguments
  const args = process.argv.slice(2)
  let startDate: Date
  let endDate: Date

  if (args.length >= 1) {
    // Custom date range provided
    startDate = new Date(args[0])
    endDate = args[1] ? new Date(args[1]) : new Date()
  } else {
    // Default: Last 5 years
    endDate = new Date()
    startDate = new Date()
    startDate.setFullYear(startDate.getFullYear() - 5)
  }

  try {
    await importer.run(startDate, endDate)
    console.log('\n✅ Import completed successfully')
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Import failed:', error)
    process.exit(1)
  }
}

// Run if executed directly
if (require.main === module) {
  main()
}

export { SECImporter }
