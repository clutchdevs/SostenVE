-- Confidential coordinator notes about volunteers (RF-2.4, issue #20).
--
-- Free-text annotations a coordinator/admin keeps on a psychologist's profile
-- (special skills, burnout alerts, rotation needs, logistics). STRICTLY private:
-- never visible to the volunteer themselves nor to requesters. RLS restricts all
-- access to coordinator/admin; the volunteer's own-row policy does NOT apply here.

create table volunteer_notes (
  id uuid primary key default gen_random_uuid(),
  volunteer_id uuid not null references volunteers (id) on delete cascade,
  -- Notes outlive their author: keep the note, null the author if removed.
  author_id uuid references volunteers (id) on delete set null,
  content text not null,
  created_at timestamptz not null default now()
);

create index idx_volunteer_notes_volunteer on volunteer_notes (volunteer_id);

alter table volunteer_notes enable row level security;

-- Only coordinator/admin may read or write; everyone else (incl. the volunteer)
-- is denied. The backend service role bypasses RLS for system operations.
create policy volunteer_notes_select on volunteer_notes for select
  using (public.app_role() in ('coordinator', 'admin'));
create policy volunteer_notes_insert on volunteer_notes for insert
  with check (public.app_role() in ('coordinator', 'admin'));

grant select, insert on volunteer_notes to authenticated;
grant all on volunteer_notes to service_role;
