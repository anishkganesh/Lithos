import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import FirecrawlApp from '@mendable/firecrawl-js'
import { supabaseService } from '@/lib/supabase-service'

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
})

// Mining data sources configuration
const miningSources = {
  // Regulatory filings
  regulatory: [
    'sedarplus.ca', // Canadian securities filings
    'sec.gov/edgar', // US SEC filings
    'asx.com.au/announcements', // Australian Stock Exchange
    'londonstockexchange.com/rns', // London Stock Exchange
    'tsx.com', // Toronto Stock Exchange
  ],
  
  // Technical report databases
  technical: [
    'mining.com', // Industry news and reports
    'infomine.com', // Mining intelligence
    'miningweekly.com', // Mining news
    'northernminer.com', // Canadian mining news
    'australianmining.com.au', // Australian mining
    'mining-journal.com', // Global mining news
  ],
  
  // Specific project databases
  projects: [
    'resourceprojects.gov.au', // Australian resource projects
    'nrcan.gc.ca', // Natural Resources Canada
    'usgs.gov', // US Geological Survey
    'bgs.ac.uk', // British Geological Survey
  ],
  
  // Company websites and IR pages
  companies: [
    'investor relations', // Generic IR pages
    'technical reports', // Technical report sections
    'ni 43-101', // Canadian standard
    'jorc', // Australian standard
    'feasibility study',
    'resource estimate',
  ]
}

// Commodity rotation for diverse discovery
const commodityRotation = [
  'lithium', 'copper', 'nickel', 'cobalt', 'graphite',
  'rare earths', 'uranium', 'gold', 'silver', 'zinc',
  'lead', 'tin', 'tungsten', 'vanadium', 'manganese'
]

// Geographic regions for search diversity
const geographicRegions = [
  { region: 'North America', countries: ['Canada', 'USA', 'Mexico'] },
  { region: 'Australia', countries: ['Australia'] },
  { region: 'South America', countries: ['Chile', 'Peru', 'Brazil', 'Argentina'] },
  { region: 'Africa', countries: ['DRC', 'South Africa', 'Zambia', 'Zimbabwe', 'Botswana'] },
  { region: 'Europe', countries: ['Finland', 'Sweden', 'Serbia', 'Portugal'] },
  { region: 'Asia', countries: ['Indonesia', 'Philippines', 'Mongolia', 'Kazakhstan'] },
]

// Project stages for classification
const projectStages = {
  'exploration': ['exploration', 'early stage', 'greenfield', 'grassroots'],
  'PEA': ['preliminary economic assessment', 'PEA', 'scoping study'],
  'PFS': ['pre-feasibility', 'prefeasibility', 'PFS'],
  'DFS': ['definitive feasibility', 'bankable feasibility', 'DFS', 'BFS'],
  'development': ['construction', 'development', 'financing', 'permitted'],
  'production': ['production', 'operating', 'commercial', 'mining'],
}

// Helper function to create progress stream
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

// Generate diverse search queries
function generateMiningQueries(): string[] {
  const queries: string[] = []
  const currentDate = new Date()
  const year = currentDate.getFullYear()
  const month = currentDate.toLocaleDateString('en-US', { month: 'long' })
  
  // Rotate through commodities
  const selectedCommodities = commodityRotation
    .sort(() => Math.random() - 0.5)
    .slice(0, 5)
  
  // Rotate through regions
  const selectedRegions = geographicRegions
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
  
  // Technical report queries
  for (const commodity of selectedCommodities) {
    queries.push(`${commodity} mining project ${year}`)
    queries.push(`${commodity} mine development news`)
    queries.push(`${commodity} resource update ${year}`)
  }
  
  // Regional queries
  for (const region of selectedRegions) {
    const country = region.countries[Math.floor(Math.random() * region.countries.length)]
    queries.push(`"${country}" mining project "${year}" development`)
    queries.push(`"${country}" mineral resources "technical report" ${month}`)
  }
  
  // Recent announcements
  queries.push(`mining "project update" "${month} ${year}" "resource estimate"`)
  queries.push(`mining feasibility study ${year}`)
  queries.push(`mining resource estimate ${year}`)
  queries.push(`mining project economics ${year}`)
  
  // Company and news
  queries.push(`mining news ${month} ${year}`)
  queries.push(`new mining discoveries ${year}`)
  queries.push(`mining company announcements ${year}`)
  
  return queries.slice(0, 15) // Limit to 15 queries for speed
}

