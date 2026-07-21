# Modelo de amenazas — Proyecto PPV

> **Fase AI-DLC:** `02-design`  ·  **Método:** STRIDE + priorización DREAD
> **Estado:** propuesta  ·  **Fecha:** 2026-06-27 (actualizado 2026-06-28 — arquitectura serverless)

## 1. Alcance y activos a proteger
- **Notas clínicas y diagnóstico** (dato restringido) — el activo más sensible.
- **Nivel de riesgo / tags clínicos / score** (restringido).
- **Datos de contacto** del solicitante y del voluntario (sensible).
- **Credenciales** de psicólogos/coordinadores.
- **Disponibilidad del servicio** ante el volumen del primer día.

Componentes en alcance: intake/triage, API serverless (`/api/*`), endpoint de cron, base de datos
en Supabase, panel de psicólogo, panel de coordinador.

> **Nota:** no se modelan amenazas del repo de referencia que aquí **no aplican** (face-match,
> biometría): este dominio no usa biometría.

## 2. Diagrama de flujo de datos
Ver `docs/architecture/architecture.md` y `docs/architecture/c4-container.md`.

## 3. Análisis STRIDE
| Categoría | Amenaza | Componente | Mitigación |
|---|---|---|---|
| **S**poofing | Alguien se hace pasar por un psicólogo verificado | Auth / registro | Validación automática contra BD de la FPV (Módulo 2), contraseñas hasheadas; a futuro 2FA |
| **S**poofing | Invocación falsa del endpoint de cron para disparar escalamientos | `/api/cron/*` | **Secreto compartido** verificado en cada invocación, solo en variables de entorno de Vercel |
| **T**ampering | Modificación de notas clínicas o del score de triage | API / BD | Control de acceso por rol; solo el autor escribe sus notas; integridad de BD |
| **R**epudiation | Un usuario niega haber escrito/leído/consultado un expediente | API / BD | **Bitácora de auditoría inmutable** de solo-inserción (ADR-0012): `usuario_id`, `rol`, `registro_afectado_id`, `tipo_accion`, `timestamp`; no editable ni por el admin de BD |
| **I**nformation disclosure | La identidad queda junto al contenido clínico en la misma fila | BD | **Seudonimización** de PII (ADR-0011): tabla de PII separada, vinculada por ID hash SHA-256 + salt |
| **I**nformation disclosure | Exposición de notas por acceso insuficiente o volcado de BD | Supabase / paneles | Cifrado en reposo por columna (ADR-0004), HTTPS, acceso por rol, BD aislada del cPanel de la FPV (ADR-0002) |
| **D**enial of service | Saturación por el volumen del primer día o abuso del intake | Intake / API | Cola con prioridad (ADR-0008), rate limiting, mensaje honesto, escalado serverless |
| **E**levation of privilege | Un psicólogo accede a casos ajenos o a funciones de admin | API / autorización | Autorización estricta por rol y por propiedad del caso |
| **D**enial of service / disponibilidad | **Cold-start** serverless al mostrar líneas de crisis en el momento crítico | Frontend / backend | Líneas de crisis **cacheadas en el cliente**; no dependen de la latencia del backend (ADR-0009) |
| **I**nformation disclosure / DoS | Agotar el límite de conexiones de Supabase desde funciones concurrentes | Backend / Supabase | Uso del **connection pooler** de Supabase (ADR-0002) |
| **I**nformation disclosure | **Exfiltración masiva**: descargar en un archivo el contenido clínico de *todos* los casos cerrados, no de uno (reporte de casos cerrados, ADR-0017) | API / Reportes | Acceso limitado a coordinador/admin, **otorgado y revocable por la FPV** vía invitaciones; **cada consulta y cada descarga se auditan** (filtros y nº de filas); sin los campos estructurados de identidad del solicitante; disclaimer versionado en el punto de uso |

## 4. Priorización DREAD
Escala 0-10 por factor; total = suma (máx. 50).

| Amenaza | Damage | Reproducibility | Exploitability | Affected | Discoverability | Total |
|---|---|---|---|---|---|---|
| (g) Exfiltración masiva de casos cerrados vía descarga del reporte | 9 | 8 | 6 | 9 | 7 | **39** |
| (a) Exposición de diagnóstico/notas por control de acceso insuficiente | 10 | 6 | 5 | 9 | 5 | **35** |
| (c) Denegación de servicio por el volumen del primer día | 6 | 8 | 6 | 7 | 7 | **34** |
| (e) Invocación falsa del endpoint de cron (escalamientos falsos) | 7 | 7 | 6 | 6 | 6 | **32** |
| (b) Suplantación de un psicólogo no verificado | 9 | 5 | 5 | 8 | 4 | **31** |
| (f) Cold-start retrasa las líneas de crisis en riesgo alto | 9 | 5 | 4 | 6 | 5 | **29** |
| (d) Pérdida de datos clínicos sin respaldo (plan gratuito Supabase) | 10 | 3 | 2 | 10 | 3 | **28** |

> Prioridad de mitigación: **(g)**, (a), (c) y (e) por total alto; (b), (f) y (d) por daño crítico.
> (g) encabeza la lista porque una descarga expone *todos* los casos cerrados de una vez, mientras que el
> resto de vectores expone uno. Su contramedida principal no es técnica sino de gobernanza + trazabilidad:
> la FPV decide quién entra, y toda descarga queda registrada.

## 5. Decisiones / riesgos aceptados
- Sin 2FA en la primera versión (ADR-0005): riesgo residual aceptado, mitigado por validación contra BD FPV.
- Canal de contacto vía `wa.me` sin auditoría interna (ADR-0007): aceptado como decisión de costo.
- **Plan gratuito de Supabase sin respaldos automáticos** (ADR-0002): riesgo abierto, pendiente de decisión de la Federación (`<TODO — Human-in-the-Loop>`).
- **Exportación de casos cerrados** (ADR-0017 / issue #169): **riesgo aceptado por la Federación**, que es
  la **titular y responsable del tratamiento** de estos datos. La FPV solicitó el reporte, decidió exponer
  el cierre **tal como se guardó, sin excluir campos** —incluido `comentario`, que es **texto libre** y
  **puede contener identidad** escrita por el psicólogo sin que el sistema pueda evitarlo—, y **controla
  quién accede** mediante el flujo de invitaciones de coordinadores.
  Mitigaciones implementadas por el equipo: restricción por rol, **auditoría de cada consulta y descarga**,
  ausencia de los campos estructurados de identidad, y disclaimer versionado en el punto de uso.
  Una vez descargado, el archivo **sale del perímetro de controles** del sistema; su custodia, uso y
  eliminación quedan a cargo de la Federación y de quien realiza la descarga.
- Acceso del coordinador al contenido clínico (issue #25): **resuelto** — acceso **auditado**. El
  coordinador/admin puede leer las notas clínicas (cumple el PRD), pero cada lectura registra
  `clinical_note_read` en el `audit_log` inmutable (ADR-0012); la PII de contacto sigue restringida al
  psicólogo asignado. Riesgo residual aceptado: mayor superficie de lectura, mitigada por trazabilidad.
