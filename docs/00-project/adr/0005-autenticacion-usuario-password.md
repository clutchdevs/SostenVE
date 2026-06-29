# ADR-0005 — Autenticación usuario/contraseña

> **Fase AI-DLC:** `02-design`  ·  **Estado:** aceptada
> **Fecha:** 2026-06-27 (actualizado 2026-06-28 — algoritmo y JWT fijados en Bloque 1.5)
> **Responsable:** equipo de desarrollo

## Contexto
Los psicólogos y coordinadores necesitan autenticarse para ver casos y registrar notas. El alta de
usuarios es controlada (vía psicólogo verificador, no autoregistro). Se busca lo suficiente para la
primera versión sin sobrecargar el timeline. Al implementar la seguridad transversal de API
(Bloque 1.5) se fija el algoritmo de hashing y el esquema de JWT exactos.

## Decisión
Autenticación con **usuario/contraseña** y **JWT**. Se deja explícitamente abierta la puerta a
**2FA** en una iteración posterior.

- **Hashing de contraseñas: argon2id** vía `@node-rs/argon2` (binarios prebuilt, sin node-gyp).
  Parámetros explícitos y documentados (no defaults sin revisar): `memoryCost = 19456 KiB (~19 MiB)`,
  `timeCost = 2`, `parallelism = 1` (guía OWASP para argon2id). Tunables como decisión documentada.
- **JWT con `jose`** (pure JS, Node+Edge). Access token corto
  (`security.jwt.access_token_ttl_minutes`, 15 min) + refresh token separado
  (`refresh_token_ttl_days`, 7 días). Algoritmo HS256 con `JWT_SECRET` (solo en variables de entorno).
- **Revocación:** por **token version** (al pasar un voluntario a `Inactivo` se incrementa su versión
  y los tokens previos dejan de validar) y por **denylist de `jti`** para revocación inmediata. En
  producción serverless ambos requieren un store compartido (Supabase/Upstash), cableado en un bloque
  posterior.

## Alternativas consideradas
- **argon2id (elegida)** — estándar actual recomendado (OWASP) para hashing de contraseñas; resistente a GPU/ASIC.
- **bcrypt/bcryptjs** — válido y portable, pero algoritmo más antiguo; se prefiere argon2id para dato clínico.
- **jose para JWT (elegida)** vs **jsonwebtoken** — `jose` es pure JS, moderna y corre en Node y Edge, sin deps nativas.
- **2FA desde el inicio** — descartada para la primera versión por costo/tiempo; planificada como mejora.
- **OAuth/SSO de terceros** — descartada: añade dependencia externa y complejidad innecesaria para un padrón cerrado de voluntarios.

## Consecuencias
- **Positivas:** rápida de construir; control de acceso por rol sobre una base simple.
- **Negativas / costos:** sin 2FA, una credencial comprometida da acceso directo; mitigado por alta controlada y, a futuro, 2FA.
- **Pendientes:** iteración futura para 2FA.
