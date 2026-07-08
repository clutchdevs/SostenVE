# PPV — Programa de Psicólogos Voluntarios

> Plataforma de apoyo psicológico post-terremoto · Venezuela, 2026
> Nombre definido por la Federación de Psicólogos de Venezuela (antes se usó "Sostén" como placeholder).

**Visión:** conectar de forma rápida, priorizada y segura a personas afectadas por el terremoto con
psicólogos voluntarios disponibles, asegurando que **ninguna persona en riesgo de vida dependa de
que un voluntario revise la plataforma a tiempo**.

## Contexto
Doblete sísmico del 24-06-2026 (epicentro San Felipe/Yumare, Yaracuy; magnitudes 7.2 y 7.5), con
cientos de fallecidos, miles de heridos, colapso de infraestructura y caída intermitente de
electricidad y telecomunicaciones. El gremio de psicólogos voluntarios necesita coordinar la
atención y registrar diagnóstico, notas clínicas y contacto de cada caso.

## Qué hace
- **Solicitante:** formulario de solicitud dentro de la app **offline-first** (guarda el borrador local
  y reintenta el envío al recuperar conexión), con **aviso de consentimiento** no bloqueante en cada
  pantalla y **guías de Primeros Auxilios Psicológicos (PAP)** de autoayuda.
- **Triage** automático y determinístico del nivel de riesgo (alto / moderado / seguimiento) con índice
  de urgencia ponderado y catálogo clínico de tags de la FPV.
- Ante **riesgo alto**: muestra de inmediato las líneas de crisis, antes e independientemente de toda
  asignación (fail-safe: se muestran aun con el backend caído).
- **Asignación automática** por especialidad y **presencia en vivo** (solo asigna a
  psicólogos `Online`); cola visible y honesta ante saturación, con **SLA de 10 min** y escalamiento.
- **Panel de psicólogo** (solo casos propios; identidad del solicitante, notas y **cierre clínico
  estructurado**; toggle de disponibilidad en vivo) y **panel de coordinador** (todos los casos,
  prioridad de riesgo alto, reasignar/cerrar, notas de voluntario, presencia por psicólogo).
- **Registro de voluntarios validado contra el padrón real de la FPV**; alta automática
  (`cédula+FPV ∧ PAP → Activo`) con credenciales por correo. Coordinadores por **invitación tokenizada**.
- **Panel de administración:** padrón de voluntarios, invitaciones de coordinador, líneas de crisis
  editables sin tocar código y consulta de la **bitácora de auditoría**.
- **Seguridad de cuenta:** cambio/reseteo de contraseña, expiración de sesión por inactividad e
  invalidación de sesiones duplicadas.
- **Observabilidad:** métricas de SLA por nivel de riesgo y alerta crítica cuando un caso de riesgo alto
  se escala sin coordinador en línea.
- PostgreSQL con **cifrado en reposo** de campos clínicos, HTTPS, control de acceso por rol (RLS) y
  auditoría inmutable.

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
proceso persistente. La **presencia en tiempo real** de los psicólogos usa **Upstash Redis** (REST,
sin proceso persistente; en dev/tests hay un adaptador en memoria — ADR-0014). La validación de
voluntarios llama al **padrón real de la FPV** por HTTP tras un adaptador con Circuit Breaker
(ADR-0013). El triage sigue el PRD de la Federación ("Sistema PPV 2026", ADR-0010).

- Contexto: [`docs/architecture/c4-context.md`](docs/architecture/c4-context.md)
- Contenedores: [`docs/architecture/c4-container.md`](docs/architecture/c4-container.md)
- Componentes — triage: [`docs/architecture/c4-component-triage.md`](docs/architecture/c4-component-triage.md)
- Componentes — asignación: [`docs/architecture/c4-component-asignacion.md`](docs/architecture/c4-component-asignacion.md)
- Diseño general: [`docs/02-design/architecture.md`](docs/02-design/architecture.md)

## Privacidad y seguridad
- **Responsable y dueña de los datos:** la Federación de Psicólogos de Venezuela (ADR-0003). El equipo de desarrollo es proveedor de la plataforma, no operador de datos.
- **Datos clínicos = restringidos:** cifrado en tránsito (HTTPS) y en reposo por columna (ADR-0004).
- **Seudonimización de PII** (tabla separada + ID hash SHA-256 con salt, ADR-0011) y **bitácora de auditoría inmutable** de accesos (ADR-0012), según NFR 6.1 de la Federación.
- Control de acceso por rol (RLS en Supabase), alta de voluntarios validada contra el padrón real de la FPV (ADR-0013).
- Ver [`docs/00-project/data-classification.md`](docs/00-project/data-classification.md) y [`docs/02-design/threat-model.md`](docs/02-design/threat-model.md).

