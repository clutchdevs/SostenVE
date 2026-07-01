-- Password change/reset flow for staff (RF-2.2.4, issue #36).
--
-- The welcome/credential email delivers a temporary password; this table backs
-- the "forgot password" recovery so a volunteer who loses it can set a new one.
-- We store only the SHA-256 hash of the single-use token (never the raw value),
-- so a database leak does not expose a usable reset link. The raw token lives
-- only in the emailed recovery URL.
--
-- Lifecycle: created (pending) -> used (consumed once) | expired (`expires_at`
-- cut-off). Redeeming sets a new password hash and bumps token_version to
-- destroy existing sessions in-place (RF-2.7, ADR-0005).

create table password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  volunteer_id uuid not null references volunteers (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_password_reset_tokens_volunteer on password_reset_tokens (volunteer_id);

-- Default-deny RLS: only the backend service role issues and redeems tokens (the
-- forgot/reset endpoints both run server-side, ADR-0005). No policy is defined
-- for `authenticated`, so user-scoped clients see nothing.
alter table password_reset_tokens enable row level security;

grant all on password_reset_tokens to service_role;
