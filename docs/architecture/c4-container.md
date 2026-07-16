# C4 — Diagrama de contenedores

> **Fase AI-DLC:** `02-design`  ·  Nivel 2 (Contenedores del sistema PPV).
> El motor de triage es un contenedor **lógico dentro del backend**, no un servicio separado.

```mermaid
C4Container
    title Contenedores — Plataforma PPV

    Person(solicitante, "Solicitante")
    Person(psicologo, "Psicólogo voluntario")
    Person(coordinador, "Coordinador de turno")

    System_Boundary(ppv, "PPV") {
        Container(frontend, "Frontend web", "Next.js (App Router) + Tailwind, PWA", "Formulario de solicitud y paneles de psicólogo y coordinador; guardado local/reintento")
        Container(api, "API / Backend", "Node.js / Hono, serverless (ADR-0001/0009)", "Autenticación, triage, asignación/cola, gestión de líneas de crisis")
        ContainerDb(db, "Base de datos", "PostgreSQL en Supabase (ADR-0002)", "Casos, usuarios, asignaciones, notas clínicas (cifradas), líneas de respaldo")
        Container(presence, "Presencia en vivo", "Upstash Redis (REST, ADR-0014)", "Estado Online/pausa de los psicólogos por TTL")
    }

    System_Ext(crisis, "Líneas de crisis", "Federación, VEN-911, PsicoMapa UCAB")

    Rel(solicitante, frontend, "Envía solicitud, ve líneas de crisis", "HTTPS")
    Rel(psicologo, frontend, "Ve casos propios, registra notas", "HTTPS")
    Rel(coordinador, frontend, "Monitorea panel y capacidad", "HTTPS")

    Rel(frontend, api, "Llamadas REST/JSON", "HTTPS")
    Rel(api, db, "Lee/escribe; cifra columnas clínicas", "TLS")
    Rel(api, presence, "Latido / consulta de presencia", "REST")
    Rel(frontend, crisis, "Muestra contacto en riesgo alto", "")
```

**Notas**
- Cifrado en tránsito (HTTPS/TLS) y en reposo por columna para datos clínicos (ADR-0004).
- El frontend muestra las líneas de crisis directamente al solicitante (datos provistos por la API).
