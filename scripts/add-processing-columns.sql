-- Add processing columns to edgar_technical_documents if they don't exist
ALTER TABLE edgar_technical_documents
ADD COLUMN IF NOT EXISTS processing_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE;