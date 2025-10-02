import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { MiningProject } from '@/lib/types/mining-project'

export function useWatchlistProjects() {
  const [projects, setProjects] = useState<MiningProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProjects()

    // Subscribe to realtime changes if Supabase is available
    const client = supabase
    if (client) {
      const subscription = client
        .channel('watchlist-projects')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'projects', filter: 'watchlist=eq.true' },
          () => {
            fetchProjects()
          }
        )
        .subscribe()

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [])

  const fetchProjects = async () => {
    try {
      setLoading(true)

      const client = supabase
      if (!client) {
        // Use dummy data if Supabase is not available
        const { dummyProjects } = await import('@/lib/data/dummy-projects')
        // Filter to only show a few as "watchlisted" for demo
        setProjects(dummyProjects.slice(0, 3))
        setError(null)
        setLoading(false)
        return
      }

      // Fetch only watchlisted projects from the projects table
      const { data, error } = await client
        .from('projects')
        .select('*')
        .eq('watchlist', true)
        .order('updated_at', { ascending: false })

      if (error) throw error

      // Transform database data to match MiningProject interface
      const transformedProjects: MiningProject[] = (data || []).map((project: any) => ({
        id: project.project_id || project.id,
        project_id: project.project_id,  // Keep original project_id for database operations
        project: project.project_name || 'Unknown',
        company: project.company_name || 'Unknown',
        stage: project.stage || 'Exploration',
        mineLife: project.mine_life_years || 0,
        postTaxNPV: project.post_tax_npv_usd_m || 0,
        irr: project.irr_percent || 0,
        payback: project.payback_years || 0,
        paybackYears: project.payback_years || 0,
        capex: project.capex_usd_m || 0,
        aisc: project.aisc_usd_per_tonne || 0,
        primaryCommodity: project.primary_commodity || 'Unknown',
        jurisdiction: `${project.jurisdiction || ''}, ${project.country || ''}`.trim() || 'Unknown',
        jurisdictionRisk: project.jurisdiction_risk || 'Medium',
        riskLevel: project.jurisdiction_risk || 'Medium',
        investorsOwnership: project.investors_ownership?.[0] || project.ownership_structure || '',
        resourceGrade: project.resource_grade || 0,
        gradeUnit: project.grade_unit || '%',
        containedMetal: project.contained_metal || 0,
        esgScore: project.esg_score || 'C',
        redFlags: project.red_flag_count || 0,
        permitStatus: project.permit_status || 'Pending',
        offtakeAgreements: project.offtake_count || 0,
        lastUpdated: project.updated_at || new Date().toISOString(),
        dataQuality: 'High' as const,
        watchlist: true, // Always true for watchlisted projects
        watchlisted_at: project.watchlisted_at,
        generated_image_url: project.generated_image_url,
        technicalReportUrl: project.technical_report_url
      }))

      setProjects(transformedProjects)
      setError(null)
    } catch (err) {
      console.error('Error fetching watchlisted projects:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch watchlisted projects')
    } finally {
      setLoading(false)
    }
  }

  return { projects, loading, error, refetch: fetchProjects }
}