-- First, let's check if there are any duplicate accession numbers
-- and clean them up if needed

-- Delete duplicates keeping only the first occurrence
DELETE FROM edgar_technical_documents a
USING edgar_technical_documents b
WHERE a.id > b.id
  AND a.accession_number = b.accession_number;

-- Now ensure the unique constraint exists on accession_number
-- First drop if it exists with a different name
ALTER TABLE edgar_technical_documents
DROP CONSTRAINT IF EXISTS edgar_technical_documents_accession_number_key;

-- Add the unique constraint on accession_number
ALTER TABLE edgar_technical_documents
ADD CONSTRAINT edgar_technical_documents_accession_number_unique
UNIQUE (accession_number);