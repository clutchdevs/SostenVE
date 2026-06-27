# C4 — Diagrama de contexto

> **Fase AI-DLC:** `02-design`  ·  Nivel 1 (Sistema en su entorno).
> Las líneas de crisis son **destinos de derivación**, no integraciones técnicas.

```mermaid
C4Context
    title Contexto del sistema — Plataforma Sostén

    Person(solicitante, "Solicitante", "Víctima, familiar o voluntario/rescatista que pide apoyo psicológico")
    Person(psicologo, "Psicólogo voluntario", "Atiende casos asignados; registra diagnóstico y notas")
    Person(verificador, "Psicólogo verificador", "Da de alta y valida a cada voluntario")
    Person(coordinador, "Coordinador de turno", "Monitorea el panel y prioriza el riesgo alto")
    Person(federacion, "Federación de Psicólogos de Venezuela", "Dueña y responsable de los datos; define políticas")

    System(sosten, "Sostén", "Recibe solicitudes, hace triage, deriva a crisis, asigna casos y guarda historias clínicas")

    System_Ext(crisis_fed, "Línea de la Federación", "0212-416-3116 / 0212-416-3118 — gratuita, anónima")
    System_Ext(ven911, "VEN-911 / CICPC", "911 — prevención del suicidio, nacional")
    System_Ext(psicomapa, "PsicoMapa UCAB / Psico Línea", "Buscador de centros gratuitos/bajo costo")

    Rel(solicitante, sosten, "Envía solicitud y consulta estado", "HTTPS")
    Rel(psicologo, sosten, "Atiende casos, registra notas", "HTTPS")
    Rel(verificador, sosten, "Da de alta a voluntarios", "HTTPS")
    Rel(coordinador, sosten, "Monitorea y prioriza casos", "HTTPS")
    Rel(federacion, sosten, "Define políticas, posee los datos", "")

    Rel(sosten, crisis_fed, "Deriva en riesgo alto", "muestra contacto")
    Rel(sosten, ven911, "Deriva en riesgo alto", "muestra contacto")
    Rel(sosten, psicomapa, "Deriva en riesgo alto", "muestra contacto")
```

**Notas**
- La derivación a líneas de crisis ocurre **antes e independientemente** de cualquier asignación.
- La Federación es actor dueño de datos (ADR-0003), no un sistema externo.
