# Sostén

> Plataforma de apoyo psicológico post-terremoto · Venezuela, 2026
> *("Sostén" es un nombre de trabajo — `<TODO — Human-in-the-Loop>` el nombre final lo confirma la Federación.)*

**Visión:** conectar de forma rápida, priorizada y segura a personas afectadas por el terremoto con
psicólogos voluntarios disponibles, asegurando que **ninguna persona en riesgo de vida dependa de
que un voluntario revise la plataforma a tiempo**.

## Contexto
Doblete sísmico del 24-06-2026 (epicentro San Felipe/Yumare, Yaracuy; magnitudes 7.2 y 7.5), con
cientos de fallecidos, miles de heridos, colapso de infraestructura y caída intermitente de
electricidad y telecomunicaciones. El gremio de psicólogos voluntarios necesita coordinar la
atención y registrar diagnóstico, notas clínicas y contacto de cada caso.

## Qué hace
- Formulario de solicitud dentro de la app, tolerante a conexión intermitente.
- Triage automático y determinístico del nivel de riesgo (alto / moderado / seguimiento).
- Ante **riesgo alto**: muestra de inmediato las líneas de crisis, antes e independientemente de toda asignación.
- Asignación automática por especialidad y disponibilidad para el resto; cola visible y honesta ante saturación.
- Panel de psicólogo (solo casos propios; diagnóstico y notas) y panel de coordinador (todos los casos, prioridad de riesgo alto).
- Líneas de crisis/respaldo editables sin tocar código.
- PostgreSQL con cifrado en reposo de campos clínicos, HTTPS, respaldos automáticos y control de acceso por rol.

## Niveles de riesgo
| Nivel | Significado | Acción del sistema |
|---|---|---|
| `riesgo_alto` | Ideación suicida o señales de brote psicótico | Líneas de crisis de inmediato; caso urgente en panel de coordinador |
| `riesgo_moderado` | Apoyo pronto, sin riesgo vital inmediato | Asignación automática prioritaria, dentro de su categoría |
| `seguimiento` | Apoyo no urgente | Asignación por orden de llegada, cola visible |
| `cerrado` | Caso atendido y finalizado | Archivado, sujeto a retención de la Federación |

## Arquitectura
- Contexto: [`docs/architecture/c4-context.md`](docs/architecture/c4-context.md)
- Contenedores: [`docs/architecture/c4-container.md`](docs/architecture/c4-container.md)
- Componentes — triage: [`docs/architecture/c4-component-triage.md`](docs/architecture/c4-component-triage.md)
- Componentes — asignación: [`docs/architecture/c4-component-asignacion.md`](docs/architecture/c4-component-asignacion.md)
- Diseño general: [`docs/02-design/architecture.md`](docs/02-design/architecture.md)

## Privacidad y seguridad
- **Responsable y dueña de los datos:** la Federación de Psicólogos de Venezuela (ADR-0003). El equipo de desarrollo es proveedor de la plataforma, no operador de datos.
- **Datos clínicos = restringidos:** cifrado en tránsito (HTTPS) y en reposo por columna (ADR-0004).
- Control de acceso por rol, respaldos automáticos diarios, alta de voluntarios solo vía psicólogo verificador.
- Ver [`docs/00-project/data-classification.md`](docs/00-project/data-classification.md) y [`docs/02-design/threat-model.md`](docs/02-design/threat-model.md).

## Metodología y documentación
Proyecto documentado con **AI-DLC** (markdown versionable, en español, con gates por fase).

```
.ai-dlc/            Gates y plantillas (AI-DLC)
apps/               Código (pendiente; solo README por ahora)
docs/
  00-project/       Charter, glosario, clasificación de datos, ADRs
  01-requirements/  PRD del flujo central
  02-design/        Arquitectura, threat model, contratos de API, OpenAPI
  03-implementation/  (pendiente)
  04-testing/         (pendiente)
  05-deployment/      (pendiente)
  06-monitoring/      (pendiente)
  architecture/     Diagramas C4 (Mermaid)
CHANGELOG.md  LICENSE  README.md
```

## Estado
| Fase | Gate | Estado al generar este repo |
|---|---|---|
| 00 · Project | — | ✅ Charter, glosario, clasificación de datos |
| 01 · Requirements | Gate 0 | ✅ PRD del flujo central con escenarios de riesgo |
| 02 · Design | Gate 1 | ✅ C4, threat model STRIDE/DREAD, ADRs 0001-0008, contrato OpenAPI |
| 03 · Implementation | Gate 2 | ⬜ Pendiente (estructura creada) |
| 04-06 | Gates 3-5 | ⬜ Pendiente (estructura creada) |

> Objetivo del primer sprint: dejar firmes `00-project` y `01-requirements`.

## Decisiones abiertas (Human-in-the-Loop)
Las define la Federación; no se inventan en este repo: esquema de turnos, política de retención de
historias clínicas, texto de consentimiento informado, lenguaje de backend final, proveedor de
hosting y nombre definitivo del proyecto.
