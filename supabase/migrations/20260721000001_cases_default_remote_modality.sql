-- Modalidad como constante del servicio (issue #169).
--
-- La atención siempre fue 100% remota (WhatsApp / llamada): nunca hubo atención
-- presencial. El intake aceptaba `modalidad` pero el formulario jamás la enviaba, así
-- que TODOS los casos quedaron con `preferred_modality` en NULL. Eso dejaba la columna
-- "Modalidad" vacía en el reporte de casos cerrados y "Sin definir" en el portal del
-- psicólogo, sugiriendo un dato faltante cuando en realidad se conoce con certeza.
--
-- A partir de ahora el caso de uso de intake la estampa desde `service.modality` en la
-- configuración. Esto rellena el histórico con el mismo valor, que es el real.

update cases
set preferred_modality = 'distancia'
where preferred_modality is null;
