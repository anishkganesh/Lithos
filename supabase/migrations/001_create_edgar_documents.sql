-- Create table for storing EDGAR technical documentation links
CREATE TABLE IF NOT EXISTS edgar_technical_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Filing Information
  cik TEXT NOT NULL,
  company_name TEXT NOT NULL,
  ticker TEXT,
  filing_date DATE NOT NULL,
  accession_number TEXT NOT NULL UNIQUE,
  form_type TEXT NOT NULL,

  -- Document Information
  document_url TEXT NOT NULL,
  document_title TEXT,
  exhibit_number TEXT,
  file_size_bytes BIGINT,

  -- Mining-specific metadata
  sic_code TEXT,
  primary_commodity TEXT,
  commodities TEXT[], -- Array of all commodities mentioned
  project_names TEXT[], -- Extracted project names from the document

  -- Processing status
  is_processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  extraction_errors TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_edgar_docs_cik ON edgar_technical_documents(cik);
CREATE INDEX idx_edgar_docs_ticker ON edgar_technical_documents(ticker);
CREATE INDEX idx_edgar_docs_filing_date ON edgar_technical_documents(filing_date DESC);
CREATE INDEX idx_edgar_docs_commodity ON edgar_technical_documents(primary_commodity);
CREATE INDEX idx_edgar_docs_processed ON edgar_technical_documents(is_processed);
CREATE INDEX idx_edgar_docs_accession ON edgar_technical_documents(accession_number);

-- Create GIN index for array columns
CREATE INDEX idx_edgar_docs_commodities ON edgar_technical_documents USING GIN(commodities);
CREATE INDEX idx_edgar_docs_projects ON edgar_technical_documents USING GIN(project_names);

-- Create table for tracking scraper runs
CREATE TABLE IF NOT EXISTS edgar_scraper_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type TEXT NOT NULL, -- 'initial', 'incremental', 'backfill'
  status TEXT NOT NULL DEFAULT 'running', -- 'running', 'completed', 'failed'

  -- Search parameters used
  search_query TEXT,
  sic_codes TEXT[],
  commodities TEXT[],
  date_from DATE,
  date_to DATE,

  -- Statistics
  total_filings_found INTEGER DEFAULT 0,
  filings_processed INTEGER DEFAULT 0,
  documents_extracted INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,

  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Error tracking
  error_details JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for run status
CREATE INDEX idx_scraper_runs_status ON edgar_scraper_runs(status, started_at DESC);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update the updated_at column
CREATE TRIGGER update_edgar_documents_updated_at
  BEFORE UPDATE ON edgar_technical_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();