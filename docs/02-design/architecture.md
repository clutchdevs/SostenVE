# Arquitectura — Proyecto PPV

> **Fase AI-DLC:** `02-design`  ·  **Estado:** propuesta
> **Decisiones relacionadas:** ADR-0001 (Node.js serverless), ADR-0002 (PostgreSQL/Supabase),
> ADR-0004 (cifrado), ADR-0005 (auth), ADR-0006 (Vercel+Supabase), ADR-0008 (cola),
> ADR-0009 (Vercel serverless), ADR-0010 (triage PRD FPV).

## 1. Estilo arquitectónico
Aplicación web (PWA) **serverless**, mantenible por una sola persona. Frontend y backend en Vercel;
estado en Supabase. No hay proceso persistente: todo es request-response salvo un cron job.

```
Solicitante / Psicólogo / Coordinador
        │  (HTTPS)
        ▼
┌──────────────────────────────────────────────┐
│ Vercel — Frontend (PWA: formulario + paneles)│
│   · Líneas de crisis cacheadas en cliente    │
└──────────────────────────────────────────────┘
        │  (REST/JSON sobre HTTPS)
        ▼
┌──────────────────────────────────────────────┐
│ Vercel — Backend (funciones serverless /api/*)│
│  ├─ Autenticación y control de acceso (rol)  │
│  ├─ Motor de triage (tags + score ponderado) │
│  ├─ Motor de asignación / cola (stateless)   │
│  ├─ Validación de psicólogos contra BD FPV   │
│  └─ Gestión de líneas de crisis (ruteo/hora) │
└──────────────────────────────────────────────┘
        │  (connection pooler, TLS)
        ▼
┌──────────────────────────────────────────────┐
│ Supabase — PostgreSQL (cifrado de columnas)  │
└──────────────────────────────────────────────┘
        ▲
        │  cada 1-2 min
┌──────────────────────────────────────────────┐
│ Vercel Cron Job — Motor de SLA               │
│   revisa casos > 10 min y escala (RF-3.3)    │
└──────────────────────────────────────────────┘
```

## 2. Componentes principales
- **Frontend (Vercel):** PWA. Prioridad: carga rápida con conexión intermitente, guardado
  local/reintento del formulario, y **líneas de crisis cacheadas en el cliente** para no depender
  de la latencia del backend en el momento crítico.
- **Backend (Vercel, funciones serverless):** expone `/api/*`, **stateless** (todo el estado en
  Supabase). Orquesta triage, asignación/cola, validación de voluntarios y ruteo de líneas de crisis.
- **Motor de triage:** embudo de baja fricción con **tags clínicos ponderados** y score de urgencia
  (ADR-0010), determinístico. No es ML; el analizador léxico-semántico (RF-1.4) es Fase 2.
- **Motor de asignación/cola:** prioridad del ADR-0008; stateless.
- **Motor de SLA (Vercel Cron Job):** único componente periódico; revisa la BD cada 1-2 min y
  dispara el escalamiento de casos de riesgo alto no aceptados en 10 minutos (ADR-0009).
- **Supabase (PostgreSQL):** casos, usuarios, asignaciones, notas (cifradas), líneas de respaldo.
  Acceso vía **connection pooler** desde las funciones serverless (ADR-0002).

## 3. Modelo de datos (alto nivel)
- **usuarios** — psicólogos y coordinadores: nombre, cédula profesional, especialidad, contacto, disponibilidad, rol, credenciales (hash), estado de validación contra BD FPV.
- **casos** — solicitante (nombre, contacto, tipo), rama (roja/verde), **tags seleccionados + score ponderado**, nivel de riesgo, estado, zona, modalidad, fecha de creación, marca de tiempo para el SLA.
- **asignaciones** — relación caso–psicólogo, fecha, canal de contacto, marca de "aceptado".
- **notas_clinicas** — caso, psicólogo autor, fecha, diagnóstico, contenido (campo cifrado).
- **lineas_de_respaldo** — nombre, número, **cobertura horaria** (para el ruteo dinámico), prioridad; editable sin tocar código.

## 4. Control de acceso
- Un psicólogo solo ve y escribe notas de sus casos asignados.
- El coordinador ve el estado de todos los casos, pero no necesariamente el contenido clínico (`<TODO — Human-in-the-Loop>`).
- El endpoint de cron (`/api/cron/...`) se protege con **secreto compartido**, no auth de usuario (ADR-0009).

## 5. Atributos de calidad
- **Seguridad:** cifrado en tránsito y reposo (ADR-0004); control de acceso por rol; aislamiento de la BD respecto del sistema existente de la FPV (ADR-0002).
- **Resiliencia:** guardado local/reintento; líneas de crisis cacheadas ante cold-start.
- **Costo/operación:** Vercel + Supabase en plan económico (ADR-0006); sin servidor que mantener.
- **Disponibilidad:** dimensionado para 300+ solicitudes/día sin sobre-ingeniería.
