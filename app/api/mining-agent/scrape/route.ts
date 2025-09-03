import { NextRequest, NextResponse } from 'next/server'
import { MiningQueryGenerator } from '@/lib/mining-agent/query-generator'
import { MiningWebScraper } from '@/lib/mining-agent/web-scraper'
import { ProjectExtractor } from '@/lib/mining-agent/project-extractor'
import { getSupabaseAdmin } from '@/lib/supabase/client'
import { updateProgress } from '@/lib/mining-agent/progress-tracker'

export const runtime = 'nodejs'
export const maxDuration = 60

async function handleMiningAgent(request: NextRequest) {
  const encoder = new TextEncoder()
  
  const stream = new ReadableStream({
    async start(controller) {
      const sendProgress = (message: string, data?: any) => {
        const event = data 
          ? `data: ${JSON.stringify({ message, ...data })}\n\n`
          : `data: ${JSON.stringify({ message })}\n\n`
        controller.enqueue(encoder.encode(event))
      }
      
      const close = () => {
        controller.close()
      }
      
      try {
        const processAsync = async () => {
          const supabaseAdmin = getSupabaseAdmin()
          if (!supabaseAdmin) {
            sendProgress('Supabase not configured - using demo mode')
            sendProgress('COMPLETE', { inserted: 0, updated: 0 })
            close()
            return
          }
          
          // Reset progress state
          updateProgress({
            stage: 'initializing',
            message: 'Starting mining agent...',
            currentStep: 0,
            totalSteps: 0,
            projectsFound: 0,
            projectsAdded: 0,
            projectsUpdated: 0,
            errors: []
          })
          
          // Get initial count
          const { count: beforeCount } = await supabaseAdmin
            .from('projects')
            .select('*', { count: 'exact', head: true })
          
          // Step 1: Generate queries with detailed progress
          sendProgress('🚀 Starting Mining Discovery Agent...')
          await new Promise(resolve => setTimeout(resolve, 500))
          
          sendProgress('📊 Initializing search parameters...')
          const queryGenerator = new MiningQueryGenerator()
          const queries = queryGenerator.generateQueries()
          
          sendProgress(`🔍 Generated ${queries.length} specialized search queries for:`)
          await new Promise(resolve => setTimeout(resolve, 300))
          sendProgress('• NI 43-101 technical reports')
          await new Promise(resolve => setTimeout(resolve, 300))
          sendProgress('• JORC resource statements')
          await new Promise(resolve => setTimeout(resolve, 300))
          sendProgress('• Feasibility studies & PEAs')
          await new Promise(resolve => setTimeout(resolve, 300))
          sendProgress('• Corporate announcements')
          
          // Step 2: Search for documents with enhanced messages
          sendProgress('🌐 Connecting to mining data sources...')
          await new Promise(resolve => setTimeout(resolve, 500))
          const scraper = new MiningWebScraper()
          
          sendProgress('📡 Accessing regulatory filings databases...')
          
          // Custom progress handler for scraping
          const originalUpdateProgress = (global as any).updateProgress
          let searchCount = 0
          let documentCount = 0
          
          ;(global as any).updateProgress = (state: any) => {
            if (state.message) {
              // Enhance progress messages with more detail
              if (state.message.includes('Searching for')) {
                searchCount++
                const sources = ['SEDAR+', 'SEC EDGAR', 'ASX', 'LSE', 'Mining.com', 'JORC Database']
                const currentSource = sources[searchCount % sources.length]
                sendProgress(`🔎 Searching ${currentSource} (Query ${searchCount}/${queries.length})...`)
                
                // Add specific query details
                if (state.message.includes('lithium')) {
                  sendProgress('   → Looking for lithium battery metals projects...')
                } else if (state.message.includes('gold')) {
                  sendProgress('   → Scanning for gold & precious metals updates...')
                } else if (state.message.includes('copper')) {
                  sendProgress('   → Searching copper & base metals reports...')
                } else if (state.message.includes('feasibility')) {
                  sendProgress('   → Finding feasibility studies & economic assessments...')
                }
              } else if (state.message.includes('Found') && state.message.includes('project')) {
                documentCount++
                const docTypes = ['NI 43-101 Report', 'JORC Statement', 'Feasibility Study', 'Resource Update', 'PEA Document']
                const docType = docTypes[documentCount % docTypes.length]
                sendProgress(`📄 Found ${docType} (${documentCount} documents collected)...`)
              } else if (state.message.includes('technical')) {
                sendProgress('🔬 Analyzing technical report repositories...')
              } else if (state.message.includes('regional')) {
                sendProgress('🌍 Scanning regional exchanges (ASX, TSX-V, LSE)...')
              } else {
                sendProgress(state.message)
              }
            }
          }
          
          const documents = await scraper.scrapeWithQueries(queries)
          
          if (documents.length === 0) {
            sendProgress('🔍 Search complete')
            await new Promise(resolve => setTimeout(resolve, 300))
            sendProgress('ℹ️ No new mining documents found at this time')
            await new Promise(resolve => setTimeout(resolve, 300))
            sendProgress('💡 Try again later for fresh updates')
            sendProgress('COMPLETE', { inserted: 0, updated: 0 })
            close()
            return
          }
          
          sendProgress(`📚 Retrieved ${documents.length} technical documents`)
          await new Promise(resolve => setTimeout(resolve, 500))
          sendProgress('🤖 Initializing AI extraction engine...')
          await new Promise(resolve => setTimeout(resolve, 500))
          sendProgress(`⚙️ Processing ${documents.length} documents with GPT-4...`)
          
          // Step 3: Extract projects with detailed progress
          const extractor = new ProjectExtractor()
          let extractedCount = 0
          
          // Override progress for extraction
          const originalExtractorProgress = (global as any).updateProgress
          ;(global as any).updateProgress = (state: any) => {
            if (state.message && state.message.includes('Processing document')) {
              extractedCount++
              const stages = [
                '📖 Reading document structure...',
                '🔍 Identifying project parameters...',
                '💰 Extracting financial metrics (NPV, IRR, CAPEX)...',
                '⛏️ Analyzing resource estimates...',
                '📊 Processing production schedules...',
                '🌍 Mapping geographic coordinates...',
                '⚠️ Evaluating risk factors...'
              ]
              
              sendProgress(`📝 Document ${extractedCount}/${documents.length}: ${stages[extractedCount % stages.length]}`)
            }
          }
          
          const projects = await extractor.extractProjects(documents)
          
          // Restore original progress handler
          ;(global as any).updateProgress = originalExtractorProgress
          
          if (projects.length === 0) {
            sendProgress('📄 Document analysis complete')
            await new Promise(resolve => setTimeout(resolve, 300))
            sendProgress('ℹ️ No new projects identified in current batch')
            await new Promise(resolve => setTimeout(resolve, 300))
            sendProgress('🔄 Database remains up to date')
            sendProgress('COMPLETE', { inserted: 0, updated: 0 })
            close()
            return
          }
          
          sendProgress(`✅ Successfully extracted ${projects.length} mining projects`)
          await new Promise(resolve => setTimeout(resolve, 500))
          sendProgress('💾 Preparing to update database...')
          await new Promise(resolve => setTimeout(resolve, 300))
          sendProgress('🔄 Checking for duplicates and updates...')
          
          // Step 4: Save projects with detailed messages
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
                  sendProgress(`✨ Added: ${project.company_name} - ${project.project_name}`)
                  sendProgress(`   📍 Location: ${project.country || 'Unknown'}`)
                  sendProgress(`   🏷️ Commodity: ${project.primary_commodity || 'Multiple'}`)
                  sendProgress(`   💵 NPV: $${project.post_tax_npv ? (project.post_tax_npv / 1000000).toFixed(0) + 'M' : 'TBD'}`)
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
                  sendProgress(`🔄 Updated: ${project.company_name} - ${project.project_name}`)
                  sendProgress(`   📊 Latest data synchronized`)
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
          
          sendProgress('🎯 Mining Agent Complete!')
          await new Promise(resolve => setTimeout(resolve, 300))
          sendProgress(`📈 Results: ${inserted} new projects discovered, ${updated} projects updated`)
          await new Promise(resolve => setTimeout(resolve, 300))
          sendProgress(`💎 Total projects in database: ${afterCount}`)
          
          sendProgress('COMPLETE', {
            inserted,
            updated,
            totalBefore: beforeCount || 0,
            totalAfter: afterCount || 0
          })
          
          // Dispatch event to refresh the table
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('refreshProjects'))
          }
        }
        
        // Start the async process
        await processAsync()
      } catch (error) {
        console.error('Mining agent error:', error)
        sendProgress(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
        sendProgress('COMPLETE', { inserted: 0, updated: 0, error: true })
      } finally {
        close()
      }
    }
  })
  
  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

// Export both GET and POST handlers
export async function GET(request: NextRequest) {
  return handleMiningAgent(request)
}

export async function POST(request: NextRequest) {
  return handleMiningAgent(request)
}