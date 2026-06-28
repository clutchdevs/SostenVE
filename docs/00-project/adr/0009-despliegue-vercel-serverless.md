# ADR-0009 — Despliegue serverless en Vercel

> **Fase AI-DLC:** `02-design`  ·  **Estado:** aceptada
> **Fecha:** 2026-06-28  ·  **Responsable:** equipo de desarrollo

## Contexto
Se necesita un despliegue de bajo costo y bajo mantenimiento. El equipo ya está familiarizado con
Vercel, que se integra de forma natural con Supabase (ADR-0002) y permite desplegar frontend y
backend de forma conjunta vía Git. Vercel es **serverless**: ejecuta funciones por request, sin un
proceso persistente corriendo 24/7. Esto condiciona cómo se implementan el SLA y la asignación.

## Decisión
- Desplegar el **backend como funciones serverless en Vercel** (`/api/*`).
- Implementar el **SLA de 10 minutos (RF-3.2) y el escalamiento automático (RF-3.3)** mediante un
  **Vercel Cron Job** que corre cada 1-2 minutos, revisa en Supabase qué casos de riesgo alto llevan
  más de 10 minutos sin que un voluntario presione "Aceptar caso", y dispara el escalamiento. No se
  usan `setTimeout` ni procesos persistentes.

## Alternativas consideradas
- **Funciones serverless + Vercel Cron Jobs** — nativo de Vercel, sin costo adicional a esta frecuencia. Elegida.
- **VPS económico con proceso Node.js persistente** — descartado por costo y mantenimiento.
- **cPanel de la Federación vía "Setup Node.js App"** — descartado (ver ADR-0006).

## Consecuencias
- **Positivas:** sin servidor que mantener; el cron job es el único componente con ejecución periódica, todo lo demás es request-response.
- **Negativas / costos:**
  - El motor de triage y de asignación deben ser **stateless**; todo el estado vive en Supabase.
  - El endpoint de cron (`/api/cron/revisar-slas-vencidos`) debe protegerse con un **secreto compartido** (variable de entorno de Vercel), no con autenticación de usuario (ver `threat-model.md`).
  - Riesgo de **cold-start**: la pantalla de líneas de crisis debe poder mostrarse desde el cliente sin esperar al backend (números cacheados localmente).
  - Conexiones a Supabase a través del **connection pooler** (ver ADR-0002).
- **Pendientes:** ninguno.
