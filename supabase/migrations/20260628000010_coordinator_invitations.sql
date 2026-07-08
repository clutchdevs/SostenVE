-- Coordinator registration by invitation token (RF-2.6, issue #23).
--
-- A coordinator does NOT self-register against the FPV registry like a
-- psychologist; an admin invites them. We store only the SHA-256 hash of the
-- single-use token (never the raw value), so a database leak does not expose a
-- usable invitation. The raw token is returned once to the admin to share.
--
-- Lifecycle: pending -> accepted (consumed on sign-up) | revoked (admin) and an
-- `expires_at` cut-off. Accepting creates the coordinator row in `volunteers`.

create table coordinator_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text not null,
  token_hash text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  invited_by uuid references volunteers (id),
  volunteer_id uuid references volunteers (id),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_coordinator_invitations_status on coordinator_invitations (status);

-- Default-deny RLS: only the backend service role touches this table (admin
-- endpoints and the public accept flow both run server-side, ADR-0005). No
-- policy is defined for `authenticated`, so user-scoped clients see nothing.
alter table coordinator_invitations enable row level security;

grant all on coordinator_invitations to service_role;
