# Cobertura del PRD (Sistema PPV 2026) y brechas — mapa de TODO

> **Fase AI-DLC:** `01-requirements`  ·  **Estado:** vivo (actualizar conforme se cierren brechas)
> **Fuente:** `Documento de Requisitos de Producto (PRD).pdf` (FPV) · **Evaluado:** 2026-06-29
> Trazabilidad de lo construido (Bloques 0–7) contra el PRD. Leyenda: ✅ hecho · ⚠️ parcial · ❌ falta.

## Resumen
El **imperativo clínico** del PRD —ninguna vida en riesgo crítico depende de revisión manual— está
cumplido: líneas de crisis inmediatas con fail-safe en cliente, triage que escala a riesgo alto, y
**SLA de 10 min con escalamiento automático por Vercel Cron**. El RBAC del código usa los 4 roles del
PRD (`requester`, `psychologist`, `coordinator`, `admin`). Los huecos principales están en el
**Módulo 2** (consentimiento + registro completo de psicólogos), la **presencia en tiempo real**, el
**expediente clínico detallado** y varias **acciones de coordinador/admin**.

## 1. Cobertura por rol (PRD §2)

### Solicitante (Civil/Afectado)
- ✅ Registrar solicitud (intake de baja fricción: Likert → ramas roja/verde).
- ✅ Visualizar líneas de crisis instantáneas (con fail-safe de caché/embebido en cliente).
- ✅ Acceder a **guías de Primeros Auxilios Psicológicos (PAP) asíncronas** (issue #22): contenido
  **versionado** en `config/app.config.yml`, expuesto por `GET /pap` (público, sin BD) y página
  `/guias` enlazada desde inicio, intake y la confirmación de Rama Verde. Texto provisional pendiente FPV.

### Psicólogo Voluntario
- ✅ Portal exclusivo (`/psicologo`).
- ✅ Ver **solo** sus casos asignados (RLS + verificación de propiedad).
- ✅ Ver la **identidad** del solicitante (nombre/teléfono/edad) de su caso asignado (PRD §2.1).
- ✅ Registrar diagnóstico/notas + **expediente de cierre estructurado** (RF-4.2 online).
- ✅ Formulario de cierre con flujo "¿contactó? Sí/No" → cierre rápido o clínico completo.
- ✅ **Máquina de estados** correcta: aceptar solo desde `asignado` (una vez); cierre terminal; `cerrado` solo lectura.
- ❌ Portal **offline-first** con SQLCipher (RF-4.1) — decisión: fuera del MVP.
- ❌ Presencia en tiempo real (heartbeat/Redis, RF-2.5).

### Coordinador de Turno
- ✅ Monitorear panel de casos (prioridad de riesgo alto + capacidad + polling).
- ✅ Alertas de SLA vencido (visual + escalamiento por cron).
- ❌ Panel **georreferenciado** (mapas) — fuera de alcance (geo pospuesto).
- ❌ **Reasignar/cerrar** manualmente casos (hoy solo el cron reasigna).
- ⚠️ Gestión de voluntarios (aprobar/suspender) — implementado bajo rol **`admin`**; el PRD lo asigna al **coordinador**.
- ❌ Notas confidenciales sobre voluntarios (RF-2.4).

### Administrador (Federación)
- ✅ Resolver excepciones de validación de psicólogos (`approve`/`reject`).
- ✅ Auditar accesos — `audit_log` inmutable (RLS + trigger) + **endpoint** `GET /admin/audit` (filtros por acción/registro/usuario).
- ✅ CRUD de líneas de crisis — endpoints admin (`/admin/crisis-lines`, soft-delete, auditado) y el **ruteo activo lee de la BD** con fallback a `config` (fail-safe).

## 2. Matriz de datos sensibles (PRD §2.1)
- ✅ Seudonimización de PII (PII separada; admin no ve PII/clínico) — ADR-0011 + RLS.
- ✅ Cifrado de notas clínicas en reposo (AES-256-GCM) — ADR-0004.
- ✅ **Acceso del coordinador a notas clínicas (issue #25 — resuelto):** el coordinador/admin accede al
  contenido clínico de forma **auditada** (cada lectura registra `clinical_note_read` en `audit_log`),
  alineado con el PRD; la **PII de contacto** sigue restringida al psicólogo asignado.

## 3. Cobertura por módulo funcional (PRD §3)

### Módulo 1 — Intake y triage
- ✅ RF-1.1 Triage-first (Likert one-tap, sin PII en el primer paso).
- ✅ RF-1.2 Rama Roja con 3 sub-canales (llamar / recibir-llamada / WhatsApp).
- ✅ RF-1.2.1 Ruteo dinámico por hora (LAPSI 8:00–2:00 / Miranda 2:01–7:59, con cruce de medianoche).
- ✅ RF-1.3 Rama Verde con tags por severidad (motor); ⚠️ **catálogo provisional** (faltan duelo/infancia/disociación completos del PRD).
- ✅ Regla de interrupción (1 rojo o 3+ naranja → riesgo alto).
- ⚠️ RF-1.5 Índice de urgencia — suma ponderada simple; falta la fórmula completa `U = w_id·I_ideacion + …`.
- ❌ RF-1.4 Analizador léxico-semántico — Fase 2.
- ⚠️ Rama Verde pantallas: faltan ubicación/geolocalización y "cambio de hábitos" (pantalla 5).

### Módulo 2 — Registro y validación de psicólogos
- ✅ RF-2.1.1 Consentimiento informado obligatorio: checkbox que bloquea el alta, texto bioético
  **versionado** en `config/app.config.yml` (expuesto por `GET /consent/active`) y aceptación
  auditable (versión + timestamp en `volunteers` y en `audit_log`). El texto es **provisional**
  (borrador `v0.1.0-draft`) a la espera del oficial de la FPV (sección 8 del PRD); se cambia sin tocar código.
- ✅ RF-2.1.2 Formulario de postulación completo: tipo + número de documento (cédula) separados del
  `professional_id` (= nº FPV), universidad, año de egreso, colegio, PAP (sí/no) + detalle obligatorio,
  modalidad (multiselect presencial/distancia) y disponibilidad horaria estructurada (día × bloque).
  Persistido en `volunteers` (migración `…0008`, columnas nullable) y validado en la API (Zod).
- ✅ RF-2.2 Validación contra FPV vía **Adapter** (dummy always-OK; HTTP pendiente de contrato, ADR-0013)
  con la regla de activación automática `cédula+FPV ∧ PAP=Sí → Activo` (si no, queda `pending_approval`).
- ✅ Estados `active` / `pending_approval` / `inactive`.
- ✅ RF-2.2.4 Credenciales + correo de bienvenida — contraseña **autogenerada** de alta entropía
  (el usuario no la elige), entregada por **correo de bienvenida** vía `SmtpNotifier` (nodemailer,
  seleccionable por config `email.provider`; `log` por defecto). La aprobación por admin reemite y
  reenvía credenciales. ⚠️ Pendiente: flujo de cambio/reseteo de contraseña (la temporal viaja en claro).
- ❌ RF-2.5 Presencia en tiempo real (Redis/heartbeat).
- ✅ RF-2.6 Registro de coordinadores por **token de invitación** (issue #23): el admin invita
  (`/admin/coordinators/invitations`), se persiste solo el hash del token (un solo uso, con TTL) y el
  invitado lo canjea en `/coordinators/accept-invitation` para activarse como coordinador; auditado.
- ✅ RF-2.7 Login con bloqueo por 5 intentos (rate-limit/lockout configurable) **+ expiración de
  sesión por inactividad** (`security.session.idle_timeout_minutes`, enforce en cliente sobre el `exp`
  del JWT) **+ ruta separada `/login-coordinador`** (issue #23).

### Módulo 3 — Asignación y SLA
- ✅ RF-3.1 Asignación por prioridad (riesgo alto primero) + especialidad infantil por edad.
- ⚠️ Filtro de elegibilidad — usa estado `Activo`; **falta** el filtro `Online` (presencia).
- ✅ RF-3.2 SLA de 10 min (se fija `sla_expires_at`).
- ✅ RF-3.3 Escalamiento automático (revoca, vuelve a la cola, notifica coordinadores) vía cron.
- ⚠️ Notificación — `LogNotifier`; faltan push PWA y correo reales.

### Módulo 4 — Panel del psicólogo y expediente clínico (versión online ✅)
- ❌ RF-4.1 Offline-first + SQLCipher — fuera del MVP.
- ✅ RF-4.2 Registro clínico / cierre estructurado (online): contactabilidad Sí/No, demografía (sexo,
  destinatario derivado), sintomatología-chips, medio de contacto, técnicas SMAPS, motivo de cierre,
  **derivación tipo+destino**, horas y comentario. Identidad del solicitante visible para el asignado.
- ✅ RF-4.3 (bloqueo TEPT < 4 semanas) y ✅ RF-4.2.9 (crisis psicótica → derivación urgente + sube riesgo).
- ✅ Máquina de estados: aceptar (solo `asignado`, una vez) → aceptado → cierre (terminal) → solo lectura.
- ✅ RF-4.2.4: la ideación suicida registra alerta de seguimiento (auditoría).
- ❌ RF-4.3 PWA (toggle disponibilidad) y RF-4.4 (sync por deltas) — pendientes (presencia/offline).

## 4. Brechas — TODO

### A. Fuera del MVP (decisiones documentadas; no son omisiones)
- [ ] Offline-first / SQLCipher (RF-4.1) y sync por deltas (RF-4.4) — Módulo 4 completo.
- [ ] Analizador léxico-semántico (RF-1.4) — Fase 2.
- [ ] Geo-clustering / panel georreferenciado del coordinador.
- [ ] Notificaciones push PWA y correo SMTP reales (hoy `LogNotifier`).
- [ ] Webhook de Rescate Activo (RF-3.4) y SMS de dos vías (RF-5.1) — Fase 3.

### B. Pendientes dentro del alcance del MVP (esperables por el PRD)
- [x] **Módulo 2 — Consentimiento informado** obligatorio (RF-2.1.1) — mecanismo completo con texto
      provisional versionado; pendiente sustituir por el texto bioético oficial de la FPV.
- [x] **Módulo 2 — Formulario de postulación completo** (RF-2.1.2): tipo doc, FPV, universidad, año,
      PAP + detalle, colegio, multiselect de modalidad, disponibilidad horaria.
- [x] **Módulo 2 — Alta automática real:** contraseña de alta entropía autogenerada + correo de
      bienvenida (SmtpNotifier); regla `cédula+FPV ∧ PAP → Activo`. Pendiente: cambio/reseteo de contraseña.
- [ ] **Presencia en tiempo real** (RF-2.5 / RF-3.1): heartbeat + estado `Online` y filtro de
      asignación por presencia. (Requiere un store compartido; ver nota de Redis/Upstash.)
- [ ] **Catálogo clínico real de tags** (duelo, infancia, disociación, etc.) validado por la FPV.
- [x] **Expediente clínico de cierre completo** (RF-4.2.2–4.2.8): contactabilidad Sí/No, demografía,
      sintomatología-chips, técnicas SMAPS, derivación (tipo/destino), métricas de horas. ✅ (versión online)
- [ ] **Acciones del coordinador:** reasignar/cerrar manual de casos + notas confidenciales sobre
      voluntarios (RF-2.4); mover la gestión de voluntarios al rol **coordinador** (PRD §2/RF-2.3).
- [x] **Endpoints admin (issue #21):** CRUD de líneas de crisis (`/admin/crisis-lines`, soft-delete, auditado;
      el ruteo activo lee de BD con fallback a config) y consulta de auditoría (`GET /admin/audit`).
- [x] **Guías PAP asíncronas** para el solicitante (issue #22): contenido versionado en config,
      `GET /pap` y página `/guias` enlazada desde el intake. Texto provisional pendiente de la FPV.
- [x] **Registro/login de coordinador por token (issue #23):** invitación por token de un solo uso
      (hash en BD, TTL, auditada), canje en `/coordinators/accept-invitation` (RF-2.6); expiración de
      sesión por inactividad (`security.session.idle_timeout_minutes`) y ruta `/login-coordinador` (RF-2.7).
- [ ] **Índice de urgencia ponderado** completo (RF-1.5) y pantallas faltantes de Rama Verde
      (ubicación, cambio de hábitos).

### C. Decisión resuelta (Human-in-the-Loop FPV)
- [x] **Acceso del coordinador a notas clínicas (issue #25):** resuelto → acceso **auditado**. La RLS de
      `clinical_notes` amplía la lectura a coordinator/admin y cada acceso registra `clinical_note_read`;
      la PII de contacto sigue restringida al psicólogo asignado.

## Cómo mantener este documento
Marcar las casillas conforme se implementen; cada brecha cerrada debería referenciar su bloque/ADR y
quedar reflejada en el `CHANGELOG.md`.
