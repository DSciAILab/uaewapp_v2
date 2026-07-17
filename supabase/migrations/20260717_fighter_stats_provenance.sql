-- UAE-20: who measured this athlete, and when.
--
-- The app never recorded it, so a staffer asked to "confirm the data is
-- current" had nothing to confirm against. The spreadsheet this replaces DID
-- carry both, and migrating without them would throw away years of provenance.
--
-- collected_at is distinct from updated_at on purpose: updated_at is when the
-- row was last written (the migration itself would stamp today), collected_at
-- is when a human actually measured the athlete.
ALTER TABLE public.mma_fighter_stats
  ADD COLUMN IF NOT EXISTS collected_by uuid REFERENCES public.mma_users(id),
  ADD COLUMN IF NOT EXISTS collected_at date;
