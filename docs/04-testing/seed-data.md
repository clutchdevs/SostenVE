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
| Psicólogo | `psicologo@ppv.test` | `Psicologo123!` | `/psicologo` |
| Administrador | `admin@ppv.test` | `Admin123!` | `/admin` |

- El psicólogo tiene especialidad **"psicología infantil"** (útil para probar la priorización por edad).
- Ambos quedan en estado **`active`** (pueden iniciar sesión de inmediato).

### Alta de coordinador por invitación (RF-2.6, issue #23)
Además del coordinador sembrado, se puede dar de alta uno nuevo por **token de invitación**:
1. Como admin, en `/admin` → **Coordinadores** → "Invitar coordinador" (o `POST /admin/coordinators/invitations`).
   La respuesta muestra el **token una sola vez** (en local `email.provider: log` no envía correo real).
2. Abre `/registro-coordinador?token=<token>` y define una contraseña (≥ 8) para activar la cuenta.
3. Inicia sesión en `/login-coordinador` (o `/login`).

## Casos de ejemplo
| Caso | Estado | Riesgo | Edad | Notas |
|---|---|---|---|---|
| `seed-pseudo-pendiente` | `pendiente` | `riesgo_alto` | 9 | En cola; se resalta como "riesgo alto sin atender" en el panel del coordinador (SLA 10 min). Menor → al asignarlo por el cron, prioriza al psicólogo con especialidad infantil. |
| `seed-pseudo-asignado` | `asignado` | `riesgo_moderado` | 12 | Asignado al psicólogo de prueba; contacto "Ana de Prueba". Menor → la tarjeta muestra "12 años" y el cierre deriva destinatario `indirecta_nino`. |

## Líneas de crisis
Espejo de `config/app.config.yml`, para el **ruteo desde BD** (`GET /crisis-lines/active`) y el **CRUD admin**:

| Línea | Teléfono | Ventana | Tipo |
|---|---|---|---|
| LAPSI | `+584242907338` | 8:00–2:00 | Ruteo por hora |
| Colegio de Psicólogos de Miranda | `04127840112` | 2:00–8:00 | Ruteo por hora |
| VEN-911 | `911` | — | Respaldo |

> Si la tabla está vacía o la BD no responde, el endpoint hace **fallback** a las líneas del `config` (fail-safe).

Así, al iniciar sesión:
- **Coordinador** → ve ambos casos (con el de riesgo alto priorizado) y la tarjeta de capacidad.
- **Psicólogo** → ve el caso asignado con la **identidad del solicitante** (Ana de Prueba + teléfono);
  puede **aceptar** (una vez), registrar **notas** y completar el **expediente de cierre** (Módulo 4).
  Tras cerrar, la vista queda en **solo lectura** y no se puede re-tomar.

## Probar rápido
1. `npm run dev:up` (Supabase + API + Web) y `npm run dev:reset` la primera vez.
2. Abre `http://localhost:3000` → "Soy psicólogo o coordinador" → inicia sesión con una credencial de arriba.
3. Para el flujo del solicitante: `http://localhost:3000/intake`.

## Rotación de las contraseñas del seed
Si cambias una contraseña, regenera su hash y actualízalo en `supabase/seed.sql`:
```bash
node -e "import('@node-rs/argon2').then(async m=>{const o={algorithm:m.Algorithm.Argon2id,memoryCost:19456,timeCost:2,parallelism:1};console.log(await m.hash('NUEVA_CLAVE',o))})"
```
