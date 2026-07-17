-- UAE-20 Mod 6: extra beds can be requested on top of the room type.
ALTER TABLE public.mma_hotels ADD COLUMN IF NOT EXISTS extra_bed boolean NOT NULL DEFAULT false;
