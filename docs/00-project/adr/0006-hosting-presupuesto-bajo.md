# ADR-0006 — Hosting de bajo costo

> **Fase AI-DLC:** `02-design`  ·  **Estado:** propuesta (proveedor por cotizar)
> **Fecha:** 2026-06-27  ·  **Responsable:** equipo de desarrollo

## Contexto
La Federación puede cubrir un costo mensual pequeño (hosting, dominio), pero no hay presupuesto para
infraestructura compleja. El volumen esperado (300+ solicitudes el primer día) es manejable por una
arquitectura modesta; no se justifica una que escale el costo innecesariamente.

## Decisión
Elegir un **proveedor económico con base de datos PostgreSQL administrada** (p. ej. un VPS pequeño,
o una plataforma tipo Render/Railway con BD gestionada). Priorizar: respaldo automático incluido,
HTTPS sencillo y costo mensual bajo y predecible. Cotizar 2-3 opciones antes de fijar el proveedor.

## Alternativas consideradas
- **PaaS con BD administrada (Render/Railway/similar)** — respaldos y HTTPS simples; buen punto de partida.
- **VPS pequeño autogestionado** — más barato pero exige gestionar respaldos/seguridad a mano.
- **Nube grande (AWS/GCP/Azure) con arquitectura elaborada** — descartada: sobredimensionada y de costo difícil de predecir para este volumen.

## Consecuencias
- **Positivas:** costo bajo y predecible; respaldos administrados reducen riesgo de pérdida de datos.
- **Negativas / costos:** límites de escalado del plan económico; migrar de proveedor implica trabajo si se subestima el crecimiento.
- **Pendientes (Human-in-the-Loop):** `<TODO — Human-in-the-Loop>` proveedor definitivo, pendiente de cotizar 2-3 opciones.
