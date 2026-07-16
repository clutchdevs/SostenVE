# ADR-0002 — Base de datos PostgreSQL (en Supabase)

> **Fase AI-DLC:** `02-design`  ·  **Estado:** aceptada
> **Fecha:** 2026-06-27 (actualizado 2026-06-28)  ·  **Responsable:** equipo de desarrollo

## Contexto
El proyecto maneja relaciones claras entre entidades (casos, voluntarios, usuarios, asignaciones,
notas clínicas) y datos de salud sensibles que requieren cifrado. Se necesita una base de datos
madura, gestionada y de bajo costo. Ver `docs/00-project/decisiones-infraestructura.md` para el
análisis completo de por qué se descartó alojarla en el cPanel de la Federación.

## Decisión
Usar **PostgreSQL alojado en Supabase** (gestionado), **separado** del hosting cPanel de la
Federación por motivos de seguridad. No autoalojado ni compartido con el sistema PHP/Symfony
existente de la FPV.

## Alternativas consideradas
- **PostgreSQL gestionado en Supabase** — gestionado, client oficial para Next.js/Vercel, bajo costo. Elegida.
- **MySQL en el cPanel de la Federación** — descartada: riesgo de compartir credenciales/tablas con el sistema existente y límites de recursos del plan cPanel (ver ADR-0006 y `decisiones-infraestructura.md`).
- **Base NoSQL (MongoDB)** — descartada: el dominio es fuertemente relacional (caso–voluntario–nota).

## Consecuencias
- **Positivas:** integridad referencial; cifrado a nivel de columna para campos clínicos (ver ADR-0004); aislamiento del sistema existente de la FPV.
- **Negativas / costos:**
  - Desde funciones serverless (ADR-0009) **debe usarse el connection pooler de Supabase**, no la conexión directa: las funciones abren/cierran conexiones constantemente y agotarían el límite de conexiones directas.
  - **Riesgo abierto del plan gratuito:** pausa el proyecto tras 7 días de inactividad y **no incluye respaldos automáticos**. Con 300+ solicitudes/día el proyecto no estará inactivo, pero la falta de respaldos sigue siendo inaceptable para datos clínicos.
  - **Requisito explícito de la Federación (NFR 6.2):** respaldos automáticos **cada 6 horas** con snapshots geodistribuidos. El plan gratuito de Supabase **no cumple** este requisito, lo que convierte la advertencia anterior de "recomendación nuestra" en "requisito pedido por escrito por la Federación": exige un plan de pago de Supabase o un mecanismo de respaldo externo igual de confiable.
  - Sobre esta BD se construyen además la seudonimización de PII (ADR-0011) y la bitácora de auditoría inmutable (ADR-0012).
- **Pendientes (Human-in-the-Loop):** `<TODO — Human-in-the-Loop>` la Federación debe decidir plan gratuito vs. pago de Supabase; el NFR 6.2 (respaldo cada 6 h) hace que el plan gratuito no sea viable para producción.

## Decisión operativa para el MVP (2026-06-28)
Para el MVP/piloto se usa el **plan gratuito de Supabase**, asumiendo conscientemente sus límites:
- **Pausa tras 7 días de inactividad** → mitigación **implementada (Bloque 5):** el Vercel Cron
  `check-sla` (diario, `0 0 * * *`) consulta la BD en cada corrida, lo que mantiene el proyecto activo
  (una corrida diaria basta frente al umbral de 7 días).
- **Sin respaldos automáticos** → **deuda técnica explícita**: el MVP **no cumple el NFR 6.2** de la
  Federación mientras se use el plan gratuito. Debe resolverse antes de manejar datos clínicos reales
  a escala (no solo datos de prueba/piloto).
- **500 MB y límites de conexión** → improbable agotarlos en el piloto; monitorear desde el Bloque 7.
- **Reevaluación obligatoria antes de masificar:** esta decisión es válida solo para el MVP/piloto
  controlado; no asumir que "funcionó en el piloto" valida el plan gratuito a mayor escala.
