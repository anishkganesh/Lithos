import FirecrawlApp from '@mendable/firecrawl-js'
import OpenAI from 'openai'
import { supabaseAdmin } from '@/lib/supabase/client'

export interface Document {
  url: string
  title?: string
  type?: string
  date?: string
  source: string
}

export interface ProcessingResult {
  success: boolean
  action?: 'created' | 'updated' | 'skipped'
  projectId?: string
  error?: string
}

export class DocumentProcessor {
  private firecrawl: FirecrawlApp
  private openai: OpenAI

  constructor() {
    this.firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY! })
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
  }

  async processDocument(document: Document): Promise<ProcessingResult> {
    try {
      // Step 1: Scrape the document content
      const scrapedData = await this.scrapeDocument(document.url)
      if (!scrapedData) {
        return { success: false, error: 'Failed to scrape document' }
      }

      // Step 2: Extract structured data using OpenAI
      const extractedData = await this.extractProjectData(scrapedData, document)
      if (!extractedData) {
        return { success: false, error: 'Failed to extract project data' }
      }

      // Step 3: Check if project exists
      const existingProject = await this.findExistingProject(
        extractedData.project_name,
        extractedData.company_name
      )

      // Step 4: Create or update project
      if (existingProject) {
        await this.updateProject(existingProject.id, extractedData)
        return { success: true, action: 'updated', projectId: existingProject.id }
      } else {
        const newProject = await this.createProject(extractedData)
        return { success: true, action: 'created', projectId: newProject.id }
      }
    } catch (error) {
      console.error('Document processing error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  private async scrapeDocument(url: string): Promise<string | null> {
    try {
      const result = await this.firecrawl.scrapeUrl(url)
      
      // Check if result is successful
      if ('success' in result && !result.success) {
        console.error('Firecrawl error:', result.error)
        return null
      }
      
      // Type guard to ensure we have data
      if ('data' in result && result.data) {
        const data = result.data as any
        return data.content || data.markdown || data.text || null
      }
      
      return null
    } catch (error) {
      console.error('Firecrawl error:', error)
      return null
    }
  }

  private async extractProjectData(content: string, document: Document): Promise<any> {
    const prompt = `
      You are a mining industry analyst. Extract structured data from this technical report.
      
      Document source: ${document.source}
      Document type: ${document.type || 'Unknown'}
      
      Content:
      ${content.substring(0, 15000)} // Limit content length
      
      Extract the following information and return as JSON:
      {
        "project_name": "string",
        "company_name": "string",
        "project_description": "string (brief summary)",
        "jurisdiction": "string",
        "country": "string",
        "latitude": number or null,
        "longitude": number or null,
        "stage": "Exploration" | "Resource Definition" | "Pre-Feasibility" | "Feasibility" | "Construction" | "Production" | "Care & Maintenance" | "Closed",
        "mine_life_years": number or null,
        "post_tax_npv_usd_m": number or null,
        "pre_tax_npv_usd_m": number or null,
        "irr_percent": number or null,
        "payback_years": number or null,
        "capex_usd_m": number or null,
        "opex_usd_per_tonne": number or null,
        "aisc_usd_per_tonne": number or null,
        "primary_commodity": "Lithium" | "Copper" | "Nickel" | "Cobalt" | "Rare Earths" | "Gold" | "Silver" | "Uranium" | "Graphite" | "Other",
        "annual_production_tonnes": number or null,
        "total_resource_tonnes": number or null,
        "resource_grade": number or null,
        "resource_grade_unit": "string or null",
        "investors_ownership": ["string"] or [],
        "permit_status": "string or null",
        "technical_report_date": "YYYY-MM-DD or null"
      }
      
      If a field cannot be determined from the document, use null for numbers or appropriate default values.
      Ensure all numeric values are numbers, not strings.
    `

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      })

      const extracted = JSON.parse(response.choices[0].message.content || '{}')
      
      // Add metadata
      return {
        ...extracted,
        technical_report_url: document.url,
        report_type: document.type || 'Unknown',
        data_source: document.source,
        source_url: document.url,
        last_scraped_at: new Date().toISOString(),
        processing_status: 'completed'
      }
    } catch (error) {
      console.error('OpenAI extraction error:', error)
      return null
    }
  }

  private async findExistingProject(projectName: string, companyName: string): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('project_name', projectName)
      .eq('company_name', companyName)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error finding project:', error)
    }

    return data
  }

  private async createProject(projectData: any): Promise<any> {
    // Convert lat/lon to PostGIS point
    if (projectData.latitude && projectData.longitude) {
      projectData.location = `POINT(${projectData.longitude} ${projectData.latitude})`
      delete projectData.latitude
      delete projectData.longitude
    }

    const { data, error } = await supabaseAdmin
      .from('projects')
      .insert(projectData)
      .select('id')
      .single()

    if (error) {
      throw new Error(`Failed to create project: ${error.message}`)
    }

    return data
  }

  private async updateProject(projectId: string, projectData: any): Promise<void> {
    // Remove fields that shouldn't be updated
    delete projectData.id
    delete projectData.created_at

    // Convert lat/lon to PostGIS point
    if (projectData.latitude && projectData.longitude) {
      projectData.location = `POINT(${projectData.longitude} ${projectData.latitude})`
      delete projectData.latitude
      delete projectData.longitude
    }

    const { error } = await supabaseAdmin
      .from('projects')
      .update(projectData)
      .eq('id', projectId)

    if (error) {
      throw new Error(`Failed to update project: ${error.message}`)
    }
  }
} 