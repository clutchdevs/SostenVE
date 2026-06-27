# Contratos de API — Proyecto Sostén

> **Fase AI-DLC:** `02-design`  ·  **Estado:** propuesta
> Resumen legible de los endpoints REST. La especificación formal está en `openapi.yaml`
> (OpenAPI 3.1). Todos los endpoints son HTTPS; los que manejan datos clínicos requieren rol.

## Convenciones
- Formato: JSON. Autenticación: sesión/JWT tras login (ADR-0005).
- Roles: `solicitante` (anónimo, sin login), `psicologo`, `coordinador`, `administrador`.
- Niveles de riesgo: `riesgo_alto`, `riesgo_moderado`, `seguimiento`, `cerrado`.

## Endpoints

### Público (sin autenticación)
| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/solicitudes` | Crear una solicitud (formulario). Devuelve el caso creado, su nivel de riesgo y, si es `riesgo_alto`, las líneas de crisis. |
| `GET` | `/casos/{id}/estado` | Consultar el estado de un caso por su identificador/código (sin exponer contenido clínico). |
| `GET` | `/lineas-crisis` | Listar las líneas de crisis/respaldo activas (para mostrarlas en la app). |

### Psicólogo (rol `psicologo`)
| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/auth/login` | Login de psicólogo/coordinador/admin. |
| `GET` | `/casos?asignados=me` | Listar los casos asignados al psicólogo autenticado. |
| `GET` | `/casos/{id}` | Ver el detalle de un caso propio (incluye notas). |
| `POST` | `/casos/{id}/notas` | Registrar una nota clínica (diagnóstico/evolución) en un caso propio. |
| `PATCH` | `/casos/{id}` | Actualizar estado de un caso propio (p. ej. cerrar). |

### Coordinador (rol `coordinador`)
| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/casos?estado=&prioridad=` | Listar todos los casos filtrando por estado/prioridad; prioridad visual de riesgo alto sin atender. |
| `GET` | `/capacidad` | Panel de capacidad: número de casos sin asignar en tiempo real. |

### Administrador (rol `administrador`)
| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/lineas-crisis` | Crear una línea de crisis/respaldo. |
| `PUT` | `/lineas-crisis/{id}` | Editar una línea de crisis/respaldo. |
| `DELETE` | `/lineas-crisis/{id}` | Desactivar una línea de crisis/respaldo. |

## Notas de seguridad
- `/casos` y `/casos/{id}` aplican autorización por **propiedad** (psicólogo) y por **rol** (coordinador/admin).
- El contenido de `notas_clinicas` viaja cifrado en reposo y solo se devuelve al psicólogo asignado.
- La gestión de líneas de respaldo está restringida al rol `administrador` (no requiere cambios de código).
