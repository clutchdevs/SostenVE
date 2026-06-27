# Gate 0 — Inception → Requirements

> **Fase AI-DLC:** salida de `00-project` y `01-requirements`.
> **Objetivo del gate:** confirmar que el problema, el alcance y el flujo central están
> definidos y acordados *antes* de invertir esfuerzo en diseño técnico.

Marcar cada ítem solo cuando esté realmente completo y revisado por una persona.

## Charter y dominio
- [ ] `docs/00-project/charter.md` completo: visión, contexto, problema, alcance in/out, métricas, riesgos.
- [ ] `docs/00-project/glossary.md` define el lenguaje ubicuo y es consistente con el resto de documentos.
- [ ] `docs/00-project/data-classification.md` inventaría los datos por sensibilidad.
- [ ] Taxonomía de niveles de riesgo (`riesgo_alto`, `riesgo_moderado`, `seguimiento`, `cerrado`) acordada.

## Requisitos
- [ ] `docs/01-requirements/flujo-central.md` describe el flujo solicitud → triage → crisis/asignación → cierre.
- [ ] Escenarios de abuso/riesgo documentados (reporte por terceros, voluntario no verificado, saturación, pérdida de conexión).
- [ ] Punto crítico no negociable explícito: las líneas de crisis se muestran **antes e independientemente** de toda asignación.

## Decisiones abiertas (Human-in-the-Loop)
- [ ] Pendientes de la Federación marcados con `<TODO — Human-in-the-Loop>` y no inventados:
  - [ ] Esquema de turnos de coordinación.
  - [ ] Política de retención de historias clínicas.
  - [ ] Texto de consentimiento informado.

## Veredicto
- [ ] **Gate 0 aprobado** — se autoriza pasar a `02-design`.
- Aprobado por: `<TODO>`  ·  Fecha: `<TODO>`
