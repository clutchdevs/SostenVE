-- Decisión Human-in-the-Loop FPV (issue #25): el coordinador accede al contenido
-- clínico de las notas (PRD §2.1), pero de forma AUDITADA: cada lectura por un
-- coordinador/admin queda registrada en audit_log ('clinical_note_read') desde la
-- capa de aplicación. Aquí solo se amplía la RLS de lectura; la PII de contacto
-- (case_contacts) sigue restringida al psicólogo asignado.

drop policy if exists clinical_notes_select on clinical_notes;
create policy clinical_notes_select on clinical_notes for select
  using (
    public.app_role() in ('coordinator', 'admin')
    or exists (
      select 1 from assignments a
      where a.case_id = clinical_notes.case_id and a.volunteer_id = public.app_uid()
    )
  );
