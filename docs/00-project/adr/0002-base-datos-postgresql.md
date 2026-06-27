# ADR-0002 — Base de datos PostgreSQL

> **Fase AI-DLC:** `02-design`  ·  **Estado:** aceptada
> **Fecha:** 2026-06-27  ·  **Responsable:** equipo de desarrollo

## Contexto
El proyecto maneja relaciones claras entre entidades (casos, voluntarios, usuarios, asignaciones,
notas clínicas) y datos de salud sensibles que requieren cifrado. Se necesita una base de datos
madura, ampliamente documentada y de bajo costo de hosting administrado.

## Decisión
Usar **PostgreSQL** como base de datos. Decisión ya tomada por el equipo y confirmada aquí.

## Alternativas consideradas
- **PostgreSQL** — relacional, robusta, soporte de cifrado a nivel de columna, planes administrados económicos. Elegida.
- **MySQL/MariaDB** — válida, pero el equipo tiene mayor afinidad con PostgreSQL y su soporte de tipos/cifrado.
- **Base NoSQL (MongoDB)** — descartada: el dominio es fuertemente relacional (caso–voluntario–nota) y se beneficia de integridad referencial.

## Consecuencias
- **Positivas:** integridad referencial; cifrado a nivel de columna para campos clínicos (ver ADR-0004); ecosistema y respaldos maduros.
- **Negativas / costos:** requiere base administrada o gestión de respaldos propia (ver ADR-0006).
- **Pendientes:** ninguno.
