# Decisiones de interpretación y desvíos frente al PRD (FPV)

> **Fase AI-DLC:** `01-requirements` · **Estado:** vivo · **Actualizado:** 2026-07-02
> **Fuente canónica:** `Documento de Requisitos de Producto (PRD).pdf` (FPV, "Sistema PPV 2026")
>
> **Propósito.** Consolidar en un solo lugar las decisiones que el equipo tomó donde el PDF es
> **ambiguo o silencioso**, las **sustituciones técnicas** (misma intención, otra tecnología), los
> **desvíos conscientes** del texto y el **contenido provisional** que la FPV debe definir. Así la
> Federación puede **validarlas o corregirlas** sin rastrearlas por ADRs, PRs y notas sueltas.
> Complementa la cobertura RF-a-RF de [`prd-cobertura-y-brechas.md`](prd-cobertura-y-brechas.md).

## Resumen de cambios recientes (2026-07-02)
Buena parte de lo que antes eran "desvíos por ajustar" ya está alineado, y el mayor pendiente técnico
(verificador FPV) dejó de ser un stub.

| Antes | Ahora |
|---|---|
| **FPV = dummy** que aprobaba todo; contrato de API pendiente | ✅ **`HttpFpvVerifier` real** (issue #6): cruza contra el padrón real (`validate` + `getProfile`), enrutado en dev/prod; dummy solo en tests. **Contrato entregado.** |
| Inactividad de sesión 15 min | ✅ **30 min** (issue #54) — alineado |
| Contraseña ≥ 8 | ✅ **≥ 12 con complejidad** (issue #53) — alineado |
| Signup de coordinador incompleto | ✅ **Nombres/Apellidos/Cédula/FPV/Teléfono** (issue #53) — alineado |
| Sesiones duplicadas no destruidas | ✅ **bump `token_version` + validación en middleware** (issue #54) — alineado |
| Método de contacto preferido en Verde no capturado | ✅ **capturado** (issue #52) — alineado |

## Decisiones de la FPV (2026-07-03)
La FPV revisó tres puntos que estaban como interpretación/provisional y los cerró:

- ✅ **Pesos del triage — VALIDADOS (decisión final).** La FPV **ratificó las cifras**: severidad
  **RED=100 / ORANGE=10 / YELLOW=1**, **duelo traumático=20**, **culpa del superviviente=15**,
  **ideación=1000** (dominante) y **hábito=1**. **Ya no son provisionales** (RF-1.3 / RF-1.5, ADR-0010).
- 🗑️ **RF-3.1 "clúster regional del afectado" — ELIMINADO.** La FPV retiró el requisito. Se **removió la
  preferencia regional del motor de asignación** (antes issue #51); la asignación queda por **riesgo +
  especialidad + presencia**. `cases.region` se conserva como ubicación capturada pero **deprecada para
  routing** (sin migración destructiva).
- 🗑️ **RF-3.3 "clúster de coordinadores" — ELIMINADO.** La escalada por SLA notifica a **los coordinadores**
  (sin clúster geográfico), que es exactamente lo ya implementado — deja de ser una interpretación abierta.
- ✅ **Consentimiento del solicitante — TEXTO OFICIAL entregado.** La FPV entregó el texto (emergencia/líneas
  de crisis, servicio gratuito y voluntario, terceros, confidencialidad absoluta); cargado en config
  (`consent.requester`, `v1.0.0-fpv`). El mecanismo no bloqueante sigue siendo nuestra decisión de diseño.

## A. El PDF es ambiguo o silencioso → interpretamos (decisiones de diseño)
Vacíos del texto que resolvimos con un criterio; la FPV puede ratificar o cambiar cada uno.

| Tema | Qué dice el PDF | Qué interpretamos |
|---|---|---|
| **Licencia FPV no activa** (RF-2.2.1) | "cruce contra padrón FPV" — no dice qué hacer si la persona está en el padrón pero su licencia **no** está activa | Solo `data.status === 'active'` **auto-activa**; hallada pero suspendida/inactiva → **revisión manual** (nunca auto-activar una licencia no vigente). Mapeo: cédula→`national_id`, nº FPV→`fpv` (ADR-0013, #6) |
| **Ruteo infantil** (RF-1.3, #50) | "priorice en la cola a profesionales… infantil" | **Preferencia por caso** al asignar, no reordenamiento global de la cola |
| **Consentimiento del solicitante** (#1) | El issue apunta a "sección 8 ética"; el PDF no traía texto literal para el solicitante | El **mecanismo** (aviso no bloqueante en cada pantalla) es nuestra decisión de diseño; el **texto ya es oficial de la FPV** (`v1.0.0-fpv`, 2026-07-03) |

## B. Sustituciones técnicas (misma intención, otra tecnología)

| Tema | PDF | Implementado | ADR / issue |
|---|---|---|---|
| **Presencia** (RF-2.5, #18) | Redis (genérico) | **Upstash Redis** por REST + fallback en memoria (dev/tests) | ADR-0014 |
| **Cifrado clínico** | SQLCipher (RF-4.1, offline del psicólogo) | **AES-256-GCM** por columna en el servidor (SQLCipher/offline es Módulo 4, fuera-MVP) | ADR-0004 |
| **Hashing de contraseñas** | sugiere `bcrypt` (factor 12) | **argon2id** | ADR-0005 |
| **Verificación FPV** (RF-2.2.1) | cruce contra padrón FPV | **`HttpFpvVerifier` real** (`validate` + `getProfile`, Circuit Breaker → `pending_approval`); dummy solo en tests | ADR-0013, #6 |
| **Notificación al voluntario** (RF-3.2) | push PWA + correo | **correo** (voluntarios, `SmtpNotifier`) + WhatsApp manual; **push diferido** (#29); el notificador de **asignación/SLA sigue en log** | ADR-0007 |

## C. Desvíos conscientes del texto explícito
Funcionalidad construida que se apartaba de la letra del PRD. **La mayoría ya se alineó**; quedan tres.

**Resueltos (alineados con el PDF):**
- ✅ Inactividad de sesión **30 min** (RF-2.7, #54).
- ✅ Contraseña **≥ 12 complejos** (RF-2.6.2, #53), aplicada también a cambio/reset.
- ✅ **Campos del signup de coordinador** (RF-2.6.2, #53): Nombres, Apellidos, Cédula, FPV (opcional), Teléfono.
- ✅ **Destrucción de sesiones duplicadas en caliente** (RF-2.7, #54).
- ✅ **Método de contacto preferido en Verde** (RF-1.3 P2, #52).
- ✅ **Edad en Rama Roja** (RF-1.2.2/1.2.3).

**Abiertos:**
- ⚠️ **Bandera de seguimiento a 5 días** por ideación suicida (RF-4.2.4) — hoy se **audita el evento**; falta el **plazo programado** para notificar a los coordinadores.
- 🔵 **argon2id vs. bcrypt** (RF-2.6.2) — desvío **consciente**, se mantiene (ADR-0005).

> Nota: el desvío del `colegio` como texto libre (RF-2.1.2) dejó de ser relevante al eliminarse el clúster
> regional (RF-3.1); ya no hay match por región que dependa de él.

## D. Regla que el PDF vigente NO pide
- **Bloqueo de diagnóstico de TEPT < 4 semanas.** Regla de **seguridad clínica propia** (heredada de una
  versión anterior del PRD). En este PDF, **RF-4.3 es el interruptor de disponibilidad**, no este bloqueo.
  Se mantiene implementada por su valor clínico y queda anotada como interpretación propia.

## E. Contenido provisional pendiente de la FPV (Human-in-the-Loop)
- ✅ **Contrato de la API FPV — ENTREGADO** e implementado (#6). *Pendiente (no de código):* validar con
  **datos reales** del padrón y **provisionar/rotar el token** de producción (`FPV_API_TOKEN`).
- **Guías PAP** (`v0.1.0-draft`, #22).
- **Plan de Supabase y respaldos** (NFR 6.2 exige respaldo cada 6 h; el plan gratuito no lo cumple — ADR-0002).

> ✅ **Pesos/umbrales de tags clínicos (RF-1.3 / RF-1.5) — VALIDADOS por la FPV el 2026-07-03** (ver arriba);
> salen de esta lista de pendientes.

## Cómo mantener este documento
Al cerrar una interpretación (la FPV la ratifica o la corrige), mover el ítem a su estado final y
reflejarlo en `CHANGELOG.md` y en [`prd-cobertura-y-brechas.md`](prd-cobertura-y-brechas.md). Cada
sustitución técnica debe apuntar a su ADR.
