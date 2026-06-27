# Arquitectura — Proyecto Sostén

> **Fase AI-DLC:** `02-design`  ·  **Estado:** propuesta
> **Decisiones relacionadas:** ADR-0001 (stack), ADR-0002 (PostgreSQL), ADR-0004 (cifrado),
> ADR-0005 (auth), ADR-0006 (hosting), ADR-0008 (cola).

## 1. Estilo arquitectónico
Aplicación web monolítica simple, en capas, mantenible por una sola persona:

```
Solicitante / Psicólogo / Coordinador
        │  (HTTPS)
        ▼
┌──────────────────────────────────────────────┐
│ Frontend (formulario + paneles)              │
└──────────────────────────────────────────────┘
        │  (REST/JSON sobre HTTPS)
        ▼
┌──────────────────────────────────────────────┐
│ API / Backend                                │
│  ├─ Autenticación y control de acceso (rol)  │
│  ├─ Motor de triage (reglas determinísticas) │
│  ├─ Motor de asignación / cola               │
│  └─ Gestión de líneas de crisis/respaldo     │
└──────────────────────────────────────────────┘
        │  (cifrado de columnas sensibles)
        ▼
┌──────────────────────────────────────────────┐
│ PostgreSQL (+ respaldo automático diario)    │
└──────────────────────────────────────────────┘
```

El detalle de capas/componentes corresponde a la sección 3 del plan de trabajo ya acordado.

## 2. Componentes principales
- **Frontend:** web app simple (React/Vue o server-rendered). Prioridad: carga rápida con conexión
  intermitente y guardado local/reintento del formulario, no sofisticación visual.
- **API/Backend:** expone los endpoints REST (ver `api-contracts.md`), aplica control de acceso por
  rol y orquesta triage, asignación y cola.
- **Motor de triage:** función **determinística sobre las respuestas del formulario** (reglas, no un
  modelo de ML). A diferencia del repo de referencia, que usa biometría/face-match para emparejar
  personas, **este dominio no requiere ML ni biometría y no debe inventarlos**.
- **Motor de asignación/cola:** aplica la prioridad del ADR-0008 (riesgo alto primero; resto FIFO
  por categoría) y produce asignación o entrada en cola con mensaje honesto.
- **PostgreSQL:** almacena casos, usuarios, asignaciones, notas (cifradas) y líneas de respaldo.

## 3. Modelo de datos (alto nivel)
- **usuarios** — psicólogos y coordinadores: nombre, cédula profesional, especialidad, contacto, disponibilidad, rol (psicólogo/coordinador/administrador), credenciales (hash).
- **casos** — solicitante (nombre, contacto, tipo), nivel de riesgo, estado (pendiente/asignado/en seguimiento/cerrado), zona, modalidad preferida, fecha de creación.
- **asignaciones** — relación caso–psicólogo, fecha, canal de contacto usado.
- **notas_clinicas** — caso, psicólogo autor, fecha, diagnóstico, contenido (campo cifrado).
- **lineas_de_respaldo** — nombre del servicio, número, horario de cobertura, prioridad; editable sin tocar código.

## 4. Control de acceso
- Un psicólogo solo ve y escribe notas de los casos asignados.
- El coordinador ve el estado de todos los casos, pero no necesariamente el contenido clínico de
  cada nota (`<TODO — Human-in-the-Loop>` según defina la Federación).
- Rol de administrador con acceso completo: definido por el equipo de desarrollo; quién lo ocupa,
  `<TODO — Human-in-the-Loop>`.

## 5. Atributos de calidad
- **Seguridad:** cifrado en tránsito y reposo (ADR-0004), control de acceso por rol, respaldos diarios.
- **Resiliencia a conectividad:** guardado local y reintento en el formulario.
- **Costo/operación:** stack simple y hosting económico (ADR-0006); mantenible por una persona.
- **Disponibilidad:** dimensionado para 300+ solicitudes/día sin sobre-ingeniería.
