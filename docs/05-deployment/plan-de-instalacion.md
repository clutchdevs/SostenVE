# Plan de instalación y despliegue (paso a paso) — PPV / SostenVE

> **Para quién es esto:** la persona que tenga que **levantar el entorno desde cero** en
> Vercel + Supabase + Upstash. Es el runbook **práctico y probado** — cada paso y cada
> "trampa" aquí abajo la sufrimos y resolvimos en un despliegue real. Síguelo en orden.
>
> Para el endurecimiento de **producción** (dominios, backups/PITR, rotación de secretos,
> cumplimiento), ver además [`guia-de-despliegue.md`](./guia-de-despliegue.md). Este documento
> es el **"cómo lo levanto y por qué se rompía"**.

---

## 0. Mapa mental (qué habla con qué)

```
  Navegador ──► Web (Next.js, Vercel)  ──fetch──►  API (Hono, Vercel funciones)
                     │                                   │
       NEXT_PUBLIC_API_URL                               ├─► Supabase (Postgres + Data API)
       (= URL del API + /api/v1)                         ├─► Upstash Redis  (presencia en línea)
                                                         ├─► SMTP (Gmail)   (correos)
                                                         └─► Padrón FPV     (validación registro)
```

- **Dos proyectos de Vercel separados**, apuntando al **mismo repo** pero con distinto **Root Directory**:
  - `apps/api` → el API (funciones serverless; entry `apps/api/api/index.ts`).
  - `apps/web` → la web (Next.js).
- El **API** guarda/lee todo en **Supabase**, la **presencia** en **Upstash**, y manda **correos** por SMTP.

> ⚠️ **Lo primero que confunde:** son **DOS** proyectos en Vercel, no uno. Cada uno tiene sus
> propias variables de entorno. Ver la tabla de la sección 9 para saber **qué va en cuál**.

---

## 1. Cuentas necesarias (todas tienen free tier)

| Servicio | Para qué | Nota |
|---|---|---|
| **GitHub** | El repo | El repo debe ser accesible por Vercel |
| **Vercel** | Hosting Web + API | Deploy de org privada requiere plan Pro; con repo **público** funciona en Hobby |
| **Supabase** | Postgres + Data API | Free tier alcanza para piloto |
| **Upstash** | Redis (presencia) | Free tier alcanza para piloto |
| **Gmail** (u otro SMTP) | Enviar correos | Requiere **App Password** (ver 4) |
| **Token del padrón FPV** | Validar psicólogos al registrarse | Lo entrega la FPV. Sin él, el registro cae a `pending_approval` (no bloquea) |

---

## 2. Provisionar Supabase (base de datos)

1. Crea un proyecto en **supabase.com** (elige la **región más cercana a donde corre el API**; ver
   nota de región en la sección 3 — idealmente **US-East**).
2. **Aplica las migraciones** (crea tablas, RLS, funciones) desde tu máquina:
   ```bash
   npx supabase login
   npx supabase link --project-ref <REF-DEL-PROYECTO>
   npx supabase db push        # aplica supabase/migrations/*.sql en orden
   ```
   > La última migración esperada es `assignment_settings`. Si `db push` dice que ya están
   > aplicadas, estás al día.
3. **NO cargues el seed** (`supabase/seed.sql` son datos de PRUEBA `@ppv.test`).
4. Anota de **Supabase → Project Settings → API**:
   - **Project URL** → `https://xxxx.supabase.co` (esto va en `SUPABASE_URL`).
   - **anon / publishable key** → `SUPABASE_ANON_KEY`.
   - **service_role / secret key** → `SUPABASE_SERVICE_ROLE_KEY`.

> 🔑 **Formatos de clave:** Supabase migró a claves nuevas `sb_publishable_…` (= anon) y
> `sb_secret_…` (= service_role). También sirven las viejas tipo `eyJ…` (JWT). **Ambas
> funcionan** con la app.
>
> ⚠️ **`DATABASE_URL` NO se usa en runtime.** Aunque `.env.example` la lista, el API habla con
> Supabase por la **Data API** (PostgREST) usando solo `SUPABASE_URL` + las 2 claves. No pierdas
> tiempo con el pooler para que arranque el API.

---

## 3. Provisionar Upstash (presencia en tiempo real)

La presencia ("psicólogo en línea") **debe** ir en Redis compartido — en serverless cada
instancia tiene su propia memoria, así que la memoria local no sirve.

1. En **console.upstash.com** → producto **Redis** → **Create Database**.
2. **Primary Region: US-East-1 (N. Virginia)** — para que quede **junto** a la región del API en
   Vercel (`iad1`) y haya menos latencia.
