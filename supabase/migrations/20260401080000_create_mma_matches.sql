CREATE TABLE IF NOT EXISTS mma_matches (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id UUID REFERENCES mma_events(id) ON DELETE CASCADE NOT NULL,
    match_number INTEGER NOT NULL,
    division VARCHAR(100),
    
    red_corner_enrollment_id UUID REFERENCES mma_enrollments(id) ON DELETE SET NULL,
    blue_corner_enrollment_id UUID REFERENCES mma_enrollments(id) ON DELETE SET NULL,
    
    status VARCHAR(50) DEFAULT 'scheduled',
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Prevent duplicate match numbers in the same event
    UNIQUE(event_id, match_number)
);

-- Enable RLS
ALTER TABLE mma_matches ENABLE ROW LEVEL SECURITY;

-- Create policies (similarly to other tables)
CREATE POLICY "Authenticated users can read mma_matches" ON mma_matches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert mma_matches" ON mma_matches FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update mma_matches" ON mma_matches FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete mma_matches" ON mma_matches FOR DELETE TO authenticated USING (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_mma_matches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_mma_matches_timestamp
    BEFORE UPDATE ON mma_matches
    FOR EACH ROW
    EXECUTE FUNCTION update_mma_matches_updated_at();
