import { NextRequest, NextResponse } from 'next/server'
import { EDGARScraperV2 } from '@/lib/mining-agent/scrapers/edgar-scraper-v2'
import { supabaseService } from '@/lib/supabase-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      mode = 'incremental',
      daysBack = 7,
      commodities,
      tickers,
      limit = 50
    } = body

    // Create scraper instance
    const scraper = new EDGARScraperV2()

    // Prepare date range based on mode
    const now = new Date()
    let dateFrom: string | undefined
    let dateTo: string | undefined

    switch (mode) {
      case 'initial':
        // Last 5 years
        dateFrom = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate())
          .toISOString().split('T')[0]
        dateTo = now.toISOString().split('T')[0]
        break

      case 'incremental':
        // Last N days
        const fromDate = new Date()
        fromDate.setDate(fromDate.getDate() - daysBack)
        dateFrom = fromDate.toISOString().split('T')[0]
        dateTo = now.toISOString().split('T')[0]
        break

      case 'backfill':
        // Custom date range
        if (body.dateFrom && body.dateTo) {
          dateFrom = body.dateFrom
          dateTo = body.dateTo
        }
        break
    }

    // Start scraping in background (don't await)
    scraper.scrapeEX96Documents({
      dateFrom,
      dateTo,
      commodities,
      tickers,
      limit
    }).catch(error => {
      console.error('Background scraping error:', error)
    })

    // Return immediate response
    return NextResponse.json({
      success: true,
      message: 'EDGAR scraping initiated',
      parameters: {
        mode,
        dateFrom,
        dateTo,
        commodities,
        tickers,
        limit
      }
    })
  } catch (error) {
    console.error('Error initiating EDGAR scrape:', error)
    return NextResponse.json(
      { error: 'Failed to initiate scraping', details: String(error) },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get scraper status and statistics
    const { searchParams } = new URL(request.url)
    const runId = searchParams.get('runId')

    if (runId) {
      // Get specific run status
      const { data: run, error } = await supabaseService
        .from('edgar_scraper_runs')
        .select('*')
        .eq('id', runId)
        .single()

      if (error) throw error

      return NextResponse.json({
        success: true,
        run
      })
    } else {
      // Get recent runs
      const { data: runs, error: runsError } = await supabaseService
        .from('edgar_scraper_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(10)

      if (runsError) throw runsError

      // Get document statistics
      const { count: totalDocs } = await supabaseService
        .from('edgar_technical_documents')
        .select('*', { count: 'exact', head: true })

      const { count: unprocessedDocs } = await supabaseService
        .from('edgar_technical_documents')
        .select('*', { count: 'exact', head: true })
        .eq('is_processed', false)

      // Get commodity distribution
      const { data: commodityData } = await supabaseService
        .from('edgar_technical_documents')
        .select('primary_commodity')
        .not('primary_commodity', 'is', null)

      const commodityDistribution: Record<string, number> = {}
      commodityData?.forEach((doc: any) => {
        if (doc.primary_commodity) {
          commodityDistribution[doc.primary_commodity] =
            (commodityDistribution[doc.primary_commodity] || 0) + 1
        }
      })

      return NextResponse.json({
        success: true,
        statistics: {
          totalDocuments: totalDocs || 0,
          unprocessedDocuments: unprocessedDocs || 0,
          commodityDistribution,
          recentRuns: runs || []
        }
      })
    }
  } catch (error) {
    console.error('Error getting EDGAR scraper status:', error)
    return NextResponse.json(
      { error: 'Failed to get scraper status', details: String(error) },
      { status: 500 }
    )
  }
}