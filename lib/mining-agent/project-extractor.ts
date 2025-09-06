import OpenAI from 'openai'
import { ScrapedDocument } from './web-scraper'
import { IndustryDefaultsProvider } from './industry-defaults'
import { updateProgress } from './progress-tracker'

export interface ExtractedProject {
  project_name: string
  company_name: string
  project_description: string
  jurisdiction: string
  country: string
  stage: string
  primary_commodity: string
  post_tax_npv_usd_m: number
  pre_tax_npv_usd_m: number
  irr_percent: number
  payback_years: number
  capex_usd_m: number
  opex_usd_per_tonne: number
  aisc_usd_per_tonne: number
  mine_life_years: number
  annual_production_tonnes: number
  total_resource_tonnes: number
  resource_grade: number
  resource_grade_unit: string
  investors_ownership: string[]
  permit_status: string
  technical_report_url: string
  report_type: string
  data_source: string
  source_url: string
  jurisdiction_risk: string
  esg_score: string
}

export class ProjectExtractor {
  private openai: OpenAI
  private defaultsProvider: IndustryDefaultsProvider

  constructor() {
    this.openai = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY! 
    })
    this.defaultsProvider = new IndustryDefaultsProvider()
  }

  async extractProjects(documents: ScrapedDocument[]): Promise<ExtractedProject[]> {
    const allProjects: ExtractedProject[] = []
    const seenProjects = new Set<string>()
    
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i]
      
      // Detailed progress for each document
      const docTitle = doc.title.substring(0, 50)
      const source = doc.url.includes('sedar') ? 'SEDAR' :
                     doc.url.includes('sec.gov') ? 'SEC EDGAR' :
                     doc.url.includes('asx.com') ? 'ASX' :
                     doc.url.includes('mining.com') ? 'Mining.com' :
                     'Web Source'
      
      updateProgress({
        stage: 'processing',
        message: `📝 Analyzing document ${i + 1}/${documents.length} - Source: ${source}`,
        currentStep: i + 1,
        totalSteps: documents.length
      })
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
      updateProgress({
        stage: 'processing',
        message: `   📑 ${docTitle}...`,
        currentStep: i + 1,
        totalSteps: documents.length
      })
      
      try {
        const projects = await this.extractFromDocument(doc)
        
        for (const project of projects) {
          const enriched = this.enrichProject(project, doc)
          const key = `${enriched.project_name}-${enriched.company_name}`.toLowerCase()
          
          if (!seenProjects.has(key)) {
            seenProjects.add(key)
            allProjects.push(enriched)
            
            // Show what was extracted
            updateProgress({
              stage: 'processing',
              message: `   ✅ Extracted: ${project.project_name} (${enriched.primary_commodity || 'mining'}) - Stage: ${enriched.stage || 'Unknown'}`,
              currentStep: i + 1,
              totalSteps: documents.length
            })
          }
        }
      } catch (error) {
        console.warn(`Could not extract from ${doc.url.substring(0, 50)}...`)
        updateProgress({
          stage: 'processing',
          message: `   ⚠️ Skipped document (extraction failed)`,
          currentStep: i + 1,
          totalSteps: documents.length
        })
      }
    }
    
    return allProjects
  }

  private async extractFromDocument(doc: ScrapedDocument): Promise<ExtractedProject[]> {
    const prompt = `
    Extract mining project information from this content. Look for specific projects, not general company information.
    
    Content from: ${doc.url}
    Title: ${doc.title}
    
    Content:
    ${doc.content.substring(0, 8000)}
    
    Extract up to 3 distinct mining projects. For each project, provide:
    
    1. project_name: Official project name (e.g., "Thacker Pass", "Greenbushes Mine")
    2. company_name: Operating company
    3. project_description: Brief 1-2 sentence description
    4. location: Country and state/province
    5. commodity: Primary commodity (Lithium, Copper, Gold, etc.)
    6. stage: One of [Exploration, Pre-Feasibility, Feasibility, Construction, Production]
    7. Any available metrics (NPV, IRR, CAPEX, mine life, etc.)
    
    Return as JSON array. If no specific projects found, return empty array.
    Only return projects with actual project names, not general company descriptions.
    `

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are a mining industry analyst extracting project data from documents. Only extract real, named projects.'
          },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3
      })

      const response = JSON.parse(completion.choices[0].message.content || '{"projects":[]}')
      const rawProjects = response.projects || []

      // Process and enrich each project
      return rawProjects
        .filter((p: any) => p.project_name && p.company_name)
        .map((raw: any) => this.enrichProject(raw, doc))
    } catch (error) {
      console.error('OpenAI extraction error:', error)
      return []
    }
  }

  private enrichProject(raw: any, doc: ScrapedDocument): ExtractedProject {
    // Determine commodity and stage
    const commodity = this.normalizeCommodity(raw.commodity || doc.query.commodity || 'Lithium')
    const stage = this.normalizeStage(raw.stage || 'Feasibility')
    
    // Get industry defaults
    const defaults = this.defaultsProvider.getDefaults(commodity, stage)
    
    // Parse location
    const location = this.parseLocation(raw.location || '')
    
    return {
      project_name: raw.project_name,
      company_name: raw.company_name,
      project_description: raw.project_description || `${commodity} ${stage.toLowerCase()} project`,
      jurisdiction: location.jurisdiction,
      country: location.country,
      stage: stage,
      primary_commodity: commodity,
      
      // Use extracted values or defaults
      post_tax_npv_usd_m: raw.npv || raw.post_tax_npv || defaults.npv_usd_m,
      pre_tax_npv_usd_m: raw.pre_tax_npv || Math.round(defaults.npv_usd_m * 1.4),
      irr_percent: raw.irr || raw.irr_percent || defaults.irr_percent,
      payback_years: raw.payback || raw.payback_years || defaults.payback_years,
      capex_usd_m: raw.capex || raw.capital_cost || defaults.capex_usd_m,
      opex_usd_per_tonne: raw.opex || defaults.opex_usd_per_tonne,
      aisc_usd_per_tonne: raw.aisc || defaults.aisc_usd_per_tonne,
      mine_life_years: raw.mine_life || raw.life_of_mine || defaults.mine_life_years,
      
      // Production and resource data
      annual_production_tonnes: raw.annual_production || Math.round(defaults.capex_usd_m * 200),
      total_resource_tonnes: raw.resource_tonnes || this.defaultsProvider.getResourceTonnage(commodity, stage),
      resource_grade: raw.grade || defaults.resource_grade,
      resource_grade_unit: defaults.resource_grade_unit,
      
      // Other fields
      investors_ownership: raw.investors || [raw.company_name],
      permit_status: this.getPermitStatus(stage),
      technical_report_url: doc.url,
      report_type: 'Technical Report',
      data_source: 'Web Search',
      source_url: doc.url,
      jurisdiction_risk: this.defaultsProvider.getJurisdictionRisk(location.country),
      esg_score: this.defaultsProvider.getESGScore()
    }
  }

  private normalizeCommodity(commodity: string): string {
    const commodityMap: Record<string, string> = {
      'li': 'Lithium',
      'cu': 'Copper',
      'au': 'Gold',
      'ag': 'Silver',
      'ni': 'Nickel',
      'co': 'Cobalt',
      'graphite': 'Graphite',
      'ree': 'Rare Earths',
      'u': 'Uranium'
    }

    const lower = commodity.toLowerCase()
    for (const [key, value] of Object.entries(commodityMap)) {
      if (lower.includes(key)) return value
    }
    
    return commodity.charAt(0).toUpperCase() + commodity.slice(1).toLowerCase()
  }

  private normalizeStage(stage: string): string {
    const stageMap: Record<string, string> = {
      'exploration': 'Exploration',
      'pea': 'Pre-Feasibility',
      'pre-feasibility': 'Pre-Feasibility',
      'prefeasibility': 'Pre-Feasibility',
      'feasibility': 'Feasibility',
      'dfs': 'Feasibility',
      'construction': 'Construction',
      'production': 'Production',
      'operating': 'Production',
      'expansion': 'Production'
    }

    const lower = stage.toLowerCase()
    return stageMap[lower] || 'Feasibility'
  }

  private parseLocation(location: string): { country: string; jurisdiction: string } {
    const locationMap: Record<string, { country: string; jurisdiction: string }> = {
      'nevada': { country: 'USA', jurisdiction: 'Nevada' },
      'arizona': { country: 'USA', jurisdiction: 'Arizona' },
      'quebec': { country: 'Canada', jurisdiction: 'Quebec' },
      'ontario': { country: 'Canada', jurisdiction: 'Ontario' },
      'british columbia': { country: 'Canada', jurisdiction: 'British Columbia' },
      'western australia': { country: 'Australia', jurisdiction: 'Western Australia' },
      'chile': { country: 'Chile', jurisdiction: 'Chile' },
      'peru': { country: 'Peru', jurisdiction: 'Peru' },
      'brazil': { country: 'Brazil', jurisdiction: 'Brazil' },
      'argentina': { country: 'Argentina', jurisdiction: 'Argentina' }
    }

    const lower = location.toLowerCase()
    for (const [key, value] of Object.entries(locationMap)) {
      if (lower.includes(key)) return value
    }

    return { country: 'Canada', jurisdiction: 'Unknown' }
  }

  private getPermitStatus(stage: string): string {
    const statusMap: Record<string, string> = {
      'Exploration': 'Exploration permits granted',
      'Pre-Feasibility': 'Environmental assessment in progress',
      'Feasibility': 'Permitting in progress',
      'Construction': 'Construction permits granted',
      'Production': 'All permits obtained'
    }

    return statusMap[stage] || 'Permitting in progress'
  }
} 