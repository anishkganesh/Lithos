-- Enable PostGIS extension for geographic data
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create enum types
CREATE TYPE project_stage AS ENUM (
  'Exploration',
  'Resource Definition',
  'Pre-Feasibility',
  'Feasibility',
  'Construction',
  'Production',
  'Care & Maintenance',
  'Closed'
);

CREATE TYPE commodity_type AS ENUM (
  'Lithium',
  'Copper',
  'Nickel',
  'Cobalt',
  'Rare Earths',
  'Gold',
  'Silver',
  'Uranium',
  'Graphite',
  'Other'
);

CREATE TYPE risk_level AS ENUM (
  'Low',
  'Medium',
  'High',
  'Very High'
);

CREATE TYPE esg_grade AS ENUM (
  'A',
  'B',
  'C',
  'D',
  'F'
);

-- Create the main projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Basic Project Information
  project_name VARCHAR(255) NOT NULL,
  company_name VARCHAR(255),
  company_logo_url TEXT,
  project_description TEXT,
  
  -- Location & Geography
  jurisdiction VARCHAR(255),
  country VARCHAR(100),
  location GEOGRAPHY(POINT, 4326), -- PostGIS point for lat/lon
  
  -- Project Stage & Timeline
  stage project_stage DEFAULT 'Exploration',
  mine_life_years DECIMAL(5,2),
  construction_start_date DATE,
  production_start_date DATE,
  
  -- Financial Metrics
  post_tax_npv_usd_m DECIMAL(12,2),
  pre_tax_npv_usd_m DECIMAL(12,2),
  irr_percent DECIMAL(5,2),
  payback_years DECIMAL(5,2),
  
  -- Capital & Operating Costs
  capex_usd_m DECIMAL(12,2),
  sustaining_capex_usd_m DECIMAL(12,2),
  opex_usd_per_tonne DECIMAL(10,2),
  aisc_usd_per_tonne DECIMAL(10,2),
  
  -- Production & Resources
  primary_commodity commodity_type,
  secondary_commodities commodity_type[],
  annual_production_tonnes DECIMAL(15,2),
  total_resource_tonnes DECIMAL(15,2),
  resource_grade DECIMAL(10,4),
  resource_grade_unit VARCHAR(50),
  contained_metal DECIMAL(15,2),
  contained_metal_unit VARCHAR(50),
  
  -- Risk & ESG
  jurisdiction_risk risk_level DEFAULT 'Medium',
  esg_score esg_grade DEFAULT 'C',
  red_flags TEXT[],
  risk_alerts JSONB DEFAULT '[]'::JSONB,
  
  -- Ownership & Investment
  investors_ownership TEXT[],
  ownership_structure JSONB DEFAULT '{}'::JSONB,
  
  -- Permits & Agreements
  permit_status VARCHAR(100),
  environmental_permits JSONB DEFAULT '[]'::JSONB,
  offtake_agreements JSONB DEFAULT '[]'::JSONB,
  
  -- Technical Documentation
  technical_report_url TEXT,
  technical_report_date DATE,
  report_type VARCHAR(50), -- NI 43-101, JORC, SK-1300
  source_documents JSONB DEFAULT '[]'::JSONB,
  
  -- Metadata
  data_source VARCHAR(100), -- SEDAR, EDGAR, LSE, ASX
  source_url TEXT,
  last_scraped_at TIMESTAMP WITH TIME ZONE,
  processing_status VARCHAR(50) DEFAULT 'pending',
  processing_notes TEXT,
  
  -- Search optimization
  search_vector tsvector,
  
  -- Unique constraint to prevent duplicates
  UNIQUE(project_name, company_name)
);

-- Create indexes for performance
CREATE INDEX idx_projects_stage ON projects(stage);
CREATE INDEX idx_projects_commodity ON projects(primary_commodity);
CREATE INDEX idx_projects_jurisdiction ON projects(jurisdiction);
CREATE INDEX idx_projects_company ON projects(company_name);
CREATE INDEX idx_projects_location ON projects USING GIST(location);
CREATE INDEX idx_projects_search ON projects USING GIN(search_vector);
CREATE INDEX idx_projects_updated ON projects(updated_at);

-- Create trigger to update search vector
CREATE OR REPLACE FUNCTION update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.project_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.company_name, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.project_description, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.jurisdiction, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_projects_search_vector
BEFORE INSERT OR UPDATE ON projects
FOR EACH ROW
EXECUTE FUNCTION update_search_vector();

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Create a view for the project screener with calculated fields
CREATE OR REPLACE VIEW project_screener_view AS
SELECT 
  id,
  project_name,
  company_name,
  stage,
  mine_life_years,
  post_tax_npv_usd_m,
  irr_percent,
  payback_years,
  capex_usd_m,
  aisc_usd_per_tonne,
  primary_commodity,
  jurisdiction || ' - ' || jurisdiction_risk AS jurisdiction_and_risk,
  array_to_string(investors_ownership, ', ') AS investors_ownership_text,
  resource_grade,
  contained_metal,
  esg_score,
  array_length(red_flags, 1) AS red_flag_count,
  permit_status,
  jsonb_array_length(offtake_agreements) AS offtake_count,
  updated_at
FROM projects
WHERE processing_status = 'completed';

-- Grant permissions
GRANT ALL ON projects TO authenticated;
GRANT SELECT ON project_screener_view TO authenticated;
GRANT ALL ON projects TO service_role; 