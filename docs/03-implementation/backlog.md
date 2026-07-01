# Backlog de implementación — Sostén (Sistema PPV 2026)

> **Fase AI-DLC:** `03-implementation` · **Estado:** vigente · **Actualizado:** 2026-06-29
>
> Trabajo restante para completar el MVP, derivado de la brecha entre el
> [PRD de la Federación](../01-requirements/flujo-central.md) y lo ya implementado (bloques 0-7, ver
> `CHANGELOG.md`). Cada ítem de la **Sección A** es candidato a issue de GitHub; la **Sección B** son
> decisiones de la FPV (Human-in-the-Loop) que **bloquean** trabajo, no tareas que el equipo pueda
> cerrar por su cuenta; la **Sección C** está confirmada fuera del MVP.

## Convenciones
- **Prioridad:** 🔴 alta (MVP / seguridad clínica) · 🟠 media · 🟡 baja.
- **RF:** requisito funcional del PRD de la Federación al que responde.
- **Bloqueo:** dependencia que impide empezar o terminar.
- **Labels sugeridos al crear el issue:** `area:web` / `area:api` / `area:infra`, `tipo:feat` /
  `tipo:bug` / `tipo:docs` / `tipo:decisión`, `prioridad:alta|media|baja`, `bloqueado` (si aplica).

## Ya resuelto en esta sesión (2026-06-29)
- ✅ **Tests de web en verde** — `localStorage` en memoria en `apps/web/tests/setup.ts` (3 tests rojos
  de `crisis-lines` que fallaban por `localStorage.clear is not a function`).
- ✅ **README sincronizado** — la tabla "Estado" y el árbol de directorios reflejan que los bloques
  0-7 están implementados (antes decían "pendiente / solo README").

---

## Sección A — Ingeniería (accionable por el equipo)

### Épica 1 — Flujo del solicitante (intake)

