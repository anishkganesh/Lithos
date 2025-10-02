-- Create unified news table for all news sources (Firecrawl, QuoteMedia, etc.)
CREATE TABLE IF NOT EXISTS unified_news (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Core fields
    headline TEXT NOT NULL,
    summary TEXT,
    content_snippet TEXT, -- Brief content preview
    url TEXT UNIQUE NOT NULL, -- Link to full article
    published_date TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Source information
    source_name TEXT NOT NULL, -- e.g., 'Mining.com', 'Kitco', 'SEDAR+'
    source_type TEXT NOT NULL, -- 'news', 'regulatory', 'company_announcement'
    source_domain TEXT, -- Domain extracted from URL
    scraper_source TEXT NOT NULL, -- 'firecrawl', 'quotemedia', 'manual'
    
    -- Company and symbol mapping
    symbol TEXT, -- Stock symbol if applicable
    company_name TEXT,
    exchange TEXT, -- NYSE, TSX, ASX, LSE, etc.
    
    -- Topics and categorization
    topics TEXT[], -- Array of topics/tags
    primary_commodity TEXT, -- Main commodity (gold, lithium, copper, etc.)
    commodities TEXT[], -- All mentioned commodities
    news_category TEXT, -- 'exploration', 'production', 'financial', 'regulatory', 'market', 'technical'
    
    -- Geographic information
    countries TEXT[], -- Countries mentioned
    regions TEXT[], -- Regions/provinces/states
    project_names TEXT[], -- Specific project names mentioned
    
    -- Mining-specific flags and metrics
    is_mining_related BOOLEAN DEFAULT true,
    is_project_related BOOLEAN DEFAULT false,
    is_exploration_news BOOLEAN DEFAULT false,
    is_production_news BOOLEAN DEFAULT false,
    mentions_financials BOOLEAN DEFAULT false,
    mentions_technical_report BOOLEAN DEFAULT false,
    mentions_resource_estimate BOOLEAN DEFAULT false,
    mentions_feasibility_study BOOLEAN DEFAULT false,
    mentions_environmental BOOLEAN DEFAULT false,
    mentions_permits BOOLEAN DEFAULT false,
    mentions_acquisition BOOLEAN DEFAULT false,
    
    -- Sentiment and relevance
    sentiment_score NUMERIC(3,2), -- -1.00 to 1.00
    relevance_score INTEGER, -- 1-10 scale
    importance_level TEXT, -- 'critical', 'high', 'medium', 'low'
    
    -- AI extraction metadata
    ai_processed BOOLEAN DEFAULT false,
    ai_extraction_confidence NUMERIC(3,2), -- Confidence score of AI extraction
    ai_model_version TEXT, -- Track which AI model was used
    extraction_errors TEXT[], -- Any errors during extraction
    
    -- Processing and status
    is_processed BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false, -- For highlighting important news
    processing_status TEXT DEFAULT 'pending',
    processing_notes TEXT,
    
    -- User interaction tracking
    view_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_checked_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB, -- Store any additional unstructured data
    
    -- Deduplication
    content_hash TEXT, -- Hash of headline+summary for deduplication
    
    -- Constraints
    CONSTRAINT url_unique UNIQUE (url),
    CONSTRAINT valid_sentiment CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
    CONSTRAINT valid_relevance CHECK (relevance_score >= 1 AND relevance_score <= 10),
    CONSTRAINT valid_source_type CHECK (source_type IN ('news', 'regulatory', 'company_announcement', 'research', 'market_data')),
    CONSTRAINT valid_importance CHECK (importance_level IN ('critical', 'high', 'medium', 'low'))
);