> **⚠️ Deuda técnica (MVP):** el MVP usa el **plan gratuito de Supabase**, que **no incluye respaldos
> automáticos** y, por tanto, **no cumple el NFR 6.2** (respaldo cada 6 h) de la Federación. Debe
> resolverse antes de operar con datos clínicos reales a escala. Ver
> [ADR-0002](docs/00-project/adr/0002-base-datos-postgresql.md).

## Metodología y documentación
Proyecto documentado con **AI-DLC** (markdown versionable, en español, con gates por fase).

```
.ai-dlc/            Gates y plantillas (AI-DLC)
apps/
  api/              Backend Hono (Clean Architecture/DDD), serverless en Vercel
  web/              Frontend Next.js (App Router) + Tailwind, PWA
supabase/           Migraciones SQL (esquema, RLS, auditoría inmutable)
docs/
  00-project/       Charter, glosario, clasificación de datos, ADRs
  01-requirements/  PRD del flujo central
  02-design/        Arquitectura, threat model, contratos de API, OpenAPI
  03-implementation/  Backlog de implementación
  04-testing/         Estrategia de pruebas, checklist del threat model, plan piloto
  05-deployment/      Guía de despliegue (pendiente de ejecutar el go-live)
  06-monitoring/      Observabilidad: métricas de SLA y alertas
  architecture/     Diagramas C4 (Mermaid)
CHANGELOG.md  LICENSE  README.md
```

## Estado
| Fase | Gate | Estado |
|---|---|---|
| 00 · Project | — | ✅ Charter, glosario, clasificación de datos |
| 01 · Requirements | Gate 0 | ✅ PRD del flujo central con escenarios de riesgo |
| 02 · Design | Gate 1 | ✅ C4, threat model STRIDE/DREAD, ADRs 0001-0014, contrato OpenAPI |
| 03 · Implementation | Gate 2 | ✅ Módulos 1-4 (online): intake offline-first + consentimiento + PAP, triage, asignación por presencia/región/especialidad + SLA, portales de psicólogo/coordinador/admin, registro validado contra el padrón real de la FPV, presencia en vivo y seguridad de sesión. Módulo 4 offline-first (SQLCipher) pendiente de decisión de alcance |
| 04 · Testing | Gate 3 | ✅ Tests de unidad/integración (API), Playwright e2e (incl. fail-safe de crisis) y carga con autocannon |
| 05 · Deployment | Gate 4 | ⬜ Guía escrita; go-live pendiente |
| 06 · Monitoring | Gate 5 | 🟡 Métricas de SLA + alertas implementadas; dashboards/observabilidad externa pendientes |

> Próximo foco: **validar el verificador FPV con datos reales del padrón** y provisionar sus credenciales,
> aprovisionar Upstash (presencia) y el envío real de correo, cerrar con la FPV el **alcance del Módulo 4**
> y **preparar el despliegue** (fase 05). Backlog detallado en
> [`docs/03-implementation/backlog.md`](docs/03-implementation/backlog.md).

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
- **Plan de Supabase (gratuito vs. pago):** el plan gratuito pausa el proyecto por inactividad y **no
  incluye respaldos automáticos**; el NFR 6.2 de la propia Federación exige **respaldo cada 6 h**,
  que el plan gratuito no cumple (ver ADR-0002).
- **Alcance del Módulo 4** (expediente clínico): versión simple (ya implementada, online) vs. completa
  offline-first con SQLCipher (ADR/anexo). A resolver antes de implementar la variante pesada.

> Ya resueltas (antes abiertas): lenguaje de backend = **Node.js** (ADR-0001); hosting =
> **Vercel + Supabase** (ADR-0006/0009); **nombre = PPV** (Programa de Psicólogos Voluntarios);
> **contrato del verificador FPV** entregado e implementado (ADR-0013, issue #6); texto de
> consentimiento del **psicólogo** oficial de la FPV (issue #32); **pesos/umbrales del triage validados**
> por la FPV (2026-07-03, ADR-0010); **clúster regional (RF-3.1) y clúster de coordinadores (RF-3.3)
> eliminados** por la FPV (preferencia regional removida del motor); **texto de consentimiento del
> solicitante** oficial de la FPV (`v1.0.0-fpv`, issue #1).
