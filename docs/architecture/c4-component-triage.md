# C4 — Componentes: Motor de triage

> **Fase AI-DLC:** `02-design`  ·  Nivel 3 (Componentes dentro del backend).
> Entrada: respuestas del formulario. Salida: nivel de riesgo + acción.
> **Determinístico (reglas), no ML ni biometría.**

```mermaid
C4Component
    title Componentes — Motor de triage (dentro del Backend)

    Container_Boundary(api, "API / Backend") {
        Component(ctrl, "Controlador de solicitudes", "Endpoint POST /solicitudes", "Recibe el formulario y orquesta el triage")
        Component(reglas, "Evaluador de reglas de triage", "Función determinística", "Aplica las preguntas de triage y clasifica el riesgo")
        Component(crisis_svc, "Servicio de líneas de crisis", "Lectura de configuración", "Devuelve las líneas activas si el riesgo es alto")
        Component(persist, "Persistencia de casos", "Repositorio", "Crea el caso con su nivel de riesgo y estado inicial")
    }

    ContainerDb(db, "PostgreSQL", "Casos y líneas de respaldo")

    Rel(ctrl, reglas, "Envía respuestas de triage")
    Rel(reglas, ctrl, "Devuelve nivel: alto/moderado/seguimiento")
    Rel(ctrl, crisis_svc, "Si riesgo alto, pide líneas de crisis")
    Rel(crisis_svc, db, "Lee líneas activas")
    Rel(ctrl, persist, "Crea el caso clasificado")
    Rel(persist, db, "INSERT caso")
```

## Reglas de clasificación (determinísticas)
A validar por un psicólogo del gremio (ver plan, sección 6):

| Condición | Resultado |
|---|---|
| "Pensamientos de hacerse daño / no querer seguir viviendo" = **sí** | `riesgo_alto` |
| "Ver/oír/sentir cosas que otros dicen que no ocurren" = **sí** | `riesgo_alto` |
| Necesita hablar **hoy mismo** (sin señales de riesgo alto) | `riesgo_moderado` |
| Puede esperar a los próximos días | `seguimiento` |

> Si **cualquier** condición de riesgo alto se cumple, el resultado es `riesgo_alto` y se muestran
> las líneas de crisis de inmediato, antes de cualquier asignación.
