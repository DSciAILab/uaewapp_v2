-- Add anonymous coach size columns to fighter stats
ALTER TABLE mma_fighter_stats 
ADD COLUMN IF NOT EXISTS coach1_size text,
ADD COLUMN IF NOT EXISTS coach2_size text,
ADD COLUMN IF NOT EXISTS coach3_size text;
