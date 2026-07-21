# ADR-0017 — Reportes de casos cerrados: alcance, formato y disclaimer

> **Fase AI-DLC:** `02-design`  ·  **Estado:** aceptada
> **Fecha:** 2026-07-21  ·  **Responsable:** equipo de desarrollo + FPV (Human-in-the-Loop)

## Contexto

La Federación solicitó acceso a los reportes de los casos cerrados y la capacidad de **descargar la
información de los casos**. Hoy esa necesidad no está cubierta:

- La vista `/coordinador/reportes` solo consume `GET /coordinator/capacity`, que es una **foto operativa
  de la cola en este momento** — no hay histórico ni casos cerrados.
- **No existe ninguna capacidad de exportación** en el sistema.
- Los casos cerrados solo pueden consultarse **de a uno** con `GET /cases/:id`.

El dato, en cambio, ya existe y es rico: cada cierre clínico (`case_closures`) registra contacto, motivo
de no contacto, sexo, destinatario, síntomas, otro síntoma, medio de contacto, técnicas aplicadas, motivo
de cierre, tipo y destinos de derivación, **minutos de atención** y comentario.

Dos restricciones previas condicionan el diseño:

1. **ADR/decisión del issue #25 (HITL FPV):** coordinadores y admin tienen acceso clínico **auditado y sin
   los campos de identidad del solicitante** — en `getCaseForCoordinator` el contacto es siempre `null`.
2. **`data-classification.md`** clasifica diagnóstico, notas clínicas y nivel de riesgo como
   **Restringido**, y nombre y teléfono del solicitante como **Sensible**.

Un hecho de gobernanza resuelve la pregunta de "quién puede ver esto": **los coordinadores entran por
invitación de la Federación** (`POST /admin/coordinators/invitations`). Es decir, la FPV **otorga y revoca
el acceso, y es consciente de a quién se lo da**. El control de acceso ya está resuelto por diseño; no hace
falta un mecanismo de permisos adicional.

## Decisión

1. Se expone un **reporte de casos cerrados** a los roles **coordinador y admin**, con **detalle por caso**.
2. El reporte reproduce los campos del cierre **tal como fueron guardados en la base de datos**. **No se
   filtra ni se omite ningún campo del cierre**, incluido `comentario` (texto libre) — decisión explícita
   de la FPV: si van a ver el reporte, quieren el dato como está.
3. **No se incluyen los campos estructurados de identidad del solicitante** (nombre, teléfono). Se mantiene
   sin cambios la política del issue #25.
4. **Formato:** JSON paginado para la vista + descarga en **Excel con formato** (`.xlsx`) como opción
   principal — encabezado fijo, anchos por columna y tipos reales de fecha/número, para que se pueda
   ordenar y filtrar sin limpiar el archivo a mano — y **CSV** con BOM UTF-8 como alternativa plana para
   importar a otras herramientas (el BOM evita que Excel en `es-VE` rompa los acentos).
7. **Los códigos se traducen a etiquetas legibles** (`finalizado` → "Proceso finalizado (objetivos
   cumplidos)"). Es un reporte que lee un psicólogo, no un volcado de base de datos; un código aún no
   catalogado se humaniza en lugar de mostrarse crudo.
8. **La modalidad es una constante del servicio** (`service.modality: distancia`), no un dato del
   solicitante: la atención siempre fue 100 % remota, el formulario nunca envió el campo y todos los casos
   quedaron en `NULL`. El intake la estampa desde configuración y una migración rellena el histórico, para
   que la columna del reporte diga la verdad en vez de aparecer vacía.
5. **Toda consulta y toda descarga se registran en la bitácora de auditoría** (quién, cuándo, qué filtros,
   cuántas filas), con el mismo criterio que la lectura clínica del #25.
