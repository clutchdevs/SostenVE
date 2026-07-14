# Datos de prueba (seed) — desarrollo local

> ⚠️ **Solo para desarrollo/local.** Credenciales y datos ficticios. **No usar en producción.**
> Fuente: [`supabase/seed.sql`](../../supabase/seed.sql) (se carga automáticamente con `db reset`).

## Cómo cargar el seed
```bash
npm run dev:reset          # = supabase db reset (aplica migraciones + carga supabase/seed.sql)
```
El seed es idempotente (`ON CONFLICT DO NOTHING`); cada `db reset` recrea la BD y lo vuelve a cargar.

## Credenciales de personal
Login en **`/login`** (la web enruta por rol). Las contraseñas se guardan con hash **argon2id**.

| Rol | Correo | Contraseña | Redirige a |
|---|---|---|---|
| Coordinador | `coordinador@ppv.test` | `Coordinador123!` | `/coordinador` |
| Psicólogo (infantil) | `psicologo@ppv.test` | `Psicologo123!` | `/psicologo` |
| Psicólogo (adultos) | `psicologo.adultos@ppv.test` | `Psicologo123!` | `/psicologo` |
| **Doble rol** (coordinador + psicólogo) | `dual@ppv.test` | `Coordinador123!` | `/coordinador` |
| Administrador | `admin@ppv.test` | `Admin123!` | `/admin` |

- Hay **dos psicólogos activos** para probar la asignación: uno con especialidad **"psicología infantil"**
  (útil para la priorización por edad, RF-1.3) y otro **"psicología clínica de adultos"** (sin preferencia
  infantil). Un caso de menor prefiere al infantil; un caso de adulto va al primer psicólogo online.
- Todos quedan en estado **`active`** (pueden iniciar sesión de inmediato).

