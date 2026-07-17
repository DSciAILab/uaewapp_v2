-- UAE-20 Mod 1: allow standalone transports (e.g. shuttles) that are not tied
-- to athletes or flights. Route/schedule previously existed only on
-- mma_car_passengers; a car with no passengers had nowhere to carry them.
ALTER TABLE public.mma_event_cars
  ADD COLUMN IF NOT EXISTS transport_type text,          -- arrival | departure | shuttle | custom
  ADD COLUMN IF NOT EXISTS pickup_location text,
  ADD COLUMN IF NOT EXISTS dropoff_location text,
  ADD COLUMN IF NOT EXISTS scheduled_date date,
  ADD COLUMN IF NOT EXISTS scheduled_time text;
