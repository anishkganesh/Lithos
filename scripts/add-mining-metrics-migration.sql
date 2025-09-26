-- Migration script to add additional mining metrics columns
-- Run this with: npx supabase db execute --sql "$(cat scripts/add-mining-metrics-migration.sql)"

-- Add new columns for additional financial metrics
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS pre_tax_npv_usd_m numeric(10, 2),
ADD COLUMN IF NOT EXISTS payback_years numeric(5, 2),
ADD COLUMN IF NOT EXISTS annual_revenue_usd_m numeric(10, 2),
ADD COLUMN IF NOT EXISTS annual_opex_usd_m numeric(10, 2),
ADD COLUMN IF NOT EXISTS all_in_sustaining_cost numeric(10, 2),
ADD COLUMN IF NOT EXISTS cash_cost numeric(10, 2),
ADD COLUMN IF NOT EXISTS strip_ratio numeric(10, 2),
ADD COLUMN IF NOT EXISTS recovery_rate_percent numeric(5, 2),
ADD COLUMN IF NOT EXISTS reserves_tonnes numeric(20, 2),
ADD COLUMN IF NOT EXISTS resources_tonnes numeric(20, 2),
ADD COLUMN IF NOT EXISTS discount_rate_percent numeric(5, 2);

-- Add comments for documentation
COMMENT ON COLUMN projects.pre_tax_npv_usd_m IS 'Pre-tax Net Present Value in millions USD';
COMMENT ON COLUMN projects.payback_years IS 'Payback period in years';
COMMENT ON COLUMN projects.annual_revenue_usd_m IS 'Average annual revenue in millions USD';
COMMENT ON COLUMN projects.annual_opex_usd_m IS 'Annual operating expenditure in millions USD';
COMMENT ON COLUMN projects.all_in_sustaining_cost IS 'All-in sustaining cost per unit';
COMMENT ON COLUMN projects.cash_cost IS 'Cash operating cost per unit';
COMMENT ON COLUMN projects.strip_ratio IS 'Waste to ore strip ratio';
COMMENT ON COLUMN projects.recovery_rate_percent IS 'Processing recovery rate percentage';
COMMENT ON COLUMN projects.reserves_tonnes IS 'Total proven and probable reserves in tonnes';
COMMENT ON COLUMN projects.resources_tonnes IS 'Total measured, indicated and inferred resources in tonnes';
COMMENT ON COLUMN projects.discount_rate_percent IS 'Discount rate used for NPV calculation';