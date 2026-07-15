-- ============================================================
-- 01_ADD_HOTEL_ROOMS_AND_CHECKIN.sql
-- Add room_number and checked_in_at to mma_hotels
-- ============================================================

-- 1. Add room_number column
ALTER TABLE public.mma_hotels 
ADD COLUMN IF NOT EXISTS room_number VARCHAR(20);

-- 2. Add checked_in_at column to track exact check-in time
ALTER TABLE public.mma_hotels 
ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;

-- 3. Add index for room_number to help with finding roommates
CREATE INDEX IF NOT EXISTS idx_mma_hotels_room_number ON public.mma_hotels(room_number);

-- 4. Notify user to run this
-- Instructions: Run this in Supabase SQL Editor
