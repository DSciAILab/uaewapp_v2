-- Public boards (staging/medical) are anon-facing (/public/staging/[eventId],
-- /public/medical/[eventId]) and their server actions run with the anon client
-- so RLS governs access (service role was removed earlier because it leaked
-- athlete PII). But RLS blocked anon entirely on the underlying tables, so the
-- boards rendered EMPTY.
--
-- Fix: let anon SELECT the non-PII tables, and on mma_people grant anon only the
-- non-PII columns at the GRANT level, so PII (passport_number/expiry, dob, phone,
-- passport_photo, document_folder) is unreadable by anon even if a query asks
-- for it. Authenticated/service_role grants are untouched.
--
-- Applied to project otqzzllevufcxbpeavmo on 2026-07-23.
--
-- KNOWN DEBT (out of scope here, flagged): anon still holds table-level
-- INSERT/UPDATE/DELETE/TRUNCATE on mma_* (Supabase defaults, gated only by RLS).
-- Belongs to the F0 Bloco B RLS hardening.

-- Non-PII tables: allow anon SELECT (operational/board data only).
create policy "anon_public_board_read" on public.mma_enrollments      for select to anon using (true);
create policy "anon_public_board_read" on public.mma_roles            for select to anon using (true);
create policy "anon_public_board_read" on public.mma_staging_checkins for select to anon using (true);

-- mma_people: column-scoped anon read. Revoke the blanket SELECT first so PII
-- columns become unreachable, then grant only the public-board columns, then
-- let the rows through RLS. Order matters: columns are locked down before any
-- row becomes visible to anon.
revoke select on public.mma_people from anon;
grant select (id, name, surname, nationality, appadmin_fighter_id, event_name, compiled_name)
  on public.mma_people to anon;
create policy "anon_public_board_read" on public.mma_people for select to anon using (true);
