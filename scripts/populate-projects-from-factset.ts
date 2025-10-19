#!/usr/bin/env node

/**
 * Populate Supabase projects table using FactSet Global Filings API
 *
 * This script:
 * 1. Loads Canadian mining company tickers from local data
 * 2. Converts tickers to FactSet format (TSX → TOR, TSXV → TOV)
 * 3. Searches SEDAR+ filings from 2025 for mining companies
 * 4. Extracts project names and URLs from filings
 * 5. Inserts projects into Supabase with company associations
 *
 * Requirements:
 * - FACTSET_USERNAME and FACTSET_API_KEY environment variables
 * - Supabase credentials in .env.local
 *
 * Run with: npx tsx scripts/populate-projects-from-factset.ts
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import path from 'path'
import fs from 'fs'

config({ path: path.join(__dirname, '..', '.env.local') })

// ============================
// Configuration
// ============================

const FACTSET_USERNAME = process.env.FACTSET_USERNAME
const FACTSET_API_KEY = process.env.FACTSET_API_KEY
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// FactSet API configuration
const FACTSET_BASE_URL = 'https://api.factset.com/content/global-filings/v2'
const RATE_LIMIT_DELAY_MS = 150 // 10 requests per second max, use 150ms to be safe

// Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// ============================
// Type Definitions
// ============================

interface MiningCompany {
  name: string
  ticker: string
  exchange: string
  country: string
  website?: string
  description?: string
  market_cap?: number
  urls?: string[]
}

interface FactSetFilingDocument {
  headline: string
  source: string
  allIds?: string[]
  primaryIds?: string[]
  filingsDateTime: string
  categories?: string[]
  filingsLink: string
  documentId: string
  filingSize?: string
  formTypes?: string[]
  accession?: string
}

interface FactSetSearchResponse {
  data: Array<{
    requestId: string
    documents?: FactSetFilingDocument[]
    error?: {
      code: string
      title: string
      detail: string
    }
  }>
  meta?: {
    pagination?: {
      isEstimatedTotal: boolean
      total: number
    }
  }
}

interface ExtractedProject {
  name: string
  urls: string[]
  companyName: string
  companyTicker: string
  filingDate?: string
  formType?: string
  description?: string
}

// ============================
// Utility Functions
// ============================

/**
 * Convert exchange ticker to FactSet format
 * Based on testing with FactSet API:
 * - Canadian (TSX/TSXV): use -CA suffix
 * - US (NYSE/NASDAQ): use -US suffix
 */
function convertToFactSetTicker(ticker: string, exchange: string): string {
  // Remove any existing suffixes
  const cleanTicker = ticker.replace(/\.(TO|V|CN)$/i, '')

  switch (exchange.toUpperCase()) {
    case 'TSX':
    case 'TSXV':
      return `${cleanTicker}-CA` // Canadian companies use -CA
    case 'NYSE':
    case 'NASDAQ':
      return `${cleanTicker}-US`
    case 'ASX':
      return `${cleanTicker}-AU` // Australian companies
    case 'LSE':
      return `${cleanTicker}-GB` // UK companies
    default:
      console.warn(`⚠️  Unknown exchange: ${exchange}, using ticker as-is`)
      return cleanTicker
  }
}

/**
 * Sleep for rate limiting
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Make authenticated FactSet API request
 */
async function makeFactSetRequest(endpoint: string, params: Record<string, any>): Promise<any> {
  if (!FACTSET_USERNAME || !FACTSET_API_KEY) {
    throw new Error('FactSet credentials not configured. Please set FACTSET_USERNAME and FACTSET_API_KEY environment variables.')
  }

  // Build query string
  const queryParams = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      value.forEach(v => queryParams.append(key, v))
    } else if (value !== undefined && value !== null) {
      queryParams.append(key, String(value))
    }
  }

  const url = `${FACTSET_BASE_URL}${endpoint}?${queryParams.toString()}`

  // Basic Auth header
  const auth = Buffer.from(`${FACTSET_USERNAME}:${FACTSET_API_KEY}`).toString('base64')

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`FactSet API error (${response.status}): ${errorText}`)
  }

  return response.json()
}

/**
 * Search SEDAR filings for a company
 */
