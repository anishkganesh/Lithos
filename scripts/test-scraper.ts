import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

// Import after env vars are loaded
import { MiningAgentOrchestrator } from '../lib/mining-agent/orchestrator'
import { getProgress } from '../lib/mining-agent/progress-tracker'

async function testScraper() {
  console.log('🚀 Starting Mining Agent Test...\n')
  
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
    const progressInterval = setInterval(() => {
      const progress = getProgress()
      console.log(`📊 Progress: ${progress.stage} - ${progress.message}`)
      if (progress.totalSteps > 0) {
        console.log(`   Step ${progress.currentStep} of ${progress.totalSteps}`)
      }
    }, 2000)

    console.log('🔍 Running scraper...\n')
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
        console.log(`  - Errors: ${result.errors.join(', ')}`)
      }
    }
    
    const totals = results.reduce((acc, r) => ({
      docs: acc.docs + r.documentsFound,
      created: acc.created + r.projectsCreated,
      updated: acc.updated + r.projectsUpdated
    }), { docs: 0, created: 0, updated: 0 })
    
    console.log('\n📊 Total Summary:')
    console.log(`  - Total documents processed: ${totals.docs}`)
    console.log(`  - Total projects created: ${totals.created}`)
    console.log(`  - Total projects updated: ${totals.updated}`)
    
  } catch (error) {
    console.error('\n❌ Error running scraper:', error)
  }
}

// Run the test
testScraper().then(() => {
  console.log('\n✨ Test complete!')
  process.exit(0)
}).catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
}) 