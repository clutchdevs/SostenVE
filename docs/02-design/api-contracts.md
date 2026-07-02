# Contratos de API — Proyecto PPV

> **Fase AI-DLC:** `02-design`  ·  **Estado:** propuesta
> Resumen legible de los endpoints REST (funciones serverless `/api/*` en Vercel, ver ADR-0009). Todos
> son HTTPS; los que manejan datos clínicos requieren rol.
>
> **Contrato vivo e interactivo (runtime):** `GET /api/v1/docs` (Swagger UI) y `GET /api/v1/openapi.json`
> exponen el OpenAPI 3.1 generado por la API a partir de los esquemas Zod reales — es la fuente de
> verdad de los endpoints implementados. Este `api-contracts.md` y `openapi.yaml` son artefactos de
> **diseño** y pueden ir por detrás del runtime.

## Convenciones
- Formato: JSON. Autenticación: sesión/JWT tras login (ADR-0005).
- Roles: `solicitante` (anónimo, sin login), `psicologo`, `coordinador`, `administrador`, `cron` (interno).
- Niveles de riesgo: `riesgo_alto`, `riesgo_moderado`, `seguimiento`, `cerrado`.
- Triage según ADR-0010: rama (`roja`/`verde`), tags clínicos y score ponderado.

## Endpoints

### Intake / público (sin autenticación)
| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/intake/triage-inicial` | Pregunta Likert inicial, **sin datos personales**. Devuelve la rama (`roja`/`verde`). |
| `POST` | `/api/intake/rama-roja` | Sub-canal elegido: `llamar` / `recibir-llamada` / `whatsapp-silencioso`. |
| `POST` | `/api/intake/rama-verde` | Formulario conversacional completo con tags clínicos; calcula el score y crea el caso. |
| `GET` | `/api/lineas-crisis/activa` | Devuelve la línea correcta según la **hora del sistema** (ruteo dinámico, RF-1.2.1). |
| `GET` | `/api/lineas-crisis` | Listar todas las líneas activas (para cachear en el cliente). |
| `GET` | `/api/casos/{id}/estado` | Estado de un caso por su código (sin contenido clínico). |

### Voluntarios
| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/voluntarios/registro` | Registro que dispara la **validación automática contra la BD de la FPV** (Módulo 2). |
| `POST` | `/api/auth/login` | Login de psicólogo/coordinador/admin. |

### Psicólogo (rol `psicologo`)
| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/casos?asignados=me` | Listar los casos asignados al psicólogo autenticado. |
| `GET` | `/api/casos/{id}` | Ver el detalle de un caso propio (incluye notas). |
| `POST` | `/api/casos/{id}/aceptar` | El voluntario **acepta el caso**; detiene el temporizador de SLA (RF-3.2). |
| `POST` | `/api/casos/{id}/notas` | Registrar una nota clínica en un caso propio. |
| `PATCH` | `/api/casos/{id}` | Actualizar estado de un caso propio (p. ej. cerrar). |

### Coordinador (rol `coordinador`)
| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/casos?estado=&prioridad=` | Listar todos los casos; prioridad visual de riesgo alto sin atender. |
| `GET` | `/api/capacidad` | Panel de capacidad: casos sin asignar en tiempo real. |

### Administrador (rol `administrador`)
| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/lineas-crisis` | Crear una línea de crisis/respaldo (incluye cobertura horaria). |
| `PUT` | `/api/lineas-crisis/{id}` | Editar una línea de crisis/respaldo. |
| `DELETE` | `/api/lineas-crisis/{id}` | Desactivar una línea de crisis/respaldo. |

### Interno (Vercel Cron Job)
| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/cron/revisar-slas-vencidos` | Invocado por **Vercel Cron** cada 1-2 min. Detecta casos de riesgo alto > 10 min sin aceptar y dispara el escalamiento (RF-3.3). **No** es para usuarios. |

## Notas de seguridad
- `/api/casos` y `/api/casos/{id}` aplican autorización por **propiedad** (psicólogo) y por **rol** (coordinador/admin).
- El contenido de `notas_clinicas` viaja cifrado en reposo y solo se devuelve al psicólogo asignado.
- `/api/cron/revisar-slas-vencidos` se protege con un **secreto compartido** (header verificado contra una variable de entorno de Vercel), **no** con autenticación de usuario (ADR-0009).
- `GET /api/lineas-crisis` está pensado para **cachearse en el cliente**, de modo que las líneas de crisis se muestren aun con el backend frío (cold-start).
