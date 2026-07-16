# ADR-0015 — SLA de aceptación event-driven, con el Vercel Cron diario como respaldo

> **Fase AI-DLC:** `02-design`  ·  **Estado:** aceptada
> **Fecha:** 2026-07-16  ·  **Responsable:** equipo de desarrollo
> **Relacionada:** ADR-0009 (Vercel serverless), ADR-0014 (presencia), ADR-0008 (cola). Issues #159, #130.

## Contexto
El PRD (RF-3.3) exige un **SLA de aceptación**: si un caso de riesgo alto no es aceptado por el psicólogo
asignado dentro de la ventana (10 min), debe **escalarse** y no quedarse esperando indefinidamente a alguien
ausente. Un cron persistente que barra la BD "cada 1–2 min" resolvería esto de forma natural, pero el
proyecto corre **serverless en el plan gratuito de Vercel** (ADR-0009), que **solo permite un Cron Job y una
única corrida al día**. Un barrido diario es insuficiente como único mecanismo para un SLA de minutos.

## Decisión
Resolver el SLA de forma **event-driven**, apoyándonos en la presencia en vivo (ADR-0014) en lugar de en un
proceso periódico de alta frecuencia:

- **Disparador principal (evento):** cuando un psicólogo pasa de offline a **online** (transición detectada en
  el manejador de latido/presencia), se ejecuta `processQueue`, que:
  1. **Escala** los casos de riesgo alto cuyo SLA venció sin aceptación (los devuelve a la cola), capturando el
     asignado previo antes de liberar la asignación; y
  2. **reasigna cada caso a otro voluntario disponible** distinto del que no aceptó (`excludeByCase`),
     **renovando la ventana de SLA** solo para esos casos de alto riesgo reasignados.
- **Respaldo (backstop):** el **único Vercel Cron** (`/api/v1/cron/check-sla`, 1 vez/día) hace el mismo barrido
  como red de seguridad ante períodos sin conexiones de psicólogos.
- **Liberación por pausa (#130):** si un psicólogo entra en pausa con un caso asignado y **no aceptado**, ese
  caso vuelve a la cola de inmediato, sin esperar al vencimiento del SLA.

El disparo se limita a la **transición** offline→online (no en cada latido) para no repetir el barrido cada
30–60 s por cada psicólogo conectado.

## Alternativas consideradas
- **Event-driven + cron diario de respaldo (elegida)** — respeta el límite del plan free, cubre el caso real
  (un caso escala cuando aparece capacidad para reasignarlo) y mantiene el sistema stateless.
- **Barrido en cada latido de presencia** — se implementó primero y se **descartó**: repite el trabajo cada
  pocos segundos por cada psicólogo en línea, sin beneficio sobre disparar solo en la transición.
- **Vercel Cron de alta frecuencia (cada 1–2 min)** — la solución "de manual", pero **inviable en el plan
  gratuito** (1 corrida/día). Requeriría plan pago o un proceso persistente, en contra de ADR-0006/0009.
- **Worker/proceso persistente externo** — descartado: reintroduce infraestructura que se mantiene y contradice
  el estilo serverless (ADR-0009).

## Consecuencias
- **Positivas:** SLA funcional dentro del plan gratuito; sin proceso persistente; la reasignación aprovecha el
  momento exacto en que aparece un voluntario disponible; un caso nunca vuelve al mismo psicólogo que no aceptó.
- **Negativas / límites:** si **ningún** psicólogo se conecta durante un tramo, el escalamiento efectivo espera
  al cron diario. Es un riesgo aceptado dado el patrón de uso (voluntarios entrando/saliendo a lo largo del día)
  y el límite de infraestructura; se puede reforzar migrando a un cron más frecuente si se pasa a plan pago.
- **Migración:** el barrido comparte la misma lógica (`escalateOverdueCases` + `assignPendingCases` con
  `excludeByCase`) para el disparo por evento y para el cron, evitando divergencia de comportamiento.
