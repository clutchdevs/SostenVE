# Guía de despliegue a producción — PPV / SostenVE

> **Objetivo:** llevar la plataforma a producción de forma segura. Es una app de salud mental
> con datos sensibles (PII + notas clínicas), así que el cifrado, los respaldos y la gestión de
> secretos **no son opcionales**.
>
> **Estado:** guía operativa. Las decisiones marcadas `<TODO — Human-in-the-Loop>` deben resolverse
> con la Federación antes de abrir al público.

---

## 1. Arquitectura de despliegue

```
                      ┌───────────────────────────┐
   Navegador  ───────▶│  Web (Next.js)  · Vercel  │
   (PWA)             └─────────────┬─────────────┘
                                   │ NEXT_PUBLIC_API_URL (HTTPS)
                                   ▼
                      ┌───────────────────────────┐        ┌──────────────────────┐
                      │  API (Hono)  · Vercel      │───────▶│ Supabase (PostgreSQL)│
                      │  serverless functions      │  pooler│  + RLS + backups     │
                      └───┬───────────────┬────────┘        └──────────────────────┘
        Vercel Cron ──────┘               │  ├─▶ Upstash Redis (presencia RF-2.5)
        (*/2 min, CRON_SECRET)            │  ├─▶ SMTP (correos RF-2.2.4)
                                          │  └─▶ Padrón FPV (validación, X-API-TOKEN)
```

- **Dos proyectos Vercel**: `apps/web` (Next.js) y `apps/api` (Hono como funciones serverless; el
  entry es [`apps/api/api/index.ts`](../../apps/api/api/index.ts), Vercel autodetecta la carpeta `api/`).
- **Base de datos**: proyecto Supabase (Postgres gestionado, con RLS y respaldos).
- **Presencia en tiempo real**: Upstash Redis (REST) — en dev es memoria; en prod **debe** ser Upstash
  (serverless = múltiples instancias, no comparten memoria).
- **Cron**: Vercel Cron cada 2 min llama a `/api/v1/cron/check-sla` (asignación + escalado SLA), protegido
  por `CRON_SECRET` (ver [`apps/api/vercel.json`](../../apps/api/vercel.json)).
- **Correo**: proveedor SMTP (Gmail/Brevo/SendGrid…).
- **Padrón FPV**: servicio externo (`https://api.sistema.fpv.org.ve`) para validar cédula + nº FPV.

---

## 2. Servicios a provisionar (cuentas)

| Servicio | Para qué | Notas |
|---|---|---|
| **Vercel** | Hosting de Web + API | 2 proyectos apuntando al mismo repo, distinto *Root Directory* |
| **Supabase** | Postgres + Auth keys + backups | Plan con **Point-in-Time Recovery / backups diarios** |
| **Upstash Redis** | Presencia en tiempo real | Base Redis con REST habilitado |
| **Proveedor SMTP** | Correos (credenciales, invitaciones, reset) | Gmail App Password / Brevo / SendGrid |
| **Token API del padrón FPV** | Validación de psicólogos | Lo entrega la FPV (issue #6) |
| **Dominio + DNS** | `ppv.org.ve` (o el final) | Certificado HTTPS lo gestiona Vercel |

---

## 3. Decisiones previas (Human-in-the-Loop)

Deben estar cerradas **antes** de abrir al público (ver [ADR-0006](../00-project/adr) y el charter):

- [ ] Dominio definitivo (afecta CORS, URLs de correo y `NEXT_PUBLIC_API_URL`).
- [ ] Proveedor de hosting/DB confirmado y su plan (backups incluidos).
- [ ] Decisiones de la FPV: turnos, **retención de datos**, texto de consentimiento final, política de
      verificación de psicólogos. `<TODO — Human-in-the-Loop>`
- [ ] Proveedor SMTP institucional (idealmente `no-reply@ppv.org.ve`, no un Gmail personal).
- [ ] Responsable de la **custodia de secretos** (quién guarda `ENCRYPTION_KEY` y `PSEUDONYMIZATION_SALT`).

---

## 4. Variables de entorno

Todos los **secretos** viven en el entorno (Vercel → Project → Settings → Environment Variables),
**nunca en el repo**. Lo que no es secreto vive en `config/app.config.yml`. Referencia:
[`.env.example`](../../.env.example).

### 4.1 API (`apps/api`)

| Variable | Qué es | Secreto | Cómo obtenerla / generar |
|---|---|:---:|---|
| `NODE_ENV` | Selecciona la sección `production:` de `app.config.yml` | — | `production` |
| `DATABASE_URL` | Conexión Postgres — **usar el POOLER**, no la directa (serverless, ADR-0002) | ✅ | Supabase → Project → Database → *Connection Pooling* |
| `SUPABASE_URL` | URL del proyecto Supabase | — | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave service-role (bypassa RLS; solo backend) | ✅ | Supabase → API keys |
| `SUPABASE_ANON_KEY` | Clave anónima | ✅ | Supabase → API keys |
| `JWT_SECRET` | Firma de tokens de acceso/refresh (ADR-0005) | ✅ | `openssl rand -base64 48` (≥ 32 bytes) |
| `ENCRYPTION_KEY` | AES-256-GCM de campos clínicos en reposo (ADR-0004) | ✅ | **32 bytes exactos** en base64: `openssl rand -base64 32` |
| `PSEUDONYMIZATION_SALT` | HMAC que liga PII ↔ datos clínicos (ADR-0011) | ✅ | `openssl rand -base64 32` — **rotarla rompe el vínculo con los seudónimos existentes** |
| `CRON_SECRET` | Secreto que valida el endpoint de cron (ADR-0009) | ✅ | `openssl rand -hex 32` |
| `FPV_API_TOKEN` | `X-API-TOKEN` del padrón FPV | ✅ | Lo entrega la FPV |
| `EMAIL_PROVIDER` | `smtp` para enviar de verdad (default `log` = no envía) | — | `smtp` |
| `SMTP_HOST` / `SMTP_PORT` | Servidor SMTP | — | p. ej. `smtp.gmail.com` / `587` |
| `SMTP_USERNAME` / `SMTP_FROM` | Usuario y remitente | — | `SMTP_FROM` ideal: `PPV <no-reply@ppv.org.ve>` |
| `SMTP_PASSWORD` | Contraseña / App Password | ✅ | Del proveedor SMTP |
| `UPSTASH_REDIS_REST_URL` | Presencia (RF-2.5) | — | Upstash → REST API |
| `UPSTASH_REDIS_REST_TOKEN` | Token de Upstash | ✅ | Upstash → REST API |

> ⚠️ `ENCRYPTION_KEY` debe **decodificar a exactamente 32 bytes** o la app no arranca. Genera con
> `openssl rand -base64 32` (produce 32 bytes) y **guárdala en un gestor de secretos**: si se pierde,
> los datos clínicos cifrados son irrecuperables.

### 4.2 Web (`apps/web`)

| Variable | Qué es | Valor |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | URL pública del API desplegado | `https://api.ppv.org.ve/api/v1` (o la URL Vercel del proyecto API) |

### 4.3 Generar todos los secretos de una vez

```bash
echo "JWT_SECRET=$(openssl rand -base64 48)"
echo "ENCRYPTION_KEY=$(openssl rand -base64 32)"      # 32 bytes exactos (AES-256)
echo "PSEUDONYMIZATION_SALT=$(openssl rand -base64 32)"
echo "CRON_SECRET=$(openssl rand -hex 32)"
```

---

## 5. Ajustar `config/app.config.yml` (no son secretos → se commitean)

Hoy la config trae **URLs de `localhost`** en los correos y un dominio CORS placeholder. Dos ajustes:

**5.1 CORS — dominio real de la web.** La clave `production_origins` **ya existe** en el bloque
`default: &default` y la app la usa cuando `NODE_ENV=production`. Solo cambia el valor:

```yaml
default: &default
  # …
  security:
    cors:
      production_origins: ["https://ppv.org.ve"]   # ← tu dominio real
```

**5.2 URLs de los correos.** Estas **no** son configurables por entorno (solo el `provider`/SMTP lo son).
Como el merge `<<:` de YAML es **superficial** (definir `email:` en `production:` reemplaza el bloque
entero, no lo fusiona clave por clave), hay que dar el bloque `email:` **completo** dentro de `production:`:

```yaml
production:
  <<: *default
  email:
    provider: "log"          # el envío REAL se activa con EMAIL_PROVIDER=smtp (entorno)
    from: "PPV <no-reply@ppv.org.ve>"
    login_url: "https://ppv.org.ve/login"
    coordinator_invite_url: "https://ppv.org.ve/registro-coordinador"
    password_reset_url: "https://ppv.org.ve/restablecer-contrasena"
    smtp:                    # host/port/username se sobrescriben por entorno (SMTP_*)
      host: ""
      port: 587
      username: ""
```

> `provider`, `from`, `host`, `port`, `username` y `password` los toma del entorno (`EMAIL_PROVIDER`,
> `SMTP_*`) si están puestos; las **3 URLs de arriba solo salen de este archivo**. Verifica también
> `fpv.base_url` (`https://api.sistema.fpv.org.ve`) y los TTL en `security.session` (según los RF).

**5.3 Presencia (RF-2.5) → Upstash en producción.** El default usa `memory` (no sirve en serverless,
donde cada instancia tiene su propia memoria). Cambia `presence.provider` a `upstash` (bloque completo, por
el merge superficial) y pon `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` en el entorno:

```yaml
production:
  <<: *default
  email: # …(como en 5.2)…
  presence:
    provider: "upstash"
    heartbeat_ttl_seconds: 65
    heartbeat_interval_seconds: 30
```

---

## 6. Base de datos (Supabase)

1. **Crear el proyecto** Supabase (región más cercana a Venezuela disponible).
2. **Aplicar migraciones** (crea tablas, RLS, funciones):
   ```bash
   supabase link --project-ref <ref-del-proyecto>
   supabase db push        # aplica supabase/migrations/*.sql en orden
   ```
3. **NO cargar el seed.** [`supabase/seed.sql`](../../supabase/seed.sql) son **datos de PRUEBA**
   (usuarios `@ppv.test`, casos ficticios). En producción **no debe correr**.
4. **Primer administrador**: crear la cuenta admin real por SQL/migración de datos (con su hash argon2id),
   no con el seed de prueba. `<TODO — Human-in-the-Loop>`
5. **RLS**: ya viene en las migraciones (`20260628000002_rls_policies.sql` + posteriores). Verificar que
   RLS esté **habilitado** en todas las tablas con PII/clínicas.
6. **Cifrado en reposo**: las columnas clínicas se cifran a nivel de app (AES-256-GCM con `ENCRYPTION_KEY`);
   Supabase además cifra el disco.
7. **Respaldos**: activar **backups diarios / PITR desde el día 1** (requisito del proyecto). Probar una
   restauración antes de abrir al público.
8. **Conexión**: usar la **URL del pooler** en `DATABASE_URL` (serverless abre/cierra conexiones — ADR-0002).

---

## 7. Desplegar el API (Vercel)

1. **New Project** → mismo repo → **Root Directory = `apps/api`**.
2. **Build**: `npm run build` (`tsc`). Las funciones se sirven desde `apps/api/api/`.
3. **Environment Variables**: cargar **todas** las de la sección 4.1 (para *Production*, y opcionalmente
   *Preview*).
4. **Cron**: ya está declarado en [`vercel.json`](../../apps/api/vercel.json)
   (`*/2 * * * *` → `/api/v1/cron/check-sla`). Vercel envía el `CRON_SECRET` como `Authorization: Bearer`.
5. (Opcional) Dominio `api.ppv.org.ve`.

---

## 8. Desplegar la Web (Vercel)

1. **New Project** → mismo repo → **Root Directory = `apps/web`**.
2. **Build**: `npm run build` (`next build`), output estándar de Next.
3. **Environment Variables**: `NEXT_PUBLIC_API_URL` apuntando al API desplegado.
4. **Dominio**: `ppv.org.ve` (Vercel emite el certificado HTTPS automáticamente).
5. **PWA**: el `theme_color`/manifest ya están en la app; verificar que se instale como PWA.

---

## 9. Seguridad y cumplimiento (obligatorio)

- **HTTPS en todo** (Vercel lo fuerza) — nunca servir la app por HTTP.
- **Secretos fuera del repo**: `.env` está en `.gitignore`; usar el gestor de secretos de Vercel/Supabase.
- **`ENCRYPTION_KEY` y `PSEUDONYMIZATION_SALT`**: respaldarlas en un gestor seguro. Perderlas = perder datos
  clínicos; rotar la salt rompe el vínculo PII↔clínico.
- **RLS activo** en Supabase (defensa en profundidad además de la autorización de la app).
- **Auditoría**: la tabla `audit_log` registra acciones sensibles (append-only, con trigger anti-borrado).
- **Rate limiting**: configurado (`security.rate_limit`) para intake y login.
- **Sesiones**: expiran por inactividad (RF-2.7) y por `token_version` (revocación).
- **Backups diarios** + prueba de restauración.
- **Rotación de credenciales**: definir cadencia para `JWT_SECRET`, tokens SMTP y claves Supabase (rotar
  `JWT_SECRET` invalida sesiones activas — comunicar).

---

## 10. Checklist de lanzamiento (go-live)

- [ ] Secretos generados y cargados en Vercel (API + Web).
- [ ] `NODE_ENV=production`; sección `production:` de `app.config.yml` con URLs y CORS reales.
- [ ] Migraciones aplicadas en Supabase de producción; **seed NO ejecutado**.
- [ ] Admin real creado (no `@ppv.test`).
- [ ] Backups diarios activos + restauración probada.
- [ ] Upstash configurado y `presence.provider: upstash` (en el `production:` si aplica) + credenciales.
- [ ] SMTP real probado (llega un correo de bienvenida/reset de verdad).
- [ ] `FPV_API_TOKEN` válido → un registro real se valida contra el padrón.
- [ ] Dominios conectados (web + api) con HTTPS.
- [ ] Cron corriendo (ver logs de Vercel Cron cada 2 min).
- [ ] Líneas de crisis reales cargadas en `/admin/lineas` (las del seed son de prueba).

---

## 11. Verificación post-despliegue (smoke tests)

```bash
API=https://api.ppv.org.ve/api/v1
curl -s $API/health                                   # 200
curl -s $API/crisis-lines/active                       # líneas reales
# login admin real → token
# intake verde/roja desde la web → crea caso
curl -s -X POST $API/cron/check-sla -H "Authorization: Bearer $CRON_SECRET"   # {escalated,assigned}
# panel: /admin (excepciones), /admin/asignacion (tope), /coordinador, /psicologo
# monitoreo: GET /metrics (coordinador/admin) — ver docs/06-monitoring
```

---

## 12. Migraciones y rollback

- **Nuevas migraciones**: se agregan en `supabase/migrations/` y se aplican con `supabase db push`. Son
  incrementales; evitar cambios destructivos (usar columnas nuevas + backfill).
- **Rollback de app**: Vercel permite *Instant Rollback* a un despliegue previo. Ojo: un rollback de código
  con una migración ya aplicada puede requerir una migración compensatoria — versionar juntos.
- **Rollback de datos**: restaurar desde backup/PITR de Supabase (por eso el respaldo diario es innegociable).

---

## Referencias
- Variables/secretos: [`.env.example`](../../.env.example)
- Config no-secreta: [`config/app.config.yml`](../../config/app.config.yml)
- Cron: [`apps/api/vercel.json`](../../apps/api/vercel.json)
- ADRs: [`docs/00-project/adr`](../00-project/adr) — 0002 (pooler), 0004 (cifrado), 0005 (JWT/argon2),
  0006 (hosting), 0009 (cron), 0011 (seudonimización)
- Monitoreo post-deploy: [`docs/06-monitoring`](../06-monitoring)
