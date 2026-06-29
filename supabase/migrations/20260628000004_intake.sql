-- Intake support (Block 3): captured age and idempotency for red-branch retries.

-- Age captured at intake (RF-1.2.2). The minor-handling rule is pending FPV input.
alter table cases add column age integer;

-- Idempotency keys so a retried red-branch POST (intermittent connectivity for a
-- person in crisis) does not create a duplicate case. Written only by the service
-- role; RLS is enabled with no policies so no user-scoped client can touch it.
create table idempotency_keys (
  key text primary key,
  response jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index idx_idempotency_keys_expires on idempotency_keys (expires_at);

alter table idempotency_keys enable row level security;
