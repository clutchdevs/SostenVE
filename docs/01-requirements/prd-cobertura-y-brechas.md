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
- ❌ Acceder a guías de Primeros Auxilios Psicológicos (PAP) asíncronas.

### Psicólogo Voluntario
- ✅ Portal exclusivo (`/psicologo`).
- ✅ Ver **solo** sus casos asignados (RLS + verificación de propiedad).
- ⚠️ Registrar diagnóstico/notas — básico; falta el formulario clínico detallado (RF-4.2.x).
- ⚠️ Formulario de cierre — solo cambia estado; falta el flujo "¿contactó? Sí/No" del PRD.
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
- ⚠️ Auditar accesos — `audit_log` inmutable (RLS + trigger) existe, pero **sin endpoint/UI** de consulta.
- ⚠️ CRUD de líneas de crisis — tabla `crisis_lines` + RLS listos, pero el ruteo activo lee de
  `config/app.config.yml`, no de la tabla; faltan los endpoints admin.

## 2. Matriz de datos sensibles (PRD §2.1)
- ✅ Seudonimización de PII (PII separada; admin no ve PII/clínico) — ADR-0011 + RLS.
- ✅ Cifrado de notas clínicas en reposo (AES-256-GCM) — ADR-0004.
- ⚠️ **Divergencia a resolver (Human-in-the-Loop FPV):** el PRD otorga al **coordinador** acceso a
  **todas las notas clínicas**; nuestra implementación (charter/threat-model) lo **restringe** a
  estado/prioridad sin contenido clínico. Decidir cuál prevalece.

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
- ❌ RF-2.1.1 Consentimiento informado obligatorio (checkbox + texto bioético).
- ⚠️ RF-2.1.2 Formulario de registro — mínimo (nombre, cédula/`professional_id`, email, especialidad,
  disponibilidad, contraseña); faltan tipo de documento, FPV separado de cédula, universidad, año,
  PAP + detalle, colegio, etc.
- ✅ RF-2.2 Validación contra FPV vía **Adapter** (dummy always-OK; HTTP pendiente de contrato, ADR-0013);
  ⚠️ falta la regla exacta `cédula+FPV ∧ PAP=Sí → Activo` (hoy decide el verifier).
- ✅ Estados `active` / `pending_approval` / `inactive`.
- ⚠️ RF-2.2.4 Credenciales + correo de bienvenida — `LogNotifier` (stand-in); la contraseña la pone el
  usuario (no se autogenera de alta entropía).
- ❌ RF-2.5 Presencia en tiempo real (Redis/heartbeat).
- ❌ RF-2.6 Registro de coordinadores por token de invitación.
- ⚠️ RF-2.7 Login con bloqueo por 5 intentos — hay rate-limit/lockout configurable, pero no ruta
  separada `/login-coordinador` ni expiración de sesión por inactividad.

### Módulo 3 — Asignación y SLA
- ✅ RF-3.1 Asignación por prioridad (riesgo alto primero) + especialidad infantil por edad.
- ⚠️ Filtro de elegibilidad — usa estado `Activo`; **falta** el filtro `Online` (presencia).
- ✅ RF-3.2 SLA de 10 min (se fija `sla_expires_at`).
- ✅ RF-3.3 Escalamiento automático (revoca, vuelve a la cola, notifica coordinadores) vía cron.
- ⚠️ Notificación — `LogNotifier`; faltan push PWA y correo reales.

### Módulo 4 — Panel del psicólogo y expediente clínico
- ❌ RF-4.1 Offline-first + SQLCipher — fuera del MVP.
- ⚠️ RF-4.2 Registro clínico — notas básicas + cierre simple; ✅ RF-4.3 (bloqueo TEPT < 4 semanas) y
  ✅ RF-4.2.9 (crisis psicótica → derivación urgente + sube riesgo). Faltan: contactabilidad Sí/No,
  sexo/demografía, sintomatología-chips, técnicas SMAPS, derivación (tipo/destino), métricas de horas.
- ❌ RF-4.3 (toggle disponibilidad) y RF-4.4 (sync por deltas).

## 4. Brechas — TODO

### A. Fuera del MVP (decisiones documentadas; no son omisiones)
- [ ] Offline-first / SQLCipher (RF-4.1) y sync por deltas (RF-4.4) — Módulo 4 completo.
- [ ] Analizador léxico-semántico (RF-1.4) — Fase 2.
- [ ] Geo-clustering / panel georreferenciado del coordinador.
- [ ] Notificaciones push PWA y correo SMTP reales (hoy `LogNotifier`).
- [ ] Webhook de Rescate Activo (RF-3.4) y SMS de dos vías (RF-5.1) — Fase 3.

### B. Pendientes dentro del alcance del MVP (esperables por el PRD)
- [ ] **Módulo 2 — Consentimiento informado** obligatorio (RF-2.1.1) con el texto bioético del PRD.
- [ ] **Módulo 2 — Formulario de postulación completo** (RF-2.1.2): tipo doc, FPV, universidad, año,
      PAP + detalle, colegio, multiselect de modalidad, disponibilidad horaria.
- [ ] **Módulo 2 — Alta automática real:** generar contraseña de alta entropía + correo de bienvenida;
      regla `cédula+FPV ∧ PAP → Activo`.
- [ ] **Presencia en tiempo real** (RF-2.5 / RF-3.1): heartbeat + estado `Online` y filtro de
      asignación por presencia. (Requiere un store compartido; ver nota de Redis/Upstash.)
- [ ] **Catálogo clínico real de tags** (duelo, infancia, disociación, etc.) validado por la FPV.
- [ ] **Expediente clínico de cierre completo** (RF-4.2.2–4.2.8): contactabilidad Sí/No, demografía,
      sintomatología-chips, técnicas SMAPS, derivación (tipo/destino), métricas de horas.
- [ ] **Acciones del coordinador:** reasignar/cerrar manual de casos + notas confidenciales sobre
      voluntarios (RF-2.4); mover la gestión de voluntarios al rol **coordinador** (PRD §2/RF-2.3).
- [ ] **Endpoints admin:** CRUD de líneas de crisis (que el ruteo lea de BD) y consulta de auditoría.
- [ ] **Guías PAP asíncronas** para el solicitante.
- [ ] **Registro/login de coordinador por token** (RF-2.6) y expiración de sesión por inactividad (RF-2.7).
- [ ] **Índice de urgencia ponderado** completo (RF-1.5) y pantallas faltantes de Rama Verde
      (ubicación, cambio de hábitos).

### C. Decisión pendiente (Human-in-the-Loop FPV)
- [ ] **Acceso del coordinador a notas clínicas:** el PRD dice "todas"; nuestra implementación lo
      restringe. Confirmar la política y alinear RLS + endpoints.

## Cómo mantener este documento
Marcar las casillas conforme se implementen; cada brecha cerrada debería referenciar su bloque/ADR y
quedar reflejada en el `CHANGELOG.md`.