#### A1 · Consentimiento informado en cada interfaz del solicitante 🔴
- **RF / fuente:** sección 8 (ética) del PRD FPV; criterio de aceptación del [flujo central](../01-requirements/flujo-central.md#6-criterios-de-aceptación).
- **Estado actual:** no existe (grep de `consentimiento`/`consent` en `apps/web` sin resultados).
- **Bloqueo parcial:** el **texto** lo define la FPV ([B4](#b4--texto-de-consentimiento-informado)); el
  **mecanismo de UI es del equipo** y puede construirse con texto provisional.
- **Criterios de aceptación:**
  - [ ] El consentimiento aparece en **cada** pantalla del solicitante (intake roja y verde, no solo al inicio).
  - [ ] No bloquea ni añade fricción al camino de riesgo alto / líneas de crisis.
  - [ ] El texto vive en config editable, no hardcodeado, para que la FPV lo cambie sin tocar código.

#### A2 · Intake offline-first: guardado local + reintento 🟠
- **RF / fuente:** Charter in-scope #1 y restricciones de conectividad; escenario "pérdida de conexión a mitad del formulario".
- **Estado actual:** hay manifest PWA pero **no hay service worker ni cola offline** (solo `localStorage`
  para sesión y caché de líneas de crisis). El fail-safe de crisis sí está.
- **Criterios de aceptación:**
  - [ ] Lo que el usuario va escribiendo en el intake se persiste localmente y sobrevive a una recarga.
  - [ ] Si el envío falla por red, se reintenta sin perder lo capturado.
  - [ ] No compromete el principio no negociable: las líneas de crisis siguen mostrándose sin backend.

#### A3 · Pantalla "Cambio de hábitos" (Rama Verde, Pantalla 5) ✅
- **RF:** RF-1.3 / Pantalla 5 del PRD (checkboxes táctiles: alimentación, concentración, aseo,
  relaciones, sueño).
- **Estado:** los checkboxes y el payload se entregaron en #24 (wizard de Rama Verde); #3 añade la
  **persistencia en el caso** (columna `cases.habit_changes`) y su visualización para el psicólogo asignado.
- **Criterios de aceptación:**
  - [x] Checkboxes de un toque para las 5 variaciones de hábitos (issue #24).
  - [x] Los valores se incluyen en el payload del intake (#24) **y se persisten en el caso** (#3,
        `cases.habit_changes`; visibles en el detalle del caso del psicólogo).

### Épica 2 — Expediente clínico (Módulo 4)

#### A4 · Formulario clínico detallado de cierre 🟠
- **RF:** RF-4.2.1 a RF-4.2.8 (toggle de contactabilidad, filtros demográficos/género, chips de
  sintomatología, medio de contacto, estrategias PAP/SMAPS, motivo y derivación de cierre, métricas de
  esfuerzo).
- **Estado actual:** el `note-form` solo tiene "Evolución / contenido" y "Diagnóstico (opcional)".
  El backend **ya** aplica RF-4.3 (bloqueo de TEPT < 4 semanas) y RF-4.2.9 (crisis psicótica → derivación
  urgente) en `add-note`.
- **Bloqueo:** el alcance offline-first depende de [B1](#b1--alcance-del-módulo-4-offline-first-sqlcipher);
  esta tarea cubre la **versión simple** (online), separable de SQLCipher.
- **Criterios de aceptación:**
  - [ ] Toggle "¿Consiguió contactar?" que bifurca cierre rápido vs. flujo clínico completo.
  - [ ] Chips de síntomas, estrategias y selectores de derivación (`derivacion_tipo` / `derivacion_destino`).
  - [ ] Métricas de horas (stepper de 0.25 h) y comentario de evolución (≤ 1500 caracteres).
  - [ ] Se respetan las reglas de seguridad ya existentes en el backend (TEPT, crisis psicótica).

### Épica 3 — Notificaciones y validación

#### A5 · Envío real de correo (reemplazar `LogNotifier`) 🟠
- **RF:** RF-3.2 (notificación de SLA por correo) y RF-2.2 (credenciales al aprobar voluntario).
- **Estado actual:** `LogNotifier` / `LogAssignmentNotifier` solo escriben al log (stand-in).
- **Criterios de aceptación:**
  - [ ] Adapter de email real detrás del puerto existente, seleccionable por config (mismo patrón que el verificador FPV).
  - [ ] El logger sigue redactando PII/datos clínicos; el correo no filtra contenido clínico.

#### A6 · Implementar `HttpFpvVerifier` real ⛔ (bloqueado)
- **RF:** RF-2.2 (validación contra el padrón de la FPV).
- **Estado actual:** `DummyFpvVerifier` (always-OK) + esqueleto `HttpFpvVerifier`; circuit breaker ya
  cae a `pending_approval` si el servicio externo falla.
- **Bloqueo:** [B2](#b2--contrato-de-la-api-del-verificador-fpv) — requiere el contrato de API de la FPV.

### Épica 4 — Despliegue y operación

#### A7 · Despliegue a producción (fase 05) 🟠
- **Fuente:** `docs/05-deployment/README.md`, ADR-0006/0009.
- **Criterios de aceptación:**
  - [ ] Vercel (funciones `/api/*`) + Supabase configurados con HTTPS y cifrado en reposo (ADR-0004).
  - [ ] Gestión de secretos fuera del código (`JWT_SECRET`, `ENCRYPTION_KEY`, `CRON_SECRET`).
  - [ ] Vercel Cron del SLA activo en producción; checklist de decisiones FPV resuelto antes de abrir al público.

#### A8 · Observabilidad y alertas (fase 06) ✅
- **Fuente:** `docs/06-monitoring/README.md`.
- **Criterios de aceptación:**
  - [x] Métricas de SLA (tiempo de asignación por nivel de riesgo) y uptime — `GET /api/v1/metrics`
        (coordinador/admin) + `uptime_seconds` en `/health`.
  - [x] Alerta cuando un caso de riesgo alto se escala sin coordinador disponible —
        `high_risk_escalated_no_coordinator` (log crítico estructurado) desde el escalamiento del cron.

---

## Sección B — Decisiones de la Federación (Human-in-the-Loop)
> No son issues "to-do" del equipo: **bloquean** trabajo de la Sección A hasta que la FPV decida.
> Conviene rastrearlas como issues etiquetados `decisión` + `bloqueado`, no como features.

#### B1 · Alcance del Módulo 4 offline-first (SQLCipher)
- **Decisión:** ¿versión simple (online) o completa offline-first (RF-4.1 SQLCipher AES-256 +
  RF-4.4 sincronización por deltas)? Desbloquea/redimensiona [A4](#a4--formulario-clínico-detallado-de-cierre).
- **Salida esperada:** un ADR que fije el nivel elegido.

#### B2 · Contrato de la API del verificador FPV
- **Decisión:** la FPV entrega el contrato (endpoint, auth, formato) del padrón. Desbloquea [A6](#a6--implementar-httpfpvverifier-real--bloqueado).

#### B3 · Pesos y umbrales finales de los tags clínicos
- **Decisión:** un psicólogo de la FPV valida pesos del índice de urgencia (RF-1.5) y el catálogo de tags
  (hoy provisional en `triage-catalog.ts`). Ver ADR-0010.

#### B4 · Texto de consentimiento informado
- **Decisión:** texto legal/ético que la app muestra en cada interfaz del solicitante. Desbloquea el
  contenido de [A1](#a1--consentimiento-informado-en-cada-interfaz-del-solicitante).

#### B5 · Plan de Supabase y respaldos (NFR 6.2)
- **Decisión + deuda técnica:** el plan gratuito **no incluye respaldos automáticos** y la propia FPV exige
  respaldo cada 6 h (NFR 6.2). Debe resolverse **antes de operar con datos clínicos reales**. Ver ADR-0002.

---

## Sección C — Confirmado fuera del MVP (Fase 2/3)
> Registrado para no perderlo; no se crean issues activos.
- **Analizador léxico-semántico de seguridad (RF-1.4)** — Fase 2.
- **Notificaciones push de la PWA** — Fase 2 (en el MVP la notificación al voluntario es por correo).
- **Webhook de Rescate Activo (RF-3.4)** — Fase 3 (depende de Defensa Civil/Bomberos).
- **SMS de dos vías / 2wT (RF-5.1)** — fuera del MVP (requiere pasarela SMS).
- **Redes LoRa/Meshtastic (RF-5.2)** — fuera del MVP (excluido por la propia FPV).
- **GIS / mapas en el panel del coordinador** — fase futura.
