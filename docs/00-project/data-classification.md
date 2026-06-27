# Clasificación de datos — Proyecto Sostén

> **Fase AI-DLC:** `00-project`
> Inventario de datos por sensibilidad. Define el trato mínimo obligatorio (cifrado, acceso) de
> cada categoría. La **retención** la define la Federación (Human-in-the-Loop), no este equipo.

## Niveles de sensibilidad
| Nivel | Definición | Trato mínimo |
|---|---|---|
| **Restringido** | Dato de salud sensible. Su exposición causa daño grave a la persona. | Cifrado en reposo (columna) y en tránsito (HTTPS); acceso solo al psicólogo asignado; auditoría de acceso. |
| **Sensible** | Identifica o permite contactar a una persona. | Cifrado en tránsito; control de acceso por rol; no exponer en listados públicos. |
| **Interno** | Operativo, sin dato personal directo. | Control de acceso por rol. |
| **Público** | Sin restricción de divulgación. | Ninguno especial. |

## Inventario de datos
| Dato | Categoría | Nivel | Retención |
|---|---|---|---|
| Diagnóstico | Caso / nota clínica | **Restringido** | `<TODO — Human-in-the-Loop>` |
| Notas clínicas / evolución | Nota clínica | **Restringido** | `<TODO — Human-in-the-Loop>` |
| Nivel de riesgo detectado | Caso | **Restringido** | `<TODO — Human-in-the-Loop>` |
| Nombre del solicitante | Caso | Sensible | `<TODO — Human-in-the-Loop>` |
| Teléfono / contacto del solicitante | Caso | Sensible | `<TODO — Human-in-the-Loop>` |
| Tipo de solicitante (víctima/familiar/voluntario) | Caso | Sensible | `<TODO — Human-in-the-Loop>` |
| Zona / modalidad preferida | Caso | Sensible | `<TODO — Human-in-the-Loop>` |
| Cédula profesional del voluntario | Usuario | Sensible | `<TODO — Human-in-the-Loop>` |
| Especialidad / disponibilidad del voluntario | Usuario | Sensible | `<TODO — Human-in-the-Loop>` |
| Credenciales (hash de contraseña) | Usuario | Sensible | Mientras la cuenta esté activa |
| Líneas de crisis / respaldo | Configuración | Público | Permanente (editable) |
| Logs técnicos sin contenido clínico | Operación | Interno | `<TODO — Human-in-the-Loop>` |

## Reglas derivadas
- Ningún dato **Restringido** se muestra en listados de coordinador por defecto (ver matriz del charter).
- Los respaldos automáticos heredan la clasificación del dato más sensible que contienen → se tratan como **Restringido**.
- La política exacta de retención y de quién, además del psicólogo tratante, accede a lo Restringido, es decisión de la Federación: `<TODO — Human-in-the-Loop>`.
