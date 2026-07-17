-- UAE-20: cache the YouTube title per song slot, resolved once when the link
-- is saved (oEmbed), so the grid never has to call YouTube to render a row.
ALTER TABLE public.mma_entrance_music
  ADD COLUMN IF NOT EXISTS title_1 text,
  ADD COLUMN IF NOT EXISTS title_2 text,
  ADD COLUMN IF NOT EXISTS title_3 text;
