import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

// Import after env vars are loaded
import { MiningAgentOrchestrator } from '../lib/mining-agent/orchestrator'
import { getProgress } from '../lib/mining-agent/progress-tracker'

async function testRealScraper() {
  console.log('🚀 Starting Real Mining Scraper Test...\n')
  
  // Check environment variables
  console.log('Environment Check:')
  console.log('- FIRECRAWL_API_KEY:', process.env.FIRECRAWL_API_KEY ? '✅ Set' : '❌ Missing')
  console.log('- OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Missing')
  console.log('- SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing')
  console.log('- SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing')
  console.log('\n')

  try {
    const orchestrator = new MiningAgentOrchestrator()
    
    // Set up progress monitoring
    let lastMessage = ''
    const progressInterval = setInterval(() => {
      const progress = getProgress()
      if (progress.message !== lastMessage) {
        console.log(`📊 ${new Date().toLocaleTimeString()} - ${progress.stage.toUpperCase()}: ${progress.message}`)
        if (progress.totalSteps > 0) {
          console.log(`   Progress: ${progress.currentStep}/${progress.totalSteps} (${Math.round((progress.currentStep / progress.totalSteps) * 100)}%)`)
        }
        lastMessage = progress.message
      }
    }, 1000)

    console.log('🔍 Starting to scrape real mining technical reports...\n')
    const results = await orchestrator.run()
    
    clearInterval(progressInterval)
    
    console.log('\n✅ Scraper completed!\n')
    console.log('📈 Results by source:')
    
    for (const result of results) {
      console.log(`\n${result.source}:`)
      console.log(`  - Documents found: ${result.documentsFound}`)
      console.log(`  - Projects created: ${result.projectsCreated}`)
      console.log(`  - Projects updated: ${result.projectsUpdated}`)
      if (result.errors.length > 0) {
        console.log(`  - Errors:`)
        result.errors.forEach(err => console.log(`    • ${err}`))
      }
    }
    
    const totals = results.reduce((acc, r) => ({
      docs: acc.docs + r.documentsFound,
      created: acc.created + r.projectsCreated,
      updated: acc.updated + r.projectsUpdated,
      errors: acc.errors + r.errors.length
    }), { docs: 0, created: 0, updated: 0, errors: 0 })
    
    console.log('\n📊 Total Summary:')
    console.log(`  - Total documents processed: ${totals.docs}`)
    console.log(`  - Total projects created: ${totals.created}`)
    console.log(`  - Total projects updated: ${totals.updated}`)
    console.log(`  - Total errors: ${totals.errors}`)
    
    // Show the projects in the database
    if (totals.created > 0 || totals.updated > 0) {
      console.log('\n📋 Projects in Database:')
      const { getSupabaseAdmin } = await import('../lib/supabase/client')
      const supabaseAdmin = getSupabaseAdmin()
      
      const { data: projects, error } = await supabaseAdmin
        .from('projects')
        .select('project_name, company_name, stage, primary_commodity, post_tax_npv_usd_m, created_at')
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (!error && projects) {
        console.table(projects.map(p => ({
          Project: p.project_name,
          Company: p.company_name,
          Stage: p.stage,
          Commodity: p.primary_commodity,
          'NPV ($M)': p.post_tax_npv_usd_m,
          Created: new Date(p.created_at).toLocaleDateString()
        })))
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error running scraper:', error)
  }
}

// Run the test
testRealScraper().then(() => {
  console.log('\n✨ Test complete!')
  process.exit(0)
}).catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
}) 