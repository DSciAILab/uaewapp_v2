-- Add detailed uniform columns to fighter stats
ALTER TABLE mma_fighter_stats 
ADD COLUMN IF NOT EXISTS tshirt_size text,
ADD COLUMN IF NOT EXISTS shorts_size text,
ADD COLUMN IF NOT EXISTS jacket_size text,
ADD COLUMN IF NOT EXISTS gloves_size text;

-- Note: No RLS changes needed as they apply to the table which is already covered.