async function searchSedarFilings(
  factsetTicker: string,
  startDate: string = '20250101',
  endDate?: string
): Promise<FactSetFilingDocument[]> {
  try {
    const params: Record<string, any> = {
      ids: [factsetTicker],
      sources: ['SDRP'], // SEDAR+ for recent filings
      startDate: startDate,
      _paginationLimit: 50,
      _paginationOffset: 0,
      timeZone: 'America/Toronto',
      _sort: ['-filingsDateTime'] // Most recent first
    }

    if (endDate) {
      params.endDate = endDate
    }

    const response: FactSetSearchResponse = await makeFactSetRequest('/search', params)

    if (!response.data || response.data.length === 0) {
      return []
    }

    const result = response.data[0]

    if (result.error) {
      console.warn(`   ⚠️  API Error for ${factsetTicker}: ${result.error.detail}`)
      return []
    }

    return result.documents || []
  } catch (error: any) {
    console.error(`   ❌ Error searching filings for ${factsetTicker}: ${error.message}`)
    return []
  }
}

/**
 * Extract project information from filing headline
 * Mining-related filings often mention specific project names
 */
function extractProjectsFromFiling(
  document: FactSetFilingDocument,
  company: MiningCompany
): ExtractedProject[] {
  const projects: ExtractedProject[] = []
  const headline = document.headline || ''

  // Common patterns in mining filings that indicate project mentions
  const projectPatterns = [
    /(?:Technical Report|NI 43-101).*?(?:for|on)\s+(?:the\s+)?([A-Z][A-Za-z\s]+(?:Project|Property|Mine|Deposit))/gi,
    /([A-Z][A-Za-z\s]+(?:Project|Property|Mine|Deposit))/g,
    /(?:Annual|Quarterly)\s+Report.*?([A-Z][A-Za-z\s]+(?:Project|Property))/gi
  ]

  // Try to extract project names from headline
  const extractedNames = new Set<string>()

  for (const pattern of projectPatterns) {
    const matches = headline.matchAll(pattern)
    for (const match of matches) {
      const projectName = match[1]?.trim()
      if (projectName && projectName.length > 3 && projectName.length < 100) {
        extractedNames.add(projectName)
      }
    }
  }

  // If we found specific project names, create project entries
  if (extractedNames.size > 0) {
    extractedNames.forEach(name => {
      projects.push({
        name: name,
        urls: [document.filingsLink],
        companyName: company.name,
        companyTicker: company.ticker,
        filingDate: document.filingsDateTime,
        formType: document.formTypes?.[0],
        description: `Project mentioned in ${document.formTypes?.[0] || 'filing'} filed on ${new Date(document.filingsDateTime).toLocaleDateString()}`
      })
    })
  } else {
    // If no specific project name found but it's a relevant filing,
    // create a generic project entry based on company
    const formType = document.formTypes?.[0] || 'Unknown'

    // Only create generic entries for technical reports
    if (headline.toLowerCase().includes('technical report') ||
        headline.toLowerCase().includes('ni 43-101') ||
        formType.includes('43-101')) {
      projects.push({
        name: `${company.name} - Filing ${document.documentId}`,
        urls: [document.filingsLink],
        companyName: company.name,
        companyTicker: company.ticker,
        filingDate: document.filingsDateTime,
        formType: formType,
        description: headline
      })
    }
  }

  return projects
}

/**
 * Load Canadian mining companies from JSON data
 */
function loadCanadianMiningCompanies(): MiningCompany[] {
  const dataPath = path.join(__dirname, '..', 'data', 'mining-companies-comprehensive.json')

  if (!fs.existsSync(dataPath)) {
    console.error(`❌ Error: File not found: ${dataPath}`)
    process.exit(1)
  }

  const allCompanies: MiningCompany[] = JSON.parse(fs.readFileSync(dataPath, 'utf-8'))

  // Filter for Canadian companies or companies with TSX/TSXV listings
  const canadianCompanies = allCompanies.filter(c =>
    c.country === 'Canada' ||
    c.exchange === 'TSX' ||
    c.exchange === 'TSXV'
  )

  return canadianCompanies
}

// ============================
// Main Process
// ============================

async function main() {
  console.log('='.repeat(70))
  console.log('FACTSET SEDAR FILINGS → SUPABASE PROJECTS POPULATION')
  console.log('='.repeat(70))

  // Validate credentials
  if (!FACTSET_USERNAME || !FACTSET_API_KEY) {
    console.error('\n❌ ERROR: FactSet credentials not configured')
    console.error('Please set the following environment variables:')
    console.error('  - FACTSET_USERNAME')
    console.error('  - FACTSET_API_KEY')
    console.error('\nAdd them to your .env.local file or export them in your shell.')
    process.exit(1)
  }

  console.log('\n✅ FactSet credentials configured')
  console.log(`📡 API Base URL: ${FACTSET_BASE_URL}`)
  console.log(`🔑 Username: ${FACTSET_USERNAME}`)

  // Load companies
  console.log('\n📂 Loading Canadian mining companies...')
  const companies = loadCanadianMiningCompanies()
  console.log(`✅ Loaded ${companies.length} Canadian mining companies`)

  // Get existing companies from Supabase for matching
  console.log('\n📊 Loading companies from Supabase...')
  const { data: supabaseCompanies, error: companiesError } = await supabase
    .from('companies')
    .select('id, name, ticker')

  if (companiesError || !supabaseCompanies) {
    console.error('❌ Error loading companies from Supabase:', companiesError)
    process.exit(1)
  }

  console.log(`✅ Loaded ${supabaseCompanies.length} companies from database`)

  // Create company lookup map
  const companyLookup = new Map<string, string>()
  supabaseCompanies.forEach(c => {
    if (c.ticker) {
      companyLookup.set(c.ticker.toUpperCase(), c.id)
    }
    companyLookup.set(c.name.toLowerCase(), c.id)
  })

  // Statistics
  let totalFilings = 0
  let totalProjects = 0
  let companiesProcessed = 0
  let companiesWithFilings = 0
  let projectsInserted = 0
  let projectsSkipped = 0
  let errors = 0

  console.log('\n' + '='.repeat(70))
  console.log('PROCESSING COMPANIES')
  console.log('='.repeat(70))

  // Process each company (limit to first 10 for testing)
  const companiesToProcess = companies.slice(0, 10)

  for (const company of companiesToProcess) {
    companiesProcessed++

    // Convert to FactSet format
    const factsetTicker = convertToFactSetTicker(company.ticker, company.exchange)

    console.log(`\n[${companiesProcessed}/${companiesToProcess.length}] ${company.name} (${company.ticker} → ${factsetTicker})`)

    try {
      // Search SEDAR filings
      const filings = await searchSedarFilings(factsetTicker)

      if (filings.length === 0) {
        console.log('   ℹ️  No filings found')
      } else {
        totalFilings += filings.length
        companiesWithFilings++
        console.log(`   ✅ Found ${filings.length} filing(s)`)

        // Extract projects from filings
        const extractedProjects: ExtractedProject[] = []

        for (const filing of filings) {
          const projects = extractProjectsFromFiling(filing, company)
          extractedProjects.push(...projects)
        }

        if (extractedProjects.length > 0) {
          console.log(`   📋 Extracted ${extractedProjects.length} project(s)`)
          totalProjects += extractedProjects.length

          // Insert projects into Supabase
          for (const project of extractedProjects) {
            // Find company_id
            const companyId = companyLookup.get(company.ticker.toUpperCase()) ||
                             companyLookup.get(company.name.toLowerCase())

            if (!companyId) {
              console.log(`   ⚠️  Company not found in database: ${company.name}`)
              continue
            }

            // Check if project already exists
            const { data: existing } = await supabase
              .from('projects')
              .select('id')
              .eq('name', project.name)
              .eq('company_id', companyId)
              .single()

            if (existing) {
              console.log(`      ⏭️  Skipped: ${project.name} (already exists)`)
              projectsSkipped++
              continue
            }

            // Insert project
            const { error: insertError } = await supabase
              .from('projects')
              .insert({
                company_id: companyId,
                name: project.name,
                urls: project.urls,
                description: project.description,
                status: 'Active',
                watchlist: false
              })

            if (insertError) {
              console.log(`      ❌ Error inserting ${project.name}: ${insertError.message}`)
              errors++
            } else {
              console.log(`      ✅ Inserted: ${project.name}`)
              projectsInserted++
            }
          }
        }
      }

      // Rate limiting
      await sleep(RATE_LIMIT_DELAY_MS)

    } catch (error: any) {
      console.error(`   ❌ Error processing ${company.name}: ${error.message}`)
      errors++
    }
  }

  // Final statistics
  console.log('\n' + '='.repeat(70))
  console.log('POPULATION COMPLETE')
  console.log('='.repeat(70))
  console.log(`\n📊 Summary:`)
  console.log(`   Companies processed: ${companiesProcessed}`)
  console.log(`   Companies with filings: ${companiesWithFilings}`)
  console.log(`   Total filings found: ${totalFilings}`)
  console.log(`   Total projects extracted: ${totalProjects}`)
  console.log(`   Projects inserted: ${projectsInserted}`)
  console.log(`   Projects skipped (duplicates): ${projectsSkipped}`)
  console.log(`   Errors: ${errors}`)

  // Get final count
  const { count: finalCount } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })

  console.log(`\n   Total projects in database: ${finalCount}`)

  console.log('\n✅ Process complete!')
  console.log('='.repeat(70))
}

// Execute
main().catch(error => {
  console.error('\n❌ Fatal error:', error)
  process.exit(1)
})
