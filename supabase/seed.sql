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
    'coordinador@ppv.test',
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
    'psicologo@ppv.test',
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
    'admin@ppv.test',
    null,
    'admin',
    '$argon2id$v=19$m=19456,t=2,p=1$VIY6M3xruuLdP5q+wa2p7w$eYDFcQIi0TWsLi2aCVYPALzudgFrQsSxM2I/TFh6ePU',
    'active',
    'v0.1.0-draft',
    now()
  ),
  -- Segundo psicólogo activo SIN especialidad infantil (adultos), para probar la
  -- asignación de casos de adultos y contrastar con la priorización infantil.
  -- Misma contraseña que el psicólogo de prueba (Psicologo123!).
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'Psicóloga Clínica de Adultos',
    'FPV-PSICO-002',
    'psicologo.adultos@ppv.test',
    'psicología clínica de adultos',
    'psychologist',
    '$argon2id$v=19$m=19456,t=2,p=1$Ky7np0LE4J7g8zGA3HdtmA$lbA4d36yXbTibL6C+qdki9ZxeeuH+gNMWoQEO1AUIlU',
    'active',
    'v0.1.0-draft',
    now()
  )
on conflict (id) do nothing;

-- Cuenta con DOBLE rol (#133): coordinadora que ADEMÁS es psicóloga. Sirve para
-- probar multi-rol — ve ambos portales (coordinador y psicólogo) y, como psicóloga
-- con especialidad de adultos, puede recibir casos. `role` = rol primario
-- (coordinator → redirección por defecto); `roles` lleva ambos. Contraseña:
-- Coordinador123! (mismo hash que la coordinadora de prueba).
insert into volunteers (id, full_name, professional_id, email, specialty, role, roles, password_hash, status, consent_version, consent_accepted_at)
values (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'Dual Coordinadora-Psicóloga de Prueba',
  'FPV-DUAL-001',
  'dual@ppv.test',
  'psicología clínica de adultos',
  'coordinator',
  array['coordinator', 'psychologist']::volunteer_role[],
  '$argon2id$v=19$m=19456,t=2,p=1$ykdOEgZ83oois6LECtATnQ$mfj1zbfsSYwORLSIVxNgJc65zYNrFOLXst1W5k8MlNE',
  'active',
  'v0.1.0-draft',
  now()
)
on conflict (id) do nothing;

-- Excepciones de registro (RF-2.2): psicólogos que no se validaron automáticamente
-- y esperan revisión manual del admin. Cada uno con su motivo (pending_reason).
insert into volunteers (id, full_name, professional_id, email, specialty, role, password_hash, status, pending_reason, consent_version, consent_accepted_at)
values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'María Fernanda Quintero',
    'FPV-7741',
    'mf.quintero@example.com',
    'Clínica adultos',
    'psychologist',
    'x',
    'pending_approval',
    'fpv_unreachable',
    'v0.1.0-draft',
    now()
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'José Gregorio Salas',
    'FPV-8123',
    'jg.salas@example.com',
    'Psicología infantil',
    'psychologist',
    'x',
    'pending_approval',
    'fpv_not_found',
    'v0.1.0-draft',
    now()
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'Daniela Andrade',
    'FPV-9055',
    'd.andrade@example.com',
    'Clínica adultos',
    'psychologist',
    'x',
    'pending_approval',
    'pap_not_declared',
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

-- Caso de un ADULTO asignado al psicólogo de adultos (paridad con el caso infantil
-- de arriba): puebla su portal y ejercita la asignación NO infantil. Edad 34 → el
-- motor no prioriza especialidad infantil (contraste con los casos de menores).
insert into cases (id, pseudonym_id, branch, risk_level, urgency_score, status, requester_type, zone, age)
values (
  'a5a5a5a5-a5a5-a5a5-a5a5-a5a5a5a5a5a5',
  'seed-pseudo-adulto',
  'verde',
  'riesgo_moderado',
  10,
  'asignado',
  'victima',
  'Carabobo',
  34
)
on conflict (id) do nothing;

insert into case_contacts (pseudonym_id, name, contact)
values ('seed-pseudo-adulto', 'Luis de Prueba', '+584120000001')
on conflict (pseudonym_id) do nothing;

insert into assignments (id, case_id, volunteer_id)
values (
  'a6a6a6a6-a6a6-a6a6-a6a6-a6a6a6a6a6a6',
  'a5a5a5a5-a5a5-a5a5-a5a5-a5a5a5a5a5a5',
  'dddddddd-dddd-dddd-dddd-dddddddddddd'
)
on conflict (id) do nothing;

-- Líneas de crisis (espejo de config/app.config.yml) para el ruteo DB-driven y el
-- CRUD admin. Las que tienen ventana horaria enrutan por hora; las demás son respaldo.
insert into crisis_lines (id, name, phone, coverage, start_hour, end_hour, priority, active)
values
  ('66666666-6666-6666-6666-666666666666', 'LAPSI', '+584242907338', '8:00–2:00', 8, 2, 10, true),
  ('77777777-7777-7777-7777-777777777777', 'Colegio de Psicólogos de Miranda', '04127840112', '2:00–8:00', 2, 8, 9, true),
  ('88888888-8888-8888-8888-888888888888', 'VEN-911', '911', 'Emergencias', null, null, 1, true)
on conflict (id) do nothing;
