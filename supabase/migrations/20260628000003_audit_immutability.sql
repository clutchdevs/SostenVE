-- Audit log immutability (ADR-0012).
-- RLS already denies UPDATE/DELETE for normal roles (no policy granted). This
-- trigger is defense-in-depth: it raises on any UPDATE/DELETE, blocking even the
-- table owner / service role. (A superuser could disable triggers, which is out
-- of scope for application-level guarantees.)

create or replace function public.prevent_audit_mutation() returns trigger
  language plpgsql
  as $$
begin
  raise exception 'audit_log is append-only: % is not allowed', tg_op
    using errcode = 'check_violation';
end;
$$;

create trigger audit_log_no_update
  before update on audit_log
  for each row execute function public.prevent_audit_mutation();

create trigger audit_log_no_delete
  before delete on audit_log
  for each row execute function public.prevent_audit_mutation();
