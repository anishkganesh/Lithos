-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
  company_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Company Information
  company_name VARCHAR(255) NOT NULL UNIQUE,
  company_logo_url TEXT,
  website TEXT,
  description TEXT,
  
  -- Location & Contact
  headquarters_location VARCHAR(255),
  headquarters_country VARCHAR(100),
  
  -- Financial Information
  market_cap DECIMAL(15,2), -- in millions USD
  stock_ticker VARCHAR(20),
  exchange VARCHAR(50), -- TSX, ASX, LSE, NYSE, NASDAQ, etc.
  
  -- Company Details
  founded_year INTEGER,
  employee_count INTEGER,
  
  -- Computed/Cached Fields
  project_count INTEGER DEFAULT 0,
  active_projects INTEGER DEFAULT 0,
  total_resources_value DECIMAL(15,2), -- in millions USD
  
  -- Metadata
  last_updated_from_source TIMESTAMP WITH TIME ZONE,
  data_sources TEXT[] -- Array of sources this data came from
);

-- Create indexes for better query performance
CREATE INDEX idx_companies_name ON companies(company_name);
CREATE INDEX idx_companies_ticker ON companies(stock_ticker);
CREATE INDEX idx_companies_exchange ON companies(exchange);
CREATE INDEX idx_companies_country ON companies(headquarters_country);

-- Add company_id foreign key to projects table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' 
    AND column_name = 'company_id'
  ) THEN
    ALTER TABLE projects 
    ADD COLUMN company_id UUID REFERENCES companies(company_id) ON DELETE SET NULL;
    
    CREATE INDEX idx_projects_company ON projects(company_id);
  END IF;
END $$;

-- Add data source tracking columns to projects table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' 
    AND column_name = 'data_source'
  ) THEN
    ALTER TABLE projects 
    ADD COLUMN data_source VARCHAR(255),
    ADD COLUMN source_document_url TEXT,
    ADD COLUMN source_document_date DATE,
    ADD COLUMN extraction_confidence DECIMAL(3,2) DEFAULT 0.8;
  END IF;
END $$;

-- Add columns to track shown projects (to avoid repetition)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' 
    AND column_name = 'shown_count'
  ) THEN
    ALTER TABLE projects 
    ADD COLUMN shown_count INTEGER DEFAULT 0,
    ADD COLUMN last_shown_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN discovery_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- Create a function to update project count for companies
CREATE OR REPLACE FUNCTION update_company_project_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE companies 
    SET project_count = (
      SELECT COUNT(*) FROM projects WHERE company_id = NEW.company_id
    ),
    active_projects = (
      SELECT COUNT(*) FROM projects 
      WHERE company_id = NEW.company_id 
      AND stage IN ('Development', 'Production', 'PFS', 'DFS')
    ),
    updated_at = NOW()
    WHERE company_id = NEW.company_id;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    UPDATE companies 
    SET project_count = (
      SELECT COUNT(*) FROM projects WHERE company_id = OLD.company_id
    ),
    active_projects = (
      SELECT COUNT(*) FROM projects 
      WHERE company_id = OLD.company_id 
      AND stage IN ('Development', 'Production', 'PFS', 'DFS')
    ),
    updated_at = NOW()
    WHERE company_id = OLD.company_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update project counts
DROP TRIGGER IF EXISTS update_company_project_count_trigger ON projects;
CREATE TRIGGER update_company_project_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON projects
FOR EACH ROW
EXECUTE FUNCTION update_company_project_count();

-- Create view for company details with project summaries
CREATE OR REPLACE VIEW company_details_view AS
SELECT 
  c.*,
  COUNT(DISTINCT p.id) as total_projects,
  COUNT(DISTINCT CASE WHEN p.stage IN ('Development', 'Production') THEN p.id END) as producing_projects,
  COUNT(DISTINCT CASE WHEN p.stage IN ('PEA', 'PFS', 'DFS') THEN p.id END) as development_projects,
  COUNT(DISTINCT CASE WHEN p.stage = 'Exploration' THEN p.id END) as exploration_projects,
  ARRAY_AGG(DISTINCT p.primary_commodity) FILTER (WHERE p.primary_commodity IS NOT NULL) as commodities,
  ARRAY_AGG(DISTINCT p.country) FILTER (WHERE p.country IS NOT NULL) as project_countries,
  MAX(p.updated_at) as latest_project_update
FROM companies c
LEFT JOIN projects p ON c.company_id = p.company_id
GROUP BY c.company_id;

-- Grant appropriate permissions
GRANT ALL ON companies TO authenticated;
GRANT ALL ON company_details_view TO authenticated;
GRANT SELECT ON companies TO anon;
GRANT SELECT ON company_details_view TO anon;
