#!/usr/bin/env node

import { config } from 'dotenv'
import { resolve } from 'path'
import axios from 'axios'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

async function debugAccessionIssue() {
  console.log('🔍 Debugging Accession Number Issue\n')

  try {
    // Search for EX-96.1 filings
    const searchUrl = 'https://efts.sec.gov/LATEST/search-index'
    const searchParams = new URLSearchParams({
      q: 'EX-96.1',
      dateRange: 'custom',
      category: 'form-cat1',
      startdt: '2024-11-01',
      enddt: '2024-12-31',
      from: '0',
      size: '10'
    })

    const response = await axios.get(`${searchUrl}?${searchParams}`, {
      headers: {
        'User-Agent': 'Lithos Mining Analytics (test@example.com)',
        'Accept': 'application/json'
      }
    })

    const data = response.data

    if (data.hits?.hits && data.hits.hits.length > 0) {
      console.log('🔍 Analyzing Accession Numbers:')
      console.log('─'.repeat(60))

      const accessionNumbers = new Set()
      const duplicates = []

      data.hits.hits.forEach((hit: any, i: number) => {
        const source = hit._source
        const [adsh, filename] = hit._id ? hit._id.split(':') : ['', '']

        console.log(`\nFiling ${i + 1}:`)
        console.log('  ID:', hit._id)
        console.log('  ADSH from ID:', adsh)
        console.log('  ADSH from source:', source.adsh)
        console.log('  Company:', source.display_names?.[0])
        console.log('  Filename:', filename)

        const accession = source.adsh || adsh
        if (accessionNumbers.has(accession)) {
          duplicates.push({ accession, company: source.display_names?.[0], filename })
          console.log('  ⚠️  DUPLICATE ACCESSION!')
        }
        accessionNumbers.add(accession)
      })

      if (duplicates.length > 0) {
        console.log('\n❌ Found duplicate accession numbers:')
        duplicates.forEach(dup => {
          console.log(`   - ${dup.accession}: ${dup.company} (${dup.filename})`)
        })
        console.log('\nThis means multiple documents from the same filing are being returned.')
        console.log('Solution: We should only store unique filings, not individual documents from the search.')
      } else {
        console.log('\n✅ No duplicate accession numbers found')
      }
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message)
  }
}

debugAccessionIssue()