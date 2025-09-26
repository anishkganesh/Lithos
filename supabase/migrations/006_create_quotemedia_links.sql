-- Create quotemedia_links table for storing verified technical document links
CREATE TABLE IF NOT EXISTS quotemedia_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Company identifiers
  symbol TEXT NOT NULL,
  company_name TEXT NOT NULL,
  cik TEXT, -- US companies (SEC CIK)
  issuer_number TEXT, -- Canadian companies (SEDAR)
  sic_code TEXT, -- Standard Industrial Classification

  -- Document identifiers
  filing_id TEXT UNIQUE NOT NULL,
  accession_number TEXT,
  form_type TEXT NOT NULL,
  form_description TEXT,

  -- Document metadata
  filing_date DATE NOT NULL,
  period_date DATE,
  file_size TEXT,
  page_count INTEGER,

  -- Document links (QuoteMedia URLs)
  pdf_link TEXT NOT NULL,
  html_link TEXT,
  excel_link TEXT,
  xbrl_link TEXT,

  -- Commodity and project information
  primary_commodity TEXT,
  commodities TEXT[], -- Array of all commodities mentioned
  project_names TEXT[], -- Extracted project names

  -- Financial metrics validation
  has_capex BOOLEAN DEFAULT false,
  has_npv BOOLEAN DEFAULT false,
  has_irr BOOLEAN DEFAULT false,
  has_mine_life BOOLEAN DEFAULT false,
  has_production_rate BOOLEAN DEFAULT false,
  has_resource_data BOOLEAN DEFAULT false,
  has_opex BOOLEAN DEFAULT false,
  has_aisc BOOLEAN DEFAULT false,

  -- Validation scores
  financial_metrics_count INTEGER DEFAULT 0, -- Count of financial metrics found
  document_quality_score INTEGER, -- 0-100 quality score
  validation_confidence INTEGER, -- 0-100 confidence score

  -- Document classification
  is_technical_report BOOLEAN DEFAULT false,
  report_type TEXT, -- 'NI 43-101', 'S-K 1300', 'PEA', 'Feasibility Study', etc.
  project_stage TEXT, -- 'exploration', 'pea', 'feasibility', 'production', etc.

  -- Source information
  source TEXT DEFAULT 'quotemedia', -- 'quotemedia', 'edgar_direct', 'sedar_direct'
  exchange TEXT, -- 'NYSE', 'NASDAQ', 'TSX', etc.
  country TEXT, -- 'US', 'CA'

  -- Processing status
  is_downloaded BOOLEAN DEFAULT false,
  is_parsed BOOLEAN DEFAULT false,
  is_validated BOOLEAN DEFAULT false,
  processing_status TEXT DEFAULT 'pending',
  processing_notes TEXT,

  -- Extracted financial values (optional - for validated documents)
  capex_value NUMERIC,
  npv_value NUMERIC,
  irr_value NUMERIC,
  mine_life_value NUMERIC,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  validated_at TIMESTAMPTZ,

  -- Metadata JSONB for additional data
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for performance
CREATE INDEX idx_quotemedia_links_symbol ON quotemedia_links(symbol);
CREATE INDEX idx_quotemedia_links_company ON quotemedia_links(company_name);
CREATE INDEX idx_quotemedia_links_commodity ON quotemedia_links(primary_commodity);
CREATE INDEX idx_quotemedia_links_filing_date ON quotemedia_links(filing_date DESC);
CREATE INDEX idx_quotemedia_links_form_type ON quotemedia_links(form_type);
CREATE INDEX idx_quotemedia_links_technical ON quotemedia_links(is_technical_report) WHERE is_technical_report = true;
CREATE INDEX idx_quotemedia_links_quality ON quotemedia_links(document_quality_score DESC);
CREATE INDEX idx_quotemedia_links_confidence ON quotemedia_links(validation_confidence DESC);
CREATE INDEX idx_quotemedia_links_metrics ON quotemedia_links(financial_metrics_count DESC);
CREATE INDEX idx_quotemedia_links_status ON quotemedia_links(processing_status);

-- GIN indexes for array searches
CREATE INDEX idx_quotemedia_links_commodities_gin ON quotemedia_links USING GIN(commodities);
CREATE INDEX idx_quotemedia_links_projects_gin ON quotemedia_links USING GIN(project_names);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_quotemedia_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_quotemedia_links_updated_at
  BEFORE UPDATE ON quotemedia_links
  FOR EACH ROW
  EXECUTE FUNCTION update_quotemedia_links_updated_at();

-- Add comments for documentation
COMMENT ON TABLE quotemedia_links IS 'Stores validated technical document links from QuoteMedia with financial metrics verification';
COMMENT ON COLUMN quotemedia_links.filing_id IS 'Unique filing ID from QuoteMedia';
COMMENT ON COLUMN quotemedia_links.financial_metrics_count IS 'Number of key financial metrics found in document';
COMMENT ON COLUMN quotemedia_links.document_quality_score IS 'Overall document quality score (0-100) based on size, type, and content';
COMMENT ON COLUMN quotemedia_links.validation_confidence IS 'Confidence score (0-100) that document contains required project data';
COMMENT ON COLUMN quotemedia_links.is_technical_report IS 'True if document is identified as a technical report with project economics';
COMMENT ON COLUMN quotemedia_links.project_stage IS 'Development stage: exploration, pea, prefeasibility, feasibility, construction, production';