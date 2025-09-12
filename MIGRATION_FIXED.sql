-- Safe migration script that checks for existing objects

-- Create companies table only if it doesn't exist
CREATE TABLE IF NOT EXISTS companies (
  company_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  company_name VARCHAR(255) NOT NULL UNIQUE,
  company_logo_url TEXT,
  website TEXT,
  description TEXT,
  headquarters_location VARCHAR(255),
  headquarters_country VARCHAR(100),
  market_cap DECIMAL(15,2),
  stock_ticker VARCHAR(20),
  exchange VARCHAR(50),
  founded_year INTEGER,
  employee_count INTEGER,
  project_count INTEGER DEFAULT 0,
  active_projects INTEGER DEFAULT 0,
  total_resources_value DECIMAL(15,2),
  last_updated_from_source TIMESTAMP WITH TIME ZONE,
  data_sources TEXT[]
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(company_name);
CREATE INDEX IF NOT EXISTS idx_companies_ticker ON companies(stock_ticker);
CREATE INDEX IF NOT EXISTS idx_companies_exchange ON companies(exchange);
CREATE INDEX IF NOT EXISTS idx_companies_country ON companies(headquarters_country);

-- Add company_id to projects if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' 
    AND column_name = 'company_id'
  ) THEN
    ALTER TABLE projects 
    ADD COLUMN company_id UUID REFERENCES companies(company_id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for company_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'projects' 
    AND indexname = 'idx_projects_company'
  ) THEN
    CREATE INDEX idx_projects_company ON projects(company_id);
  END IF;
END $$;

-- Add source_document_url if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' 
    AND column_name = 'source_document_url'
  ) THEN
    ALTER TABLE projects 
    ADD COLUMN source_document_url TEXT;
  END IF;
END $$;

-- Add source_document_date if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' 
    AND column_name = 'source_document_date'
  ) THEN
    ALTER TABLE projects 
    ADD COLUMN source_document_date DATE;
  END IF;
END $$;

-- Add extraction_confidence if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' 
    AND column_name = 'extraction_confidence'
  ) THEN
    ALTER TABLE projects 
    ADD COLUMN extraction_confidence DECIMAL(3,2) DEFAULT 0.8;
  END IF;
END $$;

-- Add tracking columns if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' 
    AND column_name = 'shown_count'
  ) THEN
    ALTER TABLE projects 
    ADD COLUMN shown_count INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' 
    AND column_name = 'last_shown_at'
  ) THEN
    ALTER TABLE projects 
    ADD COLUMN last_shown_at TIMESTAMP WITH TIME ZONE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' 
    AND column_name = 'discovery_date'
  ) THEN
    ALTER TABLE projects 
    ADD COLUMN discovery_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- Create or replace the update function
CREATE OR REPLACE FUNCTION update_company_project_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.company_id IS NOT NULL THEN
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
  END IF;
  
  IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.company_id IS DISTINCT FROM NEW.company_id) THEN
    IF OLD.company_id IS NOT NULL THEN
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
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS update_company_project_count_trigger ON projects;
CREATE TRIGGER update_company_project_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON projects
FOR EACH ROW
EXECUTE FUNCTION update_company_project_count();

-- Grant permissions
GRANT ALL ON companies TO authenticated;
GRANT ALL ON companies TO service_role;
GRANT ALL ON projects TO authenticated;
GRANT ALL ON projects TO service_role;

-- Enable RLS if not already enabled
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Allow authenticated read companies" ON companies;
CREATE POLICY "Allow authenticated read companies" ON companies
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated read projects" ON projects;
CREATE POLICY "Allow authenticated read projects" ON projects
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Service role full access companies" ON companies;
CREATE POLICY "Service role full access companies" ON companies
  FOR ALL TO service_role USING (true);

DROP POLICY IF EXISTS "Service role full access projects" ON projects;
CREATE POLICY "Service role full access projects" ON projects
  FOR ALL TO service_role USING (true);

-- Verify the migration
SELECT 'Migration completed successfully!' as status;

