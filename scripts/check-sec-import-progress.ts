#!/usr/bin/env node

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import path from 'path'

// Load environment variables
config({ path: path.join(__dirname, '..', '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function checkProgress() {
  console.log('='.repeat(60))
  console.log('SEC IMPORT PROGRESS CHECK')
  console.log('='.repeat(60))
  
  try {
    // Get latest import run
    const { data: latestRun, error: runError } = await supabase
      .from('sec_import_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(1)
      .single()
    
    if (runError || !latestRun) {
      console.log('No import runs found')
      return
    }
    
    console.log(`\nLatest Import Run:`)
    console.log(`  ID: ${latestRun.id}`)
    console.log(`  Status: ${latestRun.status}`)
    console.log(`  Type: ${latestRun.run_type}`)
    console.log(`  Started: ${new Date(latestRun.started_at).toLocaleString()}`)
    if (latestRun.completed_at) {
      console.log(`  Completed: ${new Date(latestRun.completed_at).toLocaleString()}`)
    }
    console.log(`  Date Range: ${latestRun.date_from} to ${latestRun.date_to}`)
    
    console.log(`\nProgress:`)
    console.log(`  Filings Checked: ${latestRun.total_filings_checked || 0}`)
    console.log(`  Documents Found: ${latestRun.new_documents_found || 0}`)
    console.log(`  Documents Imported: ${latestRun.documents_imported || 0}`)
    console.log(`  Documents Failed: ${latestRun.documents_failed || 0}`)
    
    if (latestRun.error_message) {
      console.log(`\n⚠️  Error: ${latestRun.error_message}`)
    }
    
    // Get document statistics
    const { count: totalDocs, error: countError } = await supabase
      .from('sec_technical_reports')
      .select('*', { count: 'exact', head: true })
    
    const { data: recentDocs, error: recentError } = await supabase
      .from('sec_technical_reports')
      .select('company_name, filing_date, form_type, exhibit_number, primary_commodity')
      .order('created_at', { ascending: false })
      .limit(5)
    
    console.log(`\n📊 Database Statistics:`)
    console.log(`  Total SEC Documents: ${totalDocs || 0}`)
    
    if (recentDocs && recentDocs.length > 0) {
      console.log(`\n📄 Recent Documents:`)
      recentDocs.forEach(doc => {
        console.log(`  • ${doc.company_name} - ${doc.form_type} (${doc.filing_date})`)
        console.log(`    Exhibit: ${doc.exhibit_number}, Commodity: ${doc.primary_commodity || 'N/A'}`)
      })
    }
    
    // Get commodity distribution
    const { data: commodities, error: commError } = await supabase
      .from('sec_technical_reports')
      .select('primary_commodity')
      .not('primary_commodity', 'is', null)
    
    if (commodities) {
      const commodityCount: Record<string, number> = {}
      commodities.forEach(c => {
        if (c.primary_commodity) {
          commodityCount[c.primary_commodity] = (commodityCount[c.primary_commodity] || 0) + 1
        }
      })
      
      const topCommodities = Object.entries(commodityCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
      
      if (topCommodities.length > 0) {
        console.log(`\n🏆 Top Commodities:`)
        topCommodities.forEach(([commodity, count]) => {
          console.log(`  ${commodity}: ${count} documents`)
        })
      }
    }
    
    console.log('\n' + '='.repeat(60))
    
  } catch (error) {
    console.error('Error checking progress:', error)
  }
}

// Auto-refresh mode
async function monitor() {
  while (true) {
    console.clear()
    await checkProgress()
    
    // Check if still running
    const { data: latestRun } = await supabase
      .from('sec_import_runs')
      .select('status')
      .order('started_at', { ascending: false })
      .limit(1)
      .single()
    
    if (latestRun?.status !== 'running') {
      console.log('\n✅ Import completed!')
      break
    }
    
    console.log('\n🔄 Refreshing in 10 seconds... (Ctrl+C to exit)')
    await new Promise(resolve => setTimeout(resolve, 10000))
  }
}

// Parse command line arguments
const args = process.argv.slice(2)
const isMonitor = args.includes('--monitor') || args.includes('-m')

if (isMonitor) {
  monitor()
} else {
  checkProgress()
}
