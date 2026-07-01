# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato se basa en [Keep a Changelog 1.1.0](https://keepachangelog.com/es-ES/1.1.0/)
y este proyecto adhiere a [Versionado Semántico](https://semver.org/lang/es/).

## [No publicado]
### Seguridad
- **Acceso del coordinador a notas clínicas (issue #25, decisión FPV):** resuelto como acceso
  **auditado**. La RLS de `clinical_notes` amplía la lectura a coordinator/admin y `GET /cases/:id`
  les devuelve las notas y el cierre (sin PII de contacto, que sigue restringida al psicólogo
  asignado); cada lectura registra `clinical_note_read` en el `audit_log` inmutable. Actualizados
  charter, threat-model y clasificación de datos.

### Añadido
- **Módulo 1 — Índice de urgencia ponderado completo + pantallas de Rama Verde (issue #24, RF-1.5/RF-1.3):**
  el índice pasó de suma simple a la fórmula `U = w_id·I_ideacion + Σ peso(tag) + w_hab·n_cambios_habito`,
  con un término de **ideación dominante** (cualquier tag rojo lleva el caso a la cima de la cola) y un
  aporte menor por **cambios de hábito**. El **motor de asignación ahora drena la cola por urgencia**
  (mayor primero, FIFO en empate); los casos de Rama Roja comparten el nivel de ideación. La **Rama Verde**
  se volvió un **flujo por pantallas**: síntomas → **ubicación** (estado + ciudad, menús de selección
  rápida) → **cambio de hábitos** (pantalla 5) → contacto. Pesos aislados y pendientes de validación FPV;
  pendiente la autodetección por geolocalización del dispositivo.
- **Acciones del coordinador (issue #20, RF-2.3 / RF-2.4):** el coordinador ahora actúa sobre casos y
  voluntarios. **Casos:** reasignación manual a un psicólogo activo (`POST /cases/:id/reassign`, resetea
  el SLA en riesgo alto y notifica) y **cierre administrativo** con motivo (`POST /cases/:id/coordinator-close`),
  ambos auditados y disponibles desde el board (`/coordinador`). **Voluntarios:** la gestión
  (aprobar/suspender) se **abre al rol `coordinador`** además del admin, y se añaden **notas confidenciales**
  sobre cada voluntario (RF-2.4) en la nueva tabla `volunteer_notes` (migración `20260628000012`, RLS solo
  coordinador/admin, `GET/POST /volunteers/:id/notes`). Nueva página `/coordinador/voluntarios`. La
  auditoría registra el rol real del actor.
- **Módulo 1 — Guías de Primeros Auxilios Psicológicos (PAP) asíncronas (issue #22):** autoayuda para
  el solicitante con contenido **versionado** en `config/app.config.yml` (provisional `v0.1.0-draft`
  hasta el oficial de la FPV), expuesto por `GET /pap` (público, sin BD, instantáneo aun con backend
  frío). Nueva página web `/guias` (acordeón de guías con pasos) enlazada desde el inicio, la pantalla
  de intake y la confirmación de la Rama Verde, con aviso de que no reemplaza la atención profesional y
  acceso a líneas de crisis.
- **Módulo 2 — Registro/login de coordinador por token + expiración por inactividad (issue #23,
  RF-2.6 / RF-2.7):** los coordinadores ya no se autorregistran contra el padrón FPV; un admin los
  **invita por token**. El admin emite la invitación (`POST /admin/coordinators/invitations`), que
  genera un token de un solo uso de alta entropía del que solo se persiste su **hash SHA-256**
  (migración `20260628000010`, RLS default-deny); el token en claro se devuelve **una sola vez** y se
  envía por correo (`Notifier.notifyCoordinatorInvitation`). El invitado lo canjea en
  `POST /coordinators/accept-invitation` para fijar su contraseña y quedar **coordinador `active`** sin
  pasar por la verificación FPV. Listado y revocación (`GET` / `DELETE .../:id`), todo **auditado**
  (`coordinator_invited` / `_accepted` / `_revoked`). **Expiración de sesión por inactividad** (RF-2.7):
  nueva config `security.session.idle_timeout_minutes` (15 min) aplicada en el cliente con seguimiento
  de actividad (`SessionGuard`) sobre la expiración absoluta del JWT. Web: panel admin para invitar y
  gestionar invitaciones, página pública `/registro-coordinador` (activación por enlace) y ruta de
  acceso dedicada `/login-coordinador`.
- **Módulo 2 — Alta automática real (RF-2.2.4 / RF-2.2):** la contraseña ya no la elige el usuario;
  se **autogenera** con alta entropía (24 bytes, base64url) y se entrega por un **correo de bienvenida**
  real vía `SmtpNotifier` (nodemailer), seleccionable por config `email.provider` (`log` por defecto
  para tests/dev; `smtp` para envío real, p. ej. contra el Inbucket de Supabase en local). Regla de
  **activación automática** `cédula+FPV ∧ PAP=Sí → Activo` (si no, `pending_approval`). La **aprobación**
  por un admin reemite una contraseña nueva y reenvía las credenciales para no dejar la cuenta bloqueada.
  El formulario `/registro` ya no pide contraseña.
- **Endpoints admin (issue #21):** CRUD de líneas de crisis (`GET/POST /admin/crisis-lines`,
  `PATCH/DELETE /admin/crisis-lines/:id`) con **soft-delete** (desactivación) y **auditoría** de cada
  cambio; y consulta del log de auditoría (`GET /admin/audit`, filtros por acción/registro/usuario). El
  **ruteo de líneas de crisis** (`GET /crisis-lines/active`) ahora **lee de la BD** (fuente gestionada por
  el admin) con **fallback a `config`** si la BD no responde o está vacía (fail-safe). Seed con líneas de
  crisis y un usuario administrador (`admin@sostenve.test`). Panel web `/admin` para gestionar líneas y
  ver la auditoría.
- **Módulo 2 — Formulario de postulación completo (RF-2.1.2):** el registro de psicólogos recoge ahora
  todos los datos del PRD — tipo + número de documento (cédula) separados del nº de inscripción FPV
  (`professional_id`), universidad, año de egreso, colegio, formación PAP (sí/no con detalle
  obligatorio), modalidad de atención (multiselect presencial/distancia) y disponibilidad horaria
  estructurada (día × bloque mañana/tarde/noche). Persistido en `volunteers` (migración
  `20260628000008`, columnas nullable para compatibilidad) y validado en la API con Zod. La página
  web `/registro` se amplía con los nuevos campos y bloquea el envío hasta completar modalidad y
  disponibilidad.
- **Módulo 2 — Consentimiento informado obligatorio (RF-2.1.1):** el registro de psicólogos exige
  aceptar el consentimiento bioético antes del alta. Texto **versionado** y editable en
  `config/app.config.yml` (provisional `v0.1.0-draft` hasta el oficial de la FPV), expuesto por
  `GET /consent/active`. El backend bloquea el alta sin aceptación (`consentimiento` obligatorio) y
  rechaza versiones obsoletas; la aceptación queda **auditable** (versión + timestamp en `volunteers`
  y entrada `consent_accepted:{versión}` en el `audit_log` inmutable). Nueva página web `/registro`
  con la casilla que bloquea el envío hasta marcarla.
- **Módulo 4 (online) — Panel del Psicólogo y Expediente Clínico:** el detalle de caso muestra la
  **identidad del solicitante** (nombre/teléfono/edad) al psicólogo asignado; **máquina de estados**
  correcta (aceptar solo desde `asignado` y una vez; cierre terminal; `cerrado` en solo lectura) con
  guardas 409 en el backend; **cierre clínico estructurado** (RF-4.2): contactabilidad Sí/No → cierre
  rápido o flujo clínico (sexo, síntomas, técnicas SMAPS, derivación tipo+destino, horas, comentario).
  Nueva tabla `case_closures` (RLS, comentario cifrado); endpoint `POST /cases/:id/close` (reemplaza el
  PATCH genérico). La ideación suicida registra alerta de seguimiento.
- **Seed de pruebas local** (`supabase/seed.sql`, se carga con `db reset`): coordinador y psicólogo
  de prueba (login funcional, hashes argon2id) + casos de ejemplo (uno de riesgo alto en cola y uno
  asignado al psicólogo). Credenciales documentadas en `docs/04-testing/seed-data.md`.
- **Swagger UI / OpenAPI runtime:** `GET /api/v1/docs` (Swagger UI interactivo) y
  `GET /api/v1/openapi.json` (OpenAPI 3.1 generado en código, reutilizando los esquemas Zod) con todos
  los endpoints implementados. La CSP estricta se relaja solo en la página `/docs`.
- **Tooling de desarrollo local:** `docker-compose.yml` (servicios `installer` + `api` + `web`) que
  levanta la app apuntando al Supabase local; scripts `npm run dev:up` / `dev:down` / `dev:reset` que
  orquestan Supabase + la app en un comando; y `DEVELOPMENT.md` con la guía de arranque, base de
  datos, pruebas y troubleshooting.
- **Bloque 0 — Fundaciones:** monorepo npm workspaces (`apps/api`, `apps/web`), TypeScript estricto
  compartido, ESLint + Prettier, config singleton (`config/app.config.yml` validado con Zod),
  cliente Supabase lazy, app Hono con `GET /api/v1/health`, shell Next.js (App Router), CI en
  GitHub Actions y `CONTRIBUTING.md`.
- **Bloque 1 — Dominio de triage (núcleo de seguridad):** value objects `Severity`, `RiskLevel`,
  `SymptomTag`; clasificación de riesgo por estrategias (regla de interrupción 1 rojo / 3+ naranja);
  índice de urgencia ponderado (RF-1.5); reglas clínicas RF-4.3 (bloqueo de diagnóstico TEPT < 30
  días) y RF-4.2.9 (Crisis Psicótica Aguda fuerza derivación URGENTE); catálogo de tags provisional
  (pendiente FPV). Dominio puro, sin dependencias de infraestructura.
- **Bloque 1.5 — Seguridad transversal de API:** hashing argon2id, JWT con `jose` (access/refresh,
  revocación por token version + denylist), rate limiter con store inyectable, jerarquía de errores
  de API, y middlewares Hono (CORS estricto, security headers, rate limit, validación Zod en el
  borde, auth por rol, manejo central de errores).

- **Bloque 2 — Datos en Supabase + seudonimización y auditoría:** migraciones SQL versionadas
  (`supabase/migrations`) con el esquema (`cases`, `case_contacts` PII separada, `volunteers`,
  `assignments`, `clinical_notes`, `crisis_lines`, `audit_log`); políticas RLS por rol; `audit_log`
  inmutable (RLS + trigger); generador de ID seudonimizado HMAC-SHA256 (ADR-0011); cifrado de
  columnas clínicas AES-256-GCM (ADR-0004); factory de clientes Supabase (service/usuario) y adapters
  de repositorio (puertos en el dominio). Tooling: Supabase CLI local sobre Docker.

- **Bloque 7 — Pruebas integrales, carga y piloto:** scaffold de **Playwright** (`apps/web/e2e/`) con
  specs del camino crítico —incluido `crisis-failsafe` que verifica que las líneas de crisis se
  muestran aunque la API esté caída—; prueba de **carga** con **autocannon** (`scripts/load-test.mjs`,
  `npm run load-test`) sobre el intake; y `docs/04-testing/README.md` con la estrategia de pruebas,
  el **checklist del threat model** (verificación manual) y el plan de piloto. Los e2e/carga se corren
  en CI/preview (no descargan navegadores en este repo).
- **Bloque 6 — Frontend (PWA) + endpoints de casos/coordinador:**
  - Backend: endpoints `GET /api/v1/cases` (psicólogo→propios; coordinador/admin→todos, riesgo alto
    primero), `GET /cases/:id` (detalle + notas, solo asignado), `POST /cases/:id/notes` (RF-4.3 bloquea
    TEPT < 4 semanas; RF-4.2.9 crisis psicótica → derivación urgente + sube riesgo + auditoría),
    `PATCH /cases/:id` (cerrar) y `GET /coordinator/capacity`. Config `clinical_records.event_date`.
  - Frontend (`apps/web`, Next.js + Tailwind): intake (Likert → ramas roja/verde con tags táctiles),
    portal del psicólogo (casos, detalle, notas, aceptar/cerrar), panel del coordinador (prioridad de
    riesgo alto + SLA + capacidad, polling), login. **Fail-safe de líneas de crisis** en el cliente
    (caché + lista embebida: siempre se muestran aunque la API falle). Servidor de API local
    (`@hono/node-server`) para desarrollo. asignación de casos `pendiente` a
  voluntarios activos por compatibilidad (prioridad infantil para menores), cola honesta cuando no
  hay voluntario; `POST /api/v1/cases/:id/accept` (detiene el SLA); `GET|POST /api/v1/cron/check-sla`
  protegido por `CRON_SECRET` que asigna pendientes y **escala** casos de riesgo alto vencidos (revoca,
  vuelve a la cola, notifica a coordinadores); `vercel.json` con el cron cada 2 min. Las consultas del
  cron sirven de ping anti-pausa de Supabase (ADR-0002).
- **Bloque 4 — Registro y validación de psicólogos:** `POST /api/v1/volunteers/register` con
  validación contra la FPV vía **Adapter** (`DummyFpvVerifier` always-OK + esqueleto
  `HttpFpvVerifier`, seleccionable por config), **Circuit Breaker** (caída del servicio → registro a
  `pending_approval`) y **Chain of Responsibility**; `POST /api/v1/auth/login` (JWT access+refresh,
  rate-limited); endpoints de admin (`GET /volunteers`, `approve`, `reject` con `bumpTokenVersion`);
  notificaciones vía `LogNotifier` (stand-in del email). Migración: columna `email` en `volunteers`.
  Documentado en ADR-0013.
- **Bloque 3 — Endpoints del Intake (Rama Roja / Rama Verde):** `POST /api/v1/intake/triage`
  (bifurcación Likert), `GET /api/v1/crisis-lines/active` (ruteo por hora desde config, sin BD),
  `POST /api/v1/intake/red-branch` (caso de riesgo alto + líneas de crisis, **idempotente** por
  `Idempotency-Key`) y `POST /api/v1/intake/green-branch` (clasificación por tags con escalamiento a
  riesgo alto). Casos de uso (Use Case/Command) sobre los repos del Bloque 2, validación Zod y rate
  limiting del Bloque 1.5. Migración: columna `age` y tabla `idempotency_keys`. Las respuestas de
  riesgo alto siempre incluyen líneas de crisis (principio no negociable).
- **Bloque 2.5 — Secretos, dependencias y logging seguro:** logger central con **redacción
  automática de PII/datos clínicos** (Facade); regla ESLint que prohíbe `console` en `apps/api/src`;
  gate de CI `npm audit --omit=dev --audit-level=high` (falla ante high/critical en producción);
  Dependabot (npm + GitHub Actions); versiones **ancladas** de libs críticas (argon2, jose, zod);
  procedimiento de rotación de secretos en `CONTRIBUTING.md`.

### Cambiado
- ADR-0005: fijados argon2id (parámetros explícitos) y `jose` para JWT con estrategia de revocación.
- ADR-0002: decisión operativa de usar el plan gratuito de Supabase en el MVP (mitigación de pausa,
  deuda técnica de respaldos vs NFR 6.2, reevaluación antes de masificar). README marca la deuda.

## [0.3.0] - 2026-06-28
### Añadido
- ADR-0011: seudonimización de PII (tabla separada + ID hash SHA-256 con salt, NFR 6.1).
- ADR-0012: bitácora de auditoría inmutable de accesos a expedientes (NFR 6.1).
- `flujo-central.md`: tabla de **discrepancias de alcance** con el cronograma de la Federación
  (Webhook RF-3.4 y SMS 2wT RF-5.1 fuera del MVP por dependencias externas); Módulo 4 marcado como
  `<TODO — Alcance Pendiente>` con dos niveles (simple vs. offline-first); RF-4.3 (bloqueo de
  diagnóstico TEPT <4 semanas) incluido en el MVP; consentimiento informado en cada interfaz.
- README: sección "Decisiones de alcance frente al PRD de la Federación".
- Glosario: seudonimización, ID seudonimizado, bitácora de auditoría inmutable, offline-first,
  sincronización por deltas, PAP, SMAPS, mhGAP.

### Cambiado
- ADR-0002: se cita el NFR 6.2 (respaldo cada 6 h) como requisito explícito de la FPV que el plan
  gratuito de Supabase no cumple.
- ADR-0004: refinado por ADR-0011 (la seudonimización complementa el cifrado en reposo).
- `threat-model.md`: auditoría inmutable (repudio) y seudonimización (divulgación) como mitigaciones.

### Notas
- **Webhook de Rescate Activo (RF-3.4)** y **SMS de dos vías (RF-5.1)** confirmados **fuera del MVP**
  como decisión de alcance documentada (dependen de terceros fuera del control del equipo).
- **Alcance del Módulo 4** queda como decisión abierta a resolver antes de implementar.

## [0.2.0] - 2026-06-28
### Añadido
- ADR-0009: despliegue serverless en Vercel (SLA y escalamiento vía Vercel Cron Jobs).
- ADR-0010: adopción del PRD "Sistema PPV 2026" de la Federación como diseño de triage.
- `docs/00-project/decisiones-infraestructura.md`: respaldo del análisis Vercel + Supabase vs. cPanel.
- Endpoints nuevos en `api-contracts.md` / `openapi.yaml`: intake (Likert, rama roja/verde), ruteo
  dinámico de líneas de crisis por hora, registro/validación de voluntarios contra BD de la FPV,
  aceptación de caso (SLA) y endpoint interno de cron.
- Glosario: rama roja/verde, tag clínico, score de urgencia ponderado, SLA de asignación, ruteo
  dinámico, Webhook de Rescate Activo.

### Cambiado
- ADR-0001: backend confirmado **Node.js** como funciones serverless en Vercel (antes: abierto).
- ADR-0002: PostgreSQL alojado en **Supabase** (connection pooler; riesgo del plan gratuito).
- ADR-0006: hosting = **Vercel + Supabase**; descartado el cPanel de la Federación.
- `flujo-central.md`: reescrito según el PRD de la Federación (embudo de baja fricción, tags, SLA).
- `architecture.md`, `threat-model.md`: arquitectura serverless (cold-start, cron, pooler).
- `README.md`: arquitectura Vercel/Supabase y decisiones abiertas actualizadas.

### Notas
- **Webhook de Rescate Activo (RF-3.4)** confirmado **fuera del MVP** (diseño de Fase 3).
- Plan de Supabase (gratuito vs. pago) queda como decisión abierta de la Federación.

## [0.1.0] - 2026-06-27
### Añadido
- Estructura inicial del repositorio siguiendo la metodología AI-DLC.
- `docs/00-project/`: charter, glosario, clasificación de datos y ADRs 0001-0008.
- `docs/01-requirements/`: PRD del flujo central con escenarios de abuso/riesgo.
- `docs/02-design/`: arquitectura, threat model (STRIDE/DREAD), contratos de API y `openapi.yaml`.
- `docs/architecture/`: diagramas C4 (contexto, contenedores, componentes de triage y asignación).
- `.ai-dlc/`: checklists de Gate 0 y Gate 1, y plantillas (PRD, threat model, ADR).
- READMEs de fases 03-06 y de `apps/` (sin código todavía).
- `README.md`, `LICENSE` y `.gitignore` iniciales.
