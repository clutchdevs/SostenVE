-- Informed-consent acceptance at registration (RF-2.1.1, Módulo 2).
-- Per-volunteer record of which bioethical-consent version was accepted and when.
-- The immutable audit_log additionally captures a `consent_accepted:{version}`
-- entry; these columns give a queryable view on the volunteer row itself.
alter table volunteers add column consent_version text;
alter table volunteers add column consent_accepted_at timestamptz;
