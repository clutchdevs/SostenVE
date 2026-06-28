# ADR-0010 — Triage según el PRD de la Federación ("Sistema PPV 2026")

> **Fase AI-DLC:** `02-design`  ·  **Estado:** aceptada
> **Fecha:** 2026-06-28  ·  **Responsable:** equipo de desarrollo + Federación

## Contexto
El diseño original de triage eran 4 preguntas estáticas que clasificaban en alto/moderado/seguimiento
(ver ADR-0008 e historial). La Federación entregó un PRD propio ("Sistema PPV 2026") con un diseño de
triage más rico, de baja fricción, validado clínicamente por el gremio. Este diseño **reemplaza y
amplía** el original.

## Decisión
Adoptar el embudo de triage del PRD de la Federación:
- **Pantalla única Likert** de entrada, sin pedir datos personales primero (baja fricción).
- **Bifurcación en Rama Roja / Rama Verde** según la respuesta.
- **Tags táctiles con peso clínico** (categorías Rojo/Naranja/Amarillo) que producen un **score de
  urgencia ponderado**, en lugar de respuestas booleanas de formulario.
- **Regla de interrupción y reenrutamiento:** 1 tag rojo, o 3+ tags naranja, escala a Rama Roja.
- **Rama Roja:** incluye el **ruteo dinámico de línea de crisis por hora** (RF-1.2.1) y el análisis
  léxico-semántico (RF-1.4) documentado como parte de esta rama.

El detalle completo del flujo vive en `docs/01-requirements/flujo-central.md`.

## Alternativas consideradas
- **Embudo de baja fricción con tags ponderados (PRD FPV)** — validado por el gremio, mejor experiencia para personas en crisis. Elegida.
- **Mantener las 4 preguntas estáticas originales** — descartado: más fricción y menos resolución clínica que el diseño de la Federación.

## Consecuencias
- **Positivas:** triage más fino y de menor fricción; alineado con el criterio clínico de la FPV.
- **Negativas / costos:**
  - El **modelo de datos de triage cambia** de "respuestas de formulario" a "tags seleccionados + score ponderado".
  - El analizador léxico-semántico (RF-1.4) queda documentado pero puede ir a **Fase 2** (ver alcance del MVP en `flujo-central.md`).
- **Pendientes (Human-in-the-Loop):** `<TODO — Human-in-the-Loop>` validación final de pesos/umbrales de los tags por un psicólogo de la FPV.
