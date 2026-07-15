-- ============================================================
-- 002_fix_hotels_schema.sql
-- Fix mma_hotels table to match TypeScript code expectations
-- ============================================================
--
-- INSTRUÇÕES:
-- 1. Acesse seu projeto no Supabase (https://supabase.com/dashboard)
-- 2. Vá em "SQL Editor"
-- 3. Cole TODO este conteúdo
-- 4. Clique em "Run"
-- 5. Aguarde a mensagem "Success"
--
-- ============================================================

-- Add missing columns to mma_hotels table
ALTER TABLE public.mma_hotels 
  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES public.mma_events(id) ON DELETE CASCADE;

ALTER TABLE public.mma_hotels 
  ADD COLUMN IF NOT EXISTS hotel_name VARCHAR(200) DEFAULT 'Pending Booking';

ALTER TABLE public.mma_hotels 
  ADD COLUMN IF NOT EXISTS room_type VARCHAR(100);

ALTER TABLE public.mma_hotels 
  ADD COLUMN IF NOT EXISTS calculated_checkin TIMESTAMPTZ;

ALTER TABLE public.mma_hotels 
  ADD COLUMN IF NOT EXISTS calculated_checkout TIMESTAMPTZ;

ALTER TABLE public.mma_hotels 
  ADD COLUMN IF NOT EXISTS actual_checkin DATE;

ALTER TABLE public.mma_hotels 
  ADD COLUMN IF NOT EXISTS actual_checkout DATE;

ALTER TABLE public.mma_hotels 
  ADD COLUMN IF NOT EXISTS confirmation_number VARCHAR(100);

ALTER TABLE public.mma_hotels 
  ADD COLUMN IF NOT EXISTS divergence_reason TEXT;

ALTER TABLE public.mma_hotels 
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.mma_users(id);

ALTER TABLE public.mma_hotels 
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Add primary_divergence_type as single value column (code expects string, not array)
ALTER TABLE public.mma_hotels 
  ADD COLUMN IF NOT EXISTS primary_divergence_type VARCHAR(50);

-- Create index for event_id for faster queries
CREATE INDEX IF NOT EXISTS idx_mma_hotels_event ON public.mma_hotels(event_id);

-- Update hotel_name to NOT NULL after adding default
-- First update any existing null values
UPDATE public.mma_hotels SET hotel_name = 'Pending Booking' WHERE hotel_name IS NULL;

-- Now we need to backfill event_id from enrollment
-- This updates existing records to have the correct event_id
UPDATE public.mma_hotels h
SET event_id = e.event_id
FROM public.mma_enrollments e
WHERE h.enrollment_id = e.id AND h.event_id IS NULL;

-- ============================================================
-- RLS Policies for mma_hotels (if not exists)
-- ============================================================

-- Enable RLS
ALTER TABLE public.mma_hotels ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to view all hotels
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'mma_hotels' AND policyname = 'hotels_select_policy'
  ) THEN
    CREATE POLICY hotels_select_policy ON public.mma_hotels
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- Policy: Allow authenticated users to insert hotels
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'mma_hotels' AND policyname = 'hotels_insert_policy'
  ) THEN
    CREATE POLICY hotels_insert_policy ON public.mma_hotels
      FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

-- Policy: Allow authenticated users to update hotels
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'mma_hotels' AND policyname = 'hotels_update_policy'
  ) THEN
    CREATE POLICY hotels_update_policy ON public.mma_hotels
      FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Policy: Allow authenticated users to delete hotels
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'mma_hotels' AND policyname = 'hotels_delete_policy'
  ) THEN
    CREATE POLICY hotels_delete_policy ON public.mma_hotels
      FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

-- ============================================================
-- Success message
-- ============================================================
DO $$ BEGIN RAISE NOTICE 'Migration 002_fix_hotels_schema completed successfully!'; END $$;
