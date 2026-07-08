-- Runtime-configurable assignment settings, editable by an admin from the panel.
-- Single row (id = 1). The case-load cap bounds how many active cases a
-- psychologist can hold before the balancer stops routing new (non-high-risk)
-- cases to them (RF-2.5 load balancing). Default 6.
create table if not exists assignment_settings (
  id integer primary key default 1 check (id = 1),
  max_active_caseload integer not null default 6 check (max_active_caseload > 0),
  updated_at timestamptz not null default now()
);

-- Guarantee the single settings row exists so reads never fall back blindly.
insert into assignment_settings (id) values (1) on conflict (id) do nothing;

alter table assignment_settings enable row level security;
-- Any signed-in staff may read the cap; only admins may change it.
create policy assignment_settings_select on assignment_settings for select
  using (public.app_role() in ('psychologist', 'coordinator', 'admin'));
create policy assignment_settings_write_admin on assignment_settings for all
  using (public.app_role() = 'admin')
  with check (public.app_role() = 'admin');

-- Grants (RLS still applies). The backend uses the service role, which bypasses RLS.
grant select on assignment_settings to authenticated;
grant all on assignment_settings to service_role;
