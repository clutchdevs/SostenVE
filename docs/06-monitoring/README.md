# 06 · Monitoreo

> **Fase AI-DLC:** `06-monitoring`  ·  **Estado:** 🟡 en curso (issue #8: métricas SLA + alertas).

Monitoreo técnico continuo (ver plan de trabajo, Fase 4).

## Implementado (issue #8)

### Métricas — `GET /api/v1/metrics` (coordinador/admin)
Snapshot calculado sobre la BD (función pura `summarizeSla`):
- **Tiempo de asignación** (p50 / p95 / promedio, en segundos) **por nivel de riesgo**
  (`riesgo_alto` / `riesgo_moderado` / `seguimiento`) — desde `creado_en` hasta la **primera** asignación.
- **Cola:** pendientes, riesgo alto pendientes y **SLA vencidos** (casos de riesgo alto sin aceptar tras su
  `sla_expires_at`).
- **Totales:** casos, asignados, cerrados.
- **Uptime:** `uptime_seconds` del instante que responde (además de `GET /api/v1/health`, que ahora
  también expone `uptime_seconds` como *liveness probe* público).

### Alertas — `raiseAlert` (log crítico estructurado)
Una alerta es una línea de log `level: error` con `alert: <tipo>`, pensada para que un pipeline de alertas
por logs (p. ej. Vercel log drains → pager/webhook) la enganche sin acoplar el MVP a un proveedor.
- **`high_risk_escalated_no_coordinator`** — se dispara cuando un **caso de riesgo alto se escala** (SLA
  vencido sin aceptación) y **no hay coordinador activo** disponible para atenderlo. Como la presencia en
  tiempo real (RF-2.5) aún no existe, "disponible" se aproxima por la existencia de un coordinador `active`.

## Pendiente (fase futura)
- Cobertura de riesgo alto y **tasa de abandono de cola** como métricas dedicadas.
- Presencia en tiempo real (RF-2.5) para afinar "coordinador disponible".
- Alertas técnicas de caídas/errores y **verificación de respaldos** (NFR 6.2).
- Panel de métricas en la UI (hoy el coordinador ve capacidad/cola en `/coordinador`).
