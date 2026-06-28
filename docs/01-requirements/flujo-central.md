# PRD — Flujo central de Sostén (Sistema PPV 2026)

> **Fase AI-DLC:** `01-requirements`  ·  **Estado:** aprobado para diseño
> **Autor:** equipo de desarrollo, sobre el PRD "Sistema PPV 2026" de la Federación
> **Fecha:** 2026-06-27 (reescrito 2026-06-28 — ver ADR-0010)

Este documento refleja el flujo del PRD de la Federación, que **reemplaza** el flujo original de
"formulario con 4 preguntas". El cambio de enfoque está registrado en
[`../00-project/adr/0010-triage-prd-federacion.md`](../00-project/adr/0010-triage-prd-federacion.md).

## Fuera de alcance del MVP
Confirmado fuera del MVP (Fase 2 o Fase 3 según se indique):
- **Webhook de Rescate Activo (RF-3.4)** — **Fase 3**, no se construye en el MVP.
- **Notificaciones push de la PWA** — en MVP la notificación al voluntario es por **correo electrónico** (ver ADR-0007 para el canal de contacto al solicitante).
- **Notas confidenciales del coordinador sobre voluntarios** — Fase 2.
- **Geo-clustering avanzado** — Fase 2.
- **Analizador léxico-semántico (RF-1.4)** — Fase 2 (documentado aquí como parte de la Rama Roja).

## 1. Módulo 1 — Intake y triage (baja fricción)

### 1.1 Pantalla única Likert
La persona entra a una **pantalla única** con una pregunta tipo Likert, **sin pedir datos
personales primero**. Según la respuesta, el sistema bifurca en **Rama Roja** o **Rama Verde**.

### 1.2 Rama Roja (riesgo alto)
Despliegue inmediato de apoyo, **antes e independientemente** de cualquier asignación. Tres
sub-canales a elección de la persona:
1. **Llamar yo mismo** — con **ruteo dinámico de línea de crisis por hora** (RF-1.2.1): el sistema
   muestra el número correcto según la hora del sistema (cobertura horaria de cada línea).
2. **Recibir una llamada**.
3. **WhatsApp silencioso** (contacto discreto).

La pantalla de líneas de crisis debe poder mostrarse **desde el cliente sin depender de la latencia
del backend** (números cacheados localmente), por el riesgo de cold-start serverless (ver
`../02-design/threat-model.md` y ADR-0009).

### 1.3 Rama Verde (resto de casos)
Formulario **conversacional** que recoge **tags clínicos táctiles** con peso. El score de urgencia
ponderado resultante define la prioridad.

### 1.4 Tags clínicos por severidad
> Categorías clínicas tomadas del PRD de la Federación; no se alteran. Los **pesos/umbrales finales
> los valida un psicólogo de la FPV** (`<TODO — Human-in-the-Loop>`, ver ADR-0010).

| Severidad | Significado | Peso relativo |
|---|---|---|
| **Rojo** | Señal de riesgo vital (ideación suicida, brote psicótico) | Máximo |
| **Naranja** | Señal de alta angustia sin riesgo vital inmediato | Alto |
| **Amarillo** | Malestar que requiere apoyo no urgente | Moderado |

### 1.5 Regla de interrupción y reenrutamiento
- **1 tag rojo** → escalar de inmediato a **Rama Roja**.
- **3+ tags naranja** → escalar a **Rama Roja**.

## 2. Módulo 2 — Registro y validación de psicólogos
- El voluntario se registra en la plataforma.
- **Validación automática contra la BD de la FPV**: el sistema verifica que el voluntario esté en el
  padrón de la Federación antes de habilitarlo. No hay autoregistro abierto que active una cuenta sin
  esta validación.

## 3. Módulo 3 — Asignación, SLA y escalamiento
1. Un caso clasificado entra al motor de asignación (riesgo alto primero; resto por orden de llegada
   dentro de su categoría — ver ADR-0008).
2. **SLA de 10 minutos (RF-3.2):** desde que un caso de riesgo alto queda disponible, un voluntario
   tiene 10 minutos para presionar **"Aceptar caso"**.
3. **Escalamiento automático (RF-3.3):** si nadie acepta en 10 minutos, el sistema escala. El
   temporizador **no** vive en memoria: un **Vercel Cron Job** revisa la BD cada 1-2 minutos y
   dispara el escalamiento (ver ADR-0009).
4. **Webhook de Rescate Activo (RF-3.4):** **fuera del MVP — diseño de Fase 3.**

## 4. Reglas de negocio (invariantes)
- Las líneas de crisis nunca dependen de que haya un voluntario disponible (principio no negociable del charter).
- Riesgo alto siempre primero; el resto FIFO dentro de su categoría.
- El sistema comunica honestamente la saturación; no promete tiempos de respuesta.
- Un psicólogo solo ve y escribe notas de sus casos asignados.
- El alta de voluntarios pasa por la validación automática contra la BD de la FPV.

## 5. Escenarios de borde, abuso y riesgo
| Escenario | Comportamiento esperado |
|---|---|
| Reporte de **riesgo alto en nombre de un tercero** | Se muestran líneas de crisis y se crea el caso; el contacto humano valida. Texto de consentimiento: `<TODO — Human-in-the-Loop>`. |
| **Voluntario no verificado** intenta registrarse | La validación contra la BD de la FPV no lo habilita; no se activa cuenta. |
| **Saturación** el primer día (300+ solicitudes) | Prioridad de riesgo alto; mensaje honesto de espera; panel de capacidad para el coordinador. |
| **Pérdida de conexión** a mitad del formulario | Datos guardados localmente; reintento de envío sin perder lo escrito. |
| **Cold-start** del backend al mostrar líneas de crisis | Las líneas se muestran desde caché del cliente, sin esperar al backend. |
| **SLA vencido** sin voluntario que acepte | El cron job detecta el caso > 10 min y dispara el escalamiento automático. |

## 6. Criterios de aceptación
- [ ] La pantalla Likert bifurca correctamente en Rama Roja / Rama Verde.
- [ ] 1 tag rojo o 3+ naranja escalan a Rama Roja.
- [ ] La línea de crisis mostrada corresponde a la hora del sistema (ruteo dinámico).
- [ ] Un caso de riesgo alto sin aceptar en 10 min se escala automáticamente vía cron job.
- [ ] El registro de un voluntario se valida contra la BD de la FPV.
- [ ] Las líneas de crisis se muestran aun con el backend frío.

## 7. Decisiones abiertas (Human-in-the-Loop)
- `<TODO — Human-in-the-Loop>` Pesos/umbrales finales de los tags clínicos (valida la FPV).
- `<TODO — Human-in-the-Loop>` Texto de consentimiento informado.
- `<TODO — Human-in-the-Loop>` Umbral de tiempo de espera aceptable por categoría.
