# Supabase Migration Instructions

## How to Apply the Migration

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor** (in the left sidebar)
4. Click **New Query**
5. Copy and paste the entire SQL script below
6. Click **Run** to execute the migration

## Complete Migration Script

Copy everything below this line:

```sql
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
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(company_name);
CREATE INDEX IF NOT EXISTS idx_companies_ticker ON companies(stock_ticker);
CREATE INDEX IF NOT EXISTS idx_companies_exchange ON companies(exchange);
CREATE INDEX IF NOT EXISTS idx_companies_country ON companies(headquarters_country);

-- Add new columns to projects table if not exists
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
  
  -- Create index only if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_projects_company'
  ) THEN
    CREATE INDEX idx_projects_company ON projects(company_id);
  END IF;
END $$;

-- Add data source tracking columns to projects table
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
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' 
    AND column_name = 'source_document_date'
  ) THEN
    ALTER TABLE projects 
    ADD COLUMN source_document_date DATE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' 
    AND column_name = 'extraction_confidence'
  ) THEN
    ALTER TABLE projects 
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
  
  IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.company_id IS DISTINCT FROM NEW.company_id) THEN
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

-- Create trigger to automatically update company project counts
DROP TRIGGER IF EXISTS update_company_project_count_trigger ON projects;
CREATE TRIGGER update_company_project_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON projects
FOR EACH ROW
EXECUTE FUNCTION update_company_project_count();

-- Grant permissions (adjust based on your needs)
GRANT ALL ON companies TO authenticated;
GRANT ALL ON companies TO service_role;
GRANT ALL ON projects TO authenticated;
GRANT ALL ON projects TO service_role;

-- Add RLS policies if needed
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Policy to allow all authenticated users to read
CREATE POLICY "Allow authenticated read companies" ON companies
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read projects" ON projects
  FOR SELECT TO authenticated USING (true);

-- Policy to allow service role full access
CREATE POLICY "Service role full access companies" ON companies
  FOR ALL TO service_role USING (true);

CREATE POLICY "Service role full access projects" ON projects
  FOR ALL TO service_role USING (true);

-- Verify the migration
SELECT 'Migration completed successfully!' as status;
```

## After Running the Migration

1. You should see "Migration completed successfully!" in the results
2. Check that the `companies` table was created
3. Check that the `projects` table has the new columns
4. The mining agent will now be able to save projects to the database

## Troubleshooting

If you get any errors:
- Make sure you're connected to the correct database
- Check if some tables/columns already exist (the script handles this but just in case)
- If you get permission errors, make sure you're using an admin account

## Test the Mining Agent

After applying the migration:
1. Go back to your app
2. Click "Run Mining Agent" 
3. It should complete in under 1 minute now (with the optimizations)
4. Check your Supabase dashboard to see the new projects and companies
