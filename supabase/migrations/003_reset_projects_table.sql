-- Drop the existing projects table and recreate it without the default constraint
DROP TABLE IF EXISTS projects CASCADE;

-- Create new projects table WITHOUT the default stage value
CREATE TABLE projects (
    project_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    company_id UUID REFERENCES companies(company_id) ON DELETE SET NULL,

    -- Location
    country VARCHAR(100),
    jurisdiction VARCHAR(100),

    -- Commodities
    primary_commodity commodity_type,

    -- Stage - NO DEFAULT VALUE
    stage project_stage,

    -- Financial Metrics
    capex_usd_m DECIMAL(10,2),
    sustaining_capex_usd_m DECIMAL(10,2),
    post_tax_npv_usd_m DECIMAL(10,2),
    pre_tax_npv_usd_m DECIMAL(10,2),
    irr_percent DECIMAL(5,2),
    payback_years DECIMAL(5,2),
    mine_life_years DECIMAL(5,2),

    -- Production Metrics
    annual_production_tonnes DECIMAL(15,2),
    total_resource_tonnes DECIMAL(15,2),
    resource_grade DECIMAL(10,4),
    resource_grade_unit VARCHAR(10),
    contained_metal DECIMAL(15,2),
    contained_metal_unit VARCHAR(10),

    -- Operating Costs
    opex_usd_per_tonne DECIMAL(10,2),
    aisc_usd_per_tonne DECIMAL(10,2),

    -- Technical Reports
    technical_report_url TEXT,
    technical_report_date DATE,

    -- Metadata
    data_source VARCHAR(50),
    extraction_confidence DECIMAL(3,2),
    processing_status VARCHAR(50),
    discovery_date TIMESTAMP,
    last_scraped_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Add unique constraint on project name + company name
    CONSTRAINT unique_project_company UNIQUE (project_name, company_name)
);

-- Create indexes
CREATE INDEX idx_projects_company ON projects(company_name);
CREATE INDEX idx_projects_commodity ON projects(primary_commodity);
CREATE INDEX idx_projects_country ON projects(country);
CREATE INDEX idx_projects_stage ON projects(stage);
CREATE INDEX idx_projects_npv ON projects(post_tax_npv_usd_m DESC);
CREATE INDEX idx_projects_irr ON projects(irr_percent DESC);

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Enable read access for all users" ON projects
    FOR SELECT
    USING (true);

-- Create policy for authenticated users to insert/update
CREATE POLICY "Enable insert for authenticated users" ON projects
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON projects
    FOR UPDATE
    USING (true);

-- Grant permissions
GRANT SELECT ON projects TO anon;
GRANT ALL ON projects TO authenticated;

-- Create update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Projects table reset successfully without default stage constraint!';
END $$;