-- Psychologist registration: residence fields (#128). Country and city of
-- residence collected at sign-up (RF-2.1.2), alongside the existing colegio.
-- Nullable so pre-existing rows and non-psychologist accounts are unaffected.
alter table volunteers
  add column if not exists pais_residencia text,
  add column if not exists ciudad_residencia text;
