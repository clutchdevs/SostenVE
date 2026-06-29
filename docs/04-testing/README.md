# 04 · Pruebas

> **Fase AI-DLC:** `04-testing`  ·  **Estado:** ✅ estrategia y herramientas listas (Bloque 7).

## Estrategia (pirámide de pruebas)
| Nivel | Qué cubre | Herramienta | Cómo correr |
|---|---|---|---|
| **Unidad** | Dominio puro: triage, regla de interrupción, urgencia, RF-4.3/RF-4.2.9, seudonimización, cifrado, circuit breaker, selección | Vitest | `npm run test` |
| **Integración** | Repos + RLS + auditoría inmutable + endpoints contra **Supabase local** | Vitest + `pg` (e2e de API) | `npm run db:start` y `npm run test` |
| **E2E (navegador)** | Camino crítico de la PWA: intake, fail-safe de líneas de crisis, login a portales | Playwright | `npm run e2e:install` (una vez) + `npm run e2e` (en `apps/web`) |
| **Carga** | Volumen del primer día (300+/día con picos) sobre el intake | autocannon | `npm run load-test` |

Estado actual: **125 pruebas** (unidad + integración) en verde. Los e2e de navegador están
configurados (scaffold) para correr en CI/preview; la carga se ejecuta contra API local/preview.

### E2E de navegador (Playwright)
- Specs en `apps/web/e2e/`:
  - `crisis-failsafe.spec.ts` — **principio no negociable**: aborta la API de líneas de crisis y
    verifica que la Rama Roja **igual muestra los números** (fallback embebido). Solo necesita el web server.
  - `intake.spec.ts` — la pantalla Likert bifurca a Rama Roja/Verde.
  - `staff-flow.spec.ts` — login a los portales (requiere API+Supabase y credenciales sembradas vía
    `E2E_STAFF_EMAIL`/`E2E_STAFF_PASSWORD`; se omite si no están).
- Requisitos para los specs que tocan la API: `npm run dev -w @sostenve/api` (+ Supabase + `.env`).

### Carga (autocannon)
```
LOAD_URL=http://localhost:3001/api/v1/intake/green-branch \
LOAD_CONNECTIONS=50 LOAD_DURATION=30 npm run load-test
```
Reporta RPS, latencia p50/p99 y no-2xx. **Antes de la corrida real** confirmar el plan de Supabase
(gratuito vs Pro) — el resultado depende de los límites del plan (ver ADR-0002). **No** ejecutar
contra una base con datos clínicos reales.

#### Plantilla de resultados
| Parámetro | Valor |
|---|---|
| Fecha / entorno | `<…>` |
| Conexiones / duración | `<…>` |
| RPS (avg) | `<…>` |
| Latencia p50 / p99 | `<…>` |
| % no-2xx | `<…>` |
| Plan de Supabase | `<gratuito / Pro>` |
| Observaciones | `<…>` |

## Checklist del threat model (verificación manual)
Derivado de [`../02-design/threat-model.md`](../02-design/threat-model.md). Verificar uno por uno
contra el sistema real antes del piloto:

- [ ] **Exposición de notas/PII por acceso insuficiente:** un psicólogo NO puede leer un caso/PII/nota
      no asignado (RLS + propiedad en endpoints). Cubierto por `rls.test.ts` y `cases.e2e.test.ts`; revalidar manual.
- [ ] **Suplantación de psicólogo no verificado:** el registro pasa por el verificador FPV (dummy hoy);
      con verificador real, un no-colegiado cae a `pending_approval`. Revisar con el adapter HTTP cuando exista.
- [ ] **DoS por volumen del primer día:** rate limiting en `/intake/*`; la cola es honesta. Validar con la prueba de carga.
- [ ] **Invocación falsa del cron** (`/cron/check-sla`): sin `CRON_SECRET` → 401. Cubierto por `assignment.e2e.test.ts`; revalidar en producción con el secreto real.
- [ ] **Cold-start / API caída al mostrar líneas de crisis:** la PWA muestra los números desde caché/fallback. Cubierto por `crisis-failsafe.spec.ts`; verificar en el dispositivo objetivo con red intermitente.
- [ ] **Pérdida de datos clínicos:** respaldos. ⚠️ El plan gratuito de Supabase **no** cumple el NFR 6.2 (respaldo cada 6 h). Resolver antes de datos reales (ADR-0002).
- [ ] **Cifrado en reposo de notas:** los campos clínicos se almacenan cifrados (AES-256-GCM). Verificar inspeccionando la columna en la BD.
- [ ] **Auditoría inmutable:** `audit_log` rechaza UPDATE/DELETE. Cubierto por `rls.test.ts`.

## Plan de piloto controlado
1. **Datos de prueba** únicamente al inicio (sin datos clínicos reales de personas).
2. **Grupo reducido** de psicólogos voluntarios reales (validados por la FPV) y un volumen limitado de
   solicitudes antes de la difusión masiva.
3. **Criterios de avance:** líneas de crisis siempre visibles en riesgo alto; SLA y escalamiento
   funcionando; ningún caso de riesgo alto sin ruta de atención; latencia/errores aceptables en carga.
4. **Antes de abrir al público con datos reales** (Human-in-the-Loop de la Federación): plan de
   Supabase con respaldos, esquema de turnos, texto de consentimiento, verificación real de voluntarios
   (ver decisiones abiertas en el charter) y un ambiente separado de pruebas (sección 6 del plan de
   ejecución).
