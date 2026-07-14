-- Multi-role volunteers (#133): a person can hold more than one role at once
-- (e.g. a psychologist who is ALSO a coordinator). Before this, `volunteers.role`
-- was a single value and `volunteers.email` is unique, so accepting a coordinator
-- invitation for an email already registered as a psychologist failed on the
-- unique-email index. Now the same account simply gains the extra role.
--
-- `role` is kept as the PRIMARY role (used for the default post-login redirect and
-- back-compat); `roles` is the authoritative set that authorization checks against.
--
-- Written idempotently so it is safe to re-run.

alter table volunteers
  add column if not exists roles volunteer_role[] not null default array[]::volunteer_role[];

-- Backfill existing rows: everyone starts with exactly their current single role.
update volunteers set roles = array[role] where cardinality(roles) = 0;

-- Safety net: any insert/update that leaves `roles` empty inherits the primary
-- `role`, so raw inserts (seed, migrations) never end up with a role-less account.
create or replace function volunteers_default_roles() returns trigger as $$
begin
  if coalesce(cardinality(new.roles), 0) = 0 then
    new.roles := array[new.role];
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_volunteers_default_roles on volunteers;
create trigger trg_volunteers_default_roles
  before insert or update on volunteers
  for each row execute function volunteers_default_roles();
