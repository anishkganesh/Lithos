-- Create chat_history table
CREATE TABLE IF NOT EXISTS chat_history (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_chat_history_user_id ON chat_history(user_id);
CREATE INDEX idx_chat_history_updated_at ON chat_history(updated_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_chat_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chat_history_updated_at_trigger
BEFORE UPDATE ON chat_history
FOR EACH ROW
EXECUTE FUNCTION update_chat_history_updated_at();

-- Enable RLS
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own chat history"
  ON chat_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chat history"
  ON chat_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat history"
  ON chat_history FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat history"
  ON chat_history FOR DELETE
  USING (auth.uid() = user_id); 