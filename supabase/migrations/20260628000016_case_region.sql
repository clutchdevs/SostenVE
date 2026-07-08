-- Regional cluster for assignment (RF-3.1, issue #51).
--
-- The green-branch intake captures the requester's Estado (location screen). We
-- persist it as `region` so the assignment engine can PREFER psychologists of the
-- same regional cluster ("clúster regional del afectado"). It is a preference,
-- not a hard filter: a case is never stranded if nobody in-region is online. The
-- red branch does not collect location, so its cases have a null region.

alter table cases
  add column region text;
