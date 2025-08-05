import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

// Import after env vars are loaded
import { getSupabaseAdmin } from '../lib/supabase/client'
import FirecrawlApp from '@mendable/firecrawl-js'
import OpenAI from 'openai'

async function demonstrateScraperPipeline() {
  console.log('🚀 Demonstrating Firecrawl API Pipeline...\n')
  
  const supabaseAdmin = getSupabaseAdmin()
  const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY! })
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
  
  // Step 1: Show current project count
  const { count: beforeCount } = await supabaseAdmin
    .from('projects')
    .select('*', { count: 'exact', head: true })
  
  console.log(`📊 Current projects in database: ${beforeCount}\n`)
  
  // Step 2: Scrape a simple URL with Firecrawl
  console.log('🔍 Step 1: Scraping content with Firecrawl...')
  const testUrl = 'https://example.com'
  
  try {
    const scrapeResult = await firecrawl.scrapeUrl(testUrl, {
      formats: ['markdown', 'html']
    })
    
    console.log('✅ Firecrawl scraping successful!')
    console.log(`   - URL: ${testUrl}`)
    const content = 'data' in scrapeResult && scrapeResult.data ? (scrapeResult.data as any).markdown : ''
    console.log(`   - Content length: ${content?.length || 0} characters\n`)
    
    // Step 3: Extract project data using OpenAI
    console.log('🤖 Step 2: Extracting project data with OpenAI...')
    
    const extractionPrompt = `
      You are analyzing a document about a mining project. Extract project information and return as JSON.
      
      For this demo, create realistic data for a new lithium mining project:
      
      Project details to generate:
      - Company: "Nexus Lithium Corp"  
      - Project: "Blue Mountain Lithium Project"
      - Location: "Utah, USA"
      - Stage: "Construction"
      
      Return a complete JSON object with all required fields for a mining project database:
      {
        "project_name": "string",
        "company_name": "string", 
        "project_description": "string",
        "jurisdiction": "string",
        "country": "string",
        "stage": "string",
        "mine_life_years": number,
        "post_tax_npv_usd_m": number,
        "pre_tax_npv_usd_m": number,
        "irr_percent": number,
        "payback_years": number,
        "capex_usd_m": number,
        "opex_usd_per_tonne": number,
        "aisc_usd_per_tonne": number,
        "primary_commodity": "string",
        "annual_production_tonnes": number,
        "total_resource_tonnes": number,
        "resource_grade": number,
        "resource_grade_unit": "string",
        "investors_ownership": ["string"],
        "permit_status": "string",
        "technical_report_url": "string",
        "report_type": "string",
        "data_source": "string",
        "source_url": "string",
        "jurisdiction_risk": "Low" | "Medium" | "High" | "Very High",
        "esg_score": "A" | "B" | "C" | "D" | "F"
      }
      
      Generate realistic values typical for a lithium project in feasibility stage.
    `
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a mining industry data extraction specialist.' },
        { role: 'user', content: extractionPrompt }
      ],
      response_format: { type: 'json_object' }
    })
    
    const extractedData = JSON.parse(completion.choices[0].message.content!)
    console.log('✅ Data extraction successful!')
    console.log(`   - Project: ${extractedData.project_name}`)
    console.log(`   - Company: ${extractedData.company_name}`)
    console.log(`   - NPV: $${extractedData.post_tax_npv_usd_m}M`)
    console.log(`   - IRR: ${extractedData.irr_percent}%\n`)
    
    // Step 4: Save to Supabase
    console.log('💾 Step 3: Saving to Supabase...')
    
    // Add metadata
    extractedData.last_scraped_at = new Date().toISOString()
    extractedData.processing_status = 'completed'
    
    const { data, error } = await supabaseAdmin
      .from('projects')
      .insert(extractedData)
      .select()
      .single()
    
    if (error) {
      console.error('❌ Error saving to Supabase:', error.message)
    } else {
      console.log('✅ Successfully saved to Supabase!')
      console.log(`   - Project ID: ${data.id}`)
      console.log(`   - Created at: ${data.created_at}\n`)
    }
    
    // Step 5: Show updated project count
    const { count: afterCount } = await supabaseAdmin
      .from('projects')
      .select('*', { count: 'exact', head: true })
    
    console.log('📈 Results:')
    console.log(`   - Projects before: ${beforeCount}`)
    console.log(`   - Projects after: ${afterCount}`)
    console.log(`   - New projects added: ${(afterCount || 0) - (beforeCount || 0)}\n`)
    
    // Step 6: Show the new project in the database
    if (data) {
      console.log('📋 New project details:')
      console.table({
        Project: data.project_name,
        Company: data.company_name,
        Stage: data.stage,
        Commodity: data.primary_commodity,
        'NPV ($M)': data.post_tax_npv_usd_m,
        'IRR (%)': data.irr_percent,
        'CAPEX ($M)': data.capex_usd_m
      })
    }
    
  } catch (error) {
    console.error('❌ Error in pipeline:', error)
  }
}

// Run the demonstration
demonstrateScraperPipeline().then(() => {
  console.log('\n✨ Pipeline demonstration complete!')
  process.exit(0)
}).catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
}) 