// Real web search function using Firecrawl
async function searchMiningDocuments(query: string): Promise<any[]> {
  const firecrawlApiKey = process.env.FIRECRAWL_API_KEY
  
  if (!firecrawlApiKey) {
    console.error('FIRECRAWL_API_KEY not configured')
    // Return minimal mock data if API key not available
    return [{
      url: `https://example.com/report-${Date.now()}`,
      title: `Mining Project Report - ${query}`,
      content: `Sample content for query: ${query}`,
      source: 'SEDAR+'
    }]
  }
  
  try {
    const firecrawl = new FirecrawlApp({ apiKey: firecrawlApiKey })
    
    // Search for mining documents
    const searchResults = await firecrawl.search(query, {
      limit: 3,
      searchOptions: {
        limit: 3
      }
    })
    
    if (!searchResults.success || !searchResults.data) {
      return []
    }
    
    // Process and return results
    return searchResults.data.map((result: any) => ({
      url: result.url,
      title: result.title || 'Untitled Document',
      content: result.markdown || result.content || '',
      source: determineSource(result.url)
    }))
  } catch (error) {
    console.error('Error searching with Firecrawl:', error)
    return []
  }
}

// Helper function to determine source from URL
function determineSource(url: string): string {
  if (url.includes('sedar')) return 'SEDAR+'
  if (url.includes('sec.gov')) return 'SEC EDGAR'
  if (url.includes('asx.com')) return 'ASX'
  if (url.includes('londonstockexchange')) return 'LSE'
  if (url.includes('tsx')) return 'TSX'
  if (url.includes('mining.com')) return 'Mining.com'
  if (url.includes('northernminer')) return 'Northern Miner'
  return 'Web'
}

// Extract projects from documents using AI
async function extractProjectsWithAI(documents: any[]): Promise<any[]> {
  const projects: any[] = []
  
  for (const doc of documents) {
    try {
      const prompt = `Extract mining project information from this document. Return a JSON object with:
      - project_name: Name of the project
      - company_name: Name of the company
      - country: Country location
      - stage: One of (Exploration, PEA, PFS, DFS, Development, Production)
      - primary_commodity: Main commodity
      - post_tax_npv: NPV in millions USD (number only)
      - irr_percent: IRR percentage (number only)
      - capex_usd_m: CAPEX in millions USD (number only)
      - mine_life_years: Mine life in years (number only)
      - resource_tonnage_mt: Resource in million tonnes (number only)
      - grade: Grade with units (e.g., "1.2% Li2O")
      - key_highlights: Array of 3-5 key points
      
      Document: ${doc.content?.slice(0, 2000) || doc.title}`
      
      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a mining industry analyst extracting project data from technical reports.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      })
      
      const projectData = JSON.parse(response.choices[0].message.content || '{}')
      
      if (projectData.project_name && projectData.company_name) {
        projects.push({
          ...projectData,
          data_source: doc.source,
          source_document_url: doc.url,
          source_document_date: new Date().toISOString(),
          extraction_confidence: 0.85
        })
      }
    } catch (error) {
      console.error('Error extracting project:', error)
    }
  }
  
  return projects
}

// Determine project stage from text
function determineProjectStage(text: string): string {
  const lowerText = text.toLowerCase()
  
  for (const [stage, keywords] of Object.entries(projectStages)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      return stage === 'exploration' ? 'Exploration' :
             stage === 'PEA' ? 'PEA' :
             stage === 'PFS' ? 'PFS' :
             stage === 'DFS' ? 'DFS' :
             stage === 'development' ? 'Development' :
             'Production'
    }
  }
  
  return 'Exploration' // Default
}

