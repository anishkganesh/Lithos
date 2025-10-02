-- Simplified script to create unified news table
-- Run this directly in Supabase SQL Editor

-- Drop existing table if needed (uncomment if you want to reset)
-- DROP TABLE IF EXISTS unified_news CASCADE;

-- Create unified news table
CREATE TABLE IF NOT EXISTS unified_news (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Core fields
    headline TEXT NOT NULL,
    summary TEXT,
    content_snippet TEXT,
    url TEXT UNIQUE NOT NULL,
    published_date TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Source information
    source_name TEXT NOT NULL,
    source_type TEXT NOT NULL DEFAULT 'news',
    source_domain TEXT,
    scraper_source TEXT NOT NULL DEFAULT 'firecrawl',
    
    -- Company and symbol mapping
    symbol TEXT,
    company_name TEXT,
    exchange TEXT,
    
    -- Topics and categorization
    topics TEXT[] DEFAULT '{}',
    primary_commodity TEXT,
    commodities TEXT[] DEFAULT '{}',
    news_category TEXT,
    
    -- Geographic information
    countries TEXT[] DEFAULT '{}',
    regions TEXT[] DEFAULT '{}',
    project_names TEXT[] DEFAULT '{}',
    
    -- Mining-specific flags
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
    sentiment_score NUMERIC(3,2),
    relevance_score INTEGER,
    importance_level TEXT DEFAULT 'medium',
    
    -- AI extraction metadata
    ai_processed BOOLEAN DEFAULT false,
    ai_extraction_confidence NUMERIC(3,2),
    ai_model_version TEXT,
    extraction_errors TEXT[] DEFAULT '{}',
    
    -- Processing and status
    is_processed BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
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
    metadata JSONB,
    
    -- Deduplication
    content_hash TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_unified_news_published ON unified_news(published_date DESC);
CREATE INDEX IF NOT EXISTS idx_unified_news_symbol ON unified_news(symbol) WHERE symbol IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_unified_news_company ON unified_news(company_name) WHERE company_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_unified_news_source ON unified_news(source_name);
CREATE INDEX IF NOT EXISTS idx_unified_news_category ON unified_news(news_category);
CREATE INDEX IF NOT EXISTS idx_unified_news_commodity ON unified_news(primary_commodity) WHERE primary_commodity IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_unified_news_mining ON unified_news(is_mining_related) WHERE is_mining_related = true;
CREATE INDEX IF NOT EXISTS idx_unified_news_featured ON unified_news(is_featured) WHERE is_featured = true;

-- Enable Row Level Security
ALTER TABLE unified_news ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to read
CREATE POLICY "Allow authenticated users to read news" ON unified_news
    FOR SELECT
    TO authenticated
    USING (true);

-- Create policy for service role to manage
CREATE POLICY "Allow service role to manage news" ON unified_news
    FOR ALL
    TO service_role
    USING (true);

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Table unified_news created successfully!';
END $$;