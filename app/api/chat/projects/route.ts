import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET() {
  try {
    // Fetch all projects with key metrics
    const { data: projects, error } = await supabase
      .from('projects')
      .select(`
        id,
        project_name,
        company_name,
        stage,
        primary_commodity,
        secondary_commodities,
        jurisdiction,
        country,
        post_tax_npv_usd_m,
        irr_percent,
        capex_usd_m,
        mine_life_years,
        annual_production_tonnes,
        resource_grade,
        resource_grade_unit,
        contained_metal,
        contained_metal_unit,
        esg_score,
        jurisdiction_risk,
        updated_at
      `)
      .eq('processing_status', 'completed')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching projects:', error);
      return NextResponse.json({ projects: [] });
    }

    // Format projects data for AI consumption
    const formattedProjects = projects?.map(project => ({
      name: project.project_name,
      company: project.company_name,
      stage: project.stage,
      location: `${project.jurisdiction}, ${project.country}`,
      commodity: project.primary_commodity,
      otherCommodities: project.secondary_commodities?.join(', ') || 'None',
      npv: project.post_tax_npv_usd_m ? `$${project.post_tax_npv_usd_m}M` : 'N/A',
      irr: project.irr_percent ? `${project.irr_percent}%` : 'N/A',
      capex: project.capex_usd_m ? `$${project.capex_usd_m}M` : 'N/A',
      mineLife: project.mine_life_years ? `${project.mine_life_years} years` : 'N/A',
      production: project.annual_production_tonnes ? `${project.annual_production_tonnes.toLocaleString()} tonnes/year` : 'N/A',
      grade: project.resource_grade && project.resource_grade_unit ? 
        `${project.resource_grade} ${project.resource_grade_unit}` : 'N/A',
      esgScore: project.esg_score || 'N/A',
      riskLevel: project.jurisdiction_risk || 'N/A'
    })) || [];

    // Calculate summary statistics
    const stats = {
      totalProjects: projects?.length || 0,
      byStage: projects?.reduce((acc: any, p) => {
        acc[p.stage] = (acc[p.stage] || 0) + 1;
        return acc;
      }, {}),
      byCommodity: projects?.reduce((acc: any, p) => {
        acc[p.primary_commodity] = (acc[p.primary_commodity] || 0) + 1;
        return acc;
      }, {}),
      avgIRR: projects?.filter(p => p.irr_percent)
        .reduce((sum, p) => sum + (p.irr_percent || 0), 0) / 
        projects?.filter(p => p.irr_percent).length || 0,
      totalNPV: projects?.reduce((sum, p) => sum + (p.post_tax_npv_usd_m || 0), 0) || 0
    };

    return NextResponse.json({ 
      projects: formattedProjects,
      stats,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in projects API:', error);
    return NextResponse.json({ 
      projects: [],
      stats: {},
      error: 'Failed to fetch projects' 
    });
  }
}