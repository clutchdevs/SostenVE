-- Child-specialty routing signal (RF-1.3, issue #50).
--
-- When the green-branch intake includes "Infancia" tags (mutism, child
-- dysregulation, child psychoeducation, sleep regression), the case should be
-- routed preferentially to a psychologist with a child specialty — not only when
-- the requester is a minor. We persist a boolean computed server-side at intake
-- so the assignment engine can prefer child specialists without re-reading tags.

alter table cases
  add column requires_child_specialty boolean not null default false;
