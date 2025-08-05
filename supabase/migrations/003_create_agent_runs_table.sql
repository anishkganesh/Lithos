-- Create agent_runs table
CREATE TABLE IF NOT EXISTS agent_runs (
  id SERIAL PRIMARY KEY,
  agent_type TEXT NOT NULL DEFAULT 'mining',
  projects_added INTEGER DEFAULT 0,
  projects_updated INTEGER DEFAULT 0,
  total_projects INTEGER DEFAULT 0,
  run_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_agent_runs_agent_type ON agent_runs(agent_type);
CREATE INDEX idx_agent_runs_run_at ON agent_runs(run_at DESC);

-- Enable RLS
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow read for all authenticated users)
CREATE POLICY "Anyone can view agent runs"
  ON agent_runs FOR SELECT
  USING (true);

-- Only service role can insert
CREATE POLICY "Service role can insert agent runs"
  ON agent_runs FOR INSERT
  WITH CHECK (auth.role() = 'service_role'); 