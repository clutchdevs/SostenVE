# ADR-0001 — Stack de backend

> **Fase AI-DLC:** `02-design`  ·  **Estado:** aceptada
> **Fecha:** 2026-06-27 (actualizado 2026-06-28)  ·  **Responsable:** equipo de desarrollo

## Contexto
El factor crítico es la velocidad de construcción y mantenimiento bajo presión de tiempo, no la
sofisticación del stack. Cualquier lenguaje moderno funciona bien con PostgreSQL (ver ADR-0002). Con
la decisión de desplegar en Vercel (ADR-0009), el backend debe poder ejecutarse como **funciones
serverless**, no como un proceso persistente.

## Decisión
El backend será **Node.js**, escrito para ejecutarse como **funciones serverless en Vercel**
(`/api/*` en Next.js o Vercel Functions standalone), **no** como un servidor Express/NestJS
tradicional con estado en memoria persistente.

## Alternativas consideradas
- **Node.js serverless en Vercel** — integración natural con Vercel/Supabase, equipo familiarizado. Elegida.
- **Python (FastAPI/Django)** — válido técnicamente, pero el equipo va con Node.js por afinidad con el despliegue elegido.
- **Servidor Node.js persistente (Express/NestJS) en VPS** — descartado por costo/mantenimiento y por no alinear con Vercel (ver ADR-0006 y ADR-0009).

## Consecuencias
- **Positivas:** despliegue conjunto con el frontend vía Git; sin servidor que mantener.
- **Negativas / costos:**
  - El motor de triage y de asignación deben ser **stateless**: todo el estado vive en Supabase, no en memoria del proceso.
  - El **temporizador de SLA de 10 minutos (RF-3.2)** no puede vivir como un `setTimeout` en memoria (el proceso no persiste entre invocaciones). Se resuelve con un **Vercel Cron Job** que revisa periódicamente la BD (ver ADR-0009).
  - Posible **cold-start**: la pantalla de líneas de crisis no debe depender de la latencia del backend (ver `threat-model.md`).
- **Pendientes:** ninguno (lenguaje confirmado).
