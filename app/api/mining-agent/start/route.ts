import { NextRequest, NextResponse } from 'next/server'
import { MiningAgentOrchestrator } from '@/lib/mining-agent/orchestrator'
import { getSupabaseAdmin } from '@/lib/supabase/client'

export async function POST(request: NextRequest) {
  try {
    // Get current project count
    const supabaseAdmin = getSupabaseAdmin()
    const { count: beforeCount } = await supabaseAdmin
      .from('projects')
      .select('*', { count: 'exact', head: true })
    
    // Initialize the orchestrator
    const orchestrator = new MiningAgentOrchestrator()
    
    // Start the scraping process
    const result = await orchestrator.run()
    
    // Get new project count
    const { count: afterCount } = await supabaseAdmin
      .from('projects')
      .select('*', { count: 'exact', head: true })
    
    // Get the newly added projects
    const newProjectsCount = (afterCount || 0) - (beforeCount || 0)
    const { data: newProjects } = await supabaseAdmin
      .from('projects')
      .select('project_name, company_name')
      .order('created_at', { ascending: false })
      .limit(Math.max(0, newProjectsCount))
    
    return NextResponse.json({
      success: true,
      message: 'Mining agent completed successfully',
      results: result,
      newProjects: newProjects || [],
      statistics: {
        projectsBefore: beforeCount || 0,
        projectsAfter: afterCount || 0,
        newProjects: newProjectsCount
      }
    })
  } catch (error) {
    console.error('Mining agent error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    )
  }
} 