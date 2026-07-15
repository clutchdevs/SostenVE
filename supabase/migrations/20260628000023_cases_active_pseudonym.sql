-- Intake duplicate-key bug: `cases.pseudonym_id` was globally UNIQUE, but the
-- pseudonym is deterministic per phone (HMAC), so the SAME person submitting
-- again — or an offline outbox RETRY of a submission that already saved (lost
-- response) — hit a duplicate-key error, surfaced as an unhandled 500, and the
-- client re-queued and retried it forever ("N solicitudes guardadas sin enviar").
--
-- A person must be able to open a NEW case after a previous one closes (a crisis
-- can recur), while never holding two OPEN cases at once. So drop the global
-- uniqueness and enforce it only over non-closed cases. Idempotent.

alter table cases drop constraint if exists cases_pseudonym_id_key;

-- Lookups by pseudonym (the PII link, and the idempotent-create fallback).
create index if not exists idx_cases_pseudonym_id on cases (pseudonym_id);

-- At most one ACTIVE (non-closed) case per person; multiple closed cases over
-- time are allowed. The intake `create` relies on this to stay idempotent: a
-- duplicate submission for someone who already has an open case returns that
-- case instead of erroring.
create unique index if not exists idx_cases_active_pseudonym
  on cases (pseudonym_id)
  where status <> 'cerrado';
