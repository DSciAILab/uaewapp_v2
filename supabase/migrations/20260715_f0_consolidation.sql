-- =============================================================================
-- F0-T3 — Schema consolidation (INF-691)
-- Shared Supabase project otqzzllevufcxbpeavmo. ONLY mma_* objects are touched
-- here; never reference non-mma_* objects owned by other apps in this project.
-- Runs inside the migration transaction (supabase CLI wraps each file), so any
-- RAISE below rolls the whole thing back — all-or-nothing.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Drop orphan v1 tables (known-empty). Each DROP is preceded by a guard that
--    ABORTS the migration if the table exists AND has any rows, so we never lose
--    data on a wrong assumption. Guard uses to_regclass so a missing table is a
--    no-op. CASCADE is used because the requested drop order lists a parent
--    (mma_transport_cars) before its child (mma_transport_passengers); since all
--    of these are being removed anyway, cascading their mutual FKs is safe.
-- -----------------------------------------------------------------------------

DO $$ DECLARE n bigint; BEGIN
  IF to_regclass('public.mma_athlete_stats') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM mma_athlete_stats' INTO n;
    IF n > 0 THEN RAISE EXCEPTION 'Refusing to drop mma_athlete_stats: % rows', n; END IF;
  END IF;
END $$;
DROP TABLE IF EXISTS mma_athlete_stats CASCADE;

DO $$ DECLARE n bigint; BEGIN
  IF to_regclass('public.mma_athlete_music') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM mma_athlete_music' INTO n;
    IF n > 0 THEN RAISE EXCEPTION 'Refusing to drop mma_athlete_music: % rows', n; END IF;
  END IF;
END $$;
DROP TABLE IF EXISTS mma_athlete_music CASCADE;

DO $$ DECLARE n bigint; BEGIN
  IF to_regclass('public.mma_athlete_tasks') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM mma_athlete_tasks' INTO n;
    IF n > 0 THEN RAISE EXCEPTION 'Refusing to drop mma_athlete_tasks: % rows', n; END IF;
  END IF;
END $$;
DROP TABLE IF EXISTS mma_athlete_tasks CASCADE;

DO $$ DECLARE n bigint; BEGIN
  IF to_regclass('public.mma_batch_passengers') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM mma_batch_passengers' INTO n;
    IF n > 0 THEN RAISE EXCEPTION 'Refusing to drop mma_batch_passengers: % rows', n; END IF;
  END IF;
END $$;
DROP TABLE IF EXISTS mma_batch_passengers CASCADE;

DO $$ DECLARE n bigint; BEGIN
  IF to_regclass('public.mma_pre_event_checks') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM mma_pre_event_checks' INTO n;
    IF n > 0 THEN RAISE EXCEPTION 'Refusing to drop mma_pre_event_checks: % rows', n; END IF;
  END IF;
END $$;
DROP TABLE IF EXISTS mma_pre_event_checks CASCADE;

DO $$ DECLARE n bigint; BEGIN
  IF to_regclass('public.mma_transport_cars') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM mma_transport_cars' INTO n;
    IF n > 0 THEN RAISE EXCEPTION 'Refusing to drop mma_transport_cars: % rows', n; END IF;
  END IF;
END $$;
DROP TABLE IF EXISTS mma_transport_cars CASCADE;

DO $$ DECLARE n bigint; BEGIN
  IF to_regclass('public.mma_transport_passengers') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM mma_transport_passengers' INTO n;
    IF n > 0 THEN RAISE EXCEPTION 'Refusing to drop mma_transport_passengers: % rows', n; END IF;
  END IF;
END $$;
DROP TABLE IF EXISTS mma_transport_passengers CASCADE;

DO $$ DECLARE n bigint; BEGIN
  IF to_regclass('public.mma_transport_drivers') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM mma_transport_drivers' INTO n;
    IF n > 0 THEN RAISE EXCEPTION 'Refusing to drop mma_transport_drivers: % rows', n; END IF;
  END IF;
END $$;
DROP TABLE IF EXISTS mma_transport_drivers CASCADE;

