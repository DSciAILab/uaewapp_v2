-- UAE-20: a task can span days (a photoshoot runs the 19th to the 21st), not
-- just fall due on one. start_date is nullable and optional: a task with only
-- a due_date keeps meaning exactly what it means today.
ALTER TABLE public.mma_event_tasks
  ADD COLUMN IF NOT EXISTS start_date date;

-- A range that ends before it starts is not a range.
ALTER TABLE public.mma_event_tasks
  DROP CONSTRAINT IF EXISTS mma_event_tasks_date_range_check;
ALTER TABLE public.mma_event_tasks
  ADD CONSTRAINT mma_event_tasks_date_range_check
  CHECK (start_date IS NULL OR due_date IS NULL OR start_date <= due_date);
