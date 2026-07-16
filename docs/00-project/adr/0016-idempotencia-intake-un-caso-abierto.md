# ADR-0016 — Idempotencia del intake: un único caso abierto por persona

> **Fase AI-DLC:** `02-design`  ·  **Estado:** aceptada
> **Fecha:** 2026-07-16  ·  **Responsable:** equipo de desarrollo
> **Relacionada:** ADR-0011 (seudonimización PII). Issue #148.

## Contexto
Durante QA se reportó un error 500 recurrente en el intake: reenvíos del formulario (offline-first con
reintento, doble toque, recarga) generaban **claves duplicadas** al insertar el caso, o creaban **múltiples
casos abiertos para la misma persona**. El intake es **offline-first** (guarda el borrador y reintenta al
recuperar conexión), por lo que un mismo envío puede llegar más de una vez de forma legítima; el sistema debe
tratar esos reintentos como el **mismo** caso, no como casos nuevos.

## Decisión
Hacer el intake **idempotente por persona** apoyándose en un identificador determinístico y una restricción de
BD:

- **`pseudonym_id` determinístico:** HMAC del teléfono normalizado (`+58…`) con salt del servidor (alineado con
  la seudonimización de ADR-0011). El mismo teléfono produce siempre el mismo `pseudonym_id`.
- **Un caso abierto por persona:** índice único **parcial** sobre `pseudonym_id` `WHERE status <> 'cerrado'`
  (migración 023). Garantiza a nivel de BD que no coexistan dos casos no cerrados de la misma persona, pero
  **permite** abrir un caso nuevo una vez que el anterior se cerró (una persona puede volver a pedir ayuda).
- **`create` idempotente:** ante la violación de unicidad (`23505`), el repositorio **devuelve el caso abierto
  existente** en lugar de propagar el error — el reintento resuelve al mismo caso y la respuesta es estable.

## Alternativas consideradas
- **Índice parcial + create idempotente (elegida)** — corrige la causa raíz a nivel de datos; los reintentos
  offline-first son seguros; respeta que una persona pueda reabrir tras un cierre.
- **Deduplicación solo en aplicación (buscar antes de insertar)** — sujeta a condiciones de carrera bajo
  reintentos concurrentes; sin la restricción de BD, dos inserciones simultáneas podrían pasar ambas.
- **Clave de idempotencia por request (token del cliente)** — protege del doble envío inmediato, pero no del
  requisito de negocio "un solo caso abierto por persona" a lo largo del tiempo. Complementaria, no sustituta.
- **Permitir múltiples casos abiertos y fusionarlos luego** — traslada complejidad al coordinador y contradice
  el modelo de "un caso vivo por solicitante".

## Consecuencias
- **Positivas:** desaparece el 500 por clave duplicada; los reintentos son seguros e idempotentes; la unicidad
  queda garantizada por la BD, no solo por convención; se preserva la reapertura legítima tras el cierre.
- **Negativas / límites:** la identidad se ancla al **teléfono**; un mismo solicitante con dos números tendría
  dos casos (aceptado — el teléfono es la clave de contacto operativa). El `pseudonym_id` es único por caso
  abierto, no globalmente, por diseño.