-- -----------------------------------------------------------------------------
-- 2. Rename mma_people.fighter_id -> appadmin_fighter_id
--    (this id is the external UAE Warriors appadmin fighter id, not our PK).
-- -----------------------------------------------------------------------------

ALTER TABLE mma_people RENAME COLUMN fighter_id TO appadmin_fighter_id;

-- -----------------------------------------------------------------------------
-- 3. Passport number uniqueness — DEFERRED activation.
--    The table currently HAS duplicate passport_number values (~97 known
--    ambiguous rows), so a UNIQUE index would fail to build today. We create a
--    plain (non-unique) partial index now for lookup performance, plus a view
--    that lists the conflicting rows to drive the F0-T4b dedup queue.
--    The UNIQUE index is written below but COMMENTED OUT — activate it in
--    F0-T4b once the duplicates are resolved (a unique index has no NOT VALID
--    equivalent, so it can only be created after the data is clean).
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_mma_people_passport_number
  ON mma_people (passport_number)
  WHERE passport_number IS NOT NULL AND passport_number <> '';

CREATE OR REPLACE VIEW mma_people_passport_dupes AS
  SELECT
    passport_number,
    count(*)              AS person_count,
    array_agg(id)         AS person_ids,
    array_agg(compiled_name) AS names
  FROM mma_people
  WHERE passport_number IS NOT NULL AND passport_number <> ''
  GROUP BY passport_number
  HAVING count(*) > 1;

-- F0-T4b: activate after dedup (run once mma_people_passport_dupes is empty):
-- CREATE UNIQUE INDEX uq_mma_people_passport_number
--   ON mma_people (passport_number)
--   WHERE passport_number IS NOT NULL AND passport_number <> '';

-- -----------------------------------------------------------------------------
-- 4. Event code (audit R8) on mma_enrollments.
--    Format: <ROLE_PREFIX>.<seq zero-padded to 3>, e.g. FT.001, ST.014.
--    Prefix by role name: Fighter->FT, Staff->ST, Corner->CR, Guest->GT, else XX.
--    seq = max(event_code_seq) over (event_id, role_id) + 1.
--    NOTE ON CONCURRENCY: max()+1 has a race under concurrent inserts into the
--    same (event_id, role_id); the partial UNIQUE index below turns a collision
--    into a failed insert (retry-safe) rather than a duplicate code.
-- -----------------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS uq_mma_enrollments_event_code
  ON mma_enrollments (event_id, event_code)
  WHERE event_code IS NOT NULL;

CREATE OR REPLACE FUNCTION mma_enrollments_set_event_code()
RETURNS TRIGGER AS $$
DECLARE
  v_role_name text;
  v_prefix    text;
  v_seq       integer;
BEGIN
  -- Respect an explicitly provided code (e.g. data migration / manual override).
  IF NEW.event_code IS NOT NULL AND NEW.event_code <> '' THEN
    RETURN NEW;
  END IF;

  SELECT name INTO v_role_name FROM mma_roles WHERE id = NEW.role_id;

  v_prefix := CASE lower(coalesce(v_role_name, ''))
    WHEN 'fighter' THEN 'FT'
    WHEN 'staff'   THEN 'ST'
    WHEN 'corner'  THEN 'CR'
    WHEN 'guest'   THEN 'GT'
    ELSE 'XX'
  END;

  SELECT coalesce(max(event_code_seq), 0) + 1
    INTO v_seq
    FROM mma_enrollments
   WHERE event_id = NEW.event_id AND role_id = NEW.role_id;

  NEW.event_code_seq := v_seq;
  NEW.event_code := v_prefix || '.' || lpad(v_seq::text, 3, '0');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mma_enrollments_set_event_code ON mma_enrollments;
CREATE TRIGGER trg_mma_enrollments_set_event_code
  BEFORE INSERT ON mma_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION mma_enrollments_set_event_code();

-- Immutability: once event_code is set it cannot change. NULL -> value is
-- allowed (backfill); value -> different value or value -> NULL is rejected.
CREATE OR REPLACE FUNCTION mma_enrollments_lock_event_code()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.event_code IS NOT NULL AND NEW.event_code IS DISTINCT FROM OLD.event_code THEN
    RAISE EXCEPTION 'event_code is immutable once set (enrollment %, old %, new %)',
      OLD.id, OLD.event_code, NEW.event_code;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mma_enrollments_lock_event_code ON mma_enrollments;
