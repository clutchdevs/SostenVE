# ADR-0013 — Validación de voluntarios contra la FPV vía Adapter (con dummy)

> **Fase AI-DLC:** `02-design`  ·  **Estado:** aceptada — contrato FPV recibido, `HttpFpvVerifier` implementado (issue #6)
> **Fecha:** 2026-06-28 (actualizada 2026-07-02)  ·  **Responsable:** equipo de desarrollo

## Contexto
El Módulo 2 del PRD exige **validar automáticamente** a cada voluntario contra el padrón de la
Federación (FPV) en el momento del registro. La FPV **aún no ha entregado el contrato** de su API
(URL base, autenticación, formato de request/response). No queremos bloquear la construcción del
flujo de registro esperando ese contrato.

## Decisión
Abstraer la verificación detrás de un **puerto `FpvVerifier` (patrón Adapter)** con dos
implementaciones:
- **`DummyFpvVerifier` (por defecto en dev/tests):** stand-in **documentado que siempre aprueba**, para
  construir y probar el flujo completo sin depender del padrón real.
- **`HttpFpvVerifier` (issue #6):** llama al padrón real de la FPV.
  `GET {base_url}/api/v1/public/validate?national_id=…&fpv=…` con el header `X-API-TOKEN`. Mapea la
  respuesta a `{ valid }`:
  - `200` con `data.valid === true` **y** `data.status === 'active'` → válido (auto-activa).
  - `200` con licencia hallada pero **no activa** (suspendida/inactiva) → **no** auto-aprueba; cae a
    revisión manual (seguridad: nunca activar una licencia no vigente).
  - `404` (`data.valid === false`) → no encontrado (inválido).
  - `401` → token mal configurado: lanza `NotConfiguredError`.
  - Otro no-2xx / error de red / timeout → lanza (el Circuit Breaker corta → `pending_approval`).

La implementación se elige por **config** (`fpv.verifier: dummy | http`), sin tocar los casos de uso.
El `base_url` y el timeout viven en `apps/api/config/app.config.yml`; el token `X-API-TOKEN` es **secreto** y se
lee de la env `FPV_API_TOKEN` (nunca en el repo). La verificación se envuelve en un **Circuit Breaker**:
si el servicio externo falla repetidamente, corta y el registro **cae a `pending_approval`** (Caso de
Excepción, RF-2.2) en vez de bloquearse.

## Alternativas consideradas
- **Adapter + dummy intercambiable (elegida)** — permite avanzar sin el contrato; el cambio futuro es
  configuración, no reescritura.
- **Esperar el contrato de la FPV** — descartada: bloquea el cronograma por una dependencia externa.
- **Hardcodear la llamada HTTP** — descartada: acopla el flujo a un contrato aún desconocido.

## Consecuencias
- **Positivas:** el flujo de registro queda construido y probado; conectar la FPV real es configurar
  + implementar un adapter; resiliencia ante caídas del servicio externo.
- **Negativas / costos:** con el dummy **todo registro se aprueba** (estado `active`); por eso queda
  restringido a los **tests automatizados** (`NODE_ENV=test`). `development` y `production` usan `http`
  contra el padrón real (dev para poder probar respuestas/fallos reales); requieren `FPV_API_TOKEN`.
- **Pendientes (Human-in-the-Loop):** provisionar/rotar el `FPV_API_TOKEN` de producción y validar el
  flujo con datos reales del padrón antes de mergear. El contrato y el adapter ya están implementados
  (issue #6) y la ruta por defecto ya apunta al servicio real (`fpv.verifier: http`).
