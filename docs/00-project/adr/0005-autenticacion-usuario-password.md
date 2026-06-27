# ADR-0005 — Autenticación usuario/contraseña

> **Fase AI-DLC:** `02-design`  ·  **Estado:** aceptada
> **Fecha:** 2026-06-27  ·  **Responsable:** equipo de desarrollo

## Contexto
Los psicólogos y coordinadores necesitan autenticarse para ver casos y registrar notas. El alta de
usuarios es controlada (vía psicólogo verificador, no autoregistro). Se busca lo suficiente para la
primera versión sin sobrecargar el timeline.

## Decisión
Autenticación con **usuario/contraseña**, contraseñas **hasheadas con bcrypt** (o equivalente), y
sesiones o JWT. Se deja explícitamente abierta la puerta a **2FA** en una iteración posterior.

## Alternativas consideradas
- **Usuario/contraseña con hash bcrypt** — suficiente y rápido de implementar. Elegida.
- **2FA desde el inicio** — descartada para la primera versión por costo/tiempo; planificada como mejora.
- **OAuth/SSO de terceros** — descartada: añade dependencia externa y complejidad innecesaria para un padrón cerrado de voluntarios.

## Consecuencias
- **Positivas:** rápida de construir; control de acceso por rol sobre una base simple.
- **Negativas / costos:** sin 2FA, una credencial comprometida da acceso directo; mitigado por alta controlada y, a futuro, 2FA.
- **Pendientes:** iteración futura para 2FA.