CREATE TRIGGER trg_mma_enrollments_lock_event_code
  BEFORE UPDATE ON mma_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION mma_enrollments_lock_event_code();

-- -----------------------------------------------------------------------------
-- 5. Status ENUM types (create only — column conversion is deferred to F1).
--    The requests engine (F1) will introduce the requests tables and convert
--    the relevant status columns to these types. We only CREATE the type now so
--    F1 migrations can reference it; existing VARCHAR status columns are left
--    untouched here on purpose.
-- -----------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE request_status AS ENUM (
    'requested',
    'in_progress',
    'booked',
    'cancel_requested',
    'cancelled',
    'completed',
    'rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -----------------------------------------------------------------------------
-- 6. Fight-card integrity guards on mma_matches (audit G1/G2).
-- -----------------------------------------------------------------------------

-- G1: a match cannot pit an enrollment against itself.
ALTER TABLE mma_matches DROP CONSTRAINT IF EXISTS chk_mma_matches_distinct_corners;
ALTER TABLE mma_matches ADD CONSTRAINT chk_mma_matches_distinct_corners
  CHECK (
    red_corner_enrollment_id IS NULL
    OR blue_corner_enrollment_id IS NULL
    OR red_corner_enrollment_id <> blue_corner_enrollment_id
  );

-- G2 (partial): the SAME enrollment cannot occupy the red column twice in one
-- event, nor the blue column twice in one event.
CREATE UNIQUE INDEX IF NOT EXISTS uq_mma_matches_event_red
  ON mma_matches (event_id, red_corner_enrollment_id)
  WHERE red_corner_enrollment_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_mma_matches_event_blue
  ON mma_matches (event_id, blue_corner_enrollment_id)
  WHERE blue_corner_enrollment_id IS NOT NULL;

-- The two partial indexes above do NOT catch the cross-column case: an
-- enrollment appearing as RED in one match and BLUE in another match of the
-- SAME event. That case is enforced by the trigger below, which checks both
-- columns of every other match in the event.
CREATE OR REPLACE FUNCTION mma_matches_check_enrollment_unique()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.red_corner_enrollment_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM mma_matches m
    WHERE m.event_id = NEW.event_id
      AND m.id <> NEW.id
      AND (m.red_corner_enrollment_id = NEW.red_corner_enrollment_id
        OR m.blue_corner_enrollment_id = NEW.red_corner_enrollment_id)
  ) THEN
    RAISE EXCEPTION 'enrollment % already assigned to another match in event %',
      NEW.red_corner_enrollment_id, NEW.event_id;
  END IF;

  IF NEW.blue_corner_enrollment_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM mma_matches m
    WHERE m.event_id = NEW.event_id
      AND m.id <> NEW.id
      AND (m.red_corner_enrollment_id = NEW.blue_corner_enrollment_id
        OR m.blue_corner_enrollment_id = NEW.blue_corner_enrollment_id)
  ) THEN
    RAISE EXCEPTION 'enrollment % already assigned to another match in event %',
      NEW.blue_corner_enrollment_id, NEW.event_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mma_matches_check_enrollment_unique ON mma_matches;
CREATE TRIGGER trg_mma_matches_check_enrollment_unique
  BEFORE INSERT OR UPDATE ON mma_matches
  FOR EACH ROW
  EXECUTE FUNCTION mma_matches_check_enrollment_unique();

-- -----------------------------------------------------------------------------
-- 7. Result columns on mma_matches.
-- -----------------------------------------------------------------------------

ALTER TABLE mma_matches
  ADD COLUMN IF NOT EXISTS winner_enrollment_id UUID REFERENCES mma_enrollments(id),
  ADD COLUMN IF NOT EXISTS result_method VARCHAR(40),
  ADD COLUMN IF NOT EXISTS result_round INTEGER,
  ADD COLUMN IF NOT EXISTS result_time VARCHAR(10);
