-- UAE-20: approval is per song, not per row. Each of the 3 walkout song
-- slots carries its own status; the row is Done once any one is approved.
ALTER TABLE public.mma_entrance_music
  ADD COLUMN IF NOT EXISTS status_1 text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS status_2 text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS status_3 text NOT NULL DEFAULT 'pending';
