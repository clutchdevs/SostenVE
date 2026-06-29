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
Aplicación web (PWA) **serverless**: frontend y backend en **Vercel** (backend como funciones
`/api/*`, ADR-0009), base de datos **PostgreSQL gestionada en Supabase** (ADR-0002, aislada del
cPanel de la Federación), y el **SLA de 10 min** resuelto con un **Vercel Cron Job** en vez de un
proceso persistente. El triage sigue el PRD de la Federación ("Sistema PPV 2026", ADR-0010).

- Contexto: [`docs/architecture/c4-context.md`](docs/architecture/c4-context.md)
- Contenedores: [`docs/architecture/c4-container.md`](docs/architecture/c4-container.md)
- Componentes — triage: [`docs/architecture/c4-component-triage.md`](docs/architecture/c4-component-triage.md)
- Componentes — asignación: [`docs/architecture/c4-component-asignacion.md`](docs/architecture/c4-component-asignacion.md)
- Diseño general: [`docs/02-design/architecture.md`](docs/02-design/architecture.md)

## Privacidad y seguridad
- **Responsable y dueña de los datos:** la Federación de Psicólogos de Venezuela (ADR-0003). El equipo de desarrollo es proveedor de la plataforma, no operador de datos.
- **Datos clínicos = restringidos:** cifrado en tránsito (HTTPS) y en reposo por columna (ADR-0004).
- **Seudonimización de PII** (tabla separada + ID hash SHA-256 con salt, ADR-0011) y **bitácora de auditoría inmutable** de accesos (ADR-0012), según NFR 6.1 de la Federación.
- Control de acceso por rol (RLS en Supabase), alta de voluntarios validada contra la BD de la FPV.
- Ver [`docs/00-project/data-classification.md`](docs/00-project/data-classification.md) y [`docs/02-design/threat-model.md`](docs/02-design/threat-model.md).

> **⚠️ Deuda técnica (MVP):** el MVP usa el **plan gratuito de Supabase**, que **no incluye respaldos
> automáticos** y, por tanto, **no cumple el NFR 6.2** (respaldo cada 6 h) de la Federación. Debe
> resolverse antes de operar con datos clínicos reales a escala. Ver
> [ADR-0002](docs/00-project/adr/0002-base-datos-postgresql.md).

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
| 02 · Design | Gate 1 | ✅ C4, threat model STRIDE/DREAD, ADRs 0001-0012, contrato OpenAPI (PRD FPV + Vercel/Supabase + NFRs fase 2) |
| 03 · Implementation | Gate 2 | ⬜ Pendiente (estructura creada) |
| 04-06 | Gates 3-5 | ⬜ Pendiente (estructura creada) |

> Objetivo del primer sprint: dejar firmes `00-project` y `01-requirements`.

## Decisiones de alcance frente al PRD de la Federación
Decisiones de alcance **explícitas y documentadas** (no omisiones): el cronograma de la Federación
las ubica dentro de su MVP, pero las posponemos por depender de terceros fuera del control de este
equipo. Detalle en [`docs/01-requirements/flujo-central.md`](docs/01-requirements/flujo-central.md).

| Ítem | Cronograma FPV | Nuestra decisión | Por qué |
|---|---|---|---|
| Webhook de Rescate Activo (RF-3.4) | Dentro del MVP (hito 3) | Fase 3, fuera del MVP | Depende de integración institucional con Defensa Civil/Bomberos |
| SMS de dos vías (2wT, RF-5.1) | Dentro del MVP (hito 3) | Fuera del MVP | Requiere pasarela SMS (costo + contrato + integración) |
| Redes LoRa/Meshtastic (RF-5.2) | Ya excluido por la FPV | Fuera del MVP | Sin discrepancia |

## Decisiones abiertas (Human-in-the-Loop)
Las define la Federación; no se inventan en este repo:
- Esquema de turnos de coordinación.
- Política de retención de historias clínicas (y de la bitácora de auditoría, ADR-0012).
- Texto de consentimiento informado (debe mostrarse en **cada** interfaz del solicitante).
- **Plan de Supabase (gratuito vs. pago):** el plan gratuito pausa el proyecto por inactividad y **no
  incluye respaldos automáticos**; el NFR 6.2 de la propia Federación exige **respaldo cada 6 h**,
  que el plan gratuito no cumple (ver ADR-0002).
- **Alcance del Módulo 4** (expediente clínico): versión simple vs. completa offline-first con
  SQLCipher (ADR/anexo). A resolver antes de pasar de diseño a implementación.
- Nombre definitivo del proyecto.

> Ya resueltas (antes abiertas): lenguaje de backend = **Node.js** (ADR-0001) y hosting =
> **Vercel + Supabase** (ADR-0006/0009).
