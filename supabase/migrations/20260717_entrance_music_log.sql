-- UAE-20: per-fighter change log for walkout songs (mirrors the medical log).
CREATE TABLE IF NOT EXISTS public.mma_entrance_music_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  enrolled_id uuid NOT NULL,
  field text NOT NULL,          -- song_1 | song_2 | song_3 | status_1..3 | notes
  old_value text,
  new_value text,
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_music_log_enrolled ON public.mma_entrance_music_log (enrolled_id, changed_at DESC);
ALTER TABLE public.mma_entrance_music_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY music_log_all ON public.mma_entrance_music_log FOR ALL USING (true) WITH CHECK (true);
