-- Seed de datos de PRUEBA para desarrollo local (se carga con `supabase db reset`).
-- NO usar en producción. Contraseñas y hashes documentados en
-- docs/04-testing/seed-data.md. Los hashes son argon2id (ver ADR-0005).
-- Idempotente: ON CONFLICT DO NOTHING para tolerar recargas.

-- Personal: 1 coordinador y 1 psicólogo, ambos activos (pueden iniciar sesión).
insert into volunteers (id, full_name, professional_id, email, specialty, role, password_hash, status)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'Coordinadora de Prueba',
    'FPV-COORD-001',
    'coordinador@sostenve.test',
    null,
    'coordinator',
    '$argon2id$v=19$m=19456,t=2,p=1$ykdOEgZ83oois6LECtATnQ$mfj1zbfsSYwORLSIVxNgJc65zYNrFOLXst1W5k8MlNE',
    'active'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Psicólogo de Prueba',
    'FPV-PSICO-001',
    'psicologo@sostenve.test',
    'psicología infantil',
    'psychologist',
    '$argon2id$v=19$m=19456,t=2,p=1$Ky7np0LE4J7g8zGA3HdtmA$lbA4d36yXbTibL6C+qdki9ZxeeuH+gNMWoQEO1AUIlU',
    'active'
  )
on conflict (id) do nothing;

-- Caso de riesgo alto en cola (visible y resaltado en el panel del coordinador).
insert into cases (id, pseudonym_id, branch, risk_level, urgency_score, status, sla_expires_at)
values (
  '33333333-3333-3333-3333-333333333333',
  'seed-pseudo-pendiente',
  'roja',
  'riesgo_alto',
  100,
  'pendiente',
  now() + interval '10 minutes'
)
on conflict (id) do nothing;

-- Caso asignado al psicólogo de prueba (para ver el portal con datos).
insert into cases (id, pseudonym_id, branch, risk_level, urgency_score, status, requester_type, zone)
values (
  '44444444-4444-4444-4444-444444444444',
  'seed-pseudo-asignado',
  'verde',
  'riesgo_moderado',
  10,
  'asignado',
  'familiar',
  'Yaracuy'
)
on conflict (id) do nothing;

insert into case_contacts (pseudonym_id, name, contact)
values ('seed-pseudo-asignado', 'Ana de Prueba', '+584120000000')
on conflict (pseudonym_id) do nothing;

insert into assignments (id, case_id, volunteer_id)
values (
  '55555555-5555-5555-5555-555555555555',
  '44444444-4444-4444-4444-444444444444',
  '22222222-2222-2222-2222-222222222222'
)
on conflict (id) do nothing;
