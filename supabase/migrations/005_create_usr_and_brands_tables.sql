-- Create brands table if not exists
CREATE TABLE IF NOT EXISTS brands (
  brand_id SERIAL PRIMARY KEY,
  brand_name VARCHAR(255) NOT NULL,
  brand_code VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  category VARCHAR(100),
  website VARCHAR(500),
  founded_year INTEGER,
  country VARCHAR(100) DEFAULT 'US',
  is_active BOOLEAN DEFAULT true,
  target_age_min INTEGER DEFAULT 18,
  target_age_max INTEGER DEFAULT 65,
  target_gender VARCHAR(20) DEFAULT 'all',
  target_locations TEXT[] DEFAULT ARRAY['USA', 'Canada', 'Australia', 'Chile'],
  target_income_level VARCHAR(20) DEFAULT 'medium',
  target_lifestyle TEXT[],
  target_interests TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create usr table if not exists
CREATE TABLE IF NOT EXISTS usr (
  user_id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  brand_id INTEGER REFERENCES brands(brand_id) ON DELETE SET NULL,
  role VARCHAR(50) DEFAULT 'member',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_usr_email ON usr(email);
CREATE INDEX IF NOT EXISTS idx_usr_brand_id ON usr(brand_id);
CREATE INDEX IF NOT EXISTS idx_brands_brand_code ON brands(brand_code);

-- Enable Row Level Security
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE usr ENABLE ROW LEVEL SECURITY;

-- Create policies for brands table
CREATE POLICY IF NOT EXISTS "Brands are viewable by everyone" 
  ON brands FOR SELECT 
  USING (true);

CREATE POLICY IF NOT EXISTS "Brands are insertable by service role" 
  ON brands FOR INSERT 
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Brands are updatable by service role" 
  ON brands FOR UPDATE 
  USING (true);

-- Create policies for usr table
CREATE POLICY IF NOT EXISTS "Users are viewable by themselves" 
  ON usr FOR SELECT 
  USING (auth.uid()::text = email);

CREATE POLICY IF NOT EXISTS "Users are insertable by service role" 
  ON usr FOR INSERT 
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Users are updatable by themselves" 
  ON usr FOR UPDATE 
  USING (auth.uid()::text = email);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON brands
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usr_updated_at BEFORE UPDATE ON usr
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
