# ADR-0007 — Canal de notificación al voluntario (WhatsApp manual)

> **Fase AI-DLC:** `02-design`  ·  **Estado:** aceptada para la primera versión
> **Fecha:** 2026-06-27  ·  **Responsable:** equipo de desarrollo

## Contexto
Tras una asignación, el psicólogo debe ser avisado y contactar al solicitante. No hay presupuesto
para WhatsApp Business API ni para construir un canal de mensajería propio (fuera de alcance). Se
necesita una solución de costo cero para esta fase.

## Decisión
Usar **WhatsApp vía link `wa.me`** con mensaje precargado (sin API de pago) como mecanismo de
contacto/notificación de la primera versión. Se documenta que es una decisión de **costo**, no de
seguridad, y que un canal con mejor auditoría podría reemplazarlo más adelante.

## Alternativas consideradas
- **Link `wa.me` con mensaje precargado** — costo cero, inmediato. Elegida para la primera versión.
- **WhatsApp Business API** — descartada: costo no asumible en esta fase.
- **Correo electrónico** — válido como complemento/respaldo de notificación interna; menos inmediato que WhatsApp en el contexto local.
- **Canal de mensajería propio** — fuera de alcance.

## Consecuencias
- **Positivas:** sin costo; aprovecha una herramienta ya ubicua entre los usuarios.
- **Negativas / costos:** sin auditoría ni trazabilidad del mensaje dentro de la plataforma; el contenido del contacto queda fuera del sistema.
- **Pendientes:** evaluar un canal auditable en una iteración posterior.