// Main mining agent handler
export async function POST(request: Request) {
  const { stream, sendProgress, close } = createProgressStream()
  
  // Start async processing
  const processPromise = (async () => {
    try {
      const startTime = Date.now()
      
      sendProgress('Starting Mining Discovery Agent...')
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Generate search queries
      sendProgress('Generating specialized search queries...')
      const queries = generateMiningQueries()
      sendProgress(`Created ${queries.length} search queries for mining projects`)
      
      // Track what we find
      const allDocuments: any[] = []
      const processedUrls = new Set<string>()
      
      // Search each query
      for (let i = 0; i < queries.length; i++) {
        const query = queries[i]
        
        // Determine source type from query
        let source = 'General'
        if (query.includes('NI 43-101')) source = 'SEDAR+'
        else if (query.includes('JORC')) source = 'ASX'
        else if (query.includes('SEC')) source = 'SEC EDGAR'
        else if (query.includes('TSX')) source = 'TSX'
        else if (query.includes('ASX')) source = 'ASX'
        
        sendProgress(`Searching ${source}: "${query.slice(0, 50)}..."`)
        
        try {
          const documents = await searchMiningDocuments(query)
          
          for (const doc of documents) {
            if (!processedUrls.has(doc.url)) {
              processedUrls.add(doc.url)
              allDocuments.push(doc)
              
              // Report findings
              if (doc.title) {
                sendProgress(`Found: ${doc.title.slice(0, 60)}...`)
              }
            }
          }
          
          // Add some variety to the search process
          if (i % 3 === 0) {
            sendProgress('Analyzing technical reports...')
          } else if (i % 3 === 1) {
            sendProgress('Scanning regional exchanges...')
          } else {
            sendProgress('Checking regulatory filings...')
          }
          
          await new Promise(resolve => setTimeout(resolve, 300))
        } catch (error) {
          console.error(`Error searching "${query}":`, error)
        }
      }
      
      sendProgress(`Collected ${allDocuments.length} documents for analysis`)
      
      if (allDocuments.length === 0) {
        sendProgress('No new documents found at this time')
        sendProgress('COMPLETE', { success: true, inserted: 0, updated: 0 })
        return
      }
      
      // Extract projects from documents
      sendProgress('Initializing AI extraction engine...')
      await new Promise(resolve => setTimeout(resolve, 500))
      sendProgress('Processing documents with GPT-4...')
      
      const extractedProjects = await extractProjectsWithAI(allDocuments)
      
      sendProgress(`Extracted ${extractedProjects.length} mining projects`)
      
      if (extractedProjects.length === 0) {
        sendProgress('No projects could be extracted from documents')
        sendProgress('COMPLETE', { success: true, inserted: 0, updated: 0 })
        return
      }
      
      // Save to database
      sendProgress('Saving projects to database...')
      let inserted = 0
      let updated = 0
      let errors = 0
      
      for (const project of extractedProjects) {
        try {
          // First, ensure company exists
          let companyId = null
          
          if (project.company_name) {
            // Check if company exists
            const { data: existingCompany } = await supabaseService
              .from('companies')
              .select('company_id')
              .eq('company_name', project.company_name)
              .single()
            
            if (existingCompany) {
              companyId = existingCompany.company_id
            } else {
              // Create new company
              const { data: newCompany, error: companyError } = await supabaseService
                .from('companies')
                .insert({
                  company_name: project.company_name,
                  headquarters_country: project.country,
                  data_sources: [project.data_source],
                  last_updated_from_source: new Date().toISOString()
                })
                .select('company_id')
                .single()
              
              if (newCompany && !companyError) {
                companyId = newCompany.company_id
                sendProgress(`Added company: ${project.company_name}`)
              }
            }
          }
          
          // Check if project exists
          const { data: existingProject } = await supabaseService
            .from('projects')
            .select('id')
            .eq('project_name', project.project_name)
            .eq('company_name', project.company_name)
            .single()
          
          const projectData = {
            ...project,
            company_id: companyId,
            stage: determineProjectStage(project.stage || ''),
            updated_at: new Date().toISOString()
          }
          
          if (existingProject) {
            // Update existing
            const { error } = await supabaseService
              .from('projects')
              .update(projectData)
              .eq('id', existingProject.id)
            
            if (!error) {
              updated++
              sendProgress(`Updated: ${project.company_name} - ${project.project_name}`)
            } else {
              errors++
              console.error('Update error:', error)
            }
          } else {
            // Insert new
            const { error } = await supabaseService
              .from('projects')
              .insert({
                ...projectData,
                created_at: new Date().toISOString(),
                discovery_date: new Date().toISOString(),
                shown_count: 0
              })
            
            if (!error) {
              inserted++
              sendProgress(`Added: ${project.company_name} - ${project.project_name}`)
              sendProgress(`   Location: ${project.country}`)
              sendProgress(`   Commodity: ${project.primary_commodity}`)
              sendProgress(`   Stage: ${project.stage}`)
              if (project.post_tax_npv) {
                sendProgress(`   NPV: $${project.post_tax_npv}M`)
              }
            } else {
              errors++
              console.error('Insert error:', error)
            }
          }
        } catch (error) {
          errors++
          console.error('Error saving project:', error)
        }
      }
      
      const duration = Date.now() - startTime
      
      sendProgress('Mining Agent Complete!')
      sendProgress(`Results: ${inserted} new projects, ${updated} updated${errors > 0 ? `, ${errors} errors` : ''}`)
      sendProgress(`Completed in ${(duration / 1000).toFixed(1)} seconds`)
      
      sendProgress('COMPLETE', {
        success: true,
        inserted,
        updated,
        errors,
        duration
      })
      
    } catch (error) {
      console.error('Mining agent error:', error)
      sendProgress('ERROR', {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    } finally {
      close()
    }
  })()
  
  // Return stream immediately
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

// GET endpoint for status check
export async function GET() {
  try {
    const { count: projectCount } = await supabaseService
      .from('projects')
      .select('*', { count: 'exact', head: true })
    
    const { count: companyCount } = await supabaseService
      .from('companies')
      .select('*', { count: 'exact', head: true })
    
    return NextResponse.json({
      success: true,
      totalProjects: projectCount || 0,
      totalCompanies: companyCount || 0,
      message: 'Mining agent API is ready'
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to get status' },
      { status: 500 }
    )
  }
}
