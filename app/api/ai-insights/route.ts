import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const apiKey = process.env.OPENAI_API_KEY;
const openai = new OpenAI({
  apiKey: apiKey || 'sk-dummy-key'
});

interface RiskAnalysisResult {
  geography_risk_score: number;
  geography_risk_analysis: string;
  legal_risk_score: number;
  legal_risk_analysis: string;
  commodity_risk_score: number;
  commodity_risk_analysis: string;
  team_risk_score: number;
  team_risk_analysis: string;
  overall_risk_score: number;
  risk_summary: string;
  key_opportunities: string[];
  key_threats: string[];
  investment_recommendation: string;
  recommendation_rationale: string;
}

/**
 * Generate AI-powered risk analysis for a mining project
 */
async function generateRiskAnalysis(
  project: any,
  useWebSearch: boolean = false
): Promise<RiskAnalysisResult> {
  const startTime = Date.now();

  const projectContext = `
**Project Details:**
- Name: ${project.name}
- Location: ${project.location || 'N/A'}
- Stage: ${project.stage || 'N/A'}
- Status: ${project.status || 'N/A'}
- Commodities: ${Array.isArray(project.commodities) ? project.commodities.join(', ') : 'N/A'}
- Description: ${project.description || 'N/A'}

**Company Information:**
- Company Name: ${project.company_name || 'Unknown Company'}
- Ticker: ${project.company_ticker || 'N/A'}
- Market Cap: ${project.company_market_cap ? `$${project.company_market_cap}M` : 'N/A'}
- Company Description: ${project.company_description || 'N/A'}

**Financial Metrics:**
- NPV (Net Present Value): ${project.npv !== null && project.npv !== undefined ? `$${project.npv}M` : 'N/A'}
- IRR (Internal Rate of Return): ${project.irr !== null && project.irr !== undefined ? `${project.irr}%` : 'N/A'}
- CAPEX (Capital Expenditure): ${project.capex !== null && project.capex !== undefined ? `$${project.capex}M` : 'N/A'}
- Payback Period: ${project.payback_period !== null && project.payback_period !== undefined ? `${project.payback_period} years` : 'N/A'}
- Annual Production: ${project.annual_production || 'N/A'}
- Mine Life: ${project.mine_life !== null && project.mine_life !== undefined ? `${project.mine_life} years` : 'N/A'}

**Additional Context:**
- Resource/Reserve: ${project.resource_reserve || 'N/A'}
- Mining Method: ${project.mining_method || 'N/A'}
- Processing Method: ${project.processing_method || 'N/A'}
- Infrastructure: ${project.infrastructure || 'N/A'}
  `.trim();

  const systemPrompt = `You are an expert mining industry risk analyst specializing in comprehensive project evaluation. Your analysis must be data-driven, objective, and actionable.

Analyze the following mining project across four critical risk dimensions:

1. **Geography Risk** - Political stability, infrastructure, mining jurisdiction quality, environmental regulations, social license to operate
2. **Legal Risk** - Regulatory framework, permitting process, land rights, compliance requirements, legal precedents
3. **Commodity Risk** - Market dynamics, price volatility, demand trends, supply competition, substitution threats
4. **Team Risk** - Management experience, track record, technical expertise, financial management capability

For each risk category, provide:
- A score from 0-10 (0 = lowest risk, 10 = highest risk)
- Detailed analysis (2-3 sentences) explaining the score
- Specific evidence or factors considered

Then provide:
- Overall risk score (weighted average)
- Risk summary (executive summary of all risks)
- 3-5 key opportunities (strengths and catalysts)
- 3-5 key threats (weaknesses and concerns)
- Investment recommendation: 'Strong Buy' (score 0-3), 'Buy' (3-5), 'Hold' (5-7), or 'Pass' (7-10)
- Recommendation rationale (2-3 sentences)

Return your analysis as a valid JSON object with this exact structure:
{
  "geography_risk_score": number,
  "geography_risk_analysis": string,
  "legal_risk_score": number,
  "legal_risk_analysis": string,
  "commodity_risk_score": number,
  "commodity_risk_analysis": string,
  "team_risk_score": number,
  "team_risk_analysis": string,
  "overall_risk_score": number,
  "risk_summary": string,
  "key_opportunities": string[],
  "key_threats": string[],
  "investment_recommendation": string,
  "recommendation_rationale": string
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Analyze this mining project and provide comprehensive risk assessment:\n\n${projectContext}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const analysis = JSON.parse(content) as RiskAnalysisResult;

    // Validate the response structure
    const requiredFields = [
      'geography_risk_score', 'legal_risk_score', 'commodity_risk_score',
      'team_risk_score', 'overall_risk_score', 'investment_recommendation'
    ];

    for (const field of requiredFields) {
      if (!(field in analysis)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    console.log(`Risk analysis generated in ${Date.now() - startTime}ms`);
    return analysis;

  } catch (error) {
    console.error('Error generating risk analysis:', error);
    throw error;
  }
}

/**
 * GET /api/ai-insights?projectId=xxx
 * Fetch existing AI insights for a project (from ai_insights table)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId parameter is required' },
        { status: 400 }
      );
    }

    // Fetch insights from ai_insights table
    const { data, error } = await supabase
      .from('ai_insights')
      .select('*')
      .eq('project_id', projectId)
      .gt('expires_at', new Date().toISOString())
      .order('generated_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching AI insights:', error);
      throw error;
    }

    if (!data) {
      return NextResponse.json({ insight: null, cached: false });
    }

    return NextResponse.json({ insight: { ...data, from_cache: true }, cached: true });

  } catch (error: any) {
    console.error('Error fetching AI insights:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch AI insights' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai-insights
 * Generate new AI insights for a project
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, forceRegenerate, useWebSearch } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    const insight = await generateInsightForProject(projectId, forceRegenerate, useWebSearch);
    return NextResponse.json({ insight });

  } catch (error: any) {
    console.error('Error generating AI insights:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate AI insights' },
      { status: 500 }
    );
  }
}

/**
 * Generate insight for a single project
 */
async function generateInsightForProject(
  projectId: string,
  forceRegenerate: boolean = false,
  useWebSearch: boolean = false
) {
  const startTime = Date.now();

  // Check if valid cached insight exists (unless force regenerate)
  if (!forceRegenerate) {
    const { data: existingInsight } = await supabase
      .from('ai_insights')
      .select('*')
      .eq('project_id', projectId)
      .gt('expires_at', new Date().toISOString())
      .order('generated_at', { ascending: false })
      .limit(1)
      .single();

    if (existingInsight) {
      console.log(`Using cached insight for project ${projectId}`);
      return { ...existingInsight, from_cache: true };
    }
  }

  // Fetch project details
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (projectError || !project) {
    console.error(`Project fetch error for ${projectId}:`, projectError);
    throw new Error(`Project not found: ${projectId}`);
  }

  // Fetch company data separately if company_id exists
  let companyData = {
    name: 'Unknown Company',
    ticker: null,
    market_cap: null,
    description: null
  };

  if (project.company_id) {
    const { data: company } = await supabase
      .from('companies')
      .select('name, ticker, market_cap, description')
      .eq('id', project.company_id)
      .single();

    if (company) {
      companyData = company;
    }
  }

  // Add company data to project for analysis
  const projectWithCompany = {
    ...project,
    company_name: companyData.name,
    company_ticker: companyData.ticker,
    company_market_cap: companyData.market_cap,
    company_description: companyData.description
  };

  // Generate risk analysis
  const analysis = await generateRiskAnalysis(projectWithCompany, useWebSearch);

  // Save to ai_insights table
  const { data: savedInsight, error: saveError } = await supabase
    .from('ai_insights')
    .insert({
      project_id: projectId,
      ...analysis,
      generation_time_ms: Date.now() - startTime,
      web_search_used: useWebSearch,
      model_used: 'gpt-4o-mini'
    })
    .select()
    .single();

  if (saveError) {
    console.error('Error saving insight:', saveError);
    throw saveError;
  }

  console.log(`Generated new insight for project ${projectId} in ${Date.now() - startTime}ms`);
  return { ...savedInsight, from_cache: false };
}

/**
 * DELETE /api/ai-insights?projectId=xxx
 * Delete AI insights for a project (to force regeneration)
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId parameter is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('ai_insights')
      .delete()
      .eq('project_id', projectId);

    if (error) throw error;

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error deleting AI insights:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete AI insights' },
      { status: 500 }
    );
  }
}