6. El **disclaimer de confidencialidad** vive en `app.config.yml` (versionado con `version`/`updated_at`) y
   se sirve por endpoint, siguiendo el patrón de los demás textos oficiales de la FPV. **No se hardcodea en
   el frontend**, para que la Federación pueda ajustar la redacción sin cambio de código y quede registro
   de qué texto estuvo vigente.

## Responsabilidad sobre los datos (titularidad)

Queda constancia expresa de que **la Federación Psicológica de Venezuela es la titular y responsable del
tratamiento de esta información**:

- **La FPV solicitó este reporte** y es quien necesita los datos para su gestión, control de calidad e
  investigación institucional.
- **La FPV define el alcance:** la decisión de exponer el cierre **tal como fue registrado, sin excluir
  ningún campo** (incluido el texto libre de `comentario`) es suya, tomada con conocimiento de que el
  sistema no puede garantizar la ausencia de datos identificables en campos libres.
- **La FPV controla el acceso:** otorga y revoca la condición de coordinador mediante el flujo de
  invitaciones, y por tanto **decide y conoce quién puede consultar y descargar** esta información.
- **La FPV asume la custodia posterior:** una vez descargado el archivo, la información sale del perímetro
  de controles del sistema (cifrado, control de acceso, auditoría). Su resguardo, uso, distribución y
  eliminación son responsabilidad de la Federación y de la persona que realiza la descarga.

**El rol del equipo de desarrollo** se limita a: implementar los controles técnicos acordados (restricción
por rol, exclusión de los campos estructurados de identidad, auditoría de cada consulta y descarga),
**advertir los riesgos** —hecho en este ADR, en el PRD y en el modelo de amenazas— y **mostrar el
disclaimer** en el punto de uso. El equipo **no asume responsabilidad sobre el tratamiento que la
Federación dé a los datos exportados**.

## Alternativas consideradas

- **Excluir `comentario` del export** — propuesta por el equipo por ser el único campo del que el sistema
  no puede garantizar ausencia de identidad. **Descartada por la FPV:** quieren el reporte tal como se
  guardó, sin campos ocultos.
- **Solo agregados/estadísticas** (conteos, promedios, distribuciones) — menor riesgo, pero **insuficiente**
  para la necesidad planteada (revisar la información de los casos).
- **Incluir la identidad del solicitante** — **rechazada**: contradice la política del #25, cambiaría la
  clasificación de la salida y exigiría una base legal distinta y una revisión del modelo de amenazas.
- **Hardcodear el disclaimer en la UI** — descartada: impide que la FPV ajuste el texto y no deja versión
  trazable de qué se mostró.

## Consecuencias

- **Positivas:**
  - La Federación obtiene la información real de los casos cerrados, sin capturar ningún dato nuevo.
  - Reutiliza datos y patrones existentes (auditoría, textos versionados en config, roles).
  - El acceso ya está gobernado por el flujo de invitaciones que la FPV controla.

- **Negativas / costos (aceptados conscientemente):**
  - `comentario` es **texto libre escrito por el psicólogo** y **puede contener identidad o detalle
    sensible**; el sistema **no puede garantizar su ausencia**. Se mitiga con: acceso solo por invitación
    de la FPV, auditoría de cada consulta y descarga, y el disclaimer explícito en el punto de uso.
  - Aparece un **vector nuevo de exfiltración masiva**: hasta hoy el peor caso era leer un caso; con la
    descarga es obtener **todos** los casos cerrados en un archivo. Se refleja en `threat-model.md`.
  - Al descargarse, la información **sale del perímetro de controles** del sistema (cifrado en reposo,
    control de acceso, auditoría). La custodia pasa a quien descarga, y así se declara en el disclaimer.

- **Pendientes (Human-in-the-Loop):**
  - Política general de **retención** de datos clínicos y de los archivos exportados
    (`<TODO — Human-in-the-Loop>` en `data-classification.md`). No bloquea este feature.
  - **Redacción final del disclaimer** por parte de la FPV; se publica como `v0.1.0-draft` hasta su
    aprobación, igual que se hizo con las guías de PAP.
