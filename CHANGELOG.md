# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato se basa en [Keep a Changelog 1.1.0](https://keepachangelog.com/es-ES/1.1.0/)
y este proyecto adhiere a [Versionado Semántico](https://semver.org/lang/es/).

## [No publicado]
### Añadido
- **Balanceo de carga en la asignación + tope configurable desde el admin (RF-2.5):** la asignación ya no
  amontona casos en el primer psicólogo. Ahora calcula la **carga activa** de cada psicólogo online (casos
  asignados/aceptados/en seguimiento) y **elige al menos cargado**, saltando a quien ya alcanzó el **tope**
  de casos. Un caso de **alto riesgo excede el tope** solo cuando **todos** están llenos (nunca se queda sin
  atención; si alguien tiene cupo, va al de menor carga). El tope es **editable en runtime desde el panel de
  admin** (nueva página *Asignación de casos* + `GET/PUT /admin/assignment-settings`, auditado), respaldado
  por la tabla `assignment_settings` (fila única, **default 6**).

### Cambiado
- **Registro rechazado si el postulante no está en el padrón FPV (RF-2.2):** cuando el padrón responde
  **definitivamente "no encontrado"** (`fpv_not_found`), el registro ahora se **rechaza** (HTTP 422
  `FPV_NOT_REGISTERED`, sin crear cuenta) con un mensaje claro ("No figuras en el padrón de la FPV…") que
  la web muestra en `/registro`. Se conserva el **fallback a `pending_approval`** solo para fallos
  **transitorios** (padrón caído / timeout / token inválido → `fpv_unreachable`) para no bloquear a alguien
  legítimo por una caída; y una **licencia hallada pero no activa** también va a revisión manual (la persona
  sí existe). Antes, cualquier "no aprobado" quedaba como pendiente.
- **Asignación de casos orientada a eventos + anti-duplicados (RF-2.5):** la asignación ya no espera al
  barrido del cron. Ahora se dispara **al crear un caso** (intake) y **cuando un psicólogo se pone online**
  (solo en la transición offline→online, no en cada heartbeat), de forma *best-effort* (un fallo nunca
  rompe el intake ni el heartbeat). El cron queda como **red de seguridad** (SLA + reintentos). Para evitar
  asignaciones duplicadas cuando varios disparadores corren a la vez, cada caso pasa por un **claim
  atómico** (`claimForAssignment`: `UPDATE … WHERE id=? AND status='pendiente'`, atómico a nivel de fila);
  quien pierde el claim **salta el caso** en lugar de reasignarlo. `PresenceStore.markOnline` ahora informa
  si fue una transición (memoria + Upstash `SET … GET`).
- **Validación de teléfono venezolano y cédula en formularios e intake:** los teléfonos (registro, intake
  verde/roja, invitación de coordinador) exigen un **móvil venezolano** (prefijo `0412/0414/0416/0424/0426`
  + 7 dígitos, tolera `+58` y separadores) en vez de cualquier texto; la **cédula (V/E) se limita a 8
  dígitos** (el pasaporte P es alfanumérico). Validado en el servidor (Zod) y reflejado en el cliente
  (filtra letras al escribir, `maxLength`, mensajes claros y bloqueo de envío). Las líneas de crisis
  conservan la regla laxa (son códigos de servicio).

### Añadido
- **Control de edad en el intake verde (RF-1.3):** el formulario pregunta la **edad de quien necesita
  apoyo** y la envía como `edad`; un menor (`< 18`) se rutea a un psicólogo con especialidad infantil aunque
  el síntoma elegido no sea un tag de infancia. La rama roja ya capturaba la edad.
- **Segundo psicólogo de prueba sin especialidad infantil** (`psicologo.adultos@ppv.test`) en el seed, para
  probar la asignación de casos de adultos frente a la priorización infantil; `docs/04-testing/seed-data.md`
  documenta además **cómo funciona la asignación automática** (disparadores, gate de presencia, prioridad).
- **Detalle del voluntario para revisión del coordinador (RF-2.3):** en `/coordinador/voluntarios` cada
  tarjeta ahora tiene **"Ver detalle"** que carga toda la información del postulante (correo, teléfono,
  documento/cédula, nº FPV, universidad, año de egreso, colegio, especialidad, modalidad, disponibilidad
  horaria, PAP + detalle, consentimiento aceptado y motivo de excepción) — para poder **validar quién se
  admite** y **distinguir dos postulantes con el mismo nombre**. Nuevo endpoint `GET /volunteers/:id`
  (coordinador/admin) que devuelve el registro completo (`getDetailById` en el repo + `VolunteerDetail`).
- **Teléfono de contacto en el registro de psicólogos (RF-2.1.2):** el formulario `/registro` ahora exige
  un **teléfono** (para que un coordinador pueda contactar al voluntario de un caso). Se valida como
  obligatorio en la API (`telefono`), se persiste en `volunteers.phone` y se refleja en el use case y sus
  tests.

### Cambiado
- **El registro y la aprobación de voluntario ya no fallan si el correo de notificación falla:** tanto el
  alta como la validación/aprobación (que reemite credenciales) crean/activan la cuenta y luego el envío
  del correo pasó a ser **no-fatal** — si el SMTP falla, se registra un `warn` y la acción **igual se
  completa** (antes un fallo de correo devolvía 500 y confundía al usuario, aunque la cuenta ya existía o
  ya había quedado activada). Tras un fallo del correo de aprobación, el voluntario puede recuperar sus
  credenciales con "olvidé mi contraseña".
- **Observabilidad:** el manejador central de errores ahora **loguea los 500 inesperados** (nombre,
  mensaje, stack, ruta, método) en vez de tragárselos en silencio; nunca se filtran detalles al cliente.

### Añadido
- **Plantillas de correo con identidad de marca (Poppins + azules PPV):** los correos (bienvenida +
  credenciales, invitación de coordinador, recuperación de contraseña, registro en revisión) pasan de
  texto plano a **HTML de marca** — encabezado azul oscuro `#191a36` con wordmark PPV, botón de acción
  azul claro `#5582c2`, caja de credenciales, pie institucional; tipografía Poppins con fallback seguro
  para clientes que no cargan web-fonts. Un mismo modelo de contenido (`email-template.ts`) genera la
  versión **texto** (fallback/accesibilidad) y la **HTML**; los valores del usuario se escapan (anti-inyección).
  El `SmtpNotifier` envía ambas partes (`text` + `html`).
- **Envío de correo real por SMTP configurable por entorno (RF-2.2.4):** el `SmtpNotifier` (nodemailer, ya
  existente) ahora se puede activar y apuntar a un proveedor SMTP real **sin editar la config commiteada**:
  nuevos overrides de entorno `EMAIL_PROVIDER` y `SMTP_HOST/PORT/USERNAME/FROM/PASSWORD` (con fallback a
  `email.*` de `app.config.yml`). El default sigue en `log` (tests/dev offline). Se deriva `secure` del
  puerto (465 = SSL, 587/2525 = STARTTLS) para funcionar con cualquier proveedor (Gmail, Brevo, SendGrid,
  Mailtrap…). `docker-compose.yml` pasa esas variables al contenedor de la API; `.env.example` documenta el
  set con un ejemplo de Gmail listo para pegar.

### Cambiado
- **Identidad de marca FPV — tipografía Poppins + paleta de 4 colores:** toda la app usa ahora únicamente
  los colores de marca (azul oscuro `#191a36`, azul claro `#5582c2`, blanco, negro) y sus tintes para
  jerarquía. Se cambió la tipografía a **Poppins** (una sola familia, UI y títulos; se retiraron Inter y
  Fraunces). Implementado sobre los tokens de Tailwind: `brand`/`ppv` = azul claro, `navy`/`ink` = azul
  oscuro, `surface` blanco/tinte; y se **re-mapearon las escalas por defecto** (`slate`/`gray` → azul-gris,
  `emerald`/`green`/`teal` → azul claro, `amber` → azul-gris) para que los usos hardcodeados queden en
  marca sin editar cada archivo. **Excepción de seguridad:** el **rojo** se conserva solo para líneas de
  crisis / riesgo alto y errores. `theme_color`/`themeColor` del PWA → `#191a36`.

### Cambiado (decisiones de la FPV, 2026-07-03)
- **Pesos del triage validados (RF-1.3 / RF-1.5, ADR-0010):** la FPV ratificó las cifras como **decisión
  final** (RED=100/ORANGE=10/YELLOW=1, duelo=20, culpa=15, ideación=1000, hábito=1); dejan de ser
  provisionales. Solo se actualizaron comentarios/documentación (los valores ya estaban en el código).
- **Clúster regional (RF-3.1) eliminado por la FPV:** se **removió la preferencia regional del motor de
  asignación** (antes issue #51); la asignación queda por **riesgo + especialidad + presencia**.
  `cases.region` se conserva como ubicación capturada pero **deprecada para routing** (sin migración
  destructiva); se ajustaron `selection.ts`, `assign-cases.ts`, el dominio `Case` y sus tests.
- **Clúster de coordinadores (RF-3.3) eliminado por la FPV:** la escalada por SLA notifica a los
  coordinadores sin clúster geográfico (comportamiento ya vigente); se actualizó la documentación.
- **Consentimiento del solicitante — texto oficial de la FPV (issue #1):** se reemplazó el borrador
  provisional por el **texto oficial** (emergencia/líneas de crisis, servicio gratuito y voluntario,
  terceros, confidencialidad absoluta) y se subió la versión a **`v1.0.0-fpv`** en `config/app.config.yml`
  (`consent.requester`). Sin cambios de código: la web lo toma de `GET /consent/requester`.
- Consolidado en [`docs/01-requirements/decisiones-interpretacion.md`](docs/01-requirements/decisiones-interpretacion.md)
  y reflejado en cobertura, backlog, README, charter, flujo-central y ADR-0010.

### Añadido
- **Módulo 2 — Validación real contra el padrón de la FPV (`HttpFpvVerifier`, issue #6):** se implementó
  el verificador HTTP que sustituye al dummy. Llama a `GET /api/v1/public/validate?national_id=…&fpv=…`
  con el header `X-API-TOKEN` y mapea la respuesta al flujo de registro: `200` + `data.valid` **y**
  `data.status === 'active'` → auto-activa; licencia hallada pero **no activa** → revisión manual (nunca
  se auto-activa una licencia no vigente); `404` → inválido; `401` → `NotConfiguredError`; error de
  red/timeout → el Circuit Breaker corta y el registro cae a `pending_approval` (RF-2.2). Se elige por
  config (`fpv.verifier`); `fpv.base_url` y `fpv.request_timeout_seconds` viven en `app.config.yml` y el
  token secreto en la env **`FPV_API_TOKEN`**. Se extendió `FpvVerificationInput` con `nationalId` (la
  cédula) para poder consultar el padrón. **La verificación ya queda enrutada al servicio real: `development`
  y `production` usan `http`** (para probar respuestas y fallos reales del padrón en local); **solo los tests
  automatizados** (`NODE_ENV=test`, nueva sección `test` en `app.config.yml`) conservan el dummy
  (deterministas, sin token ni red). Requiere `FPV_API_TOKEN` en el entorno (dev y prod). El mapeo honra el `status` del envelope
  (por si la API responde HTTP 200 para todo) y parsea el cuerpo de forma defensiva. Además se añadió
  `HttpFpvVerifier.getProfile(nationalId)` que consulta `GET /public/psicologo/{national_id}` y mapea el
  padrón completo (`fpv_number`, `colleges`, `national_id`, nombres, `degree_title`, `university`…) a un
  `FpvPsychologistProfile` en camelCase (404 → `null`). Actualizado ADR-0013.
- **Pruebas manuales del padrón FPV:** `apps/api/http/fpv-padron.http.example` (REST Client) con las 2 APIs
  del padrón; el `.http` real (con token) queda ignorado por git.

### Seguridad
- **Acceso del coordinador a notas clínicas (issue #25, decisión FPV):** resuelto como acceso
  **auditado**. La RLS de `clinical_notes` amplía la lectura a coordinator/admin y `GET /cases/:id`
  les devuelve las notas y el cierre (sin PII de contacto, que sigue restringida al psicólogo
  asignado); cada lectura registra `clinical_note_read` en el `audit_log` inmutable. Actualizados
  charter, threat-model y clasificación de datos.

### Cambiado
- **Documentación sincronizada con la app (2026-07-02):** se actualizó el **README** (qué hace, arquitectura
  con presencia Upstash y padrón FPV real, ADRs 0001-0014, tabla de estado, decisiones abiertas — nombre PPV
  y verificador FPV ya resueltos), el **backlog** (A1/A2/A4/A6 y B2 marcados hechos; A5 parcial), la **tabla
  de rutas** de `DEVELOPMENT.md` (páginas de personal/admin que faltaban) y el mapa de cobertura del PRD
  (RF-2.2 contra el padrón real).
- **Rebranding: Sostén → PPV (Programa de Psicólogos Voluntarios):** la FPV definió el nombre oficial. Se
  renombró en toda la app y el repo: nombre visible/wordmark (landing, sidebars, header), `app.name`, título
  del navegador y **PWA manifest** (nombre completo + `short_name: PPV`), asuntos y firmas de **correos**,
  título del **OpenAPI**, scope de paquetes **`@sostenve/*` → `@ppv/*`** (con lockfile sincronizado), **claves
  de `localStorage`** (`sostenve.*` → `ppv.*`), `project_id` de Supabase, usuarios semilla y **toda la
  documentación** (charter, PRD, C4, ADRs, guías). Dominio placeholder `sostenve.app` → `ppv.org.ve` (correo
  remitente + CORS de producción, pendiente de confirmar el dominio real). Se resolvió el TODO del nombre en
  el charter. (Pendiente, acción del dueño: renombrar el repo de GitHub y la carpeta local.)
- **UI — Unificación visual de las pantallas públicas y de auth con la paleta del dashboard:** las
  superficies que quedaban con el estilo viejo (`brand`/`rounded-md`) ahora comparten el sistema de los
  paneles de personal — lienzo `surface`, texto `ink`, tarjetas `surface-card` con `shadow-card` y
  `rounded-2xl`, títulos serif y acentos de marca. Alcance: `login`, `login-coordinador`,
  `registro-coordinador`, cambiar/recuperar/restablecer contraseña, la landing `/`, `registro` (postulación
  del psicólogo) y el flujo del solicitante (`intake` landing/roja/verde y `guías`, conservando tap-targets
  grandes y alto contraste para crisis). Se centralizó la "receta" en `src/lib/ui.ts` (constantes de clases)
  y un `AuthShell` compartido para las pantallas de auth; el fondo global pasó a `bg-surface`.
- **Módulo 2 — Seguridad de sesión RF-2.7 (issue #54):** el cierre de sesión por inactividad pasó de **15 a
  30 minutos** (`security.session.idle_timeout_minutes: 30` + espejo web), alineado con el PRD. Además se
  implementó la **destrucción de sesiones duplicadas en caliente**: cada **login bumpea `token_version`** y el
  **middleware de autenticación valida la versión del token contra la BD en cada request** (resolver
  configurado en el bootstrap; `getTokenVersion`), de modo que un login nuevo **invalida al instante** las
  sesiones previas del mismo usuario. Nuevo test del middleware (versión válida → 200; superada/inexistente →
  401).
- **Módulo 2 — Texto de consentimiento informado oficial de la FPV (issue #32, RF-2.1.1):** se reemplazó
  el borrador provisional por el **texto bioético oficial** transcrito del PRD (RF-2.1.1: carácter
  aprobatorio, uso de datos, confidencialidad) y se subió la versión a **`v1.0.0-fpv`** en
  `config/app.config.yml`. Sin cambios de código: la web toma el texto de `GET /consent/active` y la
  aceptación queda auditada como `consent_accepted:v1.0.0-fpv`.

### Cambiado
- **Módulo 3 — Escalamiento SLA basado en presencia en vivo del coordinador (issue #55, RF-3.3):** la alerta
  crítica `high_risk_escalated_no_coordinator` ahora se dispara cuando, al escalar un caso de riesgo alto por
  SLA vencido, **no hay ningún coordinador `Online`** (presencia en tiempo real, RF-2.5) — antes bastaba con
  que existiera un coordinador **activo** aunque tuviera la app cerrada. Refina la señal de observabilidad
  para que refleje quién puede realmente actuar sobre la alerta.

### Añadido
- **Módulo 2 — Signup de coordinador completo + contraseña robusta (issue #53, RF-2.6.2):** el canje de
  invitación ahora captura los campos que pide el PRD — **Nombres, Apellidos, Cédula (tipo + número), FPV
  (opcional) y Teléfono** — además de la contraseña (el correo sigue viniendo de la invitación). Se persiste
  `phone` en `volunteers` (migración `20260628000018`); la cédula va a `document_number` y el FPV (si se da)
  al `professional_id`. Se introduce una **política de contraseña robusta** (`strongPasswordSchema`: **≥12
  caracteres con mayúsculas, minúsculas, números y símbolo**) aplicada al **signup de coordinador y también a
  cambio/reset de contraseña** (para que una contraseña fuerte no pueda degradarse luego; las autogeneradas
  del psicólogo ya la superan). UI de `/registro-coordinador` ampliada con los campos y la validación.
- **Módulo 1 — Método de contacto preferido en Rama Verde (issue #52, RF-1.3 Pantalla 2):** el intake verde
  ahora captura, junto al teléfono, **cómo prefiere el solicitante ser contactado (WhatsApp / Llamada)**. Se
  persiste en el caso (`cases.preferred_contact_method`, migración `20260628000017`), viaja en el contrato
  como `metodo_contacto` y se muestra al **psicólogo asignado** en su tarjeta de identidad del caso
  ("Prefiere: WhatsApp/Llamada") para que contacte por el canal correcto.
- **Módulo 3 — Preferencia de asignación por clúster regional (issue #51, RF-3.1):** el intake de Rama Verde
  persiste el `estado` del solicitante (`cases.region`, migración `20260628000016`) y el motor de asignación
  ahora **prefiere psicólogos del mismo estado** — comparando el estado del caso contra el `colegio` del
  voluntario (insensible a acentos/mayúsculas). Es una **preferencia, no un filtro duro**: si no hay nadie de
  la región en línea, el caso se asigna igual a otro psicólogo `Online` (nunca se vara, alineado con
  RF-3.1, que solo exige Activo + Online). El `colegio` del voluntario se expone ahora en el modelo de
  dominio. La Rama Roja no captura ubicación, por lo que sus casos no llevan región. Follow-up: `colegio`
  como estado estructurado (dropdown) para un match exacto.
- **Módulo 1/3 — Ruteo por especialidad infantil disparado por tags (issue #50, RF-1.3 / RF-3.1):** cuando el
  intake de Rama Verde incluye tags de **infancia** (mutismo selectivo, desregulación infantil,
  psicoeducación, regresión del sueño), el caso se marca `requires_child_specialty` (calculado en el servidor
  desde el catálogo, nueva columna `cases.requires_child_specialty`, migración `20260628000015`) y el motor de
  asignación **prefiere un psicólogo con especialidad infantil** — no solo cuando el solicitante es menor de
  edad. Así un adulto que reporta síntomas de un menor a su cargo también rutea a un especialista infantil.
- **Módulo 2/3 — Presencia en tiempo real + filtro de asignación por presencia (RF-2.5 / RF-3.1, issue #18):**
  los psicólogos ahora tienen **presencia en vivo**. La PWA envía un **latido cada 30 s** (`POST
  /volunteers/me/presence`) y el servidor la mantiene `Online` con **TTL de 65 s**, que expira solo si cesan
  los latidos (RF-2.5.3). El **motor de asignación solo asigna a psicólogos `Online`** (RF-3.1): si ninguno lo
  está, el caso queda en cola honestamente y lo rescata el barrido de SLA. Nuevo **toggle de disponibilidad**
  en la PWA del psicólogo (Disponible/En pausa + indicador de conexión, RF-4.3) e **indicador En
  línea/Desconectado** por psicólogo en el panel del coordinador (RF-2.5.4). Implementado tras un puerto
  `PresenceStore` con adaptadores **Upstash Redis** (REST vía `fetch`, sin dependencias; producción) y
  **memoria** (dev/tests), seleccionables por `presence.provider` (ADR-0014). Activación en prod: setear
  `presence.provider: upstash` + `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`.
- **Módulo 1 — Edad en Rama Roja (RF-1.2.2 / RF-1.2.3):** el formulario mínimo de emergencia (recibir llamada
  / WhatsApp silencioso) ahora captura la **edad**, parámetro clínico crítico para priorizar minoría de edad o
  atención geriátrica. El backend ya la persistía en el caso; se añadió el campo en la UI (y al draft offline)
  para que alimente el ruteo por especialidad.
- **Módulo 1 — Intake offline-first: guardado local + reintento (issue #2, Charter in-scope #1):** el intake
  del solicitante ahora tolera conexión intermitente. Lo capturado se **guarda en `localStorage`** (draft) y
  **sobrevive a una recarga**; si el envío falla por red o error de servidor (5xx), la solicitud se **encola**
  (`intake-outbox`) y se **reintenta automáticamente** al cargar la app y al recuperar la conexión (evento
  `online`), con un aviso discreto de "solicitud guardada sin enviar". La **Rama Roja** ya no descarta en
  silencio la solicitud de contacto de una persona en riesgo. Un error **4xx** (dato inválido) no se
  reintenta. No compromete el **fail-safe**: las líneas de crisis se siguen mostrando sin backend (lista
  embebida + caché). Es la variante ligera del solicitante; el offline-first pesado con **SQLCipher (RF-4.1)**
  del portal del psicólogo permanece fuera del MVP (#26). Nuevas piezas: `intake-draft`, `intake-outbox`,
  `IntakeOutboxFlusher` (montado en un `layout` del intake) y tests unitarios.
- **Módulo 1 — Consentimiento informado en cada interfaz del solicitante (issue #1):** aviso de
  consentimiento/privacidad **no bloqueante** (`ConsentNotice`, colapsable) presente en **todas** las
  pantallas del solicitante (`/intake`, `/intake/roja`, `/intake/verde`, `/guias`), no solo al inicio. Es
  intencionadamente informativo (sin checkbox ni gate) para **no añadir fricción** al camino de riesgo alto
  ni a las líneas de crisis. El texto vive en **config** (`consent.requester`, nuevo endpoint público
  `GET /consent/requester`), nunca hardcodeado. Texto **provisional** (`v0.1.0-draft`) pendiente del texto
  oficial de la FPV — el PRD aún no fija un consentimiento para el solicitante (decisión Human-in-the-Loop,
  igual que las guías PAP).
- **Módulo 2 — Cambio y reseteo de contraseña (issue #36, RF-2.2.4):** el personal ya puede **cambiar su
  contraseña autenticado** (`POST /auth/change-password`, re-verifica la actual) y **recuperar una
  olvidada** mediante un **token de un solo uso enviado por correo** (`POST /auth/forgot-password` →
  `POST /auth/reset-password`). Solo se persiste el **hash** del token (tabla `password_reset_tokens` con
  RLS default-deny, migración `20260628000014`), con TTL configurable (`password_reset_ttl_minutes`, 60 min
  por defecto). Ambos flujos hacen **bump de `token_version`** para invalidar las sesiones previas
  (RF-2.7, ADR-0005) y `/auth/forgot-password` responde de forma **uniforme** para no filtrar qué correos
  existen. Nuevas pantallas: `/cambiar-contrasena` (enlazada desde los sidebars), `/recuperar-contrasena`
  (enlace "¿Olvidaste tu contraseña?" en el login) y `/restablecer-contrasena`. Correo de recuperación
  añadido a `LogNotifier`/`SmtpNotifier`; acciones `password_changed`, `password_reset_requested` y
  `password_reset` traducidas en la auditoría. Follow-up menor: migrar la entrega inicial de credenciales
  a un enlace tokenizado (hoy el reset ya ofrece una vía de recuperación segura).
- **Módulo 1 — Persistencia de "Cambio de hábitos" (issue #3, RF-1.3 pantalla 5):** los cambios de hábito
  reportados en el intake de Rama Verde (los 5 checkboxes ya entregados en #24) ahora **se persisten en el
  caso** (nueva columna `cases.habit_changes`, migración `20260628000013`) y se exponen en el resumen del
  caso (`cambio_habitos`), mostrándose al **psicólogo asignado** en el detalle. Ya alimentaban el índice de
  urgencia; ahora quedan registrados para el seguimiento clínico.
- **Observabilidad y alertas (issue #8, fase 06):** endpoint **`GET /metrics`** (coordinador/admin) con
  un snapshot de **SLA por nivel de riesgo** (p50/p95/promedio del tiempo de asignación), estado de la
  **cola** (pendientes, riesgo alto, **SLA vencidos**), totales y `uptime_seconds`; `GET /health` ahora
  también expone `uptime_seconds` (liveness). Nueva **alerta crítica** estructurada
  `high_risk_escalated_no_coordinator` (`raiseAlert`, log `error` para pipelines de alertas por logs) que
  se dispara cuando un caso de **riesgo alto se escala sin coordinador activo** disponible. Cálculo de
  métricas en una función pura (`summarizeSla`) con tests. Docs de la fase 06 actualizados.
- **Módulo 1 — Catálogo clínico real de tags (issue #19, RF-1.3):** se reemplazó el catálogo provisional
  por los **22 tags** de la FPV del PRD (RF-1.3), agrupados en rojo/naranja/amarillo e incluyendo duelo,
  infancia y disociación. **Versionado** (`TAG_CATALOG_VERSION`) en el dominio y espejado en el web (mismos
  códigos; el backend re-resuelve severidad/peso, nunca confía en el cliente). Pesos por severidad con
  ajustes marcados por el PRD (duelo traumático, culpa del superviviente); el `TagPicker` ahora agrupa por
  severidad. Afinado final de pesos y ruteo por especialidad infantil (por tag) quedan como follow-up FPV.
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
