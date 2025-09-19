-- Create project_screener_view if it doesn't exist
-- This view formats project data for the project screener table

CREATE OR REPLACE VIEW project_screener_view AS
SELECT
  p.id,
  p.name as project_name,
  p.company as company_name,
  p.stage,
  EXTRACT(YEAR FROM age(p.production_end, p.production_start))::integer as mine_life_years,
  p.npv_midpoint as post_tax_npv_usd_m,
  p.irr_midpoint as irr_percent,
  p.payback_years,
  p.capex_midpoint as capex_usd_m,
  p.opex_midpoint as aisc_usd_per_tonne,
  p.commodities[1] as primary_commodity,
  p.location || ', ' || p.country as jurisdiction_and_risk,
  p.risk_score as jurisdiction_risk,
  p.ownership_structure as investors_ownership_text,
  p.resource_tonnage as resource_grade,
  p.resource_tonnage as contained_metal,
  COALESCE(p.esg_score, 'C') as esg_score,
  0 as red_flag_count,
  'Pending' as permit_status,
  0 as offtake_count,
  p.updated_at,
  p.watchlist,
  p.watchlisted_at,
  p.generated_image_url
FROM projects p
ORDER BY p.updated_at DESC;