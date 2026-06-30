-- Complete psychologist application form (RF-2.1.2, Módulo 2).
-- Extends the minimal registration with the full PRD applicant data. Columns are
-- nullable so existing minimal/seed inserts keep working; required-ness for new
-- sign-ups is enforced by the API (Zod). `professional_id` keeps meaning the FPV
-- registration number; the personal ID is the new document_type + document_number.
alter table volunteers add column document_type text check (document_type in ('V', 'E', 'P'));
alter table volunteers add column document_number text;
alter table volunteers add column university text;
alter table volunteers add column graduation_year integer;
alter table volunteers add column pap_trained boolean;
alter table volunteers add column pap_detail text;
alter table volunteers add column colegio text;
-- Modalidades de atención: subconjunto de ('presencial','distancia').
alter table volunteers add column modalities text[];
-- Disponibilidad horaria estructurada: arreglo de { dia, bloque }.
alter table volunteers add column availability_schedule jsonb;
