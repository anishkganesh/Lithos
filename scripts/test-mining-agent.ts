#!/usr/bin/env node
import 'dotenv/config'

const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

async function testMiningAgent() {
  console.log('🧪 Testing Mining Agent API...\n')
  
  try {
    // Test 1: Check API status
    console.log('1️⃣ Checking API status...')
    const statusResponse = await fetch(`${API_URL}/api/mining-agent/scrape-v2`)
    
    if (!statusResponse.ok) {
      throw new Error(`API status check failed: ${statusResponse.status}`)
    }
    
    const status = await statusResponse.json()
    console.log('✅ API Status:', status)
    console.log(`   - Total Projects: ${status.totalProjects}`)
    console.log(`   - Total Companies: ${status.totalCompanies}\n`)
    
    // Test 2: Run mining agent
    console.log('2️⃣ Running Mining Agent (this will take a moment)...')
    const runResponse = await fetch(`${API_URL}/api/mining-agent/scrape-v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (!runResponse.ok) {
      throw new Error(`Mining agent failed: ${runResponse.status}`)
    }
    
    // Read streaming response
    const reader = runResponse.body?.getReader()
    const decoder = new TextDecoder()
    
    if (!reader) {
      throw new Error('No response stream')
    }
    
    let buffer = ''
    let summary = null
    
    console.log('\n📊 Progress:')
    console.log('─'.repeat(50))
    
    while (true) {
      const { done, value } = await reader.read()
      
      if (done) break
      
      buffer += decoder.decode(value, { stream: true })
      
      // Process complete messages
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6))
            
            if (data.message === 'COMPLETE') {
              summary = data.data
              console.log('\n✅ COMPLETE!')
            } else if (data.message === 'ERROR') {
              console.error('\n❌ ERROR:', data.data?.error)
            } else if (data.message) {
              // Show progress messages
              console.log(`   ${data.message}`)
            }
          } catch (error) {
            // Ignore parse errors
          }
        }
      }
    }
    
    console.log('─'.repeat(50))
    
    // Test 3: Display results
    if (summary) {
      console.log('\n3️⃣ Results Summary:')
      console.log(`   - New Projects: ${summary.inserted}`)
      console.log(`   - Updated Projects: ${summary.updated}`)
      if (summary.errors) {
        console.log(`   - Errors: ${summary.errors}`)
      }
      if (summary.duration) {
        console.log(`   - Duration: ${(summary.duration / 1000).toFixed(1)}s`)
      }
      
      // Test 4: Verify data was saved
      console.log('\n4️⃣ Verifying database...')
      const verifyResponse = await fetch(`${API_URL}/api/mining-agent/scrape-v2`)
      const verifyStatus = await verifyResponse.json()
      
      console.log('✅ Database Status:')
      console.log(`   - Total Projects: ${verifyStatus.totalProjects}`)
      console.log(`   - Total Companies: ${verifyStatus.totalCompanies}`)
      
      if (verifyStatus.totalProjects > status.totalProjects) {
        console.log(`   ✨ Successfully added ${verifyStatus.totalProjects - status.totalProjects} new projects!`)
      }
    }
    
    console.log('\n🎉 All tests passed!')
    
  } catch (error) {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  }
}

// Run the test
console.log('🚀 Mining Agent Test Suite')
console.log('═'.repeat(50))
testMiningAgent().catch(console.error)
