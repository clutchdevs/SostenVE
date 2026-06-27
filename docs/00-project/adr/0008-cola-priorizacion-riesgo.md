# ADR-0008 — Cola y priorización por riesgo

> **Fase AI-DLC:** `02-design`  ·  **Estado:** aceptada
> **Fecha:** 2026-06-27  ·  **Responsable:** equipo de desarrollo

## Contexto
Se esperan 300+ solicitudes el primer día, por encima de la capacidad de los voluntarios. El sistema
debe priorizar de forma justa y, sobre todo, segura, sin prometer lo que no puede cumplir. El punto
crítico no negociable: el riesgo de vida nunca depende de la disponibilidad de un voluntario.

## Decisión
- **Riesgo alto siempre primero**, sin excepción, y con líneas de crisis mostradas de inmediato (independiente de la cola).
- **Riesgo moderado y seguimiento** se atienden por **orden de llegada dentro de su categoría**, detrás de cualquier riesgo alto pendiente.
- Cuando no hay asignación inmediata, el sistema da un **mensaje honesto de espera** al usuario y repite las líneas de crisis.

## Alternativas consideradas
- **Prioridad por riesgo + FIFO por categoría** — simple, justa y predecible. Elegida.
- **FIFO puro (orden de llegada global)** — descartada: dejaría casos de riesgo alto detrás de seguimiento.
- **Prometer tiempos de atención** — descartada: el sistema no garantiza disponibilidad de voluntarios; sería deshonesto.

## Consecuencias
- **Positivas:** seguridad priorizada; expectativas honestas; lógica simple de implementar y auditar.
- **Negativas / costos:** ante saturación severa, casos de seguimiento pueden esperar mucho (mitigado con panel de capacidad y métrica de abandono de cola).
- **Pendientes (Human-in-the-Loop):** `<TODO — Human-in-the-Loop>` umbral de tiempo aceptable de espera por categoría, definido por la Federación.
