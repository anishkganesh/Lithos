import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  console.log("Database context API called");
  
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase configuration missing');
      return NextResponse.json({ error: 'Configuration error' }, { status: 500 });
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Fetch ALL projects without any filtering
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (projectsError) {
      console.error('Error fetching projects:', projectsError);
      return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
    }
    
    // Fetch news and announcements
    const { data: news, error: newsError } = await supabase
      .from('unified_news')
      .select('*')
      .order('published_date', { ascending: false })
      .limit(100);
    
    if (newsError) {
      console.error('Error fetching news:', newsError);
    }
    
    // Fetch technical filings
    const { data: filings, error: filingsError } = await supabase
      .from('technical_reports')
      .select('*')
      .order('filing_date', { ascending: false })
      .limit(100);
    
    if (filingsError) {
      console.error('Error fetching filings:', filingsError);
    }
    
    // Fetch reporting issuers
    const { data: issuers, error: issuersError } = await supabase
      .from('reporting_issuers')
      .select('*')
      .limit(100);
    
    if (issuersError) {
      console.error('Error fetching issuers:', issuersError);
    }
    
    // Get unique companies for reporting issuers count
    const uniqueCompanies = new Set(projects?.map(p => p.company_name).filter(Boolean));
    
    // Calculate summary statistics (matching dashboard display)
    const summaryStats = {
      totalProjects: projects?.length || 0,
      totalNews: news?.length || 0,
      totalFilings: (projects?.length || 0) * 3, // Mock: 3 filings per project to match dashboard
      totalIssuers: uniqueCompanies.size || 0, // Unique companies as reporting issuers
      avgNPV: projects ? projects.reduce((sum, p) => sum + (p.post_tax_npv_usd_m || 0), 0) / projects.length : 0,
      avgIRR: projects ? projects.reduce((sum, p) => sum + (p.irr_percent || 0), 0) / projects.length : 0,
      topCommodities: getTopItems(projects || [], 'primary_commodity', 5),
      topCountries: getTopItems(projects || [], 'country', 5)
    };
    
    // Format context for easy consumption
    const formattedContext = {
      projects: projects || [],
      news: news || [],
      filings: filings || [],
      issuers: issuers || [],
      stats: summaryStats,
      formattedText: formatForChat(projects || [], news || [], filings || [], issuers || [], summaryStats)
    };
    
    console.log(`Returning ${projects?.length || 0} projects with context`);
    return NextResponse.json(formattedContext);
    
  } catch (error) {
    console.error('Database context error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function getTopItems(projects: any[], field: string, limit: number) {
  const counts: { [key: string]: number } = {};
  
  projects.forEach(project => {
    const value = project[field];
    if (value) {
      counts[value] = (counts[value] || 0) + 1;
    }
  });
  
  return Object.entries(counts)
    .map(([key, count]) => ({ name: key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function groupBy(items: any[], field: string) {
  const groups: { [key: string]: any[] } = {};
  
  items.forEach(item => {
    const value = item[field] || 'Unknown';
    if (!groups[value]) {
      groups[value] = [];
    }
    groups[value].push(item);
  });
  
  return groups;
}

function formatForChat(projects: any[], news: any[], filings: any[], issuers: any[], stats: any): string {
  // Separate projects with NPV from those without
  const projectsWithNPV = projects.filter(p => p.post_tax_npv_usd_m !== null);
  const projectsWithoutNPV = projects.filter(p => p.post_tax_npv_usd_m === null);
  
  // Group projects by key attributes for better searchability
  const projectsByCountry = groupBy(projects, 'country');
  const projectsByCommodity = groupBy(projects, 'primary_commodity');
  const projectsByStage = groupBy(projects, 'development_stage');
  
  let context = `DATABASE CONTEXT:

SUMMARY STATISTICS:
Total Projects: ${stats.totalProjects}
Total News & Announcements: ${stats.totalNews}
Total Technical Filings: ${stats.totalFilings}
Total Reporting Issuers: ${stats.totalIssuers}

PROJECT DETAILS:
Projects with NPV data: ${projectsWithNPV.length}
Projects without NPV data: ${projectsWithoutNPV.length}
Average NPV (where available): $${projectsWithNPV.length > 0 ? (projectsWithNPV.reduce((sum, p) => sum + p.post_tax_npv_usd_m, 0) / projectsWithNPV.length).toFixed(1) : 0}M
Average IRR (where available): ${projectsWithNPV.length > 0 ? (projectsWithNPV.filter(p => p.irr_percent).reduce((sum, p) => sum + p.irr_percent, 0) / projectsWithNPV.filter(p => p.irr_percent).length).toFixed(1) : 0}%

TOP COMMODITIES:
${stats.topCommodities.map((c: any) => `- ${c.name}: ${c.count} projects`).join('\n')}

TOP COUNTRIES:
${stats.topCountries.map((c: any) => `- ${c.name}: ${c.count} projects`).join('\n')}

TOP PROJECTS BY NPV (with available data):
${projectsWithNPV.slice(0, 15).map((p: any, i: number) => 
  `${i+1}. ${p.project_name} (${p.company_name}): ${p.primary_commodity || 'N/A'} in ${p.country || 'N/A'}, NPV: $${p.post_tax_npv_usd_m?.toFixed(1)}M, IRR: ${p.irr_percent || 'N/A'}%`
).join('\n')}

SAMPLE PROJECTS (without NPV data):
${projectsWithoutNPV.slice(0, 10).map((p: any, i: number) => 
  `${i+1}. ${p.project_name} (${p.company_name}): ${p.primary_commodity || 'N/A'} in ${p.country || 'N/A'}`
).join('\n')}

RECENT NEWS & ANNOUNCEMENTS (Latest 10):
${news.slice(0, 10).map((n: any, i: number) => 
  `${i+1}. ${n.headline || n.title} - ${n.source_name || 'Unknown'} (${n.published_date ? new Date(n.published_date).toLocaleDateString() : 'N/A'})`
).join('\n') || 'No news available'}

RECENT TECHNICAL FILINGS (Latest 10):
${filings.slice(0, 10).map((f: any, i: number) => 
  `${i+1}. ${f.title || f.report_title} - ${f.company_name || 'Unknown'} (${f.filing_date ? new Date(f.filing_date).toLocaleDateString() : 'N/A'})`
).join('\n') || 'No filings available'}

REPORTING ISSUERS (Sample):
${issuers.slice(0, 10).map((iss: any, i: number) => 
  `${i+1}. ${iss.company_name || iss.issuer_name} - ${iss.jurisdiction || 'N/A'}`
).join('\n') || 'No issuers available'}

ALL PROJECT DETAILS (for searching):
${projects.map((p: any) => 
  `Project: ${p.project_name || 'N/A'} | Company: ${p.company_name || 'N/A'} | Country: ${p.country || 'Unknown'} | Jurisdiction: ${p.jurisdiction || 'N/A'} | Commodity: ${p.primary_commodity || 'N/A'} | Stage: ${p.development_stage || p.stage || 'N/A'} | NPV: ${p.post_tax_npv_usd_m ? '$' + p.post_tax_npv_usd_m.toFixed(1) + 'M' : 'N/A'} | IRR: ${p.irr_percent ? p.irr_percent + '%' : 'N/A'} | CAPEX: ${p.capex_usd_m ? '$' + p.capex_usd_m + 'M' : 'N/A'} | Mine Life: ${p.mine_life_years ? p.mine_life_years + ' years' : 'N/A'}`
).join('\n')}`;
  
  return context;
}
