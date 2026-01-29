-- Add corner column to mma_enrollments
ALTER TABLE mma_enrollments ADD COLUMN IF NOT EXISTS corner TEXT;

-- Comment for clarity
COMMENT ON COLUMN mma_enrollments.corner IS 'Fighter corner color (Red/Blue) for this specific event';
