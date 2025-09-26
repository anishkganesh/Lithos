#!/usr/bin/env node

import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import axios from 'axios'
import pLimit from 'p-limit'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // Using anon key which works
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
})

// Limit concurrent processing to avoid rate limits
const limit = pLimit(2) // Process 2 documents at a time

class EDGARDocumentProcessor {
  private processedCount = 0
  private companiesCreated = 0
  private projectsCreated = 0
  private errors = 0
  private startTime = Date.now()

  async run() {
    console.log('🚀 Starting EDGAR Document Processing')
    console.log('📊 This will extract companies and projects from technical documents\n')

    // Get unprocessed documents
    const { data: documents, error } = await supabase
      .from('edgar_technical_documents')
      .select('*')
      .eq('is_processed', false)
      .order('filing_date', { ascending: false })
      .limit(100) // Process 100 at a time

    if (error || !documents) {
      console.error('Failed to fetch documents:', error)
      return
    }

    console.log(`📄 Found ${documents.length} unprocessed documents\n`)

    // Process documents in parallel with limit
    const processingTasks = documents.map(doc =>
      limit(() => this.processDocument(doc))
    )

    await Promise.all(processingTasks)

    this.printSummary()
  }

  async processDocument(doc: any) {
    try {
      console.log(`\n📖 Processing: ${doc.company_name} - ${doc.document_title}`)

      // Fetch document content
      const content = await this.fetchDocumentContent(doc.document_url)
      if (!content) {
        console.log('  ⚠️  Could not fetch document content')
        await this.markProcessed(doc.id, 'fetch_failed')
        return
      }

      // Extract company data
      const companyData = await this.extractCompanyData(content, doc)
      const companyId = await this.upsertCompany(companyData)

      // Extract project data
      const projects = await this.extractProjectData(content, doc, companyId)

      for (const project of projects) {
        await this.upsertProject(project, companyId)
      }

      // Mark document as processed
      await this.markProcessed(doc.id, 'completed')
      this.processedCount++

      console.log(`  ✅ Processed: Found ${projects.length} projects`)
    } catch (error) {
      console.error(`  ❌ Error processing document:`, error)
      await this.markProcessed(doc.id, 'error')
      this.errors++
    }
  }

