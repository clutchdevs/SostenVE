# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato se basa en [Keep a Changelog 1.1.0](https://keepachangelog.com/es-ES/1.1.0/)
y este proyecto adhiere a [Versionado Semántico](https://semver.org/lang/es/).

## [No publicado]

## [0.2.0] - 2026-06-28
### Añadido
- ADR-0009: despliegue serverless en Vercel (SLA y escalamiento vía Vercel Cron Jobs).
- ADR-0010: adopción del PRD "Sistema PPV 2026" de la Federación como diseño de triage.
- `docs/00-project/decisiones-infraestructura.md`: respaldo del análisis Vercel + Supabase vs. cPanel.
- Endpoints nuevos en `api-contracts.md` / `openapi.yaml`: intake (Likert, rama roja/verde), ruteo
  dinámico de líneas de crisis por hora, registro/validación de voluntarios contra BD de la FPV,
  aceptación de caso (SLA) y endpoint interno de cron.
- Glosario: rama roja/verde, tag clínico, score de urgencia ponderado, SLA de asignación, ruteo
  dinámico, Webhook de Rescate Activo.

### Cambiado
- ADR-0001: backend confirmado **Node.js** como funciones serverless en Vercel (antes: abierto).
- ADR-0002: PostgreSQL alojado en **Supabase** (connection pooler; riesgo del plan gratuito).
- ADR-0006: hosting = **Vercel + Supabase**; descartado el cPanel de la Federación.
- `flujo-central.md`: reescrito según el PRD de la Federación (embudo de baja fricción, tags, SLA).
- `architecture.md`, `threat-model.md`: arquitectura serverless (cold-start, cron, pooler).
- `README.md`: arquitectura Vercel/Supabase y decisiones abiertas actualizadas.

### Notas
- **Webhook de Rescate Activo (RF-3.4)** confirmado **fuera del MVP** (diseño de Fase 3).
- Plan de Supabase (gratuito vs. pago) queda como decisión abierta de la Federación.

## [0.1.0] - 2026-06-27
### Añadido
- Estructura inicial del repositorio siguiendo la metodología AI-DLC.
- `docs/00-project/`: charter, glosario, clasificación de datos y ADRs 0001-0008.
- `docs/01-requirements/`: PRD del flujo central con escenarios de abuso/riesgo.
- `docs/02-design/`: arquitectura, threat model (STRIDE/DREAD), contratos de API y `openapi.yaml`.
- `docs/architecture/`: diagramas C4 (contexto, contenedores, componentes de triage y asignación).
- `.ai-dlc/`: checklists de Gate 0 y Gate 1, y plantillas (PRD, threat model, ADR).
- READMEs de fases 03-06 y de `apps/` (sin código todavía).
- `README.md`, `LICENSE` y `.gitignore` iniciales.