3. **Type: Regional** (no "Global", que es de pago). TLS por defecto.
4. Crea, y en la sección **REST API** copia:
   - `UPSTASH_REDIS_REST_URL` → `https://xxxx.upstash.io`
   - `UPSTASH_REDIS_REST_TOKEN` → (revélalo con el 👁)

> 💡 **Costo a escala:** cada psicólogo en línea escribe un heartbeat cada 60s (ya optimizado).
> Con muchos psicólogos concurrentes puedes pasar el free tier; el pay-as-you-go de Upstash son
> centavos. Ver `presence.heartbeat_interval_seconds` en `apps/api/config/app.config.yml`.

---

## 4. Provisionar SMTP (correos) — ejemplo con Gmail

Los correos (credenciales a psicólogos aprobados, invitación de coordinador, reset de contraseña)
salen por SMTP.

1. En la cuenta de Gmail: activa **verificación en 2 pasos**.
2. Genera una **App Password** (Google Account → Security → App passwords).
3. Guarda estos valores para las env vars del **API**:
   - `EMAIL_PROVIDER=smtp`
   - `SMTP_HOST=smtp.gmail.com`
   - `SMTP_PORT=587`
   - `SMTP_USERNAME=tucorreo@gmail.com`
   - `SMTP_PASSWORD=<la App Password de 16 caracteres>`
   - `SMTP_FROM=PPV <tucorreo@gmail.com>`

> Sin `EMAIL_PROVIDER=smtp` el API usa el proveedor `log` (no envía nada, solo loguea).

---

## 5. Generar los secretos

Desde la raíz del repo:
```bash
npm run gen:secrets
```
Genera `JWT_SECRET`, `ENCRYPTION_KEY`, `PSEUDONYMIZATION_SALT`, `CRON_SECRET`.

> ⚠️ `ENCRYPTION_KEY` debe decodificar a **exactamente 32 bytes** (AES-256) o el API no arranca.
> Guarda `ENCRYPTION_KEY` y `PSEUDONYMIZATION_SALT` en un gestor de secretos: **perderlas = perder
> los datos clínicos cifrados**; rotar la salt rompe el vínculo con los seudónimos existentes.

---

## 6. Desplegar el **API** en Vercel

1. **Add New → Project** → importa el repo → **Root Directory = `apps/api`**.
2. **Build & Output**: deja los overrides **apagados** (Vercel autodetecta las funciones de
   `apps/api/api/`). **No** pongas un "Output Directory" ni un Build Command manual — si aparece el
   error *"No Output Directory named public"*, es que quedó un override; quítalo.
3. **Deployment Protection → Vercel Authentication → Disabled.** 🚨 **Crítico.** Si queda activo,
   Vercel pone un **muro de login SSO** delante de TODO: la web te carga (tu navegador tiene sesión
   de Vercel) pero el **fetch de la web al API se bloquea con 401** y nada funciona.
4. **Environment Variables** (Production) — carga TODAS (ver tabla sección 9):
   `NODE_ENV=production`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
   `JWT_SECRET`, `ENCRYPTION_KEY`, `PSEUDONYMIZATION_SALT`, `CRON_SECRET`,
   `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`,
   `EMAIL_PROVIDER`, `SMTP_*`, `FPV_API_TOKEN`,
   **`CORS_ORIGINS`** y **`WEB_BASE_URL`** (se llenan en el paso 8, con la URL de la web).
5. **Deploy.** Cuando termine, prueba en el navegador:
   ```
   https://TU-API.vercel.app/api/v1/health   → {"status":"ok",...}
   ```

> 📌 **Cron (Hobby):** `apps/api/vercel.json` trae un cron **diario** (`0 0 * * *`). El plan Hobby
> **solo permite cron diario** — no uses `*/2`. Si necesitas el barrido de SLA más seguido, dispara
> `POST /api/v1/cron/check-sla` (con `Authorization: Bearer <CRON_SECRET>`) desde un cron externo
> (p. ej. cron-job.org).

---

## 7. Desplegar la **Web** en Vercel

1. **Add New → Project** → mismo repo → **Root Directory = `apps/web`** → Framework **Next.js**.
2. **Deployment Protection → Vercel Authentication → Disabled** (igual que el API).
3. **Environment Variables** (Production):
   - **`NEXT_PUBLIC_API_URL = https://TU-API.vercel.app/api/v1`** 🚨 **CON `/api/v1` al final.**
     El cliente web hace `${NEXT_PUBLIC_API_URL}/auth/login`; si le falta el `/api/v1`, todo da **404**.
