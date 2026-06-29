-- Clinical closure / record per case (Module 4, online). One closure per case.
-- Free-text fields are app-encrypted (AES-256-GCM, ADR-0004); coded fields are plain.
-- RLS mirrors clinical_notes: only the assigned psychologist can read/write.

create table case_closures (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null unique references cases (id) on delete cascade,
  author_volunteer_id uuid not null references volunteers (id),
  contacted boolean not null,
  no_contact_reason text,
  sex text,
  recipient text,
  symptoms text[] not null default '{}',
  other_symptom_encrypted text,
  contact_medium text,
  techniques text[] not null default '{}',
  close_reason text,
  referral_type text,
  referral_destination text,
  hours numeric(6, 2) not null default 0,
  comment_encrypted text,
  created_at timestamptz not null default now()
);

create index idx_case_closures_case on case_closures (case_id);

alter table case_closures enable row level security;

grant select, insert on case_closures to authenticated;

-- Only the assigned psychologist for the case may read/insert its closure.
create policy case_closures_select on case_closures for select
  using (
    exists (
      select 1 from assignments a
      where a.case_id = case_closures.case_id and a.volunteer_id = public.app_uid()
    )
  );

create policy case_closures_insert on case_closures for insert
  with check (
    exists (
      select 1 from assignments a
      where a.case_id = case_closures.case_id and a.volunteer_id = public.app_uid()
    )
  );
