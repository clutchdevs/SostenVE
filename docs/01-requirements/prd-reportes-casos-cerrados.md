# PRD — Reportes de casos cerrados

> **Fase AI-DLC:** `01-requirements`  ·  **Estado:** aprobado
> **Autor:** equipo de desarrollo  ·  **Fecha:** 2026-07-21
> **Origen:** solicitud de la FPV  ·  **Decisiones de alcance:** ver [ADR-0017](../00-project/adr/0017-reportes-casos-cerrados.md)

## 1. Problema

La Federación no tiene forma de revisar los casos ya atendidos. Hoy `/coordinador/reportes` solo muestra
el **estado de la cola en este momento**, y los casos cerrados se pueden ver únicamente **de a uno**. No
existe descarga de ningún tipo, así que la FPV no puede analizar la operación, medir el servicio ni rendir
cuentas a terceros.

## 2. Usuarios y actores

| Actor | Qué hace |
|---|---|
| **Coordinador** | Consulta el reporte de casos cerrados, filtra y descarga el CSV. |
| **Admin** | Igual que el coordinador. |
| **Psicólogo** | **No** accede al reporte global (sigue viendo solo sus casos). |
| **FPV (institución)** | **Titular y responsable del tratamiento de estos datos.** Solicitó el reporte, definió su alcance, otorga y revoca el acceso invitando coordinadores, y asume la custodia y el uso de la información descargada (ver ADR-0017). |

## 3. Flujo principal (happy path)

1. Un coordinador entra a **Reportes → Casos cerrados**.
2. Ve el **disclaimer de confidencialidad** (servido desde config, versionado) junto al contenido.
3. Aplica filtros: rango de fechas de cierre, nivel de riesgo, psicólogo asignado, motivo de cierre, tipo
   de derivación.
4. Ve la tabla paginada con una fila por caso cerrado y los campos del cierre.
5. Pulsa **Descargar CSV** y obtiene el mismo conjunto filtrado como archivo.
6. La consulta y la descarga quedan **registradas en la bitácora de auditoría**.

## 4. Reglas de negocio

- **R1.** El reporte incluye **solo casos en estado cerrado**.
- **R2.** Los campos del cierre se reproducen **tal como están guardados**, sin filtrar ni omitir ninguno
  (incluye `comentario`). Decisión de la FPV — ver ADR-0017.
- **R3.** **No se incluyen** los campos estructurados de identidad del solicitante (nombre, teléfono),
  manteniendo la política del issue #25.
- **R4.** El acceso se limita a **coordinador y admin**. Un psicólogo recibe `403`.
- **R5.** **Cada consulta y cada descarga se auditan**: quién, cuándo, qué filtros y cuántas filas.
- **R6.** El CSV se emite con **BOM UTF-8** para que Excel en `es-VE` muestre bien los acentos.
- **R7.** La descarga respeta exactamente los mismos filtros que la vista (lo que ves es lo que bajas).
- **R8.** El disclaimer se sirve desde configuración versionada; **no se hardcodea**.
- **R9.** El disclaimer debe declarar explícitamente que **la Federación es la responsable** de estos datos:
  otorga y revoca el acceso, y la custodia de lo descargado queda en su ámbito. El sistema aporta los
  controles técnicos y la trazabilidad, no la responsabilidad sobre el uso posterior de la información.

## 5. Escenarios de borde, abuso y riesgo

| Escenario | Comportamiento esperado del sistema |
|---|---|
| Un psicólogo llama al endpoint del reporte directamente | `403`; solo ve sus propios casos. |
| Un usuario sin sesión llama al endpoint | `401`. |
| Un coordinador con sesión revocada (token viejo) | `401` por validación de versión de token (RF-2.7). |
| **Descarga masiva repetida** (exfiltración) | Se permite pero **queda auditada cada vez**; la auditoría es la contramedida y la FPV puede revocar la invitación. |
| El `comentario` contiene identidad escrita por el psicólogo | **Se muestra tal cual** (R2). Riesgo aceptado y declarado en el disclaimer; mitigado por acceso por invitación + auditoría. |
| Filtro con rango de fechas enorme / sin filtros | Se pagina; el CSV se genera en streaming para no cargar todo en memoria. |
| No hay casos cerrados que cumplan el filtro | Tabla vacía con mensaje claro; el CSV se descarga solo con encabezados. |
| Caso cerrado administrativamente por un coordinador | Aparece en el reporte, distinguible por su motivo de cierre. |
| Caso cerrado sin contacto con el solicitante | Aparece con `contacto = false` y su motivo de no contacto. |

## 6. Criterios de aceptación

- [ ] Un coordinador lista casos cerrados y ve los campos del cierre tal como se guardaron.
- [ ] Los filtros (fechas, riesgo, psicólogo, motivo de cierre, derivación) funcionan y son combinables.
- [ ] La descarga CSV entrega exactamente el conjunto filtrado, legible en Excel con acentos correctos.
- [ ] La salida **no contiene** nombre ni teléfono del solicitante.
- [ ] Un psicólogo recibe `403`; sin sesión, `401`.
- [ ] Cada consulta y descarga aparece en la bitácora de auditoría con sus filtros y número de filas.
- [ ] El disclaimer se muestra en la sección y proviene de configuración versionada.
- [ ] Tests cubren: permisos por rol, ausencia de los campos de identidad, y el registro de auditoría.

## 7. Fuera de alcance

- Gráficas o tableros analíticos (esta entrega es tabla + descarga).
- Exportación a PDF o Excel nativo (`.xlsx`); se entrega **CSV**.
- Reportes programados o envío por correo.
- Identidad del solicitante en el reporte (requeriría decisión y base legal distintas — ADR-0017).
- Política general de retención de datos, que sigue como decisión abierta.

## 8. Decisiones abiertas (Human-in-the-Loop)

- `<TODO — Human-in-the-Loop>` **Redacción final del disclaimer** por la FPV. Se publica como
  `v0.1.0-draft` hasta su aprobación.
- `<TODO — Human-in-the-Loop>` **Política de retención** de datos clínicos y de los archivos exportados
  (pendiente general en `data-classification.md`; no bloquea esta entrega).
