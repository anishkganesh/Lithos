import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { MiningProject } from '@/lib/types/mining-project'

export function useProjects() {
  const [projects, setProjects] = useState<MiningProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProjects()

    // Subscribe to realtime changes
    const subscription = supabase
      .channel('projects')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects' },
        () => {
          fetchProjects()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('project_screener_view')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) throw error

      // Transform database data to match MiningProject interface
      const transformedProjects: MiningProject[] = (data || []).map(project => ({
        id: project.id,
        project: project.project_name,
        company: project.company_name,
        stage: project.stage,
        mineLife: project.mine_life_years || 0,
        postTaxNPV: project.post_tax_npv_usd_m || 0,
        irr: project.irr_percent || 0,
        payback: project.payback_years || 0,
        paybackYears: project.payback_years || 0, // Add missing field
        capex: project.capex_usd_m || 0,
        aisc: project.aisc_usd_per_tonne || 0,
        primaryCommodity: project.primary_commodity,
        jurisdiction: project.jurisdiction_and_risk,
        jurisdictionRisk: project.jurisdiction_risk || 'Medium',
        riskLevel: project.jurisdiction_risk || 'Medium', // Add missing field
        investorsOwnership: project.investors_ownership_text || '',
        resourceGrade: project.resource_grade || 0,
        containedMetal: project.contained_metal || 0,
        esgScore: project.esg_score || 'C',
        redFlags: project.red_flag_count || 0,
        permitStatus: project.permit_status || 'Pending',
        offtakeAgreements: project.offtake_count || 0,
        lastUpdated: project.updated_at || new Date().toISOString(), // Add missing field
        dataQuality: 'High' as const // Add missing field with default value
      }))

      setProjects(transformedProjects)
      setError(null)
    } catch (err) {
      console.error('Error fetching projects:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch projects')
      // Fall back to dummy data if Supabase is not configured
      if (err instanceof Error && err.message.includes('SUPABASE')) {
        const { dummyProjects } = await import('@/lib/data/dummy-projects')
        setProjects(dummyProjects)
      }
    } finally {
      setLoading(false)
    }
  }

  return { projects, loading, error, refetch: fetchProjects }
} 