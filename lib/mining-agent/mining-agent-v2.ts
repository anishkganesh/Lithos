import { MiningQueryGenerator } from './query-generator'
import { MiningWebScraper } from './web-scraper'
import { ProjectExtractor } from './project-extractor'
import { getSupabaseAdmin } from '@/lib/supabase/client'
import { updateProgress, resetProgress } from './progress-tracker'

export class MiningAgentV2 {
  private queryGenerator: MiningQueryGenerator
  private scraper: MiningWebScraper
  private extractor: ProjectExtractor

  constructor() {
    this.queryGenerator = new MiningQueryGenerator()
    this.scraper = new MiningWebScraper()
    this.extractor = new ProjectExtractor()
  }

  async run() {
    try {
      resetProgress()
      updateProgress({
        stage: 'idle',
        message: 'Initializing mining agent...',
        currentStep: 0,
        totalSteps: 100
      })

      // Step 1: Generate search queries
      updateProgress({
        stage: 'collecting',
        message: 'Generating search queries for diverse mining projects...',
        currentStep: 10,
        totalSteps: 100
      })
      
      const queries = this.queryGenerator.generateQueries()
      console.log(`Generated ${queries.length} search queries`)

      // Step 2: Scrape documents
      updateProgress({
        stage: 'collecting',
        message: 'Searching for mining project updates...',
        currentStep: 20,
        totalSteps: 100
      })
      
      const documents = await this.scraper.scrapeWithQueries(queries)
      console.log(`Found ${documents.length} relevant documents`)

      if (documents.length === 0) {
        updateProgress({
          stage: 'error',
          message: 'No documents found. Please try again.',
          currentStep: 100,
          totalSteps: 100
        })
        return {
          success: false,
          projectsAdded: 0,
          message: 'No mining documents found'
        }
      }

      // Step 3: Extract project data
      updateProgress({
        stage: 'processing',
        message: 'Extracting project data with AI...',
        currentStep: 50,
        totalSteps: 100
      })
      
      const projects = await this.extractor.extractProjects(documents)
      console.log(`Extracted ${projects.length} projects`)

      if (projects.length === 0) {
        updateProgress({
          stage: 'error',
          message: 'Could not extract any projects from documents.',
          currentStep: 100,
          totalSteps: 100
        })
        return {
          success: false,
          projectsAdded: 0,
          message: 'No projects could be extracted'
        }
      }

      // Step 4: Save to database
      updateProgress({
        stage: 'processing',
        message: 'Saving projects to database...',
        currentStep: 80,
        totalSteps: 100
      })
      
      const savedProjects = await this.saveProjects(projects)

      // Complete
      updateProgress({
        stage: 'completed',
        message: `Successfully added ${savedProjects.length} new mining projects!`,
        currentStep: 100,
        totalSteps: 100
      })

      return {
        success: true,
        projectsAdded: savedProjects.length,
        projects: savedProjects,
        message: `Added ${savedProjects.length} new projects`
      }

    } catch (error) {
      console.error('Mining agent error:', error)
      updateProgress({
        stage: 'error',
        message: 'An error occurred during processing',
        currentStep: 100,
        totalSteps: 100
      })
      
      return {
        success: false,
        projectsAdded: 0,
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private async saveProjects(projects: any[]) {
    const supabaseAdmin = getSupabaseAdmin()
    const savedProjects = []

    for (const project of projects) {
      try {
        // Check if project exists
        const { data: existing } = await supabaseAdmin
          .from('projects')
          .select('id')
          .eq('project_name', project.project_name)
          .eq('company_name', project.company_name)
          .single()

        if (!existing) {
          // Add metadata
          const projectData = {
            ...project,
            last_scraped_at: new Date().toISOString(),
            processing_status: 'completed',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }

          const { data, error } = await supabaseAdmin
            .from('projects')
            .insert(projectData)
            .select()
            .single()

          if (!error && data) {
            savedProjects.push(data)
            
            // Update progress
            updateProgress({
              stage: 'processing',
              message: `Added: ${project.project_name}`,
              currentStep: 85 + Math.floor((savedProjects.length / projects.length) * 15),
              totalSteps: 100
            })
          } else {
            console.error(`Failed to save project ${project.project_name}:`, error)
          }
        }
      } catch (error) {
        console.error(`Error saving project ${project.project_name}:`, error)
      }
    }

    return savedProjects
  }
} 