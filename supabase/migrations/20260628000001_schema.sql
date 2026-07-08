-- PPV schema (Block 2).
-- PII is separated from clinical content and linked by a pseudonymized id
-- (ADR-0011). Clinical columns hold app-encrypted payloads (ADR-0004).
-- Code identifiers are English; enum values mirror the API contract (Spanish).

create extension if not exists "pgcrypto";

-- Enum types
create type volunteer_role as enum ('psychologist', 'coordinator', 'admin');
create type volunteer_status as enum ('active', 'pending_approval', 'inactive');
create type case_branch as enum ('roja', 'verde');
create type risk_level as enum ('riesgo_alto', 'riesgo_moderado', 'seguimiento');
create type case_status as enum ('pendiente', 'asignado', 'aceptado', 'en_seguimiento', 'cerrado');
create type requester_type as enum ('victima', 'familiar', 'voluntario');
create type modality as enum ('presencial', 'distancia');

-- Volunteers (psychologists, coordinators, admins)
create table volunteers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  professional_id text not null unique,
  specialty text,
  availability text,
  role volunteer_role not null default 'psychologist',
  password_hash text not null,
  token_version integer not null default 1,
  status volunteer_status not null default 'pending_approval',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Cases: operational/clinical row, NO direct PII. Linked to PII via pseudonym_id.
create table cases (
  id uuid primary key default gen_random_uuid(),
  pseudonym_id text not null unique,
  branch case_branch not null,
  risk_level risk_level not null,
  urgency_score integer not null default 0,
  status case_status not null default 'pendiente',
  requester_type requester_type,
  zone text,
  preferred_modality modality,
  created_at timestamptz not null default now(),
  sla_expires_at timestamptz
);

-- PII, separated and restricted. Linked only by pseudonym_id (ADR-0011).
create table case_contacts (
  pseudonym_id text primary key,
  name text,
  contact text not null,
  created_at timestamptz not null default now()
);

-- Assignment of a case to a volunteer.
create table assignments (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases (id) on delete cascade,
  volunteer_id uuid not null references volunteers (id) on delete cascade,
  assigned_at timestamptz not null default now(),
  accepted_at timestamptz,
  contact_channel text,
  unique (case_id, volunteer_id)
);

-- Clinical notes. Diagnosis/content stored encrypted at rest (AES-256-GCM, app-level).
create table clinical_notes (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases (id) on delete cascade,
  author_volunteer_id uuid not null references volunteers (id),
  diagnosis_encrypted text,
  content_encrypted text not null,
  created_at timestamptz not null default now()
);

-- Crisis/backup lines: public, editable by admins (Block 3 routing by hour).
create table crisis_lines (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  coverage text,
  start_hour integer,
  end_hour integer,
  priority integer not null default 0,
  active boolean not null default true
);

-- Append-only audit log (ADR-0012). Immutability enforced in a later migration.
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  role text,
  affected_record_id text,
  action_type text not null,
  created_at timestamptz not null default now()
);

create index idx_assignments_volunteer on assignments (volunteer_id);
create index idx_assignments_case on assignments (case_id);
create index idx_cases_status on cases (status);
create index idx_clinical_notes_case on clinical_notes (case_id);
create index idx_audit_log_record on audit_log (affected_record_id);
