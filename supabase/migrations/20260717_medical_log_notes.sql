-- UAE-20: medical log now records notes changes too (walkout-log pattern).
ALTER TABLE public.mma_medical_clearance_log
  ADD COLUMN IF NOT EXISTS field text NOT NULL DEFAULT 'status',
  ADD COLUMN IF NOT EXISTS old_value text,
  ADD COLUMN IF NOT EXISTS new_value text;

CREATE OR REPLACE FUNCTION public.log_medical_clearance_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.mma_medical_clearance_log
      (clearance_id, event_id, enrolled_id, field, old_status, new_status, old_value, new_value, changed_at, changed_by)
    VALUES
      (NEW.id, NEW.event_id, NEW.enrolled_id, 'status', NULL, NEW.status, NULL, NEW.status, NEW.updated_at, auth.uid());
    IF NEW.notes IS NOT NULL THEN
      INSERT INTO public.mma_medical_clearance_log
        (clearance_id, event_id, enrolled_id, field, old_value, new_value, changed_at, changed_by)
      VALUES
        (NEW.id, NEW.event_id, NEW.enrolled_id, 'notes', NULL, NEW.notes, NEW.updated_at, auth.uid());
    END IF;
    RETURN NEW;
  END IF;

  IF (TG_OP = 'UPDATE') THEN
    IF (NEW.status IS DISTINCT FROM OLD.status) THEN
      INSERT INTO public.mma_medical_clearance_log
        (clearance_id, event_id, enrolled_id, field, old_status, new_status, old_value, new_value, changed_at, changed_by)
      VALUES
        (NEW.id, NEW.event_id, NEW.enrolled_id, 'status', OLD.status, NEW.status, OLD.status, NEW.status, NEW.updated_at, auth.uid());
    END IF;
    IF (NEW.notes IS DISTINCT FROM OLD.notes) THEN
      INSERT INTO public.mma_medical_clearance_log
        (clearance_id, event_id, enrolled_id, field, old_value, new_value, changed_at, changed_by)
      VALUES
        (NEW.id, NEW.event_id, NEW.enrolled_id, 'notes', OLD.notes, NEW.notes, NEW.updated_at, auth.uid());
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
