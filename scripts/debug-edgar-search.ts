#!/usr/bin/env node

import { config } from 'dotenv'
import { resolve } from 'path'
import axios from 'axios'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

async function debugEDGARSearch() {
  console.log('🔍 Debugging EDGAR Search API\n')

  try {
    // Search for EX-96.1 filings
    const searchUrl = 'https://efts.sec.gov/LATEST/search-index'
    const searchParams = new URLSearchParams({
      q: 'EX-96.1',
      dateRange: 'custom',
      category: 'form-cat1',
      startdt: '2024-01-01',
      enddt: '2024-12-31',
      from: '0',
      size: '3'
    })

    console.log('📋 Request URL:', `${searchUrl}?${searchParams}`)
    console.log('\n')

    const response = await axios.get(`${searchUrl}?${searchParams}`, {
      headers: {
        'User-Agent': 'Lithos Mining Analytics (test@example.com)',
        'Accept': 'application/json'
      }
    })

    const data = response.data

    console.log('✅ Response received')
    console.log('Total hits:', data.hits?.total?.value || 0)
    console.log('\n')

    if (data.hits?.hits && data.hits.hits.length > 0) {
      console.log('🔍 Filings found:')
      console.log('─'.repeat(60))

      data.hits.hits.forEach((hit: any, i: number) => {
        console.log(`\nFiling ${i + 1}:`)
        console.log('  ID:', hit._id)
        console.log('  Source fields:')
        const source = hit._source
        console.log('    CIKs:', source.ciks)
        console.log('    Company:', source.display_names)
        console.log('    Tickers:', source.tickers)
        console.log('    Form:', source.form)
        console.log('    Filing Date:', source.filing_date)
        console.log('    ADSH:', source.adsh)
        console.log('    Accession:', source.accession_number)
        console.log('    File Name:', source.file_name)
        console.log('    SIC Codes:', source.sics)
      })
    } else {
      console.log('❌ No filings found')
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message)
    if (error.response) {
      console.error('Response status:', error.response.status)
      console.error('Response data:', error.response.data)
    }
  }
}

debugEDGARSearch()