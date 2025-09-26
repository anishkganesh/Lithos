-- Complete migration script for EDGAR document processing
-- Run this before processing documents

-- 1. Add missing columns to edgar_technical_documents table
ALTER TABLE edgar_technical_documents
ADD COLUMN IF NOT EXISTS processing_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE;

-- 2. Create or update companies table
CREATE TABLE IF NOT EXISTS public.companies (
  company_id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  company_name character varying(255) NOT NULL,
  company_logo_url text NULL,
  website text NULL,
  description text NULL,
  headquarters_location character varying(255) NULL,
  headquarters_country character varying(100) NULL,
  market_cap numeric(15, 2) NULL,
  stock_ticker character varying(20) NULL,
  exchange character varying(50) NULL,
  founded_year integer NULL,
  employee_count integer NULL,
  project_count integer NULL DEFAULT 0,
  active_projects integer NULL DEFAULT 0,
  total_resources_value numeric(15, 2) NULL,
  last_updated_from_source timestamp with time zone NULL,
  data_sources text[] NULL,
  CONSTRAINT companies_pkey PRIMARY KEY (company_id),
  CONSTRAINT companies_company_name_key UNIQUE (company_name)
);

-- Create indexes for companies
CREATE INDEX IF NOT EXISTS idx_companies_name ON public.companies USING btree (company_name);
CREATE INDEX IF NOT EXISTS idx_companies_ticker ON public.companies USING btree (stock_ticker);
CREATE INDEX IF NOT EXISTS idx_companies_exchange ON public.companies USING btree (exchange);
CREATE INDEX IF NOT EXISTS idx_companies_country ON public.companies USING btree (headquarters_country);

-- 3. Create enum types if they don't exist
DO $$ BEGIN
  CREATE TYPE public.project_stage AS ENUM (
    'Exploration',
    'Development',
    'Feasibility',
    'Production',
    'Care & Maintenance'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.commodity_type AS ENUM (
    'Lithium',
    'Gold',
    'Silver',
    'Copper',
    'Nickel',
    'Cobalt',
    'Uranium',
    'Zinc',
    'Lead',
    'Tin',
    'Platinum',
    'Palladium',
    'Rare Earth Elements',
    'Iron Ore',
    'Coal',
    'Potash',
    'Phosphate',
    'Graphite',
    'Manganese',
    'Vanadium',
    'Molybdenum',
    'Tungsten',
    'Other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.risk_level AS ENUM (
    'Very Low',
    'Low',
    'Medium',
    'High',
    'Very High'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.esg_grade AS ENUM (
    'A+',
    'A',
    'B',
    'C',
    'D',
    'F'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 4. Create or update projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  project_name character varying(255) NOT NULL,
  company_name character varying(255) NULL,
  company_logo_url text NULL,
  project_description text NULL,
  jurisdiction character varying(255) NULL,
  country character varying(100) NULL,
  location geography NULL,
  stage public.project_stage NULL DEFAULT 'Exploration'::project_stage,
  mine_life_years numeric(5, 2) NULL,
  construction_start_date date NULL,
  production_start_date date NULL,
  post_tax_npv_usd_m numeric(12, 2) NULL,
  pre_tax_npv_usd_m numeric(12, 2) NULL,
  irr_percent numeric(5, 2) NULL,
  payback_years numeric(5, 2) NULL,
  capex_usd_m numeric(12, 2) NULL,
  sustaining_capex_usd_m numeric(12, 2) NULL,
  opex_usd_per_tonne numeric(10, 2) NULL,
  aisc_usd_per_tonne numeric(10, 2) NULL,
  primary_commodity public.commodity_type NULL,
  secondary_commodities commodity_type[] NULL,
  annual_production_tonnes numeric(15, 2) NULL,
  total_resource_tonnes numeric(15, 2) NULL,
  resource_grade numeric(10, 4) NULL,
  resource_grade_unit character varying(50) NULL,
  contained_metal numeric(15, 2) NULL,
  contained_metal_unit character varying(50) NULL,
  jurisdiction_risk public.risk_level NULL DEFAULT 'Medium'::risk_level,
  esg_score public.esg_grade NULL DEFAULT 'C'::esg_grade,
  red_flags text[] NULL,
  risk_alerts jsonb NULL DEFAULT '[]'::jsonb,
  investors_ownership text[] NULL,
  ownership_structure jsonb NULL DEFAULT '{}'::jsonb,
  permit_status character varying(100) NULL,
  environmental_permits jsonb NULL DEFAULT '[]'::jsonb,
  offtake_agreements jsonb NULL DEFAULT '[]'::jsonb,
  technical_report_url text NULL,
  technical_report_date date NULL,
  report_type character varying(50) NULL,
  source_documents jsonb NULL DEFAULT '[]'::jsonb,
  data_source character varying(100) NULL,
  source_url text NULL,
  last_scraped_at timestamp with time zone NULL,
  processing_status character varying(50) NULL DEFAULT 'pending'::character varying,
  processing_notes text NULL,
  search_vector tsvector NULL,
  company_id uuid NULL,
  source_document_url text NULL,
  source_document_date date NULL,
  extraction_confidence numeric(3, 2) NULL DEFAULT 0.8,
  shown_count integer NULL DEFAULT 0,
  last_shown_at timestamp with time zone NULL,
  discovery_date timestamp with time zone NULL DEFAULT now(),
  watchlist boolean NULL DEFAULT false,
  generated_image_url text NULL,
  watchlisted_at timestamp with time zone NULL,
  watchlist_notes text NULL,
  CONSTRAINT projects_pkey PRIMARY KEY (id),
  CONSTRAINT projects_project_name_company_name_key UNIQUE (project_name, company_name),
  CONSTRAINT projects_company_id_fkey FOREIGN KEY (company_id)
    REFERENCES companies (company_id) ON DELETE SET NULL
);

-- Create indexes for projects
CREATE INDEX IF NOT EXISTS idx_projects_stage ON public.projects USING btree (stage);
CREATE INDEX IF NOT EXISTS idx_projects_commodity ON public.projects USING btree (primary_commodity);
CREATE INDEX IF NOT EXISTS idx_projects_jurisdiction ON public.projects USING btree (jurisdiction);
CREATE INDEX IF NOT EXISTS idx_projects_company ON public.projects USING btree (company_name);
CREATE INDEX IF NOT EXISTS idx_projects_location ON public.projects USING gist (location);
CREATE INDEX IF NOT EXISTS idx_projects_search ON public.projects USING gin (search_vector);
CREATE INDEX IF NOT EXISTS idx_projects_updated ON public.projects USING btree (updated_at);
CREATE INDEX IF NOT EXISTS idx_projects_watchlist ON public.projects USING btree (watchlist) WHERE (watchlist = true);

-- 5. Create or update trigger functions
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    COALESCE(NEW.project_name, '') || ' ' ||
    COALESCE(NEW.company_name, '') || ' ' ||
    COALESCE(NEW.jurisdiction, '') || ' ' ||
    COALESCE(NEW.country, '') || ' ' ||
    COALESCE(NEW.project_description, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_company_project_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE companies
    SET project_count = project_count + 1,
        active_projects = active_projects + CASE
          WHEN NEW.stage IN ('Development', 'Feasibility', 'Production') THEN 1
          ELSE 0
        END
    WHERE company_id = NEW.company_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE companies
    SET project_count = GREATEST(project_count - 1, 0),
        active_projects = GREATEST(active_projects - CASE
          WHEN OLD.stage IN ('Development', 'Feasibility', 'Production') THEN 1
          ELSE 0
        END, 0)
    WHERE company_id = OLD.company_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.company_id IS DISTINCT FROM NEW.company_id THEN
    -- Handle company change
    IF OLD.company_id IS NOT NULL THEN
      UPDATE companies
      SET project_count = GREATEST(project_count - 1, 0),
          active_projects = GREATEST(active_projects - CASE
            WHEN OLD.stage IN ('Development', 'Feasibility', 'Production') THEN 1
            ELSE 0
          END, 0)
      WHERE company_id = OLD.company_id;
    END IF;
    IF NEW.company_id IS NOT NULL THEN
      UPDATE companies
      SET project_count = project_count + 1,
          active_projects = active_projects + CASE
            WHEN NEW.stage IN ('Development', 'Feasibility', 'Production') THEN 1
            ELSE 0
          END
      WHERE company_id = NEW.company_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create triggers if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_projects_updated_at') THEN
    CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_companies_updated_at') THEN
    CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_projects_search_vector') THEN
    CREATE TRIGGER update_projects_search_vector
    BEFORE INSERT OR UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_search_vector();
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_company_project_count_trigger') THEN
    CREATE TRIGGER update_company_project_count_trigger
    AFTER INSERT OR DELETE OR UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_company_project_count();
  END IF;
END
$$;

-- 7. Grant necessary permissions
GRANT ALL ON public.companies TO authenticated;
GRANT ALL ON public.projects TO authenticated;
GRANT ALL ON public.edgar_technical_documents TO authenticated;

-- 8. Enable Row Level Security (optional but recommended)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Enable all access for authenticated users" ON companies
  FOR ALL USING (true);

CREATE POLICY "Enable all access for authenticated users" ON projects
  FOR ALL USING (true);

-- 9. Create view for easy project querying
CREATE OR REPLACE VIEW project_summary AS
SELECT
  p.*,
  c.website,
  c.stock_ticker,
  c.exchange,
  c.market_cap,
  c.headquarters_location,
  c.headquarters_country as company_country
FROM projects p
LEFT JOIN companies c ON p.company_id = c.company_id;

-- 10. Add helper functions
CREATE OR REPLACE FUNCTION get_project_metrics(project_id uuid)
RETURNS TABLE (
  npv_discount_rate numeric,
  estimated_value numeric,
  risk_adjusted_value numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    8.0 as npv_discount_rate, -- Standard discount rate
    COALESCE(p.post_tax_npv_usd_m, p.pre_tax_npv_usd_m * 0.75) as estimated_value,
    CASE
      WHEN p.jurisdiction_risk = 'Very Low' THEN COALESCE(p.post_tax_npv_usd_m, 0) * 0.95
      WHEN p.jurisdiction_risk = 'Low' THEN COALESCE(p.post_tax_npv_usd_m, 0) * 0.90
      WHEN p.jurisdiction_risk = 'Medium' THEN COALESCE(p.post_tax_npv_usd_m, 0) * 0.80
      WHEN p.jurisdiction_risk = 'High' THEN COALESCE(p.post_tax_npv_usd_m, 0) * 0.65
      WHEN p.jurisdiction_risk = 'Very High' THEN COALESCE(p.post_tax_npv_usd_m, 0) * 0.50
      ELSE COALESCE(p.post_tax_npv_usd_m, 0) * 0.75
    END as risk_adjusted_value
  FROM projects p
  WHERE p.id = project_id;
END;
$$ LANGUAGE plpgsql;

-- 11. Create materialized view for performance (optional)
CREATE MATERIALIZED VIEW IF NOT EXISTS project_statistics AS
SELECT
  primary_commodity,
  COUNT(*) as project_count,
  AVG(post_tax_npv_usd_m) as avg_npv,
  AVG(irr_percent) as avg_irr,
  AVG(capex_usd_m) as avg_capex,
  AVG(mine_life_years) as avg_mine_life
FROM projects
WHERE post_tax_npv_usd_m IS NOT NULL
GROUP BY primary_commodity;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_project_statistics_commodity
ON project_statistics(primary_commodity);

-- 12. Final verification
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Tables created/updated: edgar_technical_documents, companies, projects';
  RAISE NOTICE 'You can now run the document processor to populate data.';
END
$$;