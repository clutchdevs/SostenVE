# ADR-0014 — Presencia en tiempo real vía puerto `PresenceStore` (Upstash Redis + fallback en memoria)

> **Fase AI-DLC:** `02-design`  ·  **Estado:** aceptada
> **Fecha:** 2026-07-01  ·  **Responsable:** equipo de desarrollo

## Contexto
El PRD (RF-2.5) exige **presencia en tiempo real** de los voluntarios: al iniciar sesión quedan `Online`,
la PWA envía un **latido cada 30 s** y el servidor expira la presencia con un **TTL de 65 s** si dejan de
llegar latidos (caída de red, cierre de pestaña, corte de luz). El motor de asignación (RF-3.1) **solo debe
asignar casos a voluntarios `Online`**, para que un caso de riesgo vital no caiga en alguien ausente. El PRD
nombra **Redis** como el store de presencia. El proyecto corre **serverless** (ADR-0009), donde no hay
memoria de proceso compartida entre invocaciones, y el presupuesto es bajo (ADR-0006).

## Decisión
Abstraer la presencia detrás de un **puerto `PresenceStore` (patrón Adapter)** con dos implementaciones,
seleccionables por **config** (`presence.provider: memory | upstash`), sin tocar los casos de uso:
- **`UpstashPresenceStore` (producción):** Redis gestionado de **Upstash** vía su **API REST con `fetch`**
  (sin dependencias ni conexiones persistentes, apto para serverless/edge). Presencia = una clave
  `presence:{id}` escrita con `SET … EX <ttl>`; se autoexpira al cesar los latidos (RF-2.5.3). Credenciales
  por entorno: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.
- **`MemoryPresenceStore` (dev/tests, por defecto):** mapa en memoria de proceso. Válido solo en un único
  proceso (dev local, vitest); **no** para serverless en producción.

El **latido y el toggle de disponibilidad** (RF-4.3.1) comparten un endpoint autenticado
`POST /volunteers/me/presence { disponible }`: `true` refresca el TTL online; `false` marca offline de
inmediato (pausa manual). La lista de voluntarios del coordinador anota `en_linea` (RF-2.5.4).

## Alternativas consideradas
- **Adapter con Upstash REST + fallback memoria (elegida)** — fiel al RF-2.5 (Redis + TTL), sin dependencias
  nuevas, activable en prod con 2 env vars; testeable offline con el adaptador en memoria.
- **Presencia en Postgres/Supabase (heartbeat como columna/tabla)** — evita infra nueva, pero se aparta del
  RF-2.5 (el PRD pide Redis) y genera escritura de alta frecuencia sobre la BD relacional. Descartada por
  decisión explícita de mantenerse fiel al PDF.
- **Redis con SDK/conexión persistente** — descartada: mala ergonomía en serverless (conexiones por
  invocación); el REST de Upstash encaja mejor.

## Consecuencias
- **Positivas:** RF-2.5/RF-3.1 implementados y probados; conectar Redis real en prod es configurar
  `presence.provider: upstash` + 2 env vars; el dev/CI corre sin infra.
- **Negativas / costos:** el default `memory` **no sirve en serverless** (cada instancia tendría su mapa);
  producción **debe** usar `upstash`. Requiere aprovisionar un proyecto Upstash (decisión de infra, ligada a
  #13/NFR-6.2).
- **Desviaciones documentadas:** la **pausa manual** (RF-4.3.1) se modela colapsándola a "offline" en la
  misma clave de presencia (no hay un estado "en pausa" distinto de "desconectado" en el store).
- **Actualización (issue #55):** el **escalamiento por SLA** (RF-3.3) ya usa **presencia en vivo** — la alerta
  `high_risk_escalated_no_coordinator` salta si no hay ningún coordinador `Online` (no solo activo).
