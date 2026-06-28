# ADR-0011 — Seudonimización criptográfica de PII

> **Fase AI-DLC:** `02-design`  ·  **Estado:** aceptada
> **Fecha:** 2026-06-28  ·  **Responsable:** equipo de desarrollo + Federación
> **Refina:** ADR-0004 (cifrado de datos clínicos). **Sobre:** ADR-0002 (PostgreSQL/Supabase).

## Contexto
El PRD "fase 2" de la Federación (NFR 6.1) exige un trato de PII más estricto que el "cifrado en
reposo por columna" genérico del ADR-0004: separar la identidad de la persona de su contenido
clínico, de modo que un acceso a la tabla clínica no revele de quién es el expediente.

## Decisión
- **Separar la PII** (nombre, contacto, cédula, etc.) en una **tabla propia**, distinta de la tabla
  de notas clínicas / evolución.
- **Vincular ambas tablas mediante un ID seudonimizado** generado con **hash SHA-256 + salt
  aleatorio**, no con un cifrado reversible simple por columna.
- Implementar este mecanismo sobre la base de datos en **Supabase** (ADR-0002).
- El cifrado en tránsito (HTTPS) y el cifrado en reposo del contenido clínico (ADR-0004) **siguen
  aplicando**; la seudonimización los complementa, no los reemplaza.

## Alternativas consideradas
- **Tabla de PII separada + ID seudonimizado (SHA-256 + salt)** — cumple el NFR 6.1; un volcado de la tabla clínica no identifica a la persona. Elegida.
- **Solo cifrado de columna reversible (ADR-0004 tal cual)** — descartada como única medida: la identidad seguiría junto al dato clínico en la misma fila.
- **Cifrado homomórfico / tokenización con bóveda externa** — descartado: complejidad y costo desproporcionados para el MVP.

## Consecuencias
- **Positivas:** la identidad y el contenido clínico quedan desacoplados; menor daño ante una filtración parcial.
- **Negativas / costos:**
  - El salt y su gestión deben protegerse (variables de entorno/secret manager); perderlo rompe la trazabilidad de re-identificación legítima.
  - Las consultas que crucen PII y datos clínicos pasan por el ID seudonimizado; afecta el modelo de datos y las queries.
- **Pendientes:** definir la estrategia de gestión/rotación del salt junto con el ADR-0004.
