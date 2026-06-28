# ADR-0012 — Bitácora de auditoría inmutable de accesos

> **Fase AI-DLC:** `02-design`  ·  **Estado:** aceptada
> **Fecha:** 2026-06-28  ·  **Responsable:** equipo de desarrollo + Federación
> **Sobre:** ADR-0002 (PostgreSQL/Supabase).

## Contexto
El PRD "fase 2" de la Federación (NFR 6.1) exige trazabilidad inmutable de todo acceso a un
expediente clínico. Esto refuerza las mitigaciones de *Repudiation* e *Information disclosure* del
modelo de amenazas: nadie —ni siquiera el administrador de base de datos— debe poder borrar o
alterar el rastro de quién leyó o modificó un expediente.

## Decisión
- Registrar en una **tabla de auditoría de solo-inserción** cada lectura, modificación o consulta a
  un expediente clínico, con los campos: `usuario_id`, `rol`, `registro_afectado_id`,
  `tipo_accion`, `timestamp`.
- Hacerla **inmutable**: impedir `UPDATE` y `DELETE` sobre esa tabla mediante **triggers** o
  **políticas RLS de Supabase** que solo permitan `INSERT`, también frente al rol administrador.

## Alternativas consideradas
- **Tabla append-only en Supabase con RLS/triggers** — nativo de la BD ya elegida, sin servicios extra. Elegida.
- **Logs de aplicación en archivo/servicio externo** — descartado como única fuente: más fácil de alterar/perder y desacoplado de la transacción de datos.
- **Servicio de auditoría/WORM dedicado** — descartado por costo y complejidad para el MVP.

## Consecuencias
- **Positivas:** trazabilidad no repudiable de accesos a datos restringidos; cumple el NFR 6.1.
- **Negativas / costos:**
  - Crecimiento de la tabla de auditoría: requiere política de archivado/retención (ligada a la retención general, `<TODO — Human-in-the-Loop>` de la Federación).
  - Cada acceso a expediente añade una escritura; impacto menor en funciones serverless (ADR-0009).
- **Pendientes:** definir retención/archivado de la bitácora junto con la política de retención clínica.
