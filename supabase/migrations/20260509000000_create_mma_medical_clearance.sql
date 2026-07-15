-- Medical clearance per athlete per event
CREATE TABLE IF NOT EXISTS mma_medical_clearance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES mma_events(id) ON DELETE CASCADE,
  enrolled_id UUID NOT NULL REFERENCES mma_enrollments(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'cleared_by_doctor', 'sent_to_hospital')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE (event_id, enrolled_id)
);

CREATE INDEX IF NOT EXISTS idx_medical_event ON mma_medical_clearance(event_id);
CREATE INDEX IF NOT EXISTS idx_medical_status ON mma_medical_clearance(status);

ALTER TABLE mma_medical_clearance ENABLE ROW LEVEL SECURITY;

-- Anyone can read (public route works without login)
CREATE POLICY "medical_select_all" ON mma_medical_clearance
  FOR SELECT USING (true);

-- Authenticated users can write
CREATE POLICY "medical_write_authenticated" ON mma_medical_clearance
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Public route writes use service-role key, which bypasses RLS by design.