-- Create comprehensive indexes for performance
CREATE INDEX IF NOT EXISTS idx_unified_news_published ON unified_news(published_date DESC);
CREATE INDEX IF NOT EXISTS idx_unified_news_symbol ON unified_news(symbol) WHERE symbol IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_unified_news_company ON unified_news(company_name) WHERE company_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_unified_news_source ON unified_news(source_name);
CREATE INDEX IF NOT EXISTS idx_unified_news_category ON unified_news(news_category);
CREATE INDEX IF NOT EXISTS idx_unified_news_commodity ON unified_news(primary_commodity) WHERE primary_commodity IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_unified_news_mining ON unified_news(is_mining_related) WHERE is_mining_related = true;
CREATE INDEX IF NOT EXISTS idx_unified_news_featured ON unified_news(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_unified_news_topics ON unified_news USING GIN(topics);
CREATE INDEX IF NOT EXISTS idx_unified_news_commodities ON unified_news USING GIN(commodities);
CREATE INDEX IF NOT EXISTS idx_unified_news_countries ON unified_news USING GIN(countries);
CREATE INDEX IF NOT EXISTS idx_unified_news_projects ON unified_news USING GIN(project_names);
CREATE INDEX IF NOT EXISTS idx_unified_news_created ON unified_news(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_unified_news_importance ON unified_news(importance_level, published_date DESC);
CREATE INDEX IF NOT EXISTS idx_unified_news_sentiment ON unified_news(sentiment_score) WHERE sentiment_score IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_unified_news_relevance ON unified_news(relevance_score DESC) WHERE relevance_score IS NOT NULL;

-- Full text search index
CREATE INDEX IF NOT EXISTS idx_unified_news_fulltext ON unified_news 
USING GIN(to_tsvector('english', coalesce(headline, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(company_name, '')));

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_unified_news_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_unified_news_updated_at
    BEFORE UPDATE ON unified_news
    FOR EACH ROW
    EXECUTE FUNCTION update_unified_news_updated_at();

-- Create function to calculate content hash for deduplication
CREATE OR REPLACE FUNCTION calculate_content_hash()
RETURNS TRIGGER AS $$
BEGIN
    NEW.content_hash = md5(coalesce(NEW.headline, '') || coalesce(NEW.summary, ''));
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER calculate_unified_news_hash
    BEFORE INSERT OR UPDATE ON unified_news
    FOR EACH ROW
    EXECUTE FUNCTION calculate_content_hash();

-- Add comments for documentation
COMMENT ON TABLE unified_news IS 'Unified news table aggregating content from all sources (Firecrawl, QuoteMedia, etc.)';
COMMENT ON COLUMN unified_news.url IS 'Direct link to the original article - clicking headline redirects here';
COMMENT ON COLUMN unified_news.source_name IS 'Human-readable source name (e.g., Mining.com, Kitco, SEDAR+)';
COMMENT ON COLUMN unified_news.scraper_source IS 'Technical source of the data (firecrawl, quotemedia, manual)';
COMMENT ON COLUMN unified_news.sentiment_score IS 'Sentiment score from -1 (negative) to 1 (positive)';
COMMENT ON COLUMN unified_news.relevance_score IS 'Relevance to mining industry from 1 (low) to 10 (high)';
COMMENT ON COLUMN unified_news.ai_extraction_confidence IS 'Confidence score of AI data extraction (0-1)';
COMMENT ON COLUMN unified_news.content_hash IS 'MD5 hash of headline+summary for deduplication';

-- Create view for easy access to recent important news
CREATE OR REPLACE VIEW recent_important_news AS
SELECT 
    id,
    headline,
    summary,
    url,
    published_date,
    source_name,
    company_name,
    symbol,
    primary_commodity,
    sentiment_score,
    relevance_score,
    importance_level
FROM unified_news
WHERE 
    published_date >= NOW() - INTERVAL '7 days'
    AND importance_level IN ('critical', 'high')
    AND is_archived = false
ORDER BY 
    published_date DESC,
    relevance_score DESC;

-- Create view for commodity-specific news
CREATE OR REPLACE VIEW commodity_news AS
SELECT 
    primary_commodity,
    COUNT(*) as news_count,
    AVG(sentiment_score) as avg_sentiment,
    MAX(published_date) as latest_news_date,
    array_agg(DISTINCT source_name) as sources
FROM unified_news
WHERE 
    primary_commodity IS NOT NULL
    AND published_date >= NOW() - INTERVAL '30 days'
GROUP BY primary_commodity;

-- Grant appropriate permissions (adjust based on your needs)
GRANT SELECT ON unified_news TO authenticated;
GRANT INSERT, UPDATE ON unified_news TO service_role;
GRANT SELECT ON recent_important_news TO authenticated;
GRANT SELECT ON commodity_news TO authenticated;

