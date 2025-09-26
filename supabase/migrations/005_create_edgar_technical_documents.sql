-- Create edgar_technical_documents table for storing technical reports from EDGAR and SEDAR
CREATE TABLE IF NOT EXISTS edgar_technical_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Filing identifiers
  filing_id TEXT UNIQUE NOT NULL,
  accession_number TEXT,

  -- Company information
  symbol TEXT NOT NULL,
  company_name TEXT NOT NULL,
  cik TEXT, -- US companies
  issuer_number TEXT, -- Canadian companies
  cusip TEXT,
  isin TEXT,

  -- Document metadata
  form_type TEXT NOT NULL,
  form_description TEXT,
  form_group TEXT,
  country TEXT CHECK (country IN ('US', 'CA')),

  -- Filing dates
  date_filed DATE NOT NULL,
  period_date DATE,

  -- Document links (QuoteMedia URLs)
  html_link TEXT,
  pdf_link TEXT,
  doc_link TEXT,
  xls_link TEXT,
  xbrl_link TEXT,

  -- Document properties
  file_size TEXT,
  page_count INTEGER,

  -- Technical report classification
  is_technical_report BOOLEAN DEFAULT false,
  report_type TEXT, -- 'NI 43-101', 'Technical Report Summary', etc.

  -- Mining project association
  project_name TEXT,
  project_location TEXT,
  commodity_types TEXT[], -- Array of commodities mentioned

  -- Document content (extracted text for searching)
  content_summary TEXT,
  full_content TEXT, -- May be null for large documents

  -- Processing status
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
  processed_at TIMESTAMPTZ,
  processing_error TEXT,

  -- PDF storage
  pdf_stored BOOLEAN DEFAULT false,
  pdf_storage_path TEXT,
  pdf_hash TEXT, -- For deduplication

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Additional metadata as JSONB
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for performance
CREATE INDEX idx_edgar_tech_docs_symbol ON edgar_technical_documents(symbol);
CREATE INDEX idx_edgar_tech_docs_company ON edgar_technical_documents(company_name);
CREATE INDEX idx_edgar_tech_docs_date_filed ON edgar_technical_documents(date_filed DESC);
CREATE INDEX idx_edgar_tech_docs_country ON edgar_technical_documents(country);
CREATE INDEX idx_edgar_tech_docs_form_type ON edgar_technical_documents(form_type);
CREATE INDEX idx_edgar_tech_docs_is_technical ON edgar_technical_documents(is_technical_report) WHERE is_technical_report = true;
CREATE INDEX idx_edgar_tech_docs_processing ON edgar_technical_documents(processing_status);
CREATE INDEX idx_edgar_tech_docs_cik ON edgar_technical_documents(cik) WHERE cik IS NOT NULL;
CREATE INDEX idx_edgar_tech_docs_issuer ON edgar_technical_documents(issuer_number) WHERE issuer_number IS NOT NULL;

-- GIN index for commodity search
CREATE INDEX idx_edgar_tech_docs_commodities ON edgar_technical_documents USING GIN(commodity_types);

-- Full text search index
CREATE INDEX idx_edgar_tech_docs_content ON edgar_technical_documents USING GIN(to_tsvector('english', COALESCE(content_summary, '') || ' ' || COALESCE(project_name, '')));

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_edgar_tech_docs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_edgar_tech_docs_updated_at
  BEFORE UPDATE ON edgar_technical_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_edgar_tech_docs_updated_at();

-- Add comments for documentation
COMMENT ON TABLE edgar_technical_documents IS 'Stores technical documentation from SEC EDGAR and SEDAR, with focus on NI 43-101 and similar mining technical reports';
COMMENT ON COLUMN edgar_technical_documents.filing_id IS 'Unique filing ID from QuoteMedia';
COMMENT ON COLUMN edgar_technical_documents.accession_number IS 'SEC accession number or SEDAR equivalent';
COMMENT ON COLUMN edgar_technical_documents.is_technical_report IS 'Whether this document is identified as a technical report (NI 43-101, etc.)';
COMMENT ON COLUMN edgar_technical_documents.report_type IS 'Specific type of technical report';
COMMENT ON COLUMN edgar_technical_documents.commodity_types IS 'Array of commodities mentioned in the document';
COMMENT ON COLUMN edgar_technical_documents.pdf_hash IS 'SHA-256 hash of PDF for deduplication';