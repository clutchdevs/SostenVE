# Modelo de amenazas — Proyecto Sostén

> **Fase AI-DLC:** `02-design`  ·  **Método:** STRIDE + priorización DREAD
> **Estado:** propuesta  ·  **Fecha:** 2026-06-27

## 1. Alcance y activos a proteger
- **Notas clínicas y diagnóstico** (dato restringido) — el activo más sensible.
- **Nivel de riesgo detectado** (restringido).
- **Datos de contacto** del solicitante y del voluntario (sensible).
- **Credenciales** de psicólogos/coordinadores.
- **Disponibilidad del servicio** ante el volumen del primer día.

Componentes en alcance: formulario, API de triage, base de datos, panel de psicólogo, panel de
coordinador.

> **Nota:** no se modelan amenazas del repo de referencia que aquí **no aplican** (face-match,
> biometría, suplantación por imagen): este dominio no usa biometría.

## 2. Diagrama de flujo de datos
Ver `docs/architecture/c4-container.md` y `c4-component-triage.md`.

## 3. Análisis STRIDE
| Categoría | Amenaza | Componente | Mitigación |
|---|---|---|---|
| **S**poofing | Alguien se hace pasar por un psicólogo verificado | Auth / panel psicólogo | Alta solo vía verificador (ADR-0005), contraseñas hasheadas, sesiones; a futuro 2FA |
| **T**ampering | Modificación de notas clínicas o del nivel de riesgo | API / BD | Control de acceso por rol; solo el autor escribe sus notas; integridad de BD |
| **R**epudiation | Un usuario niega haber escrito/leído una nota | API / BD | Registro de autor y fecha en cada nota; logs de acceso a datos restringidos |
| **I**nformation disclosure | Exposición de diagnóstico/notas por acceso insuficiente o volcado de BD | BD / paneles | Cifrado en reposo por columna (ADR-0004), HTTPS, acceso por rol, paneles que no muestran clínico por defecto |
| **D**enial of service | Saturación por el volumen del primer día (300+/día) o abuso del formulario | Formulario / API | Cola con prioridad (ADR-0008), rate limiting, mensaje honesto; dimensionamiento del hosting |
| **E**levation of privilege | Un psicólogo accede a casos ajenos o a funciones de admin | API / autorización | Autorización estricta por rol y por propiedad del caso; separación clara de rol administrador |

## 4. Priorización DREAD
Escala 0-10 por factor; total = suma (máx. 50). Se listan las amenazas más relevantes a este dominio.

| Amenaza | Damage | Reproducibility | Exploitability | Affected | Discoverability | Total |
|---|---|---|---|---|---|---|
| (a) Exposición de diagnóstico/notas por control de acceso insuficiente | 10 | 6 | 5 | 9 | 5 | **35** |
| (b) Suplantación de un psicólogo no verificado | 9 | 5 | 5 | 8 | 4 | **31** |
| (d) Pérdida de datos clínicos sin respaldo | 10 | 3 | 2 | 10 | 3 | **28** |
| (c) Denegación de servicio por el volumen del primer día | 6 | 8 | 6 | 7 | 7 | **34** |

> Prioridad de mitigación: (a) y (c) primero por total alto; (b) y (d) por daño crítico aunque menos
> reproducibles.

## 5. Decisiones / riesgos aceptados
- Sin 2FA en la primera versión (ADR-0005): riesgo residual aceptado, mitigado por alta controlada.
- Canal de contacto vía `wa.me` sin auditoría interna (ADR-0007): aceptado como decisión de costo.
- Acceso del coordinador al contenido clínico: `<TODO — Human-in-the-Loop>` (define la Federación).