> ℹ️ La asignación automática solo considera psicólogos **online** (presencia RF-2.5, heartbeat del PWA) y
> corre en el **cron** (`GET/POST /cron/check-sla`), no al crear el caso. Ver ["Cómo funciona la
> asignación"](#cómo-funciona-la-asignación-automática).

### Alta de coordinador por invitación (RF-2.6 / #133)
**Todo coordinador es primero un psicólogo registrado** (orden canónico). La invitación
**añade el rol** de coordinador a la cuenta existente; no crea cuenta ni pide contraseña.
1. Como admin, en `/admin` → **Coordinadores** → "Invitar coordinador" (o `POST /admin/coordinators/invitations`),
   usando el **correo de un psicólogo ya registrado** (si el correo no tiene cuenta, la invitación se rechaza `409`).
   La respuesta muestra el **token una sola vez** (en local `email.provider: log` no envía correo real).
2. Abre `/registro-coordinador?token=<token>` → pantalla **"Añadir rol de coordinador"** → confirmar
   (sin datos ni contraseña; se usa la contraseña de psicólogo).
3. Inicia sesión en `/login` con las credenciales del psicólogo: ahora tiene **ambos portales**.

> Para probar rápido hay una cuenta sembrada con doble rol: `dual@ppv.test` / `Coordinador123!`.

## Casos de ejemplo
| Caso | Estado | Riesgo | Edad | Notas |
|---|---|---|---|---|
| `seed-pseudo-pendiente` | `pendiente` | `riesgo_alto` | 9 | En cola; se resalta como "riesgo alto sin atender" en el panel del coordinador (SLA 10 min). Menor → al asignarlo por el cron, prioriza al psicólogo con especialidad infantil. |
| `seed-pseudo-asignado` | `asignado` | `riesgo_moderado` | 12 | Asignado al **psicólogo infantil** (`psicologo@ppv.test`); contacto "Ana de Prueba". Menor → la tarjeta muestra "12 años" y el cierre deriva destinatario `indirecta_nino`. |
| `seed-pseudo-adulto` | `asignado` | `riesgo_moderado` | 34 | Asignado al **psicólogo de adultos** (`psicologo.adultos@ppv.test`); contacto "Luis de Prueba". Adulto (≥18) → **no** requiere especialidad infantil; ejercita la ruta de asignación no infantil. |

## Líneas de crisis
Espejo de `apps/api/config/app.config.yml`, para el **ruteo desde BD** (`GET /crisis-lines/active`) y el **CRUD admin**:

| Línea | Teléfono | Ventana | Tipo |
|---|---|---|---|
| LAPSI | `+584242907338` | 8:00–2:00 | Ruteo por hora |
| Colegio de Psicólogos de Miranda | `04127840112` | 2:00–8:00 | Ruteo por hora |
| VEN-911 | `911` | — | Respaldo |

> Si la tabla está vacía o la BD no responde, el endpoint hace **fallback** a las líneas del `config` (fail-safe).

Así, al iniciar sesión:
- **Coordinador** → ve los casos (con el de riesgo alto priorizado) y la tarjeta de capacidad.
- **Psicólogo infantil** (`psicologo@ppv.test`) → ve su caso de menor asignado (Ana de Prueba, 12 años).
- **Psicólogo de adultos** (`psicologo.adultos@ppv.test`) → ve su caso de adulto asignado (Luis de Prueba, 34).
- En el portal, el psicólogo puede **aceptar** (una vez), registrar **notas** y completar el **expediente
  de cierre** (Módulo 4). Tras cerrar, la vista queda en **solo lectura** y no se puede re-tomar.

## Cómo funciona la asignación automática
La asignación **no** ocurre al crear el caso; corre en un **cron** (`processQueue`) que se puede disparar en
local con `GET`/`POST` a `/cron/check-sla` (protegido con `CRON_SECRET`). Cada corrida:

1. **Escala** los casos de riesgo alto vencidos (SLA) de vuelta a la cola.
2. **Ordena** los casos `pendiente` por **índice de urgencia** (RF-1.5) desc, y desempata por llegada (FIFO).
   La ideación suicida domina, así que va siempre primero.
3. Arma el **pool elegible**: solo voluntarios `role=psychologist`, en estado **`active`** y **online**
   (presencia RF-2.5 — el PWA envía _heartbeat_ a `POST /volunteers/me/presence`; en local la presencia vive
   en memoria del proceso de la API). Si nadie está online, los casos quedan en cola honestamente.
4. Por cada caso elige voluntario (`selectVolunteerForCase`): si el caso **requiere especialidad infantil**
   (tags de "Infancia", RF-1.3) o el solicitante es **menor de 18**, prefiere a un **psicólogo infantil**
   disponible; si no hay, cae al primero. Para casos de adultos, toma al **primer psicólogo online**.
   Es una preferencia _suave_: un caso nunca se queda sin asignar por falta de especialista.
5. Dentro de una corrida, **un caso por psicólogo** (distribución básica del MVP).

> Regionalidad (clúster por zona, RF-3.1) fue **eliminada** por la FPV (2026-07-03): la asignación es por
> **riesgo + especialidad + presencia**, no por zona.

**Para probarlo en local:**
1. Inicia sesión como el psicólogo que quieras que reciba (p. ej. `psicologo.adultos@ppv.test`) en
   `http://localhost:3000` → entra al portal `/psicologo`; el PWA lo marca **online** (heartbeat).
2. Dispara el cron:
   ```bash
   curl -s -X POST http://localhost:3001/api/v1/cron/check-sla \
     -H "X-Cron-Secret: $CRON_SECRET"    # en local: local-dev-cron-secret
   ```
   Responde `{ "escalated": N, "assigned": M }`. Los casos `pendiente` compatibles pasan a `asignado`.
3. Recarga `/psicologo` para ver el caso asignado (o `/coordinador` para la cola priorizada).

> ⚠️ Si el psicólogo **no está online**, `assigned` será 0 y el caso sigue en cola: la asignación exige
> presencia en tiempo real para no derivar a alguien ausente.

## Probar rápido
1. `npm run dev:up` (Supabase + API + Web) y `npm run dev:reset` la primera vez.
2. Abre `http://localhost:3000` → "Soy psicólogo o coordinador" → inicia sesión con una credencial de arriba.
3. Para el flujo del solicitante: `http://localhost:3000/intake`.

## Rotación de las contraseñas del seed
Si cambias una contraseña, regenera su hash y actualízalo en `supabase/seed.sql`:
```bash
node -e "import('@node-rs/argon2').then(async m=>{const o={algorithm:m.Algorithm.Argon2id,memoryCost:19456,timeCost:2,parallelism:1};console.log(await m.hash('NUEVA_CLAVE',o))})"
```
