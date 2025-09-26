-- Drop the existing unique constraint on accession_number
ALTER TABLE edgar_technical_documents
DROP CONSTRAINT IF EXISTS edgar_technical_documents_accession_number_key;

-- Add a new unique constraint on the combination of accession_number and document_url
ALTER TABLE edgar_technical_documents
ADD CONSTRAINT edgar_technical_documents_accession_url_unique
UNIQUE (accession_number, document_url);