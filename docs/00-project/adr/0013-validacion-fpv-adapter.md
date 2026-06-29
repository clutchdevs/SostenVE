# ADR-0013 — Validación de voluntarios contra la FPV vía Adapter (con dummy)

> **Fase AI-DLC:** `02-design`  ·  **Estado:** aceptada (provisional, pendiente contrato FPV)
> **Fecha:** 2026-06-28  ·  **Responsable:** equipo de desarrollo

## Contexto
El Módulo 2 del PRD exige **validar automáticamente** a cada voluntario contra el padrón de la
Federación (FPV) en el momento del registro. La FPV **aún no ha entregado el contrato** de su API
(URL base, autenticación, formato de request/response). No queremos bloquear la construcción del
flujo de registro esperando ese contrato.

## Decisión
Abstraer la verificación detrás de un **puerto `FpvVerifier` (patrón Adapter)** con dos
implementaciones:
- **`DummyFpvVerifier` (por defecto):** stand-in **documentado que siempre aprueba**, para construir y
  probar el flujo completo ya.
- **`HttpFpvVerifier`:** esqueleto con el contrato marcado `<TODO — Human-in-the-Loop>`; lanza
  `NotConfiguredError` hasta que exista el contrato.

La implementación se elige por **config** (`fpv.verifier: dummy | http`), sin tocar los casos de uso.
La verificación se envuelve en un **Circuit Breaker**: si el servicio externo falla repetidamente,
corta y el registro **cae a `pending_approval`** (Caso de Excepción, RF-2.2) en vez de bloquearse.

## Alternativas consideradas
- **Adapter + dummy intercambiable (elegida)** — permite avanzar sin el contrato; el cambio futuro es
  configuración, no reescritura.
- **Esperar el contrato de la FPV** — descartada: bloquea el cronograma por una dependencia externa.
- **Hardcodear la llamada HTTP** — descartada: acopla el flujo a un contrato aún desconocido.

## Consecuencias
- **Positivas:** el flujo de registro queda construido y probado; conectar la FPV real es configurar
  + implementar un adapter; resiliencia ante caídas del servicio externo.
- **Negativas / costos:** con el dummy **todo registro se aprueba** (estado `active`); **no debe
  usarse en producción real** sin el verificador HTTP conectado.
- **Pendientes (Human-in-the-Loop):** `<TODO — Human-in-the-Loop>` contrato de la API de la FPV
  (endpoint, autenticación, formato) para implementar `HttpFpvVerifier` y cambiar `fpv.verifier: http`.
