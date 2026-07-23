-- Access + activity logging for the UAEW app. Two layers:
--   PART 1 "who accessed": stamp mma_users.last_login_at on every auth session,
--           and expose the built-in auth audit trail (logins/logouts/token
--           events) to admins via get_access_log() (auth schema isn't on PostgREST).
--   PART 2 "what they did": a single append-only mma_audit_log table filled by a
--           generic AFTER trigger on the core tables. Captures actor = auth.uid()
--           (the authenticated console carries the user JWT, so this attributes
--           correctly; anon/service paths log as system/null). PII values are
--           redacted in the diff — the fact a sensitive field changed is kept,
--           the value is not.
-- Applied to project otqzzllevufcxbpeavmo on 2026-07-23.

-- ============ PART 1 ============
create or replace function public.stamp_last_login()
returns trigger language plpgsql security definer set search_path = public, auth as $$
begin
  update public.mma_users set last_login_at = now() where id = new.user_id;
  return new;
end $$;

drop trigger if exists trg_stamp_last_login on auth.sessions;
create trigger trg_stamp_last_login after insert on auth.sessions
  for each row execute function public.stamp_last_login();

create or replace function public.get_access_log(p_limit int default 200)
returns table(at timestamptz, actor_id uuid, email text, name text, action text, log_type text, ip text)
language sql stable security definer set search_path = public, auth as $$
  select
    e.created_at,
    (e.payload->>'actor_id')::uuid,
    e.payload->>'actor_username',
    e.payload->>'actor_name',
    e.payload->>'action',
    e.payload->>'log_type',
    nullif(e.ip_address::text, '')
  from auth.audit_log_entries e
  where public.is_admin_user()
  order by e.created_at desc
  limit greatest(1, least(p_limit, 1000));
$$;
revoke all on function public.get_access_log(int) from public, anon;
grant execute on function public.get_access_log(int) to authenticated;

-- ============ PART 2 ============
create table if not exists public.mma_audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor_id uuid,
  actor_email text,
  action text not null,
  table_name text not null,
  row_id text,
  changed jsonb
);
create index if not exists mma_audit_log_at_idx on public.mma_audit_log (at desc);
create index if not exists mma_audit_log_table_idx on public.mma_audit_log (table_name, at desc);
create index if not exists mma_audit_log_actor_idx on public.mma_audit_log (actor_id, at desc);

alter table public.mma_audit_log enable row level security;
drop policy if exists audit_admin_read on public.mma_audit_log;
create policy audit_admin_read on public.mma_audit_log
  for select to authenticated using (public.is_admin_user());

create or replace function public.audit_row_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid := auth.uid();
  v_email text;
  v_row_id text;
  v_changed jsonb;
  v_sensitive text[] := array['passport_number','passport_expiry','dob','phone','passport_photo','document_folder'];
  k text;
begin
  select email into v_email from public.mma_users where id = v_actor;

  if tg_op = 'DELETE' then
    v_row_id := to_jsonb(old)->>'id';
    v_changed := to_jsonb(old);
  elsif tg_op = 'INSERT' then
    v_row_id := to_jsonb(new)->>'id';
    v_changed := to_jsonb(new);
  else
    v_row_id := to_jsonb(new)->>'id';
    select jsonb_object_agg(key, jsonb_build_object('old', o.value, 'new', n.value))
      into v_changed
    from jsonb_each(to_jsonb(old)) o
    join jsonb_each(to_jsonb(new)) n using (key)
    where o.value is distinct from n.value
      and key not in ('updated_at','last_login_at');
    if v_changed is null then return null; end if;
  end if;

  foreach k in array v_sensitive loop
    if v_changed ? k then
      v_changed := jsonb_set(v_changed, array[k], '"[redacted]"'::jsonb);
    end if;
  end loop;

  insert into public.mma_audit_log(actor_id, actor_email, action, table_name, row_id, changed)
  values (v_actor, v_email, tg_op, tg_table_name, v_row_id, v_changed);
  return null;
end $$;

drop trigger if exists trg_audit on public.mma_people;
create trigger trg_audit after insert or update or delete on public.mma_people           for each row execute function public.audit_row_change();
drop trigger if exists trg_audit on public.mma_enrollments;
create trigger trg_audit after insert or update or delete on public.mma_enrollments      for each row execute function public.audit_row_change();
drop trigger if exists trg_audit on public.mma_staging_checkins;
create trigger trg_audit after insert or update or delete on public.mma_staging_checkins for each row execute function public.audit_row_change();
drop trigger if exists trg_audit on public.mma_medical_clearance;
create trigger trg_audit after insert or update or delete on public.mma_medical_clearance for each row execute function public.audit_row_change();
drop trigger if exists trg_audit on public.mma_events;
create trigger trg_audit after insert or update or delete on public.mma_events           for each row execute function public.audit_row_change();
drop trigger if exists trg_audit on public.mma_users;
create trigger trg_audit after insert or update or delete on public.mma_users            for each row execute function public.audit_row_change();
