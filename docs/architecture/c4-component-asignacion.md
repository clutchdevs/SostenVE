# C4 — Componentes: Motor de asignación / cola

> **Fase AI-DLC:** `02-design`  ·  Nivel 3 (Componentes dentro del backend).
> Entrada: caso clasificado. Salida: asignación a voluntario, o entrada en cola con mensaje honesto.

```mermaid
C4Component
    title Componentes — Motor de asignación y cola (dentro del Backend)

    Container_Boundary(api, "API / Backend") {
        Component(orq, "Orquestador de asignación", "Servicio", "Decide asignar o encolar según riesgo y disponibilidad")
        Component(match, "Selector de psicólogo", "Función", "Busca un voluntario por especialidad y disponibilidad")
        Component(cola, "Gestor de cola", "Servicio", "Aplica prioridad: riesgo alto primero, resto FIFO por categoría (ADR-0008)")
        Component(notif, "Notificador", "wa.me / correo (ADR-0007)", "Avisa al psicólogo asignado y al coordinador si es riesgo alto")
        Component(persist, "Persistencia de asignaciones", "Repositorio", "Registra la asignación o la posición en cola")
    }

    ContainerDb(db, "PostgreSQL", "Casos, usuarios, asignaciones")

    Rel(orq, match, "Pide un psicólogo compatible")
    Rel(match, db, "Consulta especialidad/disponibilidad")
    Rel(orq, cola, "Si no hay disponibilidad, encola con prioridad")
    Rel(orq, persist, "Registra asignación o entrada en cola")
    Rel(persist, db, "INSERT/UPDATE")
    Rel(orq, notif, "Notifica asignación / urgencia")
```

## Reglas de asignación y cola (ADR-0008)
1. **Riesgo alto:** marcado urgente en el panel del coordinador; las líneas de crisis ya se
   mostraron en el triage, con independencia de la asignación.
2. **Riesgo moderado/seguimiento:** se busca un psicólogo por especialidad y disponibilidad.
3. Si **no** hay disponibilidad inmediata → el caso entra en cola visible:
   - Riesgo alto siempre primero.
   - Moderado y seguimiento por orden de llegada dentro de su categoría.
   - Se devuelve al usuario un **mensaje honesto de espera** y se repiten las líneas de crisis.
4. El **panel de capacidad** del coordinador refleja los casos sin asignar en tiempo real.
