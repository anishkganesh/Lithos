-- Add project_description column to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS project_description TEXT;