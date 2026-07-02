-- Coordinator signup fields (RF-2.6.2, issue #53).
--
-- The coordinator sign-up form captures Teléfono; volunteers had no phone column
-- (case contacts do, but that is the requester's). Cédula and FPV reuse the
-- existing document_number / professional_id columns.

alter table volunteers
  add column phone text;
