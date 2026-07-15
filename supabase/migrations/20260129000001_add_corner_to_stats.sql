-- Add corner column to mma_fighter_stats
ALTER TABLE mma_fighter_stats 
ADD COLUMN IF NOT EXISTS corner text; -- 'Red' or 'Blue'