4. **Deploy** y abre `https://TU-WEB.vercel.app` → debe cargar la landing.

---

## 8. Conectar Web ↔ API (CORS + URLs de correo)

En el proyecto **API** de Vercel, con la URL **real de la web** ya conocida, agrega/edita:

| Variable (en el **API**) | Valor | Para qué |
|---|---|---|
| `CORS_ORIGINS` | `https://TU-WEB.vercel.app` | Permite que el navegador de la web llame al API. Sin esto, el preflight CORS se bloquea. Acepta lista separada por comas. |
| `WEB_BASE_URL` | `https://TU-WEB.vercel.app` | Rebasea las URLs de los correos (login / **invitación de coordinador** / reset) a tu dominio real. Sin esto, los links salen con el placeholder `REEMPLAZAR-web.vercel.app` y dan 404. |

> Usa el **origen exacto** (protocolo + dominio, **sin** `/` final ni ruta). Y usa la **URL de
> producción estable** de la web (proyecto Web → Settings → Domains), **no** las URLs de *preview*
> (cambian en cada deploy y romperían el CORS).

**Redeploy el API** para que tomen efecto. (Las env vars **no** aplican solas: Deployments → ⋯ → Redeploy.)

---

## 9. Referencia de variables — **qué va en cuál proyecto**

### 🔵 Proyecto **API** (`apps/api`)
| Variable | Secreto | Cómo obtenerla |
|---|:---:|---|
| `NODE_ENV` | — | `production` |
| `SUPABASE_URL` | — | Supabase → Settings → API → Project URL (`https://…supabase.co`) |
| `SUPABASE_ANON_KEY` | ✅ | Supabase → API keys (anon / `sb_publishable_…`) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase → API keys (service_role / `sb_secret_…`) |
| `JWT_SECRET` | ✅ | `npm run gen:secrets` |
| `ENCRYPTION_KEY` | ✅ | `npm run gen:secrets` (**32 bytes exactos**) |
| `PSEUDONYMIZATION_SALT` | ✅ | `npm run gen:secrets` |
| `CRON_SECRET` | ✅ | `npm run gen:secrets` |
| `UPSTASH_REDIS_REST_URL` | — | Upstash → REST API |
| `UPSTASH_REDIS_REST_TOKEN` | ✅ | Upstash → REST API |
| `EMAIL_PROVIDER` | — | `smtp` |
| `SMTP_HOST` / `SMTP_PORT` | — | `smtp.gmail.com` / `587` |
| `SMTP_USERNAME` / `SMTP_FROM` | — | tu correo / `PPV <correo>` |
| `SMTP_PASSWORD` | ✅ | App Password del proveedor |
| `FPV_API_TOKEN` | ✅ | Lo entrega la FPV (opcional para piloto) |
| `CORS_ORIGINS` | — | Origen de la web (paso 8) |
| `WEB_BASE_URL` | — | Origen de la web (paso 8) |

### 🟢 Proyecto **Web** (`apps/web`)
| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://TU-API.vercel.app/api/v1` (**con `/api/v1`**) |

> Regla mental: **API** = todo el backend + a dónde apunta la web (`CORS_ORIGINS`, `WEB_BASE_URL`).
> **Web** = solo a dónde está el API (`NEXT_PUBLIC_API_URL`).

---

## 10. Crear el primer administrador

No hay seed en producción, así que se crea a mano.

1. Genera el hash de una contraseña (desde `apps/api`, que tiene `@node-rs/argon2`):
   ```bash
   node -e "import('@node-rs/argon2').then(async m=>{const o={algorithm:m.Algorithm.Argon2id,memoryCost:19456,timeCost:2,parallelism:1};console.log(await m.hash('TU_PASSWORD',o))})"
   ```
   Copia la línea completa que empieza con `$argon2id$…`.
2. En **Supabase → SQL Editor**:
   ```sql
   insert into volunteers
     (full_name, professional_id, email, role, password_hash, status,
      consent_version, consent_accepted_at)
   values (
     'Administrador', 'ADMIN-001', 'tu-email@dominio.com', 'admin',
     'PEGA_EL_HASH_$argon2id...', 'active', 'v1.0.0-fpv', now()
   );
   ```
3. Entra en `https://TU-WEB.vercel.app/login` con ese email + contraseña → panel `/admin`.

> Para un **psicólogo de prueba** (validar asignación end-to-end): mismo INSERT pero
> `role='psychologist'`, `specialty='Psicología clínica'`. Luego entra con él, ponte **"Disponible"**
> (escribe presencia en Upstash) y crea un caso desde el intake → debe **auto-asignársele**.

