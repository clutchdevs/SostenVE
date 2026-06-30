-- Seed de datos de PRUEBA para desarrollo local (se carga con `supabase db reset`).
-- NO usar en producción. Contraseñas y hashes documentados en
-- docs/04-testing/seed-data.md. Los hashes son argon2id (ver ADR-0005).
-- Idempotente: ON CONFLICT DO NOTHING para tolerar recargas.

-- Personal: 1 coordinador y 1 psicólogo, ambos activos (pueden iniciar sesión).
-- consent_version/_at backfilled con la versión borrador (RF-2.1.1) para que
-- los registros sembrados queden consistentes con el alta por consentimiento.
insert into volunteers (id, full_name, professional_id, email, specialty, role, password_hash, status, consent_version, consent_accepted_at)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'Coordinadora de Prueba',
    'FPV-COORD-001',
    'coordinador@sostenve.test',
    null,
    'coordinator',
    '$argon2id$v=19$m=19456,t=2,p=1$ykdOEgZ83oois6LECtATnQ$mfj1zbfsSYwORLSIVxNgJc65zYNrFOLXst1W5k8MlNE',
    'active',
    'v0.1.0-draft',
    now()
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Psicólogo de Prueba',
    'FPV-PSICO-001',
    'psicologo@sostenve.test',
    'psicología infantil',
    'psychologist',
    '$argon2id$v=19$m=19456,t=2,p=1$Ky7np0LE4J7g8zGA3HdtmA$lbA4d36yXbTibL6C+qdki9ZxeeuH+gNMWoQEO1AUIlU',
    'active',
    'v0.1.0-draft',
    now()
  ),
  (
    '99999999-9999-9999-9999-999999999999',
    'Administradora de Prueba',
    'FPV-ADMIN-001',
    'admin@sostenve.test',
    null,
    'admin',
    '$argon2id$v=19$m=19456,t=2,p=1$VIY6M3xruuLdP5q+wa2p7w$eYDFcQIi0TWsLi2aCVYPALzudgFrQsSxM2I/TFh6ePU',
    'active',
    'v0.1.0-draft',
    now()
  )
on conflict (id) do nothing;

-- Caso de riesgo alto en cola (resaltado en el panel del coordinador). Menor de
-- edad: al asignarlo por el cron, prioriza al psicólogo con especialidad infantil.
insert into cases (id, pseudonym_id, branch, risk_level, urgency_score, status, requester_type, zone, age, sla_expires_at)
values (
  '33333333-3333-3333-3333-333333333333',
  'seed-pseudo-pendiente',
  'roja',
  'riesgo_alto',
  100,
  'pendiente',
  'familiar',
  'Yaracuy',
  9,
  now() + interval '10 minutes'
)
on conflict (id) do nothing;

-- Caso asignado al psicólogo de prueba (para ver el portal con datos). Menor de
-- edad → la tarjeta muestra "12 años" y el cierre deriva destinatario indirecta_nino.
insert into cases (id, pseudonym_id, branch, risk_level, urgency_score, status, requester_type, zone, age)
values (
  '44444444-4444-4444-4444-444444444444',
  'seed-pseudo-asignado',
  'verde',
  'riesgo_moderado',
  10,
  'asignado',
  'familiar',
  'Yaracuy',
  12
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

-- Líneas de crisis (espejo de config/app.config.yml) para el ruteo DB-driven y el
-- CRUD admin. Las que tienen ventana horaria enrutan por hora; las demás son respaldo.
insert into crisis_lines (id, name, phone, coverage, start_hour, end_hour, priority, active)
values
  ('66666666-6666-6666-6666-666666666666', 'LAPSI', '+584242907338', '8:00–2:00', 8, 26, 10, true),
  ('77777777-7777-7777-7777-777777777777', 'Colegio de Psicólogos de Miranda', '04127840112', '2:00–8:00', 2, 8, 9, true),
  ('88888888-8888-8888-8888-888888888888', 'VEN-911', '911', 'Emergencias', null, null, 1, true)
on conflict (id) do nothing;
