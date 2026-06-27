# PRD — Flujo central de Sostén

> **Fase AI-DLC:** `01-requirements`  ·  **Estado:** aprobado para diseño
> **Autor:** equipo de desarrollo  ·  **Fecha:** 2026-06-27

## 1. Problema
Las personas afectadas por el terremoto necesitan apoyo psicológico y el gremio no tiene forma
eficiente de recibir solicitudes, detectar riesgo vital y conectar cada caso con un voluntario. Este
PRD describe el flujo completo de extremo a extremo, desde la solicitud hasta el cierre del caso.

## 2. Usuarios y actores
Solicitante, Psicólogo voluntario, Psicólogo verificador, Coordinador de turno, Federación/Admin
(ver `docs/00-project/glossary.md` para las definiciones).

## 3. Flujo principal (happy path)
1. **Solicitud.** El solicitante (o alguien en su nombre) completa el formulario dentro de la app:
   datos de contacto, tipo de necesidad, preguntas de triage de riesgo, modalidad preferida
   (presencial/distancia) y zona. El formulario tolera conexión intermitente (guardado local y
   reintento de envío).
2. **Triage.** El motor clasifica el caso de forma determinística en `riesgo_alto`,
   `riesgo_moderado` o `seguimiento` según las respuestas.
3. **Riesgo alto → líneas de crisis.** Si el triage marca riesgo alto, la app muestra de inmediato
   la pantalla con las líneas de crisis, **antes e independientemente** de cualquier intento de
   asignación. El caso se marca como urgente en el panel del coordinador.
4. **Riesgo moderado/seguimiento → asignación o cola.** El backend busca un psicólogo con
   especialidad y disponibilidad compatibles y genera la asignación. Si no hay disponibilidad
   inmediata, el caso entra en la cola visible con un mensaje honesto de espera (ver ADR-0008).
5. **Atención.** El psicólogo asignado se autentica, ve el caso, contacta al solicitante por el
   canal acordado (ver ADR-0007) y registra diagnóstico y notas clínicas en la plataforma.
6. **Coordinación.** El coordinador de turno revisa el panel general y prioriza el riesgo alto sin
   atender.
7. **Cierre.** Cuando el caso se resuelve, el psicólogo (o coordinador) lo marca como `cerrado`;
   queda archivado sujeto a la política de retención de la Federación.

## 4. Reglas de negocio
- Las líneas de crisis nunca dependen de que haya un voluntario disponible.
- Riesgo alto siempre primero en la cola; el resto, FIFO dentro de su categoría.
- El sistema comunica honestamente la saturación; no promete tiempos de respuesta.
- Un psicólogo solo ve y escribe notas de sus casos asignados.
- El alta de voluntarios es controlada (psicólogo verificador), no por autoregistro.

## 5. Escenarios de borde, abuso y riesgo
| Escenario | Comportamiento esperado del sistema |
|---|---|
| Alguien reporta **riesgo alto en nombre de un tercero** sin su consentimiento | El sistema igual muestra líneas de crisis y crea el caso; el contacto humano valida la situación. Se registra que la solicitud la hizo un tercero. El texto de consentimiento es `<TODO — Human-in-the-Loop>`. |
| **Voluntario no verificado** intenta registrarse como psicólogo | No hay autoregistro: el alta solo ocurre vía el psicólogo verificador. El intento no crea una cuenta activa. |
| **Saturación total de la cola** el primer día (300+ solicitudes) | La app mantiene la prioridad de riesgo alto, muestra mensaje honesto de espera al resto y expone el panel de capacidad al coordinador. |
| **Pérdida de conexión a mitad del formulario** | Los datos ingresados se guardan localmente; al recuperar señal, el envío se reintenta sin perder lo escrito. |
| **Riesgo alto sin coordinador mirando el panel** | Las líneas de crisis ya se mostraron; el resto es responsabilidad organizativa (turnos) de la Federación. |

## 6. Criterios de aceptación
- [ ] Un caso de riesgo alto muestra líneas de crisis antes de cualquier llamada de asignación.
- [ ] El triage clasifica de forma determinística y reproducible las mismas respuestas.
- [ ] Un caso sin voluntario disponible entra en cola con mensaje honesto y reaparición de líneas de crisis.
- [ ] El formulario recupera datos tras una pérdida de conexión.
- [ ] Un psicólogo no puede ver casos que no le fueron asignados.
- [ ] El coordinador ve todos los casos con prioridad visual del riesgo alto sin atender.

## 7. Fuera de alcance
- Canal de mensajería propio; esquema de turnos; política de retención; verificación de voluntarios
  (organización interna de la Federación).

## 8. Decisiones abiertas (Human-in-the-Loop)
- `<TODO — Human-in-the-Loop>` Texto de consentimiento informado mostrado antes de registrar datos.
- `<TODO — Human-in-the-Loop>` Umbral de tiempo de espera aceptable por categoría.
- `<TODO — Human-in-the-Loop>` Validación final de las preguntas de triage por un psicólogo del gremio.
