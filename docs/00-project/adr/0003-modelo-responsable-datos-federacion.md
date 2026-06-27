# ADR-0003 — Modelo de responsable de datos: la Federación

> **Fase AI-DLC:** `00-project`  ·  **Estado:** aceptada
> **Fecha:** 2026-06-27  ·  **Responsable:** equipo de desarrollo + Federación

## Contexto
La plataforma maneja historias clínicas (dato de salud sensible). Alguien debe ser legalmente
responsable y dueño de esa información. El equipo de desarrollo no es una entidad legal apta para
asumir esa responsabilidad; la Federación de Psicólogos de Venezuela sí lo es.

## Decisión
La **Federación de Psicólogos de Venezuela** es la **responsable y dueña** de la información. El
equipo de desarrollo es **proveedor de la plataforma**, no operador de datos: construye y entrega la
app, pero no gestiona los datos como controlador.

## Alternativas consideradas
- **Federación como responsable** — alineado con la realidad legal y gremial. Elegida.
- **Equipo de desarrollo como responsable** — descartado: no hay entidad legal propia ni mandato para asumir responsabilidad sobre datos de salud.
- **Sin responsable formal** — descartado: inaceptable para dato clínico.

## Consecuencias
- **Positivas:** responsabilidad legal clara; el equipo se enfoca en lo técnico.
- **Negativas / costos:** decisiones de retención, consentimiento y verificación quedan del lado de la Federación (no bloquean el desarrollo, pero sí la puesta en producción).
- **Pendientes (Human-in-the-Loop):** `<TODO — Human-in-the-Loop>` política de retención, texto de consentimiento, verificación de voluntarios.
