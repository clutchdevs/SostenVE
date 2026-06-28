# ADR-0006 — Hosting de bajo costo: Vercel + Supabase

> **Fase AI-DLC:** `02-design`  ·  **Estado:** aceptada
> **Fecha:** 2026-06-27 (actualizado 2026-06-28)  ·  **Responsable:** equipo de desarrollo

## Contexto
La Federación puede cubrir un costo mensual pequeño, pero no hay presupuesto para infraestructura
compleja. El volumen esperado (300+ solicitudes el primer día) es manejable por una arquitectura
modesta. La Federación ya cuenta con un hosting cPanel para su sistema existente, lo que abrió la
pregunta de si reutilizarlo para este proyecto. Ver
`docs/00-project/decisiones-infraestructura.md` para el análisis completo.

## Decisión
- **Backend y frontend en Vercel** (plan gratuito/hobby inicialmente), con el backend como funciones serverless (ver ADR-0009).
- **Base de datos PostgreSQL en Supabase** (ver ADR-0002).
- Se **descarta** usar el hosting cPanel existente de la Federación para este proyecto.

## Alternativas consideradas
- **Vercel + Supabase** — bajo costo, despliegue conjunto vía Git, integración natural. Elegida.
- **cPanel de la Federación ("Setup Node.js App" + MySQL existente)** — descartado por:
  - **(a) Seguridad:** compartir credenciales/tablas de MySQL con el sistema PHP/Symfony existente amplía la superficie de ataque sobre datos clínicos.
  - **(b) Recursos:** límites del plan cPanel observado (4 GB RAM, 40 entry processes) frente al volumen esperado.
- **VPS económico con proceso persistente / PaaS tipo Render/Railway** — válidos, pero Vercel+Supabase gana por familiaridad del equipo e integración.

## Consecuencias
- **Positivas:** costo bajo y predecible; aislamiento del sistema existente de la FPV; despliegue simple.
- **Negativas / costos:** limitaciones del plan gratuito de Supabase (respaldos, pausa por inactividad — ver ADR-0002); las restricciones serverless aplican al backend (ver ADR-0001 y ADR-0009).
- **Pendientes (Human-in-the-Loop):** `<TODO — Human-in-the-Loop>` plan de Supabase (gratuito vs. pago).
