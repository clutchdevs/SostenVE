# C4 — Diagrama de contenedores

> **Fase AI-DLC:** `02-design`  ·  Nivel 2 (Contenedores del sistema Sostén).
> El motor de triage es un contenedor **lógico dentro del backend**, no un servicio separado.

```mermaid
C4Container
    title Contenedores — Plataforma Sostén

    Person(solicitante, "Solicitante")
    Person(psicologo, "Psicólogo voluntario")
    Person(coordinador, "Coordinador de turno")

    System_Boundary(sosten, "Sostén") {
        Container(frontend, "Frontend web", "React/Vue o server-rendered", "Formulario de solicitud y paneles de psicólogo y coordinador; guardado local/reintento")
        Container(api, "API / Backend", "Node.js o Python (ADR-0001)", "Autenticación, triage, asignación/cola, gestión de líneas de crisis")
        ContainerDb(db, "Base de datos", "PostgreSQL (ADR-0002)", "Casos, usuarios, asignaciones, notas clínicas (cifradas), líneas de respaldo")
        Container(backup, "Respaldo automático", "Job diario", "Copia de seguridad diaria de la base de datos")
    }

    System_Ext(crisis, "Líneas de crisis", "Federación, VEN-911, PsicoMapa UCAB")

    Rel(solicitante, frontend, "Envía solicitud, ve líneas de crisis", "HTTPS")
    Rel(psicologo, frontend, "Ve casos propios, registra notas", "HTTPS")
    Rel(coordinador, frontend, "Monitorea panel y capacidad", "HTTPS")

    Rel(frontend, api, "Llamadas REST/JSON", "HTTPS")
    Rel(api, db, "Lee/escribe; cifra columnas clínicas", "TLS")
    Rel(backup, db, "Respalda diariamente", "")
    Rel(frontend, crisis, "Muestra contacto en riesgo alto", "")
```

**Notas**
- Cifrado en tránsito (HTTPS/TLS) y en reposo por columna para datos clínicos (ADR-0004).
- El frontend muestra las líneas de crisis directamente al solicitante (datos provistos por la API).
