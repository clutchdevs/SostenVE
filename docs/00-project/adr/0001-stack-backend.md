# ADR-0001 — Stack de backend

> **Fase AI-DLC:** `02-design`  ·  **Estado:** propuesta (decisión abierta sobre el lenguaje)
> **Fecha:** 2026-06-27  ·  **Responsable:** equipo de desarrollo

## Contexto
Hay una sola persona con experiencia general en desarrollo web/bases de datos disponible. El factor
crítico es la velocidad de construcción y mantenimiento bajo presión de tiempo (3-4 semanas), no la
sofisticación del stack. Cualquier lenguaje moderno funciona bien con PostgreSQL (ver ADR-0002).

## Decisión
El backend será Node.js (Express o NestJS) **o** Python (FastAPI/Django). La elección final la hace
el desarrollador disponible según lo que **ya domine**; no se aprende un stack nuevo bajo presión.
Esta decisión queda explícitamente abierta y se documenta el **criterio**, no una opción forzada.

## Alternativas consideradas
- **Node.js (Express/NestJS)** — ecosistema amplio, buen soporte PostgreSQL; válido si es lo conocido.
- **Python (FastAPI/Django)** — Django aporta admin y auth de fábrica; FastAPI es ligero; válido si es lo conocido.
- **Aprender un stack nuevo "mejor"** — descartado: el costo de aprendizaje no es aceptable dado el timeline y el riesgo de bus factor 1.

## Consecuencias
- **Positivas:** máxima velocidad; mantenimiento por la persona que ya conoce la herramienta.
- **Negativas / costos:** el `.gitignore` y parte del scaffolding dependen del lenguaje elegido.
- **Pendientes (Human-in-the-Loop):** `<TODO — Human-in-the-Loop>` confirmar lenguaje final (Node.js vs. Python) según quién programe.
