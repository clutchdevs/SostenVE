-- Row Level Security per the charter access matrix (Block 2).
-- Enforced for user-scoped clients (Postgres role `authenticated`); the backend
-- service role bypasses RLS for system operations (cron, audit, seeding).
--
-- Helpers read the request JWT claims GUC, set by PostgREST in production and by
-- `set_config('request.jwt.claims', ...)` in tests. `sub` is the volunteer id;
-- `app_role` is the domain role (Supabase reserves the `role` claim for the DB role).

create or replace function public.app_uid() returns uuid
  language sql stable
  as $$ select nullif(current_setting('request.jwt.claims', true)::json ->> 'sub', '')::uuid $$;

create or replace function public.app_role() returns text
  language sql stable
  as $$ select coalesce(current_setting('request.jwt.claims', true)::json ->> 'app_role', '') $$;

-- Enable RLS (default-deny) on every table.
alter table volunteers enable row level security;
alter table cases enable row level security;
alter table case_contacts enable row level security;
alter table assignments enable row level security;
alter table clinical_notes enable row level security;
alter table crisis_lines enable row level security;
alter table audit_log enable row level security;

-- volunteers: own row, or admin.
create policy volunteers_select on volunteers for select
  using (id = public.app_uid() or public.app_role() = 'admin');

-- cases: assigned psychologist, coordinator or admin (operational columns, no PII).
create policy cases_select on cases for select
  using (
    public.app_role() in ('coordinator', 'admin')
    or exists (
      select 1 from assignments a
      where a.case_id = cases.id and a.volunteer_id = public.app_uid()
    )
  );

-- case_contacts (PII): only the assigned psychologist. Not coordinator/admin.
create policy case_contacts_select on case_contacts for select
  using (
    exists (
      select 1
      from cases c
      join assignments a on a.case_id = c.id
      where c.pseudonym_id = case_contacts.pseudonym_id
        and a.volunteer_id = public.app_uid()
    )
  );

-- clinical_notes: only the assigned psychologist for the case.
create policy clinical_notes_select on clinical_notes for select
  using (
    exists (
      select 1 from assignments a
      where a.case_id = clinical_notes.case_id and a.volunteer_id = public.app_uid()
    )
  );

-- assignments: the volunteer, coordinator or admin.
create policy assignments_select on assignments for select
  using (
    volunteer_id = public.app_uid() or public.app_role() in ('coordinator', 'admin')
  );

-- crisis_lines: readable by anyone (must be shown even before auth);
-- only admins may modify.
create policy crisis_lines_select on crisis_lines for select using (true);
create policy crisis_lines_write_admin on crisis_lines for all
  using (public.app_role() = 'admin')
  with check (public.app_role() = 'admin');

-- audit_log: insert allowed for authenticated; reads for coordinator/admin only.
-- UPDATE/DELETE have no policy (denied) and are further blocked by a trigger.
create policy audit_log_insert on audit_log for insert with check (true);
create policy audit_log_select on audit_log for select
  using (public.app_role() in ('coordinator', 'admin'));

-- Table-level grants. RLS still filters rows; these ensure access is decided by
-- the policies above (not by a missing grant). The service role bypasses RLS.
grant usage on schema public to anon, authenticated, service_role;
grant select on all tables in schema public to authenticated;
grant insert on audit_log to authenticated;
grant select on crisis_lines to anon;
grant all on all tables in schema public to service_role;
