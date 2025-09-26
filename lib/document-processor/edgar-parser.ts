import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import axios from 'axios'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
})

export interface ExtractedProject {
  project_name: string
  company_name: string
  project_description?: string
  jurisdiction?: string
  country?: string
  stage?: string
  mine_life_years?: number
  post_tax_npv_usd_m?: number
  pre_tax_npv_usd_m?: number
  irr_percent?: number
  payback_years?: number
  capex_usd_m?: number
  sustaining_capex_usd_m?: number
  opex_usd_per_tonne?: number
  aisc_usd_per_tonne?: number
  primary_commodity?: string
  secondary_commodities?: string[]
  annual_production_tonnes?: number
  total_resource_tonnes?: number
  resource_grade?: number
  resource_grade_unit?: string
  contained_metal?: number
  contained_metal_unit?: string
  technical_report_url: string
  technical_report_date?: string
  extraction_confidence: number
}

export interface ExtractedCompany {
  company_name: string
  website?: string
  description?: string
  headquarters_location?: string
  headquarters_country?: string
  stock_ticker?: string
  exchange?: string
}

export class EDGARDocumentParser {
  private readonly MAX_CONTENT_LENGTH = 100000 // Characters to send to AI

  async fetchDocumentContent(url: string): Promise<string> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Lithos Document Parser (parser@lithos.com)'
        },
        timeout: 30000,
        responseType: 'text'
      })

      // Clean HTML and extract text
      let content = response.data
      // Remove HTML tags
      content = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      content = content.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      content = content.replace(/<[^>]+>/g, ' ')
      // Clean up whitespace
      content = content.replace(/\s+/g, ' ').trim()

      return content.substring(0, this.MAX_CONTENT_LENGTH)
    } catch (error) {
      console.error(`Failed to fetch document from ${url}:`, error)
      return ''
    }
  }

  async extractProjectData(content: string, documentUrl: string, companyName: string): Promise<ExtractedProject[]> {
    try {
      const prompt = `Extract mining project information from this technical report. Return a JSON array of projects found.

Document excerpt:
${content.substring(0, 50000)}

For each project found, extract:
- project_name (required)
- project_description
- jurisdiction (state/province)
- country
- stage (Exploration/Development/Feasibility/Production/Care & Maintenance)
- mine_life_years
- post_tax_npv_usd_m (NPV in millions USD)
- pre_tax_npv_usd_m
- irr_percent (IRR as percentage)
- payback_years
- capex_usd_m (initial capital in millions)
- sustaining_capex_usd_m
- opex_usd_per_tonne (operating cost per tonne)
- aisc_usd_per_tonne (all-in sustaining cost)
- primary_commodity (Lithium/Gold/Copper/Silver/Nickel/Cobalt/etc)
- secondary_commodities (array of other commodities)
- annual_production_tonnes
- total_resource_tonnes
- resource_grade (numeric value)
- resource_grade_unit (%, g/t, ppm, etc)
- contained_metal (total contained metal/mineral)
- contained_metal_unit (tonnes, oz, lb, etc)

If exact values aren't found, provide reasonable estimates based on similar projects.
Return ONLY valid JSON array, no other text.`

      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a mining industry expert extracting technical data from reports. Always return valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 4000
      })

      const extractedData = response.choices[0].message.content
      if (!extractedData) return []

      try {
        const projects = JSON.parse(extractedData)
        return projects.map((p: any) => ({
          ...p,
          company_name: companyName,
          technical_report_url: documentUrl,
          extraction_confidence: this.calculateConfidence(p)
        }))
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError)
        return []
      }
    } catch (error) {
      console.error('AI extraction failed:', error)
      return []
    }
  }

  async extractCompanyData(content: string, knownCompanyName: string): Promise<ExtractedCompany> {
    try {
      const prompt = `Extract company information from this document.

Document excerpt:
${content.substring(0, 30000)}

Known company name: ${knownCompanyName}

Extract:
- company_name (use known name if found)
- website
- description (brief company description)
- headquarters_location (city, state/province)
- headquarters_country
- stock_ticker
- exchange (NYSE, NASDAQ, TSX, ASX, LSE, etc)

Return ONLY valid JSON object, no other text.`

      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are extracting company information from mining documents. Return valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      })

      const extractedData = response.choices[0].message.content
      if (!extractedData) {
        return { company_name: knownCompanyName }
      }

      try {
        const company = JSON.parse(extractedData)
        return {
          company_name: company.company_name || knownCompanyName,
          ...company
        }
      } catch {
        return { company_name: knownCompanyName }
      }
    } catch (error) {
      console.error('Company extraction failed:', error)
      return { company_name: knownCompanyName }
    }
  }

  private calculateConfidence(project: any): number {
    let confidence = 0.5 // Base confidence

    // Increase confidence for each field that has data
    const importantFields = ['post_tax_npv_usd_m', 'irr_percent', 'capex_usd_m', 'mine_life_years']
    const presentFields = importantFields.filter(field => project[field] != null).length
    confidence += (presentFields / importantFields.length) * 0.3

    // Additional confidence for resource data
    if (project.total_resource_tonnes && project.resource_grade) {
      confidence += 0.15
    }

    // Cap at 0.95
    return Math.min(confidence, 0.95)
  }

  private generateEstimates(project: Partial<ExtractedProject>): ExtractedProject {
    // Generate reasonable estimates based on commodity and stage
    const commodity = project.primary_commodity?.toLowerCase() || 'gold'
    const stage = project.stage || 'Development'

    const estimates: any = { ...project }

    // Estimate missing financial metrics based on commodity
    if (!estimates.capex_usd_m && stage !== 'Exploration') {
      const capexByComm: Record<string, number> = {
        lithium: 500,
        gold: 350,
        copper: 800,
        silver: 200,
        nickel: 600,
        cobalt: 400
      }
      estimates.capex_usd_m = capexByComm[commodity] || 300
    }

    if (!estimates.irr_percent && estimates.capex_usd_m) {
      // Estimate IRR based on commodity prices
      const irrByComm: Record<string, number> = {
        lithium: 35,
        gold: 25,
        copper: 22,
        silver: 20,
        nickel: 18,
        cobalt: 28
      }
      estimates.irr_percent = irrByComm[commodity] || 20
    }

    if (!estimates.mine_life_years) {
      estimates.mine_life_years = stage === 'Production' ? 15 : 12
    }

    if (!estimates.payback_years && estimates.irr_percent) {
      estimates.payback_years = Math.round(100 / estimates.irr_percent)
    }

    return estimates as ExtractedProject
  }
}

export default EDGARDocumentParser