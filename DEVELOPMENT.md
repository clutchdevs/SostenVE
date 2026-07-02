# Guía de desarrollo — PPV

Cómo levantar la app completa en local, correr la base de datos y ejecutar las pruebas.

## Arquitectura local
| Pieza | Qué es | Puerto |
|---|---|---|
| **Web** | PWA Next.js (`apps/web`) | http://localhost:3000 |
| **API** | Backend Hono / funciones serverless (`apps/api`) | http://localhost:3001/api/v1 |
| **Base de datos** | Stack local de **Supabase** (Postgres + Auth + REST), vía Supabase CLI | API 54321 · DB 54322 · Studio 54323 |

La base de datos **no** vive en `docker-compose.yml`: es el stack de Supabase, que gestiona la
Supabase CLI (`supabase start`). El `docker-compose.yml` levanta **API + Web** y se conecta a ese
Supabase local. `npm run dev:up` orquesta ambas cosas en un solo comando.

## Requisitos
- **Node.js 22+** y **npm 10+**
- **Docker Desktop** en ejecución (provee tanto Supabase como los contenedores de la app)
- No hace falta instalar la Supabase CLI global: viene como dependencia de desarrollo del repo.

## Arranque rápido (un comando)
```bash
npm install            # solo la primera vez (instala workspaces + Supabase CLI)
npm run dev:up         # arranca Supabase y luego API + Web en contenedores
```
- Abre la app: **http://localhost:3000**
- Salud de la API: **http://localhost:3001/api/v1/health**
- Supabase Studio (ver datos): **http://localhost:54323**

Primera vez (o para aplicar migraciones / limpiar datos):
```bash
npm run dev:reset      # aplica las migraciones de supabase/migrations
```

Detener todo:
```bash
npm run dev:down       # baja los contenedores y detiene Supabase
```

### Qué hace `dev:up`
1. `supabase start` — levanta Postgres + servicios de Supabase (Docker) y aplica migraciones en una BD nueva.
2. `docker compose up` — un servicio `installer` corre `npm ci` dentro de Linux (para deps nativas como
   `@node-rs/argon2`) en volúmenes nombrados, y luego arrancan **API** (`:3001`) y **Web** (`:3000`),
   apuntando al Supabase del host vía `host.docker.internal`.

> Los secretos/llaves de `docker-compose.yml` son **valores de desarrollo** (las llaves demo de la
> Supabase CLI). No usar en producción. Puedes sobreescribirlos con un `.env` en la raíz.

## Alternativa sin Docker para la app (3 terminales)
Si prefieres no contenerizar API/Web (HMR más rápido en algunos equipos):
```bash
npm run db:start                         # Supabase (Docker)
npm run db:reset                         # migraciones
npm run dev --workspace @ppv/api    # API en :3001  (requiere .env con llaves de Supabase)
npm run dev --workspace @ppv/web    # Web en :3000
```
Copia `.env.example` a `.env` y complétalo con los valores que imprime `npx supabase status`
(`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) y secretos de desarrollo
(`JWT_SECRET`, `PSEUDONYMIZATION_SALT`, `ENCRYPTION_KEY`, `CRON_SECRET`).

## Base de datos
- Migraciones versionadas en `supabase/migrations/`.
- `npm run dev:reset` (o `npm run db:reset`) recrea la BD y aplica migraciones — **borra datos locales**.
- Studio: http://localhost:54323 · DB directa: `postgresql://postgres:postgres@localhost:54322/postgres`.

## Pruebas
| Tipo | Comando | Requisitos |
|---|---|---|
| Unidad + integración (API) y componentes (Web) | `npm run test` | Supabase arriba (`npm run db:start`) para los e2e de API |
| Type-check / Lint | `npm run type-check` · `npm run lint` | — |
| E2E de navegador (Playwright) | `npm run e2e:install` (una vez) y `npm run e2e` en `apps/web` | Web (+ API/Supabase para specs de intake/portales) |
| Carga (autocannon) | `LOAD_CONNECTIONS=50 LOAD_DURATION=30 npm run load-test` | API + Supabase arriba |

Detalle de estrategia, checklist del threat model y plan de piloto: [`docs/04-testing/README.md`](docs/04-testing/README.md).

### Probar el flujo manualmente
1. `npm run dev:up` y abre http://localhost:3000.
2. **Intake**: responde el Likert → Rama Roja (líneas de crisis inmediatas) o Verde (tags) → envía.
3. **Líneas de crisis (principio no negociable)**: en `/intake/roja`, aunque la API falle, los números
   se muestran (caché/respaldo embebido).
4. **Personal**: crea un voluntario con `POST /api/v1/volunteers/register`, inicia sesión en `/login`,
   revisa el **portal del psicólogo** y el **panel del coordinador**.
5. **Asignación/SLA**: invoca el cron `POST /api/v1/cron/check-sla` con el header `X-Cron-Secret`.

## Rutas de la aplicación web
| Ruta | Para quién | Descripción | Sesión |
|---|---|---|---|
| `/` | Todos | Bienvenida con dos caminos: solicitar apoyo o acceso de personal | No |
| `/intake` | Solicitante | Pregunta Likert (triage de baja fricción) | No |
| `/intake/roja` | Solicitante | Rama Roja: líneas de crisis + sub-canales | No |
| `/intake/verde` | Solicitante | Rama Verde: tags de síntomas, ubicación, hábitos y envío | No |
| `/guias` | Solicitante | Guías de Primeros Auxilios Psicológicos (PAP) de autoayuda | No |
| `/registro` | Psicólogo | Postulación de voluntario (validación FPV + consentimiento) | No |
| `/login` | Personal | Inicio de sesión del psicólogo (enruta por rol) | No |
| `/login-coordinador` | Coordinador | Acceso dedicado de coordinador | No |
| `/registro-coordinador` | Coordinador | Activación por invitación tokenizada | No |
| `/recuperar-contrasena` · `/restablecer-contrasena` | Personal | Reseteo de contraseña por correo | No |
| `/psicologo` | Psicólogo | Lista de casos asignados + toggle de disponibilidad | Sí (psicólogo) |
| `/psicologo/casos/[id]` | Psicólogo | Detalle del caso, notas, aceptar/cierre clínico | Sí (psicólogo) |
| `/coordinador` | Coordinador / Admin | Panel de casos (prioridad + SLA), reasignar/cerrar, capacidad | Sí (coordinador/admin) |
| `/coordinador/voluntarios` · `/coordinador/psicologos` | Coordinador / Admin | Gestión de voluntarios y presencia por psicólogo | Sí (coordinador/admin) |
| `/coordinador/reportes` | Coordinador / Admin | Reportes/observabilidad de SLA | Sí (coordinador/admin) |
| `/cambiar-contrasena` | Personal | Cambio de contraseña autenticado | Sí |
| `/admin` | Admin | Panel de administración (entrada) | Sí (admin) |
| `/admin/lineas` | Admin | CRUD de líneas de crisis | Sí (admin) |
| `/admin/coordinadores` | Admin | Invitaciones de coordinador | Sí (admin) |
| `/admin/padron` | Admin | Padrón de voluntarios (roster por estado) | Sí (admin) |
| `/admin/auditoria` | Admin | Consulta de la bitácora de auditoría | Sí (admin) |

> Al iniciar sesión, el coordinador/admin va a `/coordinador` y el psicólogo a `/psicologo`. Las
> pantallas de personal tienen un encabezado/navegación con **Cerrar sesión**.

**API / Swagger:** `GET /api/v1/docs` (Swagger UI interactivo) y `GET /api/v1/openapi.json`
(documento OpenAPI). Health: `GET /api/v1/health`.

## Puertos
| Servicio | URL |
|---|---|
| Web | http://localhost:3000 |
| API | http://localhost:3001/api/v1 |
| Supabase API | http://localhost:54321 |
| Supabase Studio | http://localhost:54323 |
| Postgres | localhost:54322 |

## Troubleshooting
- **`supabase start` falla por contenedor huérfano** (p. ej. `supabase_vector`): `npm run db:stop` y
  reintenta; si persiste, `docker rm -f supabase_vector_SostenVE`. El stack de analytics está
  deshabilitado en `supabase/config.toml`.
- **Puerto en uso** (3000/3001/5432x): cierra el proceso o cambia el puerto publicado en
  `docker-compose.yml`.
- **Cambié dependencias** y los contenedores no las ven: recrea los volúmenes de node_modules:
  `docker compose down -v` y luego `npm run dev:up`.
- **HMR no recarga** en Docker/Windows: ya se fuerza polling (`WATCHPACK_POLLING`); si aún no, usa la
  alternativa sin Docker.
- **La API responde 500 "Missing env"**: faltan llaves de Supabase/secretos. Con Docker vienen por
  defecto; sin Docker, revisa tu `.env`.
