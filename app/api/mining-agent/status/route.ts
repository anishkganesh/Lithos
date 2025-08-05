import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/client'

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    
    if (!supabaseAdmin) {
      return NextResponse.json({
        lastRun: null,
        totalProjects: 0,
        canRunNow: false
      })
    }
    
    // Get the last run info
    const { data: lastRun } = await supabaseAdmin
      .from('agent_runs')
      .select('*')
      .eq('agent_type', 'mining')
      .order('run_at', { ascending: false })
      .limit(1)
      .single()
    
    // Get total project count
    const { count: totalProjects } = await supabaseAdmin
      .from('projects')
      .select('*', { count: 'exact', head: true })
    
    return NextResponse.json({
      lastRun: lastRun?.run_at || null,
      totalProjects: totalProjects || 0,
      projectsAdded: lastRun?.projects_added || 0,
      projectsUpdated: lastRun?.projects_updated || 0,
      canRunNow: true
    })
  } catch (error) {
    console.error('Error fetching agent status:', error)
    return NextResponse.json({
      lastRun: null,
      totalProjects: 0,
      canRunNow: true
    })
  }
} 