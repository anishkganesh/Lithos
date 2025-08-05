import { NextRequest, NextResponse } from 'next/server'
import { MiningQueryGenerator } from '@/lib/mining-agent/query-generator'
import { MiningWebScraper } from '@/lib/mining-agent/web-scraper'
import { ProjectExtractor } from '@/lib/mining-agent/project-extractor'
import { getSupabaseAdmin } from '@/lib/supabase/client'

// Progress update helper
function createProgressStream() {
  const encoder = new TextEncoder()
  let controller: ReadableStreamDefaultController | null = null
  
  const stream = new ReadableStream({
    start(c) {
      controller = c
    }
  })
  
  const sendProgress = (message: string, data?: any) => {
    if (controller) {
      const event = `data: ${JSON.stringify({ message, data, timestamp: Date.now() })}\n\n`
      controller.enqueue(encoder.encode(event))
    }
  }
  
  const close = () => {
    if (controller) {
      controller.close()
    }
  }
  
  return { stream, sendProgress, close }
}

export async function POST(request: NextRequest) {
  const { stream, sendProgress, close } = createProgressStream()
  
  // Start the async processing
  const processAsync = async () => {
    try {
      sendProgress('Initializing mining agent...')
      
      const supabaseAdmin = getSupabaseAdmin()
      if (!supabaseAdmin) {
        sendProgress('ERROR', { error: 'Database configuration error' })
        close()
        return
      }
      
      // Get initial project count
      const { count: beforeCount } = await supabaseAdmin
        .from('projects')
        .select('*', { count: 'exact', head: true })
      
      // Step 1: Generate queries
      sendProgress('Starting Mining Discovery Agent...')
      const queryGenerator = new MiningQueryGenerator()
      const queries = queryGenerator.generateQueries()
      sendProgress(`Generated ${queries.length} mining-specific search queries`)
      
      // Step 2: Search for documents
      sendProgress('Initializing search across mining databases...')
      const scraper = new MiningWebScraper()
      
      // Custom progress handler for scraping
      const originalUpdateProgress = (global as any).updateProgress
      let searchCount = 0
      let documentCount = 0
      
      ;(global as any).updateProgress = (state: any) => {
        if (state.message) {
          // Enhance progress messages with more detail
          if (state.message.includes('Searching for')) {
            searchCount++
            sendProgress(`Searching SEDAR, EDGAR, Mining.com (${searchCount}/${queries.length})...`)
          } else if (state.message.includes('Scanning technical report')) {
            sendProgress('Analyzing technical report databases...')
          } else if (state.message.includes('Found') && state.message.includes('project')) {
            documentCount++
            sendProgress(`Found ${documentCount} mining documents...`)
          } else if (state.message.includes('Searching regional')) {
            sendProgress('Scanning ASX and TSX filings...')
          } else {
            sendProgress(state.message)
          }
        }
      }
      
      const documents = await scraper.scrapeWithQueries(queries)
      
      if (documents.length === 0) {
        sendProgress('No new mining documents found')
        sendProgress('COMPLETE', { inserted: 0, updated: 0 })
        close()
        return
      }
      
      sendProgress(`Processing ${documents.length} documents for project data...`)
      
      // Step 3: Extract projects
      const extractor = new ProjectExtractor()
      let extractedCount = 0
      
      // Override progress for extraction
      const originalExtractorProgress = (global as any).updateProgress
      ;(global as any).updateProgress = (state: any) => {
        if (state.message && state.message.includes('Processing document')) {
          extractedCount++
          sendProgress(`Extracting project data (${extractedCount}/${documents.length})...`)
        }
      }
      
      const projects = await extractor.extractProjects(documents)
      
      // Restore original progress handler
      ;(global as any).updateProgress = originalExtractorProgress
      
      if (projects.length === 0) {
        sendProgress('No new projects found in documents')
        sendProgress('COMPLETE', { inserted: 0, updated: 0 })
        close()
        return
      }
      
      sendProgress(`Found ${projects.length} mining projects, updating database...`)
      
      // Step 4: Save projects
      let inserted = 0
      let updated = 0
      
      for (const project of projects) {
        try {
          // Check if project exists
          const { data: existing } = await supabaseAdmin
            .from('projects')
            .select('id')
            .eq('project_name', project.project_name)
            .eq('company_name', project.company_name)
            .single()
          
          if (!existing) {
            // Insert new project
            const projectData = {
              ...project,
              last_scraped_at: new Date().toISOString(),
              processing_status: 'completed',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
            
            const { error } = await supabaseAdmin
              .from('projects')
              .insert(projectData)
            
            if (!error) {
              inserted++
              sendProgress(`Added: ${project.project_name}`)
            }
          } else {
            // Update existing project
            const { error } = await supabaseAdmin
              .from('projects')
              .update({
                ...project,
                last_scraped_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', existing.id)
            
            if (!error) {
              updated++
              sendProgress(`Updated: ${project.project_name}`)
            }
          }
        } catch (error) {
          console.error(`Error saving project ${project.project_name}:`, error)
        }
      }
      
      // Get final count
      const { count: afterCount } = await supabaseAdmin
        .from('projects')
        .select('*', { count: 'exact', head: true })
      
      // Update last run timestamp
      await supabaseAdmin
        .from('agent_runs')
        .insert({
          agent_type: 'mining',
          projects_added: inserted,
          projects_updated: updated,
          total_projects: afterCount || 0,
          run_at: new Date().toISOString()
        })
      
      sendProgress('COMPLETE', {
        inserted,
        updated,
        totalBefore: beforeCount || 0,
        totalAfter: afterCount || 0
      })
      
    } catch (error) {
      console.error('Mining agent error:', error)
      sendProgress('ERROR', { error: error instanceof Error ? error.message : 'Unknown error' })
    } finally {
      // Restore original updateProgress
      if ((global as any).updateProgress) {
        delete (global as any).updateProgress
      }
      close()
    }
  }
  
  processAsync()
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
} 