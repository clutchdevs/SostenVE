# 05 · Despliegue

> **Fase AI-DLC:** `05-deployment`

## Contenido

- **[Plan de instalación (paso a paso)](plan-de-instalacion.md)** — el runbook **práctico y probado**
  para levantar el entorno desde cero en Vercel + Supabase + Upstash: provisión de cada servicio, qué
  variable va en cuál proyecto, crear el primer admin, smoke tests, una tabla de **troubleshooting** con
  los síntomas reales y sus causas, y las trampas que ya vienen resueltas en el código. **Empieza por aquí.**
- **[Plan — ambiente provisional (staging)](plan-ambiente-provisional.md)** — runbook accionable para
  levantar un entorno provisional en Vercel: qué ya está listo en el repo, qué cuentas crear (Supabase,
  Upstash, SMTP, FPV), generación de secretos, env vars por proyecto y smoke test.
- **[Guía de despliegue a producción](guia-de-despliegue.md)** — referencia a fondo: arquitectura, servicios a
  provisionar, variables de entorno y secretos, ajustes de `app.config.yml`, migraciones de Supabase,
  despliegue de API y Web en Vercel, cron, seguridad/cumplimiento, checklist de lanzamiento y smoke tests.

## Pendientes / decisiones humanas antes de abrir al público
- Proveedor de hosting/DB confirmado y su plan (ver ADR-0006) con **respaldo diario activo desde el día 1**.
- Dominio definitivo (afecta CORS, URLs de correo y `NEXT_PUBLIC_API_URL`).
- Custodia de secretos (`ENCRYPTION_KEY`, `PSEUDONYMIZATION_SALT`).
- Decisiones de la FPV (turnos, retención, consentimiento, verificación) — `<TODO — Human-in-the-Loop>`.
