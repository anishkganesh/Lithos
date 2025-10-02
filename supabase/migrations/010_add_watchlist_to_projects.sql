-- ============================================================================
-- ADD WATCHLIST COLUMN TO PROJECTS TABLE
-- ============================================================================
-- This migration adds a watchlist boolean column to the projects table
-- to track whether a project is watchlisted by users
-- ============================================================================

-- First check if watchlist column already exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'projects' 
    AND column_name = 'watchlist'
  ) THEN
    -- Add watchlist column to projects table
    ALTER TABLE projects 
    ADD COLUMN watchlist BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Add watchlisted_at column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'projects' 
    AND column_name = 'watchlisted_at'
  ) THEN
    -- Add watchlisted_at column to track when project was watchlisted
    ALTER TABLE projects 
    ADD COLUMN watchlisted_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Add comments to the columns
COMMENT ON COLUMN projects.watchlist IS 'Indicates if the project is watchlisted/bookmarked';
COMMENT ON COLUMN projects.watchlisted_at IS 'Timestamp when the project was watchlisted';

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_projects_watchlist 
  ON projects(watchlist) 
  WHERE watchlist = TRUE;

-- Create an index on watchlisted_at for sorting
CREATE INDEX IF NOT EXISTS idx_projects_watchlisted_at 
  ON projects(watchlisted_at DESC NULLS LAST);

-- Update existing projects to have watchlist = false (if not already set)
UPDATE projects 
SET watchlist = FALSE 
WHERE watchlist IS NULL;

-- ============================================================================
-- Helper function to toggle project watchlist status (works with any ID type)
-- ============================================================================
CREATE OR REPLACE FUNCTION toggle_project_watchlist_by_id(
  p_project_id TEXT  -- Using TEXT to accept both UUID and INTEGER as string
) RETURNS JSONB AS $$
DECLARE
  v_current_status BOOLEAN;
  v_new_status BOOLEAN;
  v_result JSONB;
BEGIN
  -- Try to update using UUID first (if ID column is UUID)
  BEGIN
    -- Get current watchlist status
    EXECUTE 'SELECT watchlist FROM projects WHERE id::text = $1'
    INTO v_current_status
    USING p_project_id;
    
    -- Toggle the status
    v_new_status := NOT COALESCE(v_current_status, FALSE);
    
    -- Update the project
    EXECUTE '
      UPDATE projects 
      SET watchlist = $1,
          watchlisted_at = CASE WHEN $1 THEN CURRENT_TIMESTAMP ELSE NULL END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id::text = $2'
    USING v_new_status, p_project_id;
    
    v_result := jsonb_build_object(
      'success', true,
      'watchlisted', v_new_status,
      'project_id', p_project_id
    );
    
  EXCEPTION
    WHEN OTHERS THEN
      -- If error, try with project_id column instead
      BEGIN
        EXECUTE 'SELECT watchlist FROM projects WHERE project_id::text = $1'
        INTO v_current_status
        USING p_project_id;
        
        v_new_status := NOT COALESCE(v_current_status, FALSE);
        
        EXECUTE '
          UPDATE projects 
          SET watchlist = $1,
              watchlisted_at = CASE WHEN $1 THEN CURRENT_TIMESTAMP ELSE NULL END,
              updated_at = CURRENT_TIMESTAMP
          WHERE project_id::text = $2'
        USING v_new_status, p_project_id;
        
        v_result := jsonb_build_object(
          'success', true,
          'watchlisted', v_new_status,
          'project_id', p_project_id
        );
      EXCEPTION
        WHEN OTHERS THEN
          v_result := jsonb_build_object(
            'success', false,
            'error', 'Project not found',
            'project_id', p_project_id
          );
      END;
  END;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION toggle_project_watchlist_by_id(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_project_watchlist_by_id(TEXT) TO anon;

-- ============================================================================
-- Create view for watchlisted projects
-- ============================================================================
CREATE OR REPLACE VIEW watchlisted_projects AS
SELECT * FROM projects
WHERE watchlist = TRUE
ORDER BY COALESCE(watchlisted_at, updated_at, created_at) DESC;

-- Grant permissions on the view
GRANT SELECT ON watchlisted_projects TO authenticated;
GRANT SELECT ON watchlisted_projects TO anon;

-- ============================================================================
-- Alternative: User-specific watchlist table (for multi-user systems)
-- ============================================================================
-- This creates a separate table to track user-specific watchlists
-- where each user can have their own personal watchlist

CREATE TABLE IF NOT EXISTS project_watchlist_users (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id TEXT NOT NULL,  -- TEXT to handle both UUID and INTEGER project IDs
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure a user can only watchlist a project once
  CONSTRAINT unique_user_project_watchlist_users 
    UNIQUE (user_id, project_id)
);

-- Create indexes for the user watchlist table
CREATE INDEX IF NOT EXISTS idx_project_watchlist_users_user_id 
  ON project_watchlist_users(user_id);

CREATE INDEX IF NOT EXISTS idx_project_watchlist_users_project_id 
  ON project_watchlist_users(project_id);

CREATE INDEX IF NOT EXISTS idx_project_watchlist_users_created_at 
  ON project_watchlist_users(created_at DESC);

-- Enable RLS on the user watchlist table
ALTER TABLE project_watchlist_users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for project_watchlist_users
CREATE POLICY "Users can view own project watchlist users" 
  ON project_watchlist_users
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add projects to watchlist users" 
  ON project_watchlist_users
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove projects from watchlist users" 
  ON project_watchlist_users
  FOR DELETE
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, DELETE ON project_watchlist_users TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE project_watchlist_users_id_seq TO authenticated;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================