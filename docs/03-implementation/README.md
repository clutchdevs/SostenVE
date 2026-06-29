# 03 · Implementación

> **Fase AI-DLC:** `03-implementation`  ·  **Gate previo:** Gate 1 (diseño aprobado).
> **Estado:** ✅ en curso — bloques 0-7 implementados (ver `CHANGELOG.md`).

La construcción de la app está en marcha: backend en `apps/api` (Hono, Clean Architecture/DDD),
frontend en `apps/web` (Next.js/PWA) y migraciones en `supabase/`. El trabajo restante y las
decisiones abiertas están en el [backlog](backlog.md).

## Contenido
- [`backlog.md`](backlog.md) — trabajo restante hacia el MVP, separando ingeniería de decisiones de la FPV (HITL).

## Qué irá aquí
- Decisiones de implementación derivadas de los ADR (librerías, parámetros de seguridad, etc.).
- Esquema concreto de la base de datos y migraciones.
- Notas de cómo se implementan triage, asignación/cola y cifrado de columnas.
- Guía de cómo correr el proyecto localmente.

## Referencias
- Plan de fases: ver el plan de trabajo (Fases 1 y 2).
- Diseño: [`../02-design/architecture.md`](../02-design/architecture.md).
