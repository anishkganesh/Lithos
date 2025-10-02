import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { SECEdgarClient } from '@/lib/sec-edgar/client'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { mode = 'refresh' } = body

    // Get the latest filing date from database
    const { data: latestDoc } = await supabase
      .from('sec_technical_reports')
      .select('filing_date')
      .order('filing_date', { ascending: false })
      .limit(1)
      .single()

    let startDate: Date
    const endDate = new Date()

    if (mode === 'refresh' && latestDoc) {
      // Start from day after latest filing
      startDate = new Date(latestDoc.filing_date)
      startDate.setDate(startDate.getDate() + 1)
    } else {
      // Default to last 30 days for initial or forced refresh
      startDate = new Date()
      startDate.setDate(startDate.getDate() - 30)
    }

    // Initialize import run
    const { data: runData, error: runError } = await supabase
      .from('sec_import_runs')
      .insert({
        run_type: mode,
        status: 'running',
        date_from: startDate.toISOString().split('T')[0],
        date_to: endDate.toISOString().split('T')[0],
        triggered_by: 'api'
      })
      .select('id')
      .single()

    if (runError) {
      throw runError
    }

    const runId = runData.id

    // Run import in background (don't await)
    runImport(runId, startDate, endDate).catch(error => {
      console.error('Background import failed:', error)
      supabase
        .from('sec_import_runs')
        .update({ 
          status: 'failed',
          error_message: error.message,
          completed_at: new Date().toISOString()
        })
        .eq('id', runId)
    })

    return NextResponse.json({
      success: true,
      message: 'SEC import started',
      runId,
      dateRange: {
        from: startDate.toISOString().split('T')[0],
        to: endDate.toISOString().split('T')[0]
      }
    })

  } catch (error: any) {
    console.error('SEC import error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to start SEC import' },
      { status: 500 }
    )
  }
}

async function runImport(runId: string, startDate: Date, endDate: Date) {
  const client = new SECEdgarClient()
  const stats = {
    totalChecked: 0,
    newDocumentsFound: 0,
    documentsImported: 0,
    documentsFailed: 0,
    duplicatesSkipped: 0
  }

  try {
    console.log(`Starting SEC import for ${startDate.toISOString()} to ${endDate.toISOString()}`)

    // Search for documents
    const documents = await client.searchMiningFilings(
      startDate,
      endDate,
      async (message, progress) => {
        console.log(`[${Math.round(progress)}%] ${message}`)
        stats.totalChecked++
        
        // Update run stats periodically
        if (progress % 20 === 0) {
          await supabase
            .from('sec_import_runs')
            .update({
              total_filings_checked: stats.totalChecked,
              new_documents_found: stats.newDocumentsFound,
              documents_imported: stats.documentsImported,
              documents_failed: stats.documentsFailed
            })
            .eq('id', runId)
        }
      }
    )

    stats.newDocumentsFound = documents.length
    console.log(`Found ${documents.length} new Exhibit 96.1 documents`)

    // Save documents to database
    for (const doc of documents) {
      try {
        // Check if already exists
        const { count } = await supabase
          .from('sec_technical_reports')
          .select('id', { count: 'exact', head: true })
          .eq('accession_number', doc.accessionNumber)

        if (count && count > 0) {
          stats.duplicatesSkipped++
          continue
        }

        // Save document
        const { error } = await supabase
          .from('sec_technical_reports')
          .insert({
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
            primary_commodity: doc.commodities?.[0] || null,
            status: 'pending_parse'
          })

        if (error) {
          console.error(`Error saving document:`, error)
          stats.documentsFailed++
        } else {
          stats.documentsImported++
        }
      } catch (error) {
        console.error(`Error processing document:`, error)
        stats.documentsFailed++
      }
    }

    // Update final stats
    await supabase
      .from('sec_import_runs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        total_filings_checked: stats.totalChecked,
        new_documents_found: stats.newDocumentsFound,
        documents_imported: stats.documentsImported,
        documents_failed: stats.documentsFailed
      })
      .eq('id', runId)

    console.log('SEC import completed:', stats)

  } catch (error: any) {
    console.error('Import error:', error)
    
    await supabase
      .from('sec_import_runs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: error.message,
        error_details: { error: error.stack }
      })
      .eq('id', runId)
    
    throw error
  }
}

// GET endpoint to check import status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const runId = searchParams.get('runId')

    if (runId) {
      // Get specific run status
      const { data, error } = await supabase
        .from('sec_import_runs')
        .select('*')
        .eq('id', runId)
        .single()

      if (error) throw error

      return NextResponse.json(data)
    } else {
      // Get recent runs
      const { data, error } = await supabase
        .from('sec_import_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(10)

      if (error) throw error

      return NextResponse.json(data)
    }
  } catch (error: any) {
    console.error('Error fetching import status:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch import status' },
      { status: 500 }
    )
  }
}
