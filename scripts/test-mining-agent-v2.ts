import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

// Import after env vars are loaded
import { MiningAgentV2 } from '../lib/mining-agent/mining-agent-v2'
import { getProgress } from '../lib/mining-agent/progress-tracker'

async function testMiningAgentV2() {
  console.log('🚀 Testing Mining Agent V2...\n')
  
  // Check environment variables
  console.log('Environment Check:')
  console.log('- FIRECRAWL_API_KEY:', process.env.FIRECRAWL_API_KEY ? '✅ Set' : '❌ Missing')
  console.log('- OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Missing')
  console.log('- SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing')
  console.log('- SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing')
  console.log('\n')

  try {
    const agent = new MiningAgentV2()
    
    // Set up progress monitoring
    let lastMessage = ''
    const progressInterval = setInterval(() => {
      const progress = getProgress()
      if (progress.message !== lastMessage) {
        console.log(`📊 ${new Date().toLocaleTimeString()} - ${progress.stage?.toUpperCase() || 'IDLE'}: ${progress.message}`)
        if (progress.totalSteps > 0) {
          console.log(`   Progress: ${progress.currentStep}/${progress.totalSteps} (${Math.round((progress.currentStep / progress.totalSteps) * 100)}%)`)
        }
        lastMessage = progress.message
      }
    }, 1000)

    console.log('🔍 Starting mining agent...\n')
    const result = await agent.run()
    
    clearInterval(progressInterval)
    
    console.log('\n✅ Mining agent completed!\n')
    console.log('📈 Results:')
    console.log(`   - Success: ${result.success}`)
    console.log(`   - Projects Added: ${result.projectsAdded}`)
    console.log(`   - Message: ${result.message}`)
    
    if (result.projects && result.projects.length > 0) {
      console.log('\n📋 New Projects:')
      result.projects.forEach((project: any, index: number) => {
        console.log(`\n${index + 1}. ${project.project_name}`)
        console.log(`   - Company: ${project.company_name}`)
        console.log(`   - Location: ${project.jurisdiction}, ${project.country}`)
        console.log(`   - Commodity: ${project.primary_commodity}`)
        console.log(`   - Stage: ${project.stage}`)
        console.log(`   - NPV: $${project.post_tax_npv_usd_m}M`)
        console.log(`   - IRR: ${project.irr_percent}%`)
      })
    }
    
  } catch (error) {
    console.error('\n❌ Error running mining agent:', error)
  }
}

// Run the test
testMiningAgentV2().then(() => {
  console.log('\n✨ Test complete!')
  process.exit(0)
}).catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
}) 