-- ============================================================================
-- NEWS WATCHLIST MIGRATION SCRIPT
-- ============================================================================
-- This migration creates the news_watchlist table and related functionality
-- to allow users to bookmark/watchlist news articles
-- ============================================================================

-- Drop existing objects if they exist (for clean re-run)
DROP VIEW IF EXISTS watchlisted_news_details CASCADE;
DROP TABLE IF EXISTS news_watchlist CASCADE;

-- ============================================================================
-- 1. CREATE NEWS_WATCHLIST TABLE
-- ============================================================================
CREATE TABLE news_watchlist (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  news_id UUID NOT NULL,  -- Changed from INTEGER to UUID to match unified_news.id
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key constraint to unified_news table
  CONSTRAINT fk_news_watchlist_news 
    FOREIGN KEY (news_id) 
    REFERENCES unified_news(id) 
    ON DELETE CASCADE,
  
  -- Ensure a user can only watchlist a news item once
  CONSTRAINT unique_user_news_watchlist 
    UNIQUE (user_id, news_id)
);

-- Add comment to table
COMMENT ON TABLE news_watchlist IS 'Stores user watchlisted/bookmarked news articles';
COMMENT ON COLUMN news_watchlist.user_id IS 'ID of the user who watchlisted the news';
COMMENT ON COLUMN news_watchlist.news_id IS 'ID of the news article that was watchlisted';
COMMENT ON COLUMN news_watchlist.created_at IS 'Timestamp when the news was watchlisted';

-- ============================================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX idx_news_watchlist_user_id 
  ON news_watchlist(user_id);

CREATE INDEX idx_news_watchlist_news_id 
  ON news_watchlist(news_id);

CREATE INDEX idx_news_watchlist_created_at 
  ON news_watchlist(created_at DESC);

CREATE INDEX idx_news_watchlist_user_news 
  ON news_watchlist(user_id, news_id);

-- ============================================================================
-- 3. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE news_watchlist ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. CREATE RLS POLICIES
-- ============================================================================

-- Policy: Users can view their own watchlisted news
CREATE POLICY "Users can view own watchlisted news" 
  ON news_watchlist
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can add news to their watchlist
CREATE POLICY "Users can add news to watchlist" 
  ON news_watchlist
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can remove news from their watchlist
CREATE POLICY "Users can remove news from watchlist" 
  ON news_watchlist
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policy: Users can update their own watchlist entries
CREATE POLICY "Users can update own watchlist entries" 
  ON news_watchlist
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 5. CREATE VIEW FOR EASIER QUERYING
-- ============================================================================
CREATE VIEW watchlisted_news_details AS
SELECT 
  nw.user_id,
  nw.created_at as watchlisted_at,
  nw.id as watchlist_id,
  un.id as news_id,
  un.headline,
  un.summary,
  un.source_name,
  un.published_date,
  un.url,
  un.primary_commodity,
  un.commodities,
  un.countries,
  un.regions,
  un.company_name,
  un.project_names as projects,
  un.is_exploration_news,
  un.is_production_news,
  un.sentiment_score,
  un.relevance_score,
  un.created_at as news_created_at,
  un.updated_at as news_updated_at
FROM news_watchlist nw
JOIN unified_news un ON nw.news_id = un.id
ORDER BY nw.created_at DESC;

-- Add comment to view
COMMENT ON VIEW watchlisted_news_details IS 'Detailed view of watchlisted news articles with full news information';

-- ============================================================================
-- 6. CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to toggle watchlist status (add if not exists, remove if exists)
CREATE OR REPLACE FUNCTION toggle_news_watchlist(
  p_user_id UUID,
  p_news_id UUID  -- Changed from INTEGER to UUID
) RETURNS JSONB AS $$
DECLARE
  v_exists BOOLEAN;
  v_result JSONB;
BEGIN
  -- Check if already watchlisted
  SELECT EXISTS(
    SELECT 1 FROM news_watchlist 
    WHERE user_id = p_user_id AND news_id = p_news_id
  ) INTO v_exists;
  
  IF v_exists THEN
    -- Remove from watchlist
    DELETE FROM news_watchlist 
    WHERE user_id = p_user_id AND news_id = p_news_id;
    
    v_result := jsonb_build_object(
      'action', 'removed',
      'watchlisted', false,
      'news_id', p_news_id
    );
  ELSE
    -- Add to watchlist
    INSERT INTO news_watchlist (user_id, news_id)
    VALUES (p_user_id, p_news_id)
    ON CONFLICT (user_id, news_id) DO NOTHING;
    
    v_result := jsonb_build_object(
      'action', 'added',
      'watchlisted', true,
      'news_id', p_news_id
    );
  END IF;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's watchlist status for multiple news items
CREATE OR REPLACE FUNCTION get_news_watchlist_status(
  p_user_id UUID,
  p_news_ids UUID[]  -- Changed from INTEGER[] to UUID[]
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_object_agg(
    news_id::text,
    true
  ) INTO v_result
  FROM news_watchlist
  WHERE user_id = p_user_id 
    AND news_id = ANY(p_news_ids);
  
  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get watchlist count for a user
CREATE OR REPLACE FUNCTION get_user_watchlist_count(
  p_user_id UUID
) RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM news_watchlist
    WHERE user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get watchlisted news IDs for a user
CREATE OR REPLACE FUNCTION get_user_watchlisted_news_ids(
  p_user_id UUID
) RETURNS UUID[] AS $$
BEGIN
  RETURN ARRAY(
    SELECT news_id
    FROM news_watchlist
    WHERE user_id = p_user_id
    ORDER BY created_at DESC
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, DELETE, UPDATE ON news_watchlist TO authenticated;
GRANT SELECT ON watchlisted_news_details TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE news_watchlist_id_seq TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION toggle_news_watchlist(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_news_watchlist_status(UUID, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_watchlist_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_watchlisted_news_ids(UUID) TO authenticated;

-- Grant permissions to anon users (read-only)
GRANT SELECT ON watchlisted_news_details TO anon;

-- ============================================================================
-- 8. CREATE TRIGGERS (OPTIONAL)
-- ============================================================================

-- Trigger to update user's last activity when they watchlist news
CREATE OR REPLACE FUNCTION update_user_last_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Update a hypothetical user_activity table if it exists
  -- This is optional and depends on your user tracking needs
  -- UPDATE user_activity 
  -- SET last_activity = CURRENT_TIMESTAMP
  -- WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_activity
  AFTER INSERT OR DELETE ON news_watchlist
  FOR EACH ROW
  EXECUTE FUNCTION update_user_last_activity();

-- ============================================================================
-- 9. ADD WATCHLIST SUPPORT TO UNIFIED_NEWS (OPTIONAL)
-- ============================================================================
-- This adds a computed column to check if news is watchlisted by current user
-- Note: This requires a function that gets the current user ID

-- Function to check if a news item is watchlisted by current user
CREATE OR REPLACE FUNCTION is_news_watchlisted(p_news_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 
    FROM news_watchlist 
    WHERE news_id = p_news_id 
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION is_news_watchlisted(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_news_watchlisted(UUID) TO anon;

-- ============================================================================
-- 10. SAMPLE DATA (OPTIONAL - FOR TESTING)
-- ============================================================================
-- Uncomment to add sample watchlist entries for testing
-- INSERT INTO news_watchlist (user_id, news_id)
-- SELECT 
--   auth.uid(),
--   id
-- FROM unified_news
-- LIMIT 5
-- ON CONFLICT DO NOTHING;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================