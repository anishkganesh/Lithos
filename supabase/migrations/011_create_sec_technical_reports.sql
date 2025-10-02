-- Create SEC Technical Reports table for Exhibit 96.1 documents
CREATE TABLE IF NOT EXISTS public.sec_technical_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- SEC Filing Information
  cik VARCHAR(20) NOT NULL,
  company_name TEXT NOT NULL,
  form_type VARCHAR(20) NOT NULL, -- 8-K, 10-K, 10-Q, etc.
  filing_date DATE NOT NULL,
  accession_number VARCHAR(30) UNIQUE NOT NULL,
  
  -- Document Information
  document_url TEXT NOT NULL,
  exhibit_number VARCHAR(20), -- "96.1", "96.2", etc.
  document_description TEXT,
  file_size BIGINT,
  
  -- Project Information (extracted from filing)
  project_name TEXT,
  project_location TEXT,
  commodities TEXT[], -- Array of commodities mentioned
  primary_commodity TEXT,
  
  -- Mining-specific metadata
  sic_code VARCHAR(10),
  sic_description TEXT,
  is_mining_related BOOLEAN DEFAULT true,
  
  -- Processing status
  status VARCHAR(50) DEFAULT 'pending_parse', -- pending_parse, parsing, parsed, failed, no_content
  parse_attempts INTEGER DEFAULT 0,
  last_parse_attempt TIMESTAMPTZ,
  parsed_at TIMESTAMPTZ,
  parse_error TEXT,
  
  -- Extracted data (to be populated later)
  extracted_data JSONB, -- Store raw extracted data for future processing
  resource_estimate JSONB, -- Specific resource/reserve data
  technical_summary JSONB, -- Key technical parameters
  
  -- Link to existing projects
  linked_project_id UUID REFERENCES public.projects(project_id),
  confidence_score NUMERIC(3,2), -- Confidence in the project link (0-1)
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_checked TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_sec_reports_cik ON public.sec_technical_reports(cik);
CREATE INDEX idx_sec_reports_filing_date ON public.sec_technical_reports(filing_date DESC);
CREATE INDEX idx_sec_reports_company ON public.sec_technical_reports(company_name);
CREATE INDEX idx_sec_reports_status ON public.sec_technical_reports(status);
CREATE INDEX idx_sec_reports_commodities ON public.sec_technical_reports USING GIN(commodities);
CREATE INDEX idx_sec_reports_primary_commodity ON public.sec_technical_reports(primary_commodity);
CREATE INDEX idx_sec_reports_linked_project ON public.sec_technical_reports(linked_project_id);
CREATE INDEX idx_sec_reports_accession ON public.sec_technical_reports(accession_number);

-- Create a tracking table for import runs
CREATE TABLE IF NOT EXISTS public.sec_import_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  run_type VARCHAR(50) NOT NULL, -- 'bulk', 'refresh', 'manual'
  status VARCHAR(50) NOT NULL, -- 'running', 'completed', 'failed'
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Statistics
  total_filings_checked INTEGER DEFAULT 0,
  new_documents_found INTEGER DEFAULT 0,
  documents_imported INTEGER DEFAULT 0,
  documents_failed INTEGER DEFAULT 0,
  
  -- Date range processed
  date_from DATE,
  date_to DATE,
  
  -- Error tracking
  error_message TEXT,
  error_details JSONB,
  
  -- Metadata
  triggered_by VARCHAR(100), -- 'system', 'user:email', 'api'
  notes TEXT
);

-- Create index for efficient querying
CREATE INDEX idx_import_runs_status ON public.sec_import_runs(status);
CREATE INDEX idx_import_runs_started ON public.sec_import_runs(started_at DESC);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_sec_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update the updated_at column
CREATE TRIGGER update_sec_reports_updated_at_trigger
BEFORE UPDATE ON public.sec_technical_reports
FOR EACH ROW
EXECUTE FUNCTION update_sec_reports_updated_at();

-- Function to get the latest import run
CREATE OR REPLACE FUNCTION get_latest_sec_import_date()
RETURNS DATE AS $$
BEGIN
  RETURN COALESCE(
    (SELECT MAX(filing_date) FROM public.sec_technical_reports),
    '2020-01-01'::DATE
  );
END;
$$ LANGUAGE plpgsql;

-- Function to link SEC reports to existing projects (to be enhanced later)
CREATE OR REPLACE FUNCTION link_sec_report_to_project(
  p_report_id UUID,
  p_project_name TEXT,
  p_company_name TEXT
)
RETURNS UUID AS $$
DECLARE
  v_project_id UUID;
  v_confidence NUMERIC(3,2);
BEGIN
  -- Try to find matching project by name and company
  -- This is a simple implementation, can be enhanced with fuzzy matching
  SELECT project_id INTO v_project_id
  FROM public.projects
  WHERE 
    LOWER(project_name) = LOWER(p_project_name)
    OR (
      p_company_name IS NOT NULL 
      AND LOWER(company_name) = LOWER(p_company_name)
    )
  LIMIT 1;
  
  IF v_project_id IS NOT NULL THEN
    -- Calculate confidence based on match quality
    v_confidence := CASE
      WHEN LOWER(project_name) = LOWER(p_project_name) THEN 0.95
      ELSE 0.70
    END;
    
    -- Update the SEC report with the link
    UPDATE public.sec_technical_reports
    SET 
      linked_project_id = v_project_id,
      confidence_score = v_confidence,
      updated_at = NOW()
    WHERE id = p_report_id;
  END IF;
  
  RETURN v_project_id;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL ON public.sec_technical_reports TO authenticated;
GRANT ALL ON public.sec_import_runs TO authenticated;
GRANT ALL ON public.sec_technical_reports TO anon;
GRANT ALL ON public.sec_import_runs TO anon;
