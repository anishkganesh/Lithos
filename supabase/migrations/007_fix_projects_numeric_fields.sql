ALTER TABLE projects
  ALTER COLUMN payback_years TYPE NUMERIC(10,2),
  ALTER COLUMN resource_grade TYPE NUMERIC(10,2),
  ALTER COLUMN extraction_confidence TYPE NUMERIC(10,2);