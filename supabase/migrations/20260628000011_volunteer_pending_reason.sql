-- Registration exception reason (RF-2.2 exception case): when a volunteer lands
-- in `pending_approval` instead of being auto-activated, record WHY so the admin
-- review screen ("Excepciones de registro") can explain it. Nullable: active and
-- pre-existing rows have no reason.
alter table volunteers add column pending_reason text;
