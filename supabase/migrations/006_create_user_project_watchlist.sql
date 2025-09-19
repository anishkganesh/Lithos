-- Add watchlist and generated_image_url columns to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS watchlist BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS generated_image_url TEXT,
ADD COLUMN IF NOT EXISTS watchlisted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS watchlist_notes TEXT;

-- Create index for watchlist filtering
CREATE INDEX IF NOT EXISTS idx_projects_watchlist ON projects(watchlist) WHERE watchlist = true;

-- Add comments
COMMENT ON COLUMN projects.watchlist IS 'Whether this project is on the user watchlist';
COMMENT ON COLUMN projects.generated_image_url IS 'URL of AI-generated visualization for this project';
COMMENT ON COLUMN projects.watchlisted_at IS 'Timestamp when the project was added to watchlist';
COMMENT ON COLUMN projects.watchlist_notes IS 'User notes about why they watchlisted this project';