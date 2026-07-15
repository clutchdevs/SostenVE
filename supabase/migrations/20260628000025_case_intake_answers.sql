-- P5 #131: persist the requester's own intake answers so the assigned
-- psychologist can review them after accepting:
--   * intake_tags     — the symptoms chosen on the green-branch symptom screen
--                       (Paso 1); empty/absent for the red branch.
--   * urgency_answer  — the initial urgency Likert (Paso 0, "¿Cómo te sientes en
--                       este momento?", 1 = crisis … 5 = preventive).
-- Both are captured at intake and were previously only used to route/score, then
-- discarded. Nullable: existing cases keep null.

alter table cases add column if not exists intake_tags text[];
alter table cases add column if not exists urgency_answer integer;
