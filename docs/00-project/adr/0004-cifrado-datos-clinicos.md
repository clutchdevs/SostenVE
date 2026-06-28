# ADR-0004 — Cifrado de datos clínicos

> **Fase AI-DLC:** `02-design`  ·  **Estado:** aceptada (no negociable)
> **Fecha:** 2026-06-27  ·  **Responsable:** equipo de desarrollo

## Contexto
Diagnóstico, notas clínicas y nivel de riesgo son datos de salud **restringidos** (ver
`data-classification.md`). Su exposición causa daño grave. El cifrado no es una mejora opcional sino
un requisito mínimo dado el tipo de dato y la responsabilidad institucional (ADR-0003).

## Decisión
- **Cifrado en tránsito:** HTTPS obligatorio en toda la plataforma.
- **Cifrado en reposo:** las columnas de diagnóstico y notas clínicas se almacenan cifradas.
- La gestión de claves no se acopla al código fuente; las claves viven en variables de entorno/secret manager del hosting.

> **Refinado por ADR-0011 (seudonimización de PII):** además del cifrado en reposo, la PII se
> separa en una tabla propia y se vincula al contenido clínico mediante un ID seudonimizado
> (SHA-256 + salt). La seudonimización complementa este cifrado, no lo reemplaza.

## Alternativas consideradas
- **Cifrado en tránsito + en reposo por columna** — protege el dato más sensible incluso ante acceso a la BD. Elegida.
- **Solo HTTPS, sin cifrado en reposo** — descartada: un volcado de BD expondría historias clínicas en claro.
- **Cifrado de disco completo del servidor** — complementario, no sustituto del cifrado por columna; no protege ante acceso lógico a la BD.

## Consecuencias
- **Positivas:** las notas clínicas permanecen protegidas incluso ante una filtración de la base.
- **Negativas / costos:** los campos cifrados no son buscables/indexables directamente; complejidad en la gestión de claves.
- **Pendientes:** definir el mecanismo concreto de cifrado por columna según el stack del ADR-0001.
