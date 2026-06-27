# Gate 1 — Design → Implementation

> **Fase AI-DLC:** salida de `02-design`.
> **Objetivo del gate:** confirmar que la arquitectura, el modelo de amenazas y las
> decisiones clave (ADRs) están completos antes de escribir código.

## Arquitectura
- [ ] `docs/02-design/architecture.md` describe estilo y capas (formulario → API → triage → BD).
- [ ] Diagramas C4 presentes y válidos (Mermaid):
  - [ ] `docs/architecture/c4-context.md`
  - [ ] `docs/architecture/c4-container.md`
  - [ ] `docs/architecture/c4-component-triage.md`
  - [ ] `docs/architecture/c4-component-asignacion.md`
- [ ] Queda explícito que el motor de triage es **determinístico (reglas)**, no ML/biometría.

## Seguridad
- [ ] `docs/02-design/threat-model.md` aplica STRIDE a los componentes principales.
- [ ] Amenazas priorizadas con DREAD; cubren exposición de notas, suplantación, DoS, pérdida de datos.
- [ ] Cifrado en tránsito y en reposo para campos clínicos confirmado como requisito, no opción.

## Contratos
- [ ] `docs/02-design/api-contracts.md` lista los endpoints REST.
- [ ] `docs/02-design/openapi.yaml` válido (OpenAPI 3.1) y coherente con los contratos.

## Decisiones (ADR)
- [ ] ADRs 0001–0008 redactados con formato estándar (Contexto / Decisión / Alternativas / Consecuencias).
- [ ] Las decisiones abiertas siguen marcadas como `<TODO — Human-in-the-Loop>`.

## Veredicto
- [ ] **Gate 1 aprobado** — se autoriza pasar a `03-implementation`.
- Aprobado por: `<TODO>`  ·  Fecha: `<TODO>`
