-- Green-branch screen 5 "Cambio de hábitos" (RF-1.3, issue #3).
--
-- Persists the recent personal-habit changes the requester reported at intake
-- (alimentación, concentración, aseo, relaciones, sueño) so the assigned
-- psychologist can see them on the case. Non-PII adaptive-stress signal; already
-- feeds the weighted urgency index (issue #24). Nullable for existing rows.
alter table cases add column habit_changes text[];
