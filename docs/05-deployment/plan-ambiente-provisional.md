# Plan — ambiente provisional (staging) en Vercel

> Runbook accionable para levantar un entorno **provisional** rápido, con **cero refactor**
> (Vercel = para lo que está construido). Para el detalle de cada tema, ver
> [`guia-de-despliegue.md`](guia-de-despliegue.md).
>
> Cloudflare **Workers** no sirve para la API (deps de Node: `@node-rs/argon2`, `nodemailer`,
> `node:crypto`). Si quieres Cloudflare, sería **Pages (web) + un host Node para la API** (Containers /
> Render / Railway / Fly.io), lo que exige un Dockerfile de prod aparte. Recomendado: **Vercel**.

## Qué ya dejé listo (en el repo)
- ✅ **Adaptador serverless Hono→Vercel** cableado (`apps/api/api/index.ts` → `export default handle(app)`)
  + **rewrites** en `apps/api/vercel.json` (`/(.*) → /api`). Sin esto la API **no** desplegaba en Vercel.
- ✅ Sección **`production:`** de `apps/api/config/app.config.yml` (correo, CORS, **presencia → Upstash**). Solo
  falta **reemplazar `REEMPLAZAR-web.vercel.app`** por la URL real de tu Web (2 lugares: `email.*` y
  `security.cors.production_origins`).
- ✅ **Generador de secretos**: `npm run gen:secrets` (o `node scripts/gen-secrets.mjs`).
- ✅ Test que valida las 3 secciones de config contra el schema (falla el CI si `production:` queda mal).

## Qué tienes que hacer tú (requiere cuentas externas)
Provisionar y pegar credenciales. Orden sugerido:

### 0) Mergear estos cambios a `main` (o a la rama que conecte Vercel)
Vercel despliega **desde Git**, así que necesita en la rama el adaptador de Vercel, la config de
producción y el resto. Mergea el PR correspondiente antes de conectar los proyectos.

### 1) Crear cuentas / recursos
| Recurso | Dónde | Qué copiar |
|---|---|---|
| **Supabase** (proyecto staging) | supabase.com | `Project URL`, `anon key`, `service_role key`, y la **Connection Pooling URL** (Database → Connection Pooling) |
| **Upstash Redis** | upstash.com | `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` (pestaña REST API) |
| **SMTP** | Gmail (App Password) / Brevo / SendGrid | host, port, usuario, from, password |
| **Token FPV** | La Federación (issue #6) | `FPV_API_TOKEN` |

### 2) Generar los secretos
```bash
npm run gen:secrets        # imprime JWT_SECRET, ENCRYPTION_KEY, PSEUDONYMIZATION_SALT, CRON_SECRET
```
> Corre esto **en tu máquina** y pega los valores en Vercel. **No** los commitees ni los pegues en chats.
> Genera un set **distinto** para staging y para el futuro prod. `ENCRYPTION_KEY` y
> `PSEUDONYMIZATION_SALT`: guárdalas en un gestor de secretos — perderlas = perder datos clínicos.

### 3) Crear los 2 proyectos en Vercel (mismo repo)
| Proyecto | Root Directory | Framework | Build |
|---|---|---|---|
| **Web** | `apps/web` | Next.js | `next build` |
| **API** | `apps/api` | Other | `npm run build` (funciones en `apps/api/api/`) |

Anota la URL de cada uno (ej. `https://ppv-web.vercel.app`, `https://ppv-api.vercel.app`).

### 4) Ajustar `apps/api/config/app.config.yml` con tu URL de Web
Reemplaza `REEMPLAZAR-web.vercel.app` por tu dominio de Web (en `email.login_url`,
`email.coordinator_invite_url`, `email.password_reset_url` y `security.cors.production_origins`),
commitea y deja que Vercel redepliegue.

### 5) Cargar las variables de entorno en Vercel
**Proyecto API** (Settings → Environment Variables → Production):

| Variable | De dónde sale |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Supabase → **Connection Pooling URL** |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API |
| `JWT_SECRET` / `ENCRYPTION_KEY` / `PSEUDONYMIZATION_SALT` / `CRON_SECRET` | `npm run gen:secrets` |
| `FPV_API_TOKEN` | la FPV |
| `EMAIL_PROVIDER` | `smtp` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USERNAME` / `SMTP_FROM` / `SMTP_PASSWORD` | tu proveedor SMTP |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Upstash |

**Proyecto Web**:

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://TU-API.vercel.app/api/v1` |

### 6) Base de datos
```bash
supabase link --project-ref <ref-del-proyecto-staging>
supabase db push          # aplica supabase/migrations/*  (NO cargues el seed de prueba)
```
Luego crea el **admin real** (no `admin@ppv.test`): inserta un `volunteer` con `role='admin'` y un hash
argon2id de su contraseña (puedes generarlo con el snippet de `docs/04-testing/seed-data.md`).

### 7) Smoke test
```bash
API=https://TU-API.vercel.app/api/v1
curl -s $API/health                        # 200
curl -s $API/crisis-lines/active           # responde
# En la web: /login (admin real), /intake (crear caso), /admin/asignacion (tope)
curl -s -X POST $API/cron/check-sla -H "Authorization: Bearer $CRON_SECRET"   # {escalated,assigned}
```
- Verifica que llega un **correo real** (registro/reset) → SMTP OK.
- Registra un psicólogo real → se valida contra el **padrón FPV** → `FPV_API_TOKEN` OK.
- El cron de Vercel corre cada 2 min (ver logs) → presencia (Upstash) + asignación funcionan.

## Nota: cron en el plan Hobby (gratis) de Vercel
Vercel Hobby solo permite cron **1 vez al día**, así que `vercel.json` usa `0 0 * * *` (diario). El motor de
asignación es **orientado a eventos** (al crear el caso / al ponerse online un psicólogo), por lo que el
cron es solo **red de seguridad** (escalado de SLA + reintentos) — el flujo principal no depende de él.
- **Para el barrido real cada 2 min sin pagar Pro:** usa un **cron externo gratis** (p. ej.
  [cron-job.org](https://cron-job.org)) que haga `GET https://TU-API.vercel.app/api/v1/cron/check-sla`
  con el header `Authorization: Bearer <CRON_SECRET>` cada 2 minutos.
- **Al pasar a Vercel Pro:** vuelve a poner `*/2 * * * *` en `vercel.json` y quita el cron externo.

## Checklist rápido
- [ ] Cuentas creadas (Supabase, Upstash, SMTP, token FPV).
- [ ] `npm run gen:secrets` → secretos en Vercel (staging).
- [ ] `REEMPLAZAR-web.vercel.app` reemplazado en `app.config.yml` (2 lugares) y commiteado.
- [ ] Env vars cargadas en API y Web.
- [ ] `supabase db push` (migraciones) + admin real creado. **Seed NO cargado.**
- [ ] Smoke test OK (health, login, intake, correo, FPV, cron).
