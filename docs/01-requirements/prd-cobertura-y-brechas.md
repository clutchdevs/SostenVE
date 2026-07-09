# Cobertura del PRD (Sistema PPV 2026) y brechas — mapa de TODO

> **Fase AI-DLC:** `01-requirements`  ·  **Estado:** vivo (actualizar conforme se cierren brechas)
> **Fuente canónica:** `Documento de Requisitos de Producto (PRD).pdf` (FPV, "Sistema PPV 2026") · **Evaluado:** 2026-07-02
> Trazabilidad de lo construido (Bloques 0–7 + issues #1–#55) contra el PRD. Leyenda: ✅ hecho · ⚠️ parcial · ❌ falta.
>
> **Decisiones de criterio.** Las interpretaciones donde el PDF es ambiguo/silencioso, las sustituciones
> técnicas y los desvíos conscientes están consolidados en
> [`decisiones-interpretacion.md`](decisiones-interpretacion.md) (para validación de la FPV).

> **Nota de alcance del PDF.** Esta versión del PRD describe **Módulos 1–4** (intake/triage,
> registro/validación de psicólogos, asignación/SLA y panel/expediente del psicólogo). **No** incluye
> Módulo 5 (SMS/LoRa) ni RF-3.4 (Webhook de Rescate Activo): esos venían de un PRD "fase 2" anterior y
> siguen documentados como **fuera del MVP** en [`flujo-central.md`](flujo-central.md). Además, el PDF
> **renumera el Módulo 4**: aquí **RF-4.3 = interruptor de disponibilidad + telemetría de sincronización**
> (presencia del psicólogo), no el bloqueo de TEPT. El **bloqueo de diagnóstico de TEPT < 4 semanas** es
> una adición clínica nuestra (no figura en este PDF); se mantiene implementada por su valor clínico.

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
  **versionado** en `apps/api/config/app.config.yml`, expuesto por `GET /pap` (público, sin BD) y página
  `/guias` enlazada desde inicio, intake y la confirmación de Rama Verde. Texto provisional pendiente FPV.

### Psicólogo Voluntario
- ✅ Portal exclusivo (`/psicologo`).
- ✅ Ver **solo** sus casos asignados (RLS + verificación de propiedad).
- ✅ Ver la **identidad** del solicitante (nombre/teléfono/edad) de su caso asignado (PRD §2.1).
- ✅ Registrar diagnóstico/notas + **expediente de cierre estructurado** (RF-4.2 online).
- ✅ Formulario de cierre con flujo "¿contactó? Sí/No" → cierre rápido o clínico completo.
- ✅ **Máquina de estados** correcta: aceptar solo desde `asignado` (una vez); cierre terminal; `cerrado` solo lectura.
- ❌ Portal **offline-first** con SQLCipher (RF-4.1) — decisión: fuera del MVP.
- ✅ Presencia en tiempo real (heartbeat/Redis Upstash, RF-2.5) — filtra la asignación por `Online`.

### Coordinador de Turno
- ✅ **Centro de operaciones en vivo** (`/coordinador`): cola de casos priorizada (vencido SLA → riesgo →
  antigüedad), KPIs (riesgo alto / en cola / psicólogos en atención / espera promedio), badge de **SLA
  vencido** y refresco por polling. La lista trae el **psicólogo asignado** (`asignado_a`, sin PII del solicitante).
- ✅ Sub-vistas **Psicólogos en atención** y **Reportes** (cola por categoría) con datos reales.
- ✅ Alertas de SLA vencido (visual + escalamiento por cron).
- ❌ Panel **georreferenciado** (mapas) — fuera de alcance (geo pospuesto).
- ✅ **Reasignar/cerrar** manualmente casos (issue #20): `POST /cases/:id/reassign` (a un psicólogo
  activo, resetea el SLA en riesgo alto) y `POST /cases/:id/coordinator-close` (cierre administrativo con
  motivo). Acciones en el board, auditadas.
- ✅ Gestión de voluntarios (aprobar/suspender) **abierta al rol `coordinador`** (issue #20, RF-2.3);
  el admin la conserva. Página `/coordinador/voluntarios`.
- ✅ Notas confidenciales sobre voluntarios (RF-2.4, issue #20): tabla `volunteer_notes` con RLS
  (solo coordinador/admin), endpoints `GET/POST /volunteers/:id/notes`, auditado.
- ✅ Presencia en tiempo real con indicador "En línea/Desconectado" (RF-2.5.4) — punto verde/gris por
  psicólogo en el panel del coordinador (`en_linea`).

### Administrador (Federación)
- ✅ **Módulo de administración** con sidebar y sub-rutas: excepciones de registro, padrón, líneas de
  crisis, coordinadores y auditoría.
- ✅ Resolver excepciones de validación de psicólogos (`approve`/`reject`) desde la pantalla **Excepciones
  de registro**, que muestra el **motivo** real de la excepción (FPV no respondió / cédula no encontrada /
  PAP no declarada) y un panel de tasa de auto-validación.
- ✅ **Padrón de psicólogos** (`/volunteers?status=all`) con búsqueda y filtro por estado.
- ✅ Auditar accesos — `audit_log` inmutable (RLS + trigger) + endpoint **paginado** `GET /admin/audit`
  (`{ total, items }`, 50/pág) con **acciones traducidas** a lenguaje humano y el **actor resuelto**
  (nombre + cédula para distinguir homónimos).
- ✅ CRUD de líneas de crisis — endpoints admin (`/admin/crisis-lines`, soft-delete, auditado) y el **ruteo
  activo lee de la BD** con fallback a `config` (fail-safe).
- ✅ Invitación de coordinadores por token (`/admin/coordinators/invitations`) — ver Módulo 2 (RF-2.6).

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
- ✅ RF-1.2.2 / RF-1.2.3 Formulario mínimo de Rama Roja con **Nombre, Teléfono y Edad** (la edad, parámetro
  clínico crítico para minoría/geriatría, ya se captura en la UI y persiste en el caso, alimentando el ruteo).
- ✅ RF-1.3 Rama Verde con tags por severidad (motor) + **catálogo clínico real de la FPV** (issue #19):
  los **22 tags** del PRD RF-1.3 (rojo/naranja/amarillo, con duelo, infancia y disociación), **versionado**
  (`TAG_CATALOG_VERSION`), en el dominio y espejado en el web (mismos códigos). Pesos por severidad con
  ajustes marcados por el PRD (duelo traumático, culpa del superviviente); pesos **validados por la FPV** (2026-07-03).
- ✅ RF-1.3 Pantalla 2 (Contacto): teléfono **+ método de contacto preferido (WhatsApp / Llamada)**
  (issue #52); se persiste en el caso (`preferred_contact_method`) y se muestra al psicólogo asignado.
- ✅ Regla de interrupción (1 rojo o 3+ naranja → riesgo alto).
- ✅ RF-1.5 Índice de urgencia **ponderado completo** (issue #24): `U = w_id·I_ideacion + Σ peso(tag) +
  w_hab·n_cambios_habito`, con `I_ideacion` dominante (cualquier tag rojo lleva el caso a la cima). El
  motor de asignación **drena la cola por urgencia** (mayor primero, FIFO en empate). Pesos aislados y
  **validados por la FPV** (2026-07-03, ADR-0010): RED=100/ORANGE=10/YELLOW=1, duelo=20, culpa=15, ideación=1000, hábito=1.
- ❌ RF-1.4 Analizador léxico-semántico — Fase 2.
- ✅ Rama Verde **flujo por pantallas** (issue #24): síntomas → **ubicación** (estado + ciudad, menús de
  selección rápida) → **cambio de hábitos** (pantalla 5) → contacto. Los hábitos alimentan el índice y
  **se persisten en el caso** (issue #3, `cases.habit_changes`; visibles en el detalle del psicólogo).
  ⚠️ Pendiente: autodetección por geolocalización del dispositivo (requiere geocoder).

### Módulo 2 — Registro y validación de psicólogos
- ✅ RF-2.1.1 Consentimiento informado obligatorio: checkbox que bloquea el alta, texto bioético
  **versionado** en `apps/api/config/app.config.yml` (expuesto por `GET /consent/active`) y aceptación
  auditable (versión + timestamp en `volunteers` y en `audit_log`). El texto es el **oficial de la FPV**
  transcrito del PRD (RF-2.1.1), versión `v1.0.0-fpv` (issue #32); se cambia sin tocar código.
- ✅ RF-2.1.2 Formulario de postulación completo: tipo + número de documento (cédula) separados del
  `professional_id` (= nº FPV), universidad, año de egreso, colegio, PAP (sí/no) + detalle obligatorio,
  modalidad (multiselect presencial/distancia) y disponibilidad horaria estructurada (día × bloque).
  Persistido en `volunteers` (migración `…0008`, columnas nullable) y validado en la API (Zod).
- ✅ RF-2.2 Validación contra el **padrón real de la FPV** vía **Adapter** `HttpFpvVerifier`
  (`validate` + `getProfile`, Circuit Breaker → `pending_approval`; dummy solo en tests, ADR-0013, issue #6)
  con la regla de activación automática `cédula+FPV ∧ PAP=Sí → Activo` (si no, queda `pending_approval`).
- ✅ Estados `active` / `pending_approval` / `inactive`.
- ✅ RF-2.2.4 Credenciales + correo de bienvenida — contraseña **autogenerada** de alta entropía
  (el usuario no la elige), entregada por **correo de bienvenida** vía `SmtpNotifier` (nodemailer,
  seleccionable por config `email.provider`; `log` por defecto). La aprobación por admin reemite y
  reenvía credenciales.
- ✅ RF-2.2.4 (cont.) **Cambio y reseteo de contraseña** (issue #36): el personal cambia su contraseña
  autenticado (`POST /auth/change-password`, re-verifica la actual) y recupera una olvidada con un
  **token de un solo uso por correo** (`/auth/forgot-password` → `/auth/reset-password`; solo se persiste
  el hash del token, con TTL de 60 min). Ambos flujos hacen **bump de `token_version`** para destruir las
  sesiones previas (RF-2.7). UI: `/cambiar-contrasena`, `/recuperar-contrasena`, `/restablecer-contrasena`.
  ⚠️ Pendiente menor: migrar la **entrega inicial** de credenciales de "temporal en claro" a enlace
  tokenizado (hoy el reset ya ofrece esa vía de recuperación segura).
- ✅ RF-2.5 Presencia en tiempo real (heartbeat 30 s + TTL 65 s) vía puerto `PresenceStore` con adaptador
  **Upstash Redis** (REST) para prod y **memoria** para dev/tests (ADR-0014). Endpoint
  `POST /volunteers/me/presence` (latido + pausa manual, RF-4.3.1); el coordinador ve `en_linea` (RF-2.5.4).
- ✅ RF-2.6 Registro de coordinadores por **token de invitación** (issue #23): el admin invita
  (`/admin/coordinators/invitations`), se persiste solo el hash del token (un solo uso, con TTL) y el
  invitado lo canjea en `/coordinators/accept-invitation` para activarse como coordinador; auditado.
- ✅ RF-2.6.2 Campos del signup + contraseña robusta (issue #53): el canje captura **Nombres, Apellidos,
  Cédula (tipo+número), FPV (opcional) y Teléfono**, y exige una **contraseña ≥ 12 con complejidad**
  (mayúsculas, minúsculas, números y símbolo). La misma política se aplica a cambio/reset de contraseña
  (para que no se pueda degradar). El correo sigue tomándose de la invitación (address-targeted).
- ✅ RF-2.7 Login con bloqueo por 5 intentos (rate-limit/lockout 15 min configurable) **+ expiración de
  sesión por inactividad de 30 min** (`security.session.idle_timeout_minutes: 30`, enforce en cliente sobre
  el `exp` del JWT) **+ ruta separada `/login-coordinador`** (issue #23) **+ destrucción de sesiones
  duplicadas en caliente** (issue #54): cada login **bumpea `token_version`** y el middleware **valida la
  versión del token contra la BD en cada request**, así un login nuevo invalida las sesiones previas al
  instante.

### Módulo 3 — Asignación y SLA
- ✅ RF-3.1 Asignación por prioridad (riesgo alto primero) + **especialidad infantil por edad y por tags de
  infancia** (RF-1.3, issue #50) + **filtro de presencia**: solo se asigna a psicólogos `Online` (RF-2.5); si
  ninguno está en línea, el caso queda en cola y lo rescata el barrido de SLA.
  > 🗑️ El **clúster regional** (antes issue #51) fue **eliminado por la FPV el 2026-07-03**; se removió del
  > motor de asignación. `cases.region` se conserva como ubicación pero ya no rutea.
- ✅ Filtro de elegibilidad — estado `Activo` **y** presencia `Online` (RF-2.5).
- ✅ RF-3.2 SLA de 10 min (se fija `sla_expires_at`).
- ✅ RF-3.3 Escalamiento automático (revoca, vuelve a la cola, notifica coordinadores) vía cron. La alerta
  crítica `high_risk_escalated_no_coordinator` se basa ahora en **presencia en vivo** (issue #55): salta si al
  escalar **no hay ningún coordinador `Online`** (RF-2.5), no solo si no hay coordinador activo.
- ⚠️ Notificación — `LogNotifier`; faltan push PWA y correo reales.

### Módulo 4 — Panel del psicólogo y expediente clínico (versión online ✅)
> Numeración según el PDF vigente: **RF-4.1** offline-first/SQLCipher, **RF-4.2** registro de
> diagnóstico/notas y cierre (con sub-RF 4.2.1–4.2.8), **RF-4.3** interruptor de disponibilidad +
> telemetría de sincronización (presencia). El **RF-4.4 (sync por deltas)** y la antigua **RF-4.2.9** son
> de versiones previas; abajo se mapean a lo construido.
- ❌ RF-4.1 Offline-first + SQLCipher (AES-256) — fuera del MVP.
- ✅ RF-4.2 Registro clínico / cierre estructurado (online): contactabilidad Sí/No (RF-4.2.2), demografía
  (sexo, destinatario derivado, RF-4.2.3), sintomatología-chips (RF-4.2.4), medio de contacto (RF-4.2.5),
  técnicas SMAPS (RF-4.2.6), motivo de cierre + **derivación tipo+destino** (RF-4.2.7), horas y comentario
  (RF-4.2.8). Identidad del solicitante visible para el asignado (RF-4.2.1).
- ✅ RF-4.2.4: la **ideación suicida** registra alerta de seguimiento (auditoría; el PRD pide bandera
  preventiva a 5 días para notificar a los coordinadores — hoy queda como evento auditado, falta el plazo).
- ✅ **Crisis psicótica aguda** → derivación urgente bloqueada + sube riesgo (regla de seguridad nuestra,
  alineada con el chip `sintoma_crisis_psicotica_aguda` de RF-4.2.4).
- ✅ **Bloqueo de diagnóstico de TEPT < 4 semanas** — adición clínica nuestra (no figura como RF en este
  PDF; antes numerada RF-4.3).
- ✅ Máquina de estados: aceptar (solo `asignado`, una vez) → aceptado → cierre (terminal) → solo lectura.
- ❌ **RF-4.3 (toggle disponibilidad + telemetría de sincronización)** y **sync por deltas** — pendientes
  (dependen de presencia/offline-first).

## 4. Brechas — TODO

### A. Fuera del MVP (decisiones documentadas; no son omisiones)
- [ ] Offline-first / SQLCipher (RF-4.1) y sync por deltas (RF-4.4) — Módulo 4 completo.
- [ ] Analizador léxico-semántico (RF-1.4) — Fase 2.
- [ ] Geo-clustering / panel georreferenciado del coordinador.
- [ ] Notificaciones push PWA y correo SMTP reales (hoy `LogNotifier`).
- [ ] Webhook de Rescate Activo (RF-3.4) y SMS de dos vías (RF-5.1) — Fase 3.

### B. Pendientes dentro del alcance del MVP (esperables por el PRD)
- [x] **Módulo 2 — Consentimiento informado** obligatorio (RF-2.1.1) — mecanismo completo con texto
      con el **texto bioético oficial de la FPV** (RF-2.1.1, `v1.0.0-fpv`, issue #32).
- [x] **Módulo 2 — Formulario de postulación completo** (RF-2.1.2): tipo doc, FPV, universidad, año,
      PAP + detalle, colegio, multiselect de modalidad, disponibilidad horaria.
- [x] **Módulo 2 — Alta automática real:** contraseña de alta entropía autogenerada + correo de
      bienvenida (SmtpNotifier); regla `cédula+FPV ∧ PAP → Activo`.
- [x] **Módulo 2 — Cambio/reseteo de contraseña (issue #36):** cambio autenticado
      (`/auth/change-password`) y recuperación por token de un solo uso por correo
      (`/auth/forgot-password` → `/auth/reset-password`, TTL 60 min, solo hash persistido); ambos hacen
      bump de `token_version`. UI en `/cambiar-contrasena`, `/recuperar-contrasena`,
      `/restablecer-contrasena`. Follow-up menor: migrar la entrega inicial a enlace tokenizado.
- [x] **Módulo 1 — Consentimiento en cada interfaz del solicitante (issue #1):** aviso **no bloqueante**
      (`ConsentNotice`, colapsable) en `/intake`, `/intake/roja`, `/intake/verde` y `/guias`; texto desde
      config (`consent.requester`, `GET /consent/requester`), no hardcodeado. Sin checkbox ni gate para no
      añadir fricción al camino de riesgo alto. Texto **oficial de la FPV** (`v1.0.0-fpv`, 2026-07-03).
- [x] **Intake offline-first: guardado local + reintento (issue #1 constraint / Charter in-scope #1, issue #2):**
      lo capturado en el intake se **persiste en `localStorage`** (draft) y sobrevive a recargas; si el envío
      falla por red o error de servidor (5xx) se **encola y reintenta** en carga y al reconectar (evento
      `online`), sin perder datos — la Rama Roja ya no descarta silenciosamente la solicitud de contacto. Un
      **4xx** no se reintenta (dato inválido). No compromete el **fail-safe**: las líneas de crisis siguen
      mostrándose sin backend (lista embebida + caché). Es la variante ligera para el solicitante; el
      offline-first pesado con **SQLCipher (RF-4.1)** del portal del psicólogo sigue **fuera del MVP** (#26).
- [x] **Presencia en tiempo real** (RF-2.5 / RF-3.1 / RF-2.5.4 / RF-4.3): heartbeat cada 30 s + TTL 65 s vía
      puerto `PresenceStore` con adaptador **Upstash Redis** (REST, prod) y **memoria** (dev/tests), ADR-0014.
      La asignación **solo va a psicólogos `Online`**; toggle de disponibilidad en la PWA del psicólogo
      (RF-4.3.1) e indicador En línea/Desconectado en el panel del coordinador (RF-2.5.4). Activación en prod:
      `presence.provider: upstash` + `UPSTASH_REDIS_REST_URL/TOKEN`. (Colapsar la pausa manual en offline es
      una simplificación documentada.)
- [x] **Catálogo clínico real de tags** (duelo, infancia, disociación, etc.) validado por la FPV
      (issue #19, RF-1.3): 22 tags versionados en dominio + espejo web; el motor de triage lo usa.
- [x] **Ruteo por especialidad infantil disparado por tags (issue #50, RF-1.3):** si el caso trae tags de
      **infancia** (mutismo, desregulación, psicoeducación, regresión del sueño) se persiste
      `requires_child_specialty` y la asignación **prefiere un psicólogo con especialidad infantil** —
      además del caso por edad del solicitante. Pesos/umbrales **validados por la FPV** (2026-07-03).
- 🗑️ **Filtro de asignación por clúster regional (issue #51, RF-3.1) — ELIMINADO por la FPV (2026-07-03):**
      se **removió la preferencia regional del motor de asignación**; la asignación queda por riesgo +
      especialidad + presencia. `cases.region` (estado de la Rama Verde) se conserva como ubicación capturada
      pero **deprecada para routing**. (La Rama Roja tampoco capturaba ubicación.)
- [x] **Coordinador — centro de operaciones en vivo:** cola priorizada, KPIs, badge de SLA vencido,
      psicólogo asignado por caso (`asignado_a`) y sub-vistas Psicólogos/Reportes (sin PII del solicitante).
- [x] **Acciones del coordinador (issue #20):** reasignar (`/cases/:id/reassign`) y cierre administrativo
      (`/cases/:id/coordinator-close`) manuales; notas confidenciales sobre voluntarios (RF-2.4,
      `volunteer_notes` con RLS); y gestión de voluntarios (aprobar/suspender) abierta al rol
      **coordinador** (RF-2.3). UI en `/coordinador` (acciones de caso) y `/coordinador/voluntarios`.
- [x] **Endpoints + módulo admin (issues #21, #23):** CRUD de líneas de crisis (soft-delete, auditado,
      ruteo desde BD con fallback), **excepciones de registro** con motivo FPV real + aprobar/rechazar,
      **padrón** de psicólogos, **invitaciones de coordinador** y **auditoría paginada** con acciones
      traducidas y actor (nombre + cédula).
- [x] **Guías PAP asíncronas** para el solicitante (issue #22): contenido versionado en config,
      `GET /pap` y página `/guias` enlazada desde el intake. Texto provisional pendiente de la FPV.
- [x] **Registro/login de coordinador por token (issue #23):** invitación por token de un solo uso
      (hash en BD, TTL, auditada), canje en `/coordinators/accept-invitation` (RF-2.6); expiración de
      sesión por inactividad y ruta `/login-coordinador` (RF-2.7). ⚠️ Desvíos del PRD abajo (sección D).
- [x] **Índice de urgencia ponderado** completo (RF-1.5) y pantallas faltantes de Rama Verde
      (ubicación, cambio de hábitos) — issue #24. Pendiente: geolocalización por dispositivo.

### C. Decisión resuelta (Human-in-the-Loop FPV)
- [x] **Acceso del coordinador a notas clínicas (issue #25):** resuelto → acceso **auditado**. La RLS de
      `clinical_notes` amplía la lectura a coordinator/admin y cada acceso registra `clinical_note_read`;
      la PII de contacto sigue restringida al psicólogo asignado.

### D. Desvíos del PRD por ajustar (implementado pero no exacto al texto)
Funcionalidad construida que se aparta de la letra del PRD; cada uno es un cambio chico:
- [x] **Inactividad de sesión = 30 min (RF-2.7, issue #54):** `idle_timeout_minutes: 30` (config + espejo web).
- [x] **Contraseña de coordinador ≥ 12 complejos (RF-2.6.2, issue #53):** política robusta (≥12 + mayúsc/minúsc/número/símbolo) en el canje **y** en cambio/reset de contraseña.
- [x] **Campos del signup de coordinador (RF-2.6.2, issue #53):** el canje captura Nombres, Apellidos, Cédula, FPV (opcional) y Teléfono (correo desde la invitación).
- [x] **Destrucción de sesiones duplicadas en caliente (RF-2.7, issue #54):** login bumpea `token_version` y
      el middleware valida la versión del token contra la BD en cada request → el login nuevo invalida los previos.
- [ ] **Hashing:** el PRD sugiere `bcrypt` (factor 12); usamos **argon2id** por decisión documentada (ADR-0005). Mantener argon2id; queda anotado como desvío consciente.
- [ ] **Bandera de seguimiento a 5 días por ideación suicida (RF-4.2.4):** hoy se audita el evento; falta el plazo programado para notificar a los coordinadores.

## Cómo mantener este documento
Marcar las casillas conforme se implementen; cada brecha cerrada debería referenciar su bloque/ADR y
quedar reflejada en el `CHANGELOG.md`.
