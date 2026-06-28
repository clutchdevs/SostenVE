# Modelo de amenazas — Proyecto Sostén

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
| **R**epudiation | Un usuario niega haber escrito/leído una nota | API / BD | Registro de autor y fecha; logs de acceso a datos restringidos |
| **I**nformation disclosure | Exposición de notas por acceso insuficiente o volcado de BD | Supabase / paneles | Cifrado en reposo por columna (ADR-0004), HTTPS, acceso por rol, BD aislada del cPanel de la FPV (ADR-0002) |
| **D**enial of service | Saturación por el volumen del primer día o abuso del intake | Intake / API | Cola con prioridad (ADR-0008), rate limiting, mensaje honesto, escalado serverless |
| **E**levation of privilege | Un psicólogo accede a casos ajenos o a funciones de admin | API / autorización | Autorización estricta por rol y por propiedad del caso |
| **D**enial of service / disponibilidad | **Cold-start** serverless al mostrar líneas de crisis en el momento crítico | Frontend / backend | Líneas de crisis **cacheadas en el cliente**; no dependen de la latencia del backend (ADR-0009) |
| **I**nformation disclosure / DoS | Agotar el límite de conexiones de Supabase desde funciones concurrentes | Backend / Supabase | Uso del **connection pooler** de Supabase (ADR-0002) |

## 4. Priorización DREAD
Escala 0-10 por factor; total = suma (máx. 50).

| Amenaza | Damage | Reproducibility | Exploitability | Affected | Discoverability | Total |
|---|---|---|---|---|---|---|
| (a) Exposición de diagnóstico/notas por control de acceso insuficiente | 10 | 6 | 5 | 9 | 5 | **35** |
| (c) Denegación de servicio por el volumen del primer día | 6 | 8 | 6 | 7 | 7 | **34** |
| (e) Invocación falsa del endpoint de cron (escalamientos falsos) | 7 | 7 | 6 | 6 | 6 | **32** |
| (b) Suplantación de un psicólogo no verificado | 9 | 5 | 5 | 8 | 4 | **31** |
| (f) Cold-start retrasa las líneas de crisis en riesgo alto | 9 | 5 | 4 | 6 | 5 | **29** |
| (d) Pérdida de datos clínicos sin respaldo (plan gratuito Supabase) | 10 | 3 | 2 | 10 | 3 | **28** |

> Prioridad de mitigación: (a), (c) y (e) por total alto; (b), (f) y (d) por daño crítico.

## 5. Decisiones / riesgos aceptados
- Sin 2FA en la primera versión (ADR-0005): riesgo residual aceptado, mitigado por validación contra BD FPV.
- Canal de contacto vía `wa.me` sin auditoría interna (ADR-0007): aceptado como decisión de costo.
- **Plan gratuito de Supabase sin respaldos automáticos** (ADR-0002): riesgo abierto, pendiente de decisión de la Federación (`<TODO — Human-in-the-Loop>`).
- Acceso del coordinador al contenido clínico: `<TODO — Human-in-the-Loop>`.
