-- UAE-20: on event day the staff prints the sheet, updates on paper, then marks
-- each athlete done in the app. A visual done/pending flag shows at a glance
-- who's been processed and who's still pending — distinct from collected_at,
-- which is when the data was measured, not when it was confirmed for THIS event.
ALTER TABLE public.mma_fighter_stats
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmed_by uuid REFERENCES public.mma_users(id);
