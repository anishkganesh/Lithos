#!/usr/bin/env node

/**
 * Test extraction from a single 10-K to debug the issue
 */

import axios from 'axios'
import * as cheerio from 'cheerio'

const USER_AGENT = 'Lithos Mining Analytics contact@lithos.ai'

async function test10K() {
  console.log('Testing 10-K extraction...\n')
  
  // Freeport-McMoRan 2024 10-K
  const url = 'https://www.sec.gov/Archives/edgar/data/0000027419/000002741924000016/fcx-20231231.htm'
  
  console.log('Fetching:', url)
  
  try {
    // Add delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 2000))
    
    const response = await axios.get(url, {
      headers: { 
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 30000
    })
    
    const html = response.data
    console.log(`\nReceived ${html.length} bytes`)
    
    // Check if we got rate limited
    if (html.includes('equitable access') || html.includes('rate limit')) {
      console.log('❌ Rate limited by SEC')
      return
    }
    
    // Check for financial keywords
    const text = html.toLowerCase()
    
    const keywords = [
      'capital expenditure',
      'operating cost',
      'production',
      'reserves',
      'mine life',
      'copper production',
      'gold production',
      'million pounds',
      'million tons'
    ]
    
    console.log('\nSearching for keywords:')
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        // Find context around the keyword
        const index = text.indexOf(keyword)
        const context = text.substring(Math.max(0, index - 100), Math.min(text.length, index + 200))
        console.log(`✅ Found "${keyword}"`)
        console.log(`   Context: ...${context.replace(/\s+/g, ' ').substring(0, 150)}...`)
      } else {
        console.log(`❌ Not found: "${keyword}"`)
      }
    }
    
    // Parse with cheerio to check structure
    const $ = cheerio.load(html)
    
    // Look for tables with financial data
    const tables = $('table').length
    console.log(`\n📊 Found ${tables} tables in document`)
    
    // Check for specific sections
    const sections = []
    $('h1, h2, h3').each((_, elem) => {
      const text = $(elem).text().trim()
      if (text.toLowerCase().includes('production') ||
          text.toLowerCase().includes('reserve') ||
          text.toLowerCase().includes('capital') ||
          text.toLowerCase().includes('operating')) {
        sections.push(text)
      }
    })
    
    if (sections.length > 0) {
      console.log('\n📑 Relevant sections found:')
      sections.slice(0, 10).forEach(s => console.log(`   • ${s}`))
    }
    
  } catch (error: any) {
    console.error('Error:', error.message)
    if (error.response) {
      console.log('Status:', error.response.status)
      console.log('Headers:', error.response.headers)
    }
  }
}

test10K()
