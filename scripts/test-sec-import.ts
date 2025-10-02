#!/usr/bin/env node

import { config } from 'dotenv'
import path from 'path'
import { SECEdgarClient } from '../lib/sec-edgar/client'

// Load environment variables
config({ path: path.join(__dirname, '..', '.env.local') })

async function testSECClient() {
  console.log('Testing SEC EDGAR Client...\n')
  
  const client = new SECEdgarClient()
  
  try {
    // Test 1: Get company submissions for a known mining company
    console.log('Test 1: Fetching Barrick Gold (CIK: 0000756894) submissions...')
    const barrickSubmissions = await client.getCompanySubmissions('0000756894')
    
    if (barrickSubmissions) {
      console.log(`✓ Found company: ${barrickSubmissions.name}`)
      console.log(`  SIC: ${barrickSubmissions.sic} - ${barrickSubmissions.sicDescription}`)
      console.log(`  Recent filings: ${barrickSubmissions.filings?.recent?.form?.slice(0, 5).join(', ')}`)
    }
    
    // Test 2: Search for recent Exhibit 96.1 documents
    console.log('\nTest 2: Searching for recent Exhibit 96.1 documents...')
    
    // Search last 30 days
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30)
    
    console.log(`Date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`)
    
    const documents = await client.searchMiningFilings(
      startDate,
      endDate,
      (message, progress) => {
        process.stdout.write(`\r[${Math.round(progress)}%] ${message}`)
      }
    )
    
    console.log(`\n\n✓ Found ${documents.length} Exhibit 96.1 documents`)
    
    // Display first few documents
    if (documents.length > 0) {
      console.log('\nSample documents found:')
      documents.slice(0, 5).forEach(doc => {
        console.log(`\n  Company: ${doc.companyName}`)
        console.log(`  Form: ${doc.formType} (${doc.filingDate})`)
        console.log(`  Exhibit: ${doc.exhibitNumber}`)
        console.log(`  URL: ${doc.documentUrl}`)
        console.log(`  Commodities: ${doc.commodities?.join(', ') || 'N/A'}`)
      })
    }
    
    console.log('\n✅ All tests passed!')
    
  } catch (error) {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  }
}

// Run tests
testSECClient().then(() => {
  console.log('\nTest completed successfully')
  process.exit(0)
}).catch(error => {
  console.error('Test error:', error)
  process.exit(1)
})
