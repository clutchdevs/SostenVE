# Decisiones de infraestructura — PPV

> **Fase AI-DLC:** `00-project` (respaldo de decisión)  ·  **Fecha:** 2026-06-28
> Documento de respaldo del análisis que sustenta los ADRs 0002, 0006 y 0009. Referenciado desde
> esos ADRs como evidencia de la decisión.

## Resumen de la decisión
- **Backend + frontend:** Vercel (funciones serverless; plan gratuito/hobby inicial).
- **Base de datos:** PostgreSQL gestionado en Supabase (separado del cPanel de la Federación).
- **SLA y escalamiento:** **event-driven** (se dispara al conectarse un psicólogo), con **un Vercel Cron
  diario** de respaldo — el plan free solo permite un cron/día; sin procesos persistentes (ver ADR-0015).

## Por qué se descartó el cPanel de la Federación
La Federación cuenta con un hosting cPanel para su sistema PHP/Symfony existente. Se evaluó
reutilizarlo y se descartó por dos motivos:

1. **Seguridad.** Compartir credenciales y tablas MySQL con el sistema existente amplía la
   superficie de ataque sobre datos clínicos restringidos (ver `data-classification.md`). Aislar la
   base de datos clínica del resto reduce el radio de impacto ante un compromiso.
2. **Recursos.** El plan cPanel observado (≈4 GB RAM, 40 entry processes) es ajustado frente al
   volumen esperado (300+ solicitudes/día), especialmente en picos.

## Por qué Supabase
- PostgreSQL gestionado, con client oficial para Next.js/Vercel.
- Cifrado a nivel de columna posible para campos clínicos (ADR-0004).
- **Connection pooler** necesario desde funciones serverless: las funciones abren/cierran conexiones
  constantemente y agotarían el límite de conexiones directas.
- **Riesgo abierto:** el plan gratuito pausa el proyecto tras 7 días de inactividad y **no incluye
  respaldos automáticos**. Con el volumen esperado no habrá inactividad, pero la falta de respaldos
  es inaceptable para datos clínicos → decisión de plan (gratuito vs. pago) pendiente de la
  Federación: `<TODO — Human-in-the-Loop>`.

## Por qué Vercel serverless
- Despliegue conjunto de frontend y backend vía Git; sin servidor que mantener.
- Vercel Cron Jobs resuelve el SLA de 10 minutos sin procesos persistentes (ver ADR-0009).
- Implica diseño **stateless**: todo el estado vive en Supabase.

## Consideraciones que se trasladan al diseño
- El endpoint de cron debe protegerse con secreto compartido (no auth de usuario).
- La pantalla de líneas de crisis debe tolerar cold-start: números cacheados en el cliente.
- Ver `docs/02-design/architecture.md` y `docs/02-design/threat-model.md`.
