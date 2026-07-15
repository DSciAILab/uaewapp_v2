-- Enable moddatetime extension
CREATE EXTENSION IF NOT EXISTS moddatetime SCHEMA extensions;

-- Add uniform info to fighter stats
ALTER TABLE mma_fighter_stats 
ADD COLUMN IF NOT EXISTS uniform_size text,
ADD COLUMN IF NOT EXISTS shoe_size text;

-- Create coach data table
CREATE TABLE IF NOT EXISTS mma_coach_data (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  person_id uuid REFERENCES mma_people(id) NOT NULL,
  uniform_size text,
  shoe_size text,
  height_cm numeric,
  weight_kg numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(person_id)
);

-- Enable RLS
ALTER TABLE mma_coach_data ENABLE ROW LEVEL SECURITY;

-- Create policies (open for internal users for now, matching other tables)
CREATE POLICY "Enable read access for all users" ON mma_coach_data
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON mma_coach_data
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON mma_coach_data
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Add trigger for updated_at
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON mma_coach_data
    FOR EACH ROW EXECUTE PROCEDURE extensions.moddatetime (updated_at);
