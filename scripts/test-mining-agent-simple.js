#!/usr/bin/env node

async function testMiningAgent() {
  console.log('🧪 Testing Mining Agent...\n')
  
  try {
    // Test the API endpoint
    console.log('1. Testing API status...')
    const statusRes = await fetch('http://localhost:3000/api/mining-agent/scrape-v2')
    const status = await statusRes.json()
    console.log('✅ API Status:', status)
    
    // Run a quick test of the mining agent
    console.log('\n2. Running Mining Agent (mock mode)...')
    const response = await fetch('http://localhost:3000/api/mining-agent/scrape-v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    
    if (!response.ok) {
      throw new Error(`Failed: ${response.status}`)
    }
    
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let messages = []
    
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      const chunk = decoder.decode(value)
      const lines = chunk.split('\n')
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6))
            if (data.message) {
              console.log(`   ${data.message}`)
              messages.push(data.message)
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    }
    
    console.log('\n✅ Test completed!')
    console.log(`Received ${messages.length} progress messages`)
    
    // Check final status
    const finalStatus = await fetch('http://localhost:3000/api/mining-agent/scrape-v2').then(r => r.json())
    console.log('\nFinal database status:', finalStatus)
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    process.exit(1)
  }
}

testMiningAgent()