---

## 11. Verificación post-despliegue (smoke tests)

```bash
API=https://TU-API.vercel.app/api/v1
curl -s  $API/health                                   # {"status":"ok",...}
curl -s  $API/crisis-lines/active                      # líneas de crisis (lee de la BD)
# login directo (sin navegador): 200 = OK, 401 = clave no coincide, TIMEOUT = ver troubleshooting
curl -si -X POST $API/auth/login -H "Content-Type: application/json" \
     -d '{"email":"tu-email@dominio.com","contrasena":"TU_PASSWORD"}'
```
Y desde la web: abrir `/login`, entrar como admin, crear un caso por el intake, y verificar que
el psicólogo en línea lo recibe.

---

## 12. Troubleshooting — síntomas reales y su causa

| Síntoma | Causa raíz | Arreglo |
|---|---|---|
| Al llamar el API sale `401 "Protected deployment"` / muro de login de Vercel | **Vercel Authentication** (Deployment Protection) activo | Desactívalo en **ambos** proyectos (paso 3) |
| El login (u otro **POST**) se **cuelga** hasta el timeout (300s); los **GET** sí responden | Falta alguna env var de Supabase → o (en su día) el runtime drenaba el body | Verifica `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` puestas. El *body-hang* del adaptador **ya está resuelto en el código** (`apps/api/api/index.ts` re-expone `req.rawBody`) |
| Login da **"credencial inválida"** aunque la clave sea correcta | El hash guardado no corresponde a esa clave, o el email no coincide (mayúsculas) | Regenera el hash (paso 10) y `UPDATE` la fila; usa el email en minúsculas |
| El navegador bloquea con **"No 'Access-Control-Allow-Origin'"** | `CORS_ORIGINS` no incluye el origen de la web | Ponlo (paso 8) con el origen exacto + redeploy |
| La web llama a `/auth/login` y da **404** (falta `/api/v1`) | `NEXT_PUBLIC_API_URL` sin el sufijo `/api/v1` | Corrígela (paso 7) + redeploy web |
| El link de **invitación de coordinador** abre `reemplazar-web.vercel.app` → `DEPLOYMENT_NOT_FOUND` | `WEB_BASE_URL` no configurada (las URLs de correo salen del placeholder) | Ponla (paso 8) + redeploy; **reenvía** la invitación (la vieja ya salió con el link roto) |
| El psicólogo no aparece "en línea" / no se asignan casos | Faltan `UPSTASH_REDIS_REST_URL` / `_TOKEN` | Ponlas (paso 3) + redeploy; el psicólogo debe estar **Disponible** con la pestaña abierta |
| Vercel rechaza el cron (`Hobby accounts are limited to daily cron jobs`) | Cron más frecuente que diario en Hobby | Deja el `0 0 * * *` de `vercel.json`; usa un cron externo si necesitas más |
| El API no arranca / `Missing required environment variable` | Falta un secreto (JWT/ENCRYPTION/PSEUDONYMIZATION/Supabase) | Cárgalo en el API + redeploy |

---

## 13. Cosas que **ya vienen resueltas en el código** (no las "arregles" de vuelta)

Estas fueron trampas que costaron sudor y **ya están fijas en el repo**. Si alguien las "revierte",
se rompe el deploy:

- **Adaptador Node de Vercel** (`@hono/node-server/vercel`) + **bridge del body** (`req.rawBody`) en
  `apps/api/api/index.ts` → sin esto, todo POST se cuelga.
- **argon2 síncrono** (`hashSync`/`verifySync`) en `apps/api/src/shared/security/password.ts` → la
  variante async se colgaba empaquetada en serverless.
- **Config "horneada"** a un módulo (`app-config.generated.ts` vía `npm run config:build`) en vez de
  leer el YAML en runtime (fallaba en Vercel).
- **Imports con extensión `.js`** (TypeScript `nodenext`) en todo `apps/api`.
- **Overrides por entorno** que agregamos: `CORS_ORIGINS` y `WEB_BASE_URL` (para no editar el YAML en
  cada cambio de dominio).

---

## Referencias
- Endurecimiento de producción (dominios, backups, rotación): [`guia-de-despliegue.md`](./guia-de-despliegue.md)
- Plantilla de variables: [`.env.example`](../../.env.example)
- Config no-secreta: [`apps/api/config/app.config.yml`](../../apps/api/config/app.config.yml)
- Cron: [`apps/api/vercel.json`](../../apps/api/vercel.json)
