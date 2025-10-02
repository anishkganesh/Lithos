-- Create Companies View and Enhanced Table
-- This migration creates a comprehensive companies view with aggregated project data

-- First, ensure the companies table exists with proper structure
CREATE TABLE IF NOT EXISTS companies (
    company_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL UNIQUE,
    headquarters_location VARCHAR(255),
    country VARCHAR(100),
    website_url TEXT,
    stock_ticker VARCHAR(20),
    exchange VARCHAR(50),
    market_cap_usd_m DECIMAL(12,2),
    
    -- Company metrics
    total_projects INTEGER DEFAULT 0,
    active_projects INTEGER DEFAULT 0,
    production_projects INTEGER DEFAULT 0,
    development_projects INTEGER DEFAULT 0,
    exploration_projects INTEGER DEFAULT 0,
    
    -- Aggregated financials
    total_npv_usd_m DECIMAL(15,2),
    avg_irr_percent DECIMAL(5,2),
    total_capex_usd_m DECIMAL(15,2),
    total_resources_tonnes DECIMAL(20,2),
    
    -- Primary commodities (array of commodities the company focuses on)
    primary_commodities TEXT[],
    
    -- Risk and ESG
    overall_risk_level VARCHAR(20),
    avg_esg_score VARCHAR(2),
    
    -- Metadata
    description TEXT,
    logo_url TEXT,
    founded_year INTEGER,
    employees_count INTEGER,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for companies
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(company_name);
CREATE INDEX IF NOT EXISTS idx_companies_country ON companies(country);
CREATE INDEX IF NOT EXISTS idx_companies_ticker ON companies(stock_ticker);
CREATE INDEX IF NOT EXISTS idx_companies_market_cap ON companies(market_cap_usd_m);

-- Create or replace the view that aggregates company data from projects
CREATE OR REPLACE VIEW companies_with_metrics AS
SELECT 
    COALESCE(c.company_id, gen_random_uuid()) as company_id,
    COALESCE(c.company_name, p.company_name) as company_name,
    c.headquarters_location,
    c.country as company_country,
    c.website_url,
    c.stock_ticker,
    c.exchange,
    c.market_cap_usd_m,
    c.description,
    c.logo_url,
    c.founded_year,
    c.employees_count,
    
    -- Project counts by stage
    COUNT(DISTINCT p.project_id) as total_projects,
    COUNT(DISTINCT CASE WHEN p.stage IN ('Production', 'Development', 'Feasibility', 'Pre-Feasibility', 'PFS', 'DFS') THEN p.project_id END) as active_projects,
    COUNT(DISTINCT CASE WHEN p.stage = 'Production' THEN p.project_id END) as production_projects,
    COUNT(DISTINCT CASE WHEN p.stage IN ('Development', 'Construction') THEN p.project_id END) as development_projects,
    COUNT(DISTINCT CASE WHEN p.stage IN ('Exploration', 'Resource Definition', 'PEA') THEN p.project_id END) as exploration_projects,
    
    -- Financial aggregates
    SUM(p.post_tax_npv_usd_m) as total_npv_usd_m,
    AVG(p.irr_percent) as avg_irr_percent,
    SUM(p.capex_usd_m) as total_capex_usd_m,
    SUM(p.total_resource_tonnes) as total_resources_tonnes,
    AVG(p.mine_life_years) as avg_mine_life_years,
    
    -- Commodity focus
    ARRAY_AGG(DISTINCT p.primary_commodity) FILTER (WHERE p.primary_commodity IS NOT NULL) as primary_commodities,
    
    -- Geographic spread
    ARRAY_AGG(DISTINCT p.country) FILTER (WHERE p.country IS NOT NULL) as operating_countries,
    COUNT(DISTINCT p.country) as countries_count,
    
    -- Risk assessment (using mode of project risks)
    MODE() WITHIN GROUP (ORDER BY p.jurisdiction_risk) as overall_risk_level,
    MODE() WITHIN GROUP (ORDER BY p.esg_score) as typical_esg_score,
    
    -- Latest activity
    MAX(p.updated_at) as last_project_update,
    MAX(p.technical_report_date) as latest_technical_report,
    
    -- Watchlist status (if any projects are watchlisted)
    BOOL_OR(p.watchlist) as has_watchlisted_projects,
    COUNT(DISTINCT CASE WHEN p.watchlist = true THEN p.project_id END) as watchlisted_projects_count,
    
    GREATEST(c.updated_at, MAX(p.updated_at)) as updated_at
FROM 
    projects p
    FULL OUTER JOIN companies c ON p.company_name = c.company_name
GROUP BY 
    c.company_id, 
    c.company_name, 
    p.company_name,
    c.headquarters_location,
    c.country,
    c.website_url,
    c.stock_ticker,
    c.exchange,
    c.market_cap_usd_m,
    c.description,
    c.logo_url,
    c.founded_year,
    c.employees_count,
    c.updated_at;

-- Create a materialized view for better performance
CREATE MATERIALIZED VIEW IF NOT EXISTS companies_summary AS
SELECT * FROM companies_with_metrics;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_companies_summary_name ON companies_summary(company_name);
CREATE INDEX IF NOT EXISTS idx_companies_summary_npv ON companies_summary(total_npv_usd_m);
CREATE INDEX IF NOT EXISTS idx_companies_summary_projects ON companies_summary(total_projects);

-- Function to refresh company metrics
CREATE OR REPLACE FUNCTION refresh_company_metrics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY companies_summary;
END;
$$ LANGUAGE plpgsql;

-- Function to populate companies table from projects
CREATE OR REPLACE FUNCTION populate_companies_from_projects()
RETURNS void AS $$
BEGIN
    INSERT INTO companies (company_name, total_projects)
    SELECT 
        company_name,
        COUNT(*) as total_projects
    FROM projects
    WHERE company_name IS NOT NULL
    GROUP BY company_name
    ON CONFLICT (company_name) 
    DO UPDATE SET
        total_projects = EXCLUDED.total_projects,
        updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update companies when projects change
CREATE OR REPLACE FUNCTION update_company_on_project_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Update or insert company record
    INSERT INTO companies (company_name, total_projects)
    VALUES (NEW.company_name, 1)
    ON CONFLICT (company_name) 
    DO UPDATE SET
        total_projects = companies.total_projects + 1,
        updated_at = CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for project inserts/updates
DROP TRIGGER IF EXISTS update_company_on_project_insert ON projects;
CREATE TRIGGER update_company_on_project_insert
    AFTER INSERT OR UPDATE ON projects
    FOR EACH ROW
    WHEN (NEW.company_name IS NOT NULL)
    EXECUTE FUNCTION update_company_on_project_change();

-- Initial population of companies from existing projects
SELECT populate_companies_from_projects();

-- Refresh the materialized view
REFRESH MATERIALIZED VIEW companies_summary;

-- Grant permissions
GRANT SELECT ON companies TO authenticated;
GRANT SELECT ON companies_with_metrics TO authenticated;
GRANT SELECT ON companies_summary TO authenticated;
GRANT ALL ON companies TO service_role;

-- Add RLS policies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Companies are viewable by everyone" 
    ON companies FOR SELECT 
    USING (true);

CREATE POLICY "Companies can be edited by service role" 
    ON companies FOR ALL 
    USING (auth.jwt() ->> 'role' = 'service_role');