  async fetchDocumentContent(url: string): Promise<string> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Lithos Parser (parser@lithos.com)',
          'Accept': 'text/html,application/xhtml+xml'
        },
        timeout: 30000,
        maxContentLength: 10 * 1024 * 1024 // 10MB max
      })

      let content = response.data

      // Clean HTML
      content = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      content = content.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      content = content.replace(/<[^>]+>/g, ' ')
      content = content.replace(/&[a-z]+;/gi, ' ')
      content = content.replace(/\s+/g, ' ').trim()

      return content.substring(0, 100000) // Limit to 100k chars
    } catch (error) {
      console.error('Document fetch failed:', error)
      return ''
    }
  }

  async extractCompanyData(content: string, doc: any) {
    const prompt = `Extract company information from this mining document.

Document excerpt (first 20000 chars):
${content.substring(0, 20000)}

Known company name: ${doc.company_name}
Ticker (if known): ${doc.ticker || 'Unknown'}

Extract and return as JSON:
{
  "company_name": "exact company name",
  "website": "company website if found",
  "description": "brief description of the company's mining operations",
  "headquarters_location": "city, state/province",
  "headquarters_country": "country",
  "stock_ticker": "ticker symbol",
  "exchange": "stock exchange (NYSE/NASDAQ/TSX/ASX/LSE/etc)"
}

Return ONLY the JSON object.`

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-2024-11-20', // Latest GPT-4o with improved accuracy and reduced hallucinations
        messages: [
          { role: 'system', content: 'Extract company data from mining documents. Be factual and only extract information explicitly stated in the document. Return only valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1, // Lower temperature for more accurate extraction
        max_tokens: 500
      })

      let result = response.choices[0].message.content || ''
      // Clean markdown code blocks if present
      result = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      return result ? JSON.parse(result) : { company_name: doc.company_name }
    } catch (error) {
      console.error('Company extraction failed:', error)
      return {
        company_name: doc.company_name,
        stock_ticker: doc.ticker
      }
    }
  }

  async extractProjectData(content: string, doc: any, companyId: string) {
    const prompt = `Extract mining project data from this SEC EDGAR technical report.

Document excerpt (first 50000 chars):
${content.substring(0, 50000)}

EXTRACTION RULES:
1. ONLY extract values that are EXPLICITLY stated in the document
2. If a value is not found, set it to null
3. For financial metrics (NPV, IRR, CAPEX), only use numbers directly from the document
4. Do NOT invent or estimate values that aren't in the document
5. Look for specific sections: Executive Summary, Economic Analysis, Resource Statement, Technical Report Summary

For EACH project found, extract ONLY what is explicitly stated:

{
  "project_name": "Exact project/mine name from document",
  "project_description": "Description if stated",
  "jurisdiction": "State/Province if mentioned",
  "country": "Country if mentioned",
  "stage": "Only if explicitly stated: Exploration|Development|Feasibility|Production|Care & Maintenance",
  "mine_life_years": "Only if stated as X years",
  "post_tax_npv_usd_m": "Only if NPV is given with specific number",
  "pre_tax_npv_usd_m": "Only if pre-tax NPV is given",
  "irr_percent": "Only if IRR % is stated",
  "payback_years": "Only if payback period stated",
  "capex_usd_m": "Only if initial capital/CAPEX stated in millions",
  "sustaining_capex_usd_m": "Only if sustaining capital stated",
  "opex_usd_per_tonne": "Only if operating cost per tonne stated",
  "aisc_usd_per_tonne": "Only if AISC stated",
  "primary_commodity": "Main commodity if stated",
  "secondary_commodities": "Other commodities if mentioned",
  "annual_production_tonnes": "Only if annual production stated",
  "total_resource_tonnes": "Only if total resource tonnage given",
  "resource_grade": "Only if grade number given",
  "resource_grade_unit": "Unit for grade if given",
  "contained_metal": "Only if contained metal stated",
  "contained_metal_unit": "Unit if given",
  "_extraction_note": "Mark any estimated values with [ESTIMATED]"
}

Return ONLY valid JSON array. Use null for missing values. DO NOT hallucinate data.`

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-2024-11-20', // Latest GPT-4o model for accurate extraction
        messages: [
          {
            role: 'system',
            content: 'You are a mining industry expert extracting factual data from technical reports. Only extract values that are explicitly stated in the document. For missing values, provide industry-standard estimates clearly marked as estimates. Be conservative and realistic. Never hallucinate data. Always return valid JSON array.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1, // Very low temperature for factual accuracy
        max_tokens: 4000,
        seed: 42 // For consistent extractions
      })

      let result = response.choices[0].message.content || ''
      // Clean markdown code blocks if present
      result = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

      if (!result) return []

      try {
        const projects = JSON.parse(result)
        return Array.isArray(projects) ? projects : [projects]
      } catch (error) {
        console.error('Project JSON parse error:', error)
        console.error('Raw response:', result.substring(0, 500))
        return []
      }
    } catch (error) {
      console.error('Project extraction failed:', error)
      return []
    }
  }

  async upsertCompany(companyData: any): Promise<string> {
    try {
      // Check if company exists
      const { data: existing } = await supabase
        .from('companies')
        .select('company_id')
        .eq('company_name', companyData.company_name)
        .single()

      if (existing) {
        // Update existing company
        await supabase
          .from('companies')
          .update({
            ...companyData,
            updated_at: new Date().toISOString(),
            last_updated_from_source: new Date().toISOString()
          })
          .eq('company_id', existing.company_id)

        return existing.company_id
      } else {
        // Create new company
        const { data, error } = await supabase
          .from('companies')
          .insert({
            ...companyData,
            data_sources: ['SEC EDGAR'],
            last_updated_from_source: new Date().toISOString()
          })
          .select('company_id')
          .single()

        if (error) throw error
        this.companiesCreated++
        return data.company_id
      }
    } catch (error) {
      console.error('Company upsert failed:', error)
      // Return a placeholder ID
      return 'placeholder-' + Date.now()
    }
  }

  async upsertProject(projectData: any, companyId: string) {
    try {
      // Ensure we have a project name
      if (!projectData.project_name) {
        projectData.project_name = `${projectData.primary_commodity || 'Mining'} Project ${Date.now()}`
      }

      // Map stage to enum value
      const stageMap: Record<string, string> = {
        'exploration': 'Exploration',
        'development': 'Development',
        'feasibility': 'Feasibility',
        'production': 'Production',
        'care & maintenance': 'Care & Maintenance',
        'care and maintenance': 'Care & Maintenance'
      }

      if (projectData.stage) {
        projectData.stage = stageMap[projectData.stage.toLowerCase()] || 'Development'
      }

      // Map commodity to enum
      const commodityMap: Record<string, string> = {
        'lithium': 'Lithium',
        'gold': 'Gold',
        'silver': 'Silver',
        'copper': 'Copper',
        'nickel': 'Nickel',
        'cobalt': 'Cobalt',
        'uranium': 'Uranium',
        'zinc': 'Zinc',
        'lead': 'Lead',
        'tin': 'Tin',
        'platinum': 'Platinum',
        'palladium': 'Palladium',
        'rare earth': 'Rare Earth Elements',
        'iron': 'Iron Ore',
        'coal': 'Coal'
      }

      if (projectData.primary_commodity) {
        const comm = projectData.primary_commodity.toLowerCase()
        projectData.primary_commodity = commodityMap[comm] || 'Other'
      }

      const { error } = await supabase
        .from('projects')
        .upsert({
          ...projectData,
          company_id,
          company_name: projectData.company_name,
          extraction_confidence: this.calculateConfidence(projectData),
          data_source: 'SEC EDGAR',
          processing_status: 'completed',
          last_scraped_at: new Date().toISOString(),
          discovery_date: new Date().toISOString()
        }, {
          onConflict: 'project_name,company_name'
        })

      if (error) throw error
      this.projectsCreated++
    } catch (error) {
      console.error('Project upsert failed:', error)
    }
  }

  calculateConfidence(project: any): number {
    let confidence = 0.5

    // Key financial metrics
    if (project.post_tax_npv_usd_m) confidence += 0.1
    if (project.irr_percent) confidence += 0.1
    if (project.capex_usd_m) confidence += 0.1

    // Resource data
    if (project.total_resource_tonnes && project.resource_grade) confidence += 0.15

    // Production data
    if (project.annual_production_tonnes) confidence += 0.05

    return Math.min(confidence, 0.95)
  }

  async markProcessed(docId: string, status: string) {
    await supabase
      .from('edgar_technical_documents')
      .update({
        is_processed: true,
        processing_status: status,
        processed_at: new Date().toISOString()
      })
      .eq('id', docId)
  }

  printSummary() {
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000)

    console.log('\n' + '='.repeat(60))
    console.log('✅ DOCUMENT PROCESSING COMPLETE')
    console.log(`📄 Documents processed: ${this.processedCount}`)
    console.log(`🏢 Companies created/updated: ${this.companiesCreated}`)
    console.log(`⛏️  Projects created/updated: ${this.projectsCreated}`)
    console.log(`❌ Errors: ${this.errors}`)
    console.log(`⏱️  Time: ${Math.floor(elapsed / 60)}m ${elapsed % 60}s`)
    console.log('='.repeat(60))
  }
}

// Run the processor
async function main() {
  const processor = new EDGARDocumentProcessor()

  try {
    await processor.run()
  } catch (error) {
    console.error('Fatal error:', error)
    process.exit(1)
  }
}

main().catch(console.error)