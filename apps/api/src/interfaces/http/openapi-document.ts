import { z, type ZodType } from 'zod';
import {
  acceptInvitationSchema,
  addNoteSchema,
  assignmentSettingsSchema,
  caseClosureSchema,
  changePasswordSchema,
  coordinatorCloseSchema,
  coordinatorInviteSchema,
  crisisLineCreateSchema,
  crisisLineUpdateSchema,
  forgotPasswordSchema,
  greenBranchSchema,
  invitationInfoSchema,
  loginSchema,
  presenceSchema,
  resetPasswordSchema,
  reassignCaseSchema,
  redBranchSchema,
  registerVolunteerSchema,
  triageInitialSchema,
  volunteerNoteSchema,
} from './v1/schemas.js';

/**
 * OpenAPI 3.1 document for the live API. Built in code and reusing the Zod
 * request schemas (via Zod's native `toJSONSchema`) so request bodies stay in sync
 * with validation. Served at GET /api/v1/openapi.json and rendered by Swagger UI at
 * /api/v1/docs. `servers.url` is relative so "Try it out" hits the same origin.
 */
function jsonBody(schema: ZodType, required = true) {
  // `draft-2020-12` is the dialect OpenAPI 3.1 uses. `io: 'input'` emits the shape a CLIENT
  // sends (fields with a `.default()` are optional on input), not the parsed output.
  const { $schema: _dialect, ...jsonSchema } = z.toJSONSchema(schema, {
    target: 'draft-2020-12',
    io: 'input',
  }) as Record<string, unknown>;
  return {
    required,
    content: { 'application/json': { schema: jsonSchema } },
  };
}

const bearer = [{ bearerAuth: [] }];

/**
 * Closed-case report filters (issue #169). Shared by the JSON view and both downloads so
 * the file always matches what the coordinator is looking at.
 */
const closedCaseFilterParams = [
  { name: 'desde', in: 'query', required: false, description: 'Fecha de cierre desde (YYYY-MM-DD o ISO)', schema: { type: 'string' } },
  { name: 'hasta', in: 'query', required: false, description: 'Fecha de cierre hasta (YYYY-MM-DD o ISO)', schema: { type: 'string' } },
  {
    name: 'nivel_riesgo',
    in: 'query',
    required: false,
    schema: { type: 'string', enum: ['riesgo_alto', 'riesgo_moderado', 'seguimiento'] },
  },
  { name: 'voluntario_id', in: 'query', required: false, description: 'Psicólogo que cerró el caso', schema: { type: 'string' } },
  { name: 'motivo_cierre', in: 'query', required: false, schema: { type: 'string' } },
  {
    name: 'derivacion_tipo',
    in: 'query',
    required: false,
    schema: { type: 'string', enum: ['urgente', 'seguimiento', 'ninguna'] },
  },
  { name: 'limit', in: 'query', required: false, description: 'Solo la vista JSON (1–500)', schema: { type: 'integer' } },
  { name: 'offset', in: 'query', required: false, schema: { type: 'integer' } },
];

const idParam = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'string' },
};

export function buildOpenApiDocument(): Record<string, unknown> {
  return {
    openapi: '3.1.0',
    info: {
      title: 'PPV — API (Sistema PPV 2026)',
      version: '1.0.0',
      description:
        'API de la plataforma de respuesta psicosocial. Contrato vivo de los endpoints implementados.',
    },
    servers: [{ url: '/api/v1', description: 'Base path de la API' }],
    tags: [
      { name: 'health' },
      { name: 'intake' },
      { name: 'crisis-lines' },
      { name: 'consent' },
      { name: 'pap' },
      { name: 'auth' },
      { name: 'volunteers' },
      { name: 'cases' },
      { name: 'coordinator' },
      { name: 'coordinators' },
      { name: 'reports' },
      { name: 'admin' },
      { name: 'monitoring' },
      { name: 'cron' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        cronSecret: { type: 'apiKey', in: 'header', name: 'X-Cron-Secret' },
      },
    },
    paths: {
      '/health': {
        get: {
          tags: ['health'],
          summary: 'Liveness del servicio (status + uptime del instante)',
          responses: { '200': { description: 'status + uptime_seconds' } },
        },
      },
      '/metrics': {
        get: {
          tags: ['monitoring'],
          summary: 'Métricas de SLA (tiempo de asignación por riesgo), cola y uptime (coordinador/admin)',
          security: bearer,
          responses: { '200': { description: 'Snapshot de métricas' }, '403': { description: 'Sin permiso' } },
        },
      },
      '/intake/triage': {
        post: {
          tags: ['intake'],
          summary: 'Pregunta Likert inicial; devuelve la rama (roja/verde)',
          requestBody: jsonBody(triageInitialSchema),
          responses: { '200': { description: 'Rama resultante' }, '400': { description: 'Inválido' } },
        },
      },
      '/intake/red-branch': {
        post: {
          tags: ['intake'],
          summary: 'Rama Roja: crea caso de riesgo alto y devuelve líneas de crisis',
          parameters: [
            { name: 'Idempotency-Key', in: 'header', required: false, schema: { type: 'string' } },
          ],
          requestBody: jsonBody(redBranchSchema),
          responses: { '201': { description: 'Caso creado' }, '400': { description: 'Inválido' } },
        },
      },
      '/intake/green-branch': {
        post: {
          tags: ['intake'],
          summary: 'Rama Verde: clasifica por tags y crea el caso',
          requestBody: jsonBody(greenBranchSchema),
          responses: { '201': { description: 'Caso creado' }, '400': { description: 'Inválido' } },
        },
      },
      '/crisis-lines/active': {
        get: {
          tags: ['crisis-lines'],
          summary: 'Línea de crisis activa según la hora (ruteo dinámico, leído de BD con fallback a config)',
          responses: { '200': { description: 'Línea activa + respaldos' } },
        },
      },
      '/consent/active': {
        get: {
          tags: ['consent'],
          summary: 'Texto y versión del consentimiento informado del psicólogo (RF-2.1.1)',
          responses: { '200': { description: 'version + updated_at + text' } },
        },
      },
      '/consent/requester': {
        get: {
          tags: ['consent'],
          summary: 'Aviso de consentimiento/privacidad del solicitante (issue #1, no bloqueante)',
          responses: { '200': { description: 'version + updated_at + text' } },
        },
      },
      '/consent/reports': {
        get: {
          tags: ['consent'],
          summary:
            'Aviso de confidencialidad y responsabilidad de la sección de reportes (issue #169). Declara que la FPV es titular de los datos y asume la custodia de lo descargado',
          responses: { '200': { description: 'version + updated_at + text' } },
        },
      },
      '/pap': {
        get: {
          tags: ['pap'],
          summary: 'Guías de Primeros Auxilios Psicológicos (autoayuda asíncrona) para el solicitante',
          responses: { '200': { description: 'version + updated_at + guides[]' } },
        },
      },
      '/auth/login': {
        post: {
          tags: ['auth'],
          summary: 'Login de personal (devuelve token + rol)',
          requestBody: jsonBody(loginSchema),
          responses: { '200': { description: 'Token de sesión' }, '401': { description: 'Credenciales inválidas' } },
        },
      },
      '/auth/change-password': {
        post: {
          tags: ['auth'],
          summary: 'Cambiar la propia contraseña (autenticado, RF-2.2.4). Invalida la sesión actual.',
          security: bearer,
          requestBody: jsonBody(changePasswordSchema),
          responses: {
            '204': { description: 'Contraseña cambiada (reautenticarse)' },
            '400': { description: 'La nueva contraseña es igual a la actual' },
            '401': { description: 'Contraseña actual incorrecta o sin sesión' },
          },
        },
      },
      '/auth/forgot-password': {
        post: {
          tags: ['auth'],
          summary: 'Solicitar recuperación de contraseña (RF-2.2.4). Respuesta uniforme (sin enumeración).',
          requestBody: jsonBody(forgotPasswordSchema),
          responses: { '202': { description: 'Solicitud recibida (se envía correo si la cuenta existe)' } },
        },
      },
      '/auth/reset-password': {
        post: {
          tags: ['auth'],
          summary: 'Restablecer contraseña con token de un solo uso (RF-2.2.4)',
          requestBody: jsonBody(resetPasswordSchema),
          responses: {
            '204': { description: 'Contraseña restablecida' },
            '400': { description: 'Token inválido o expirado' },
          },
        },
      },
      '/volunteers/register': {
        post: {
          tags: ['volunteers'],
          summary: 'Registro de voluntario (validación FPV vía adapter)',
          requestBody: jsonBody(registerVolunteerSchema),
          responses: { '202': { description: 'Registro recibido (active / pending_approval)' } },
        },
      },
      '/volunteers': {
        get: {
          tags: ['volunteers'],
          summary: 'Listar voluntarios (coordinador/admin). status: active|pending_approval|inactive|all (def. pending_approval)',
          security: bearer,
          parameters: [
            {
              name: 'status',
              in: 'query',
              required: false,
              schema: { type: 'string', enum: ['active', 'pending_approval', 'inactive', 'all'] },
            },
          ],
          responses: { '200': { description: 'Lista de voluntarios' }, '401': { description: 'No autenticado' }, '403': { description: 'Sin permiso' } },
        },
      },
      '/volunteers/me/presence': {
        post: {
          tags: ['volunteers'],
          summary: 'Heartbeat / disponibilidad del voluntario (RF-2.5 / RF-4.3.1)',
          security: bearer,
          requestBody: jsonBody(presenceSchema),
          responses: {
            '204': { description: 'Presencia actualizada' },
            '401': { description: 'No autenticado' },
          },
        },
      },
      '/volunteers/{id}/approve': {
        post: {
          tags: ['volunteers'],
          summary: 'Aprobar/activar un voluntario (coordinador/admin, RF-2.3)',
          security: bearer,
          parameters: [idParam],
          responses: { '200': { description: 'Aprobado' }, '403': { description: 'Sin permiso' }, '404': { description: 'No encontrado' } },
        },
      },
      '/volunteers/{id}/reject': {
        post: {
          tags: ['volunteers'],
          summary: 'Rechazar/suspender un voluntario (coordinador/admin, RF-2.3.2)',
          security: bearer,
          parameters: [idParam],
          responses: { '200': { description: 'Suspendido' }, '403': { description: 'Sin permiso' }, '404': { description: 'No encontrado' } },
        },
      },
      '/volunteers/{id}/notes': {
        get: {
          tags: ['volunteers'],
          summary: 'Listar notas confidenciales sobre un voluntario (coordinador/admin, RF-2.4)',
          security: bearer,
          parameters: [idParam],
          responses: { '200': { description: 'Notas (más recientes primero)' }, '403': { description: 'Sin permiso' } },
        },
        post: {
          tags: ['volunteers'],
          summary: 'Agregar una nota confidencial sobre un voluntario (coordinador/admin, RF-2.4)',
          security: bearer,
          parameters: [idParam],
          requestBody: jsonBody(volunteerNoteSchema),
          responses: { '201': { description: 'Nota creada' }, '403': { description: 'Sin permiso' }, '404': { description: 'No encontrado' } },
        },
      },
      '/cases': {
        get: {
          tags: ['cases'],
          summary:
            'Listar casos (psicólogo: propios, con nombre/teléfono del solicitante; coordinador/admin: todos, sin PII)',
          security: bearer,
          responses: { '200': { description: 'Lista de casos' }, '401': { description: 'No autenticado' } },
        },
      },
      '/cases/{id}': {
        get: {
          tags: ['cases'],
          summary: 'Detalle de un caso con notas y cierre (psicólogo asignado ve identidad; coordinador/admin acceso auditado sin PII)',
          security: bearer,
          parameters: [idParam],
          responses: { '200': { description: 'Detalle + notas + cierre (identidad solo para el psicólogo asignado)' }, '403': { description: 'Caso ajeno' }, '404': { description: 'No encontrado' } },
        },
      },
      '/cases/{id}/accept': {
        post: {
          tags: ['cases'],
          summary: 'El voluntario acepta el caso (solo desde "asignado"; detiene el SLA)',
          security: bearer,
          parameters: [idParam],
          responses: {
            '200': { description: 'Aceptado' },
            '403': { description: 'Caso ajeno' },
            '409': { description: 'El caso no puede aceptarse en su estado actual' },
          },
        },
      },
      '/cases/{id}/close': {
        post: {
          tags: ['cases'],
          summary: 'Cierre clínico estructurado del caso (Módulo 4; solo desde "aceptado", terminal)',
          security: bearer,
          parameters: [idParam],
          requestBody: jsonBody(caseClosureSchema),
          responses: {
            '201': { description: 'Caso cerrado con expediente' },
            '403': { description: 'Caso ajeno' },
            '409': { description: 'Estado inválido o ya cerrado' },
          },
        },
      },
      '/cases/{id}/reassign': {
        post: {
          tags: ['cases'],
          summary: 'Reasignar el caso a un psicólogo activo (coordinador/admin, RF-2.3)',
          security: bearer,
          parameters: [idParam],
          requestBody: jsonBody(reassignCaseSchema),
          responses: {
            '200': { description: 'Reasignado' },
            '400': { description: 'El destino no es un psicólogo activo' },
            '403': { description: 'Sin permiso' },
            '409': { description: 'No se puede reasignar un caso cerrado' },
          },
        },
      },
      '/cases/{id}/coordinator-close': {
        post: {
          tags: ['cases'],
          summary: 'Cierre administrativo del caso por el coordinador (RF-2.3)',
          security: bearer,
          parameters: [idParam],
          requestBody: jsonBody(coordinatorCloseSchema),
          responses: {
            '200': { description: 'Caso cerrado' },
            '403': { description: 'Sin permiso' },
            '409': { description: 'El caso ya está cerrado' },
          },
        },
      },
      '/cases/{id}/notes': {
        post: {
          tags: ['cases'],
          summary: 'Registrar nota clínica (RF-4.3 / RF-4.2.9)',
          security: bearer,
          parameters: [idParam],
          requestBody: jsonBody(addNoteSchema),
          responses: {
            '201': { description: 'Nota registrada + derivación' },
            '403': { description: 'Caso ajeno' },
            '422': { description: 'Regla clínica violada (p. ej. TEPT < 4 semanas)' },
          },
        },
      },
      '/coordinator/capacity': {
        get: {
          tags: ['coordinator'],
          summary: 'Capacidad y casos sin atender (coordinador/admin)',
          security: bearer,
          responses: { '200': { description: 'Métricas de capacidad' }, '403': { description: 'Sin permiso' } },
        },
      },
      '/coordinators/invitation-info': {
        post: {
          tags: ['coordinators'],
          summary: 'Previsualizar una invitación de coordinador por su token (público, para adaptar el onboarding)',
          requestBody: jsonBody(invitationInfoSchema),
          responses: {
            '200': { description: 'Datos públicos de la invitación (nombre, email, estado)' },
            '400': { description: 'Token inválido o vencido' },
          },
        },
      },
      '/coordinators/accept-invitation': {
        post: {
          tags: ['coordinators'],
          summary: 'Aceptar invitación de coordinador y activar la cuenta (RF-2.6)',
          requestBody: jsonBody(acceptInvitationSchema),
          responses: {
            '201': { description: 'Coordinador activado' },
            '400': { description: 'Invitación inválida o vencida' },
          },
        },
      },
      '/admin/assignment-settings': {
        get: {
          tags: ['admin'],
          summary: 'Leer el tope de casos activos por psicólogo (balanceo de carga, RF-2.5)',
          security: bearer,
          responses: { '200': { description: '{ max_active_caseload }' }, '403': { description: 'Sin permiso' } },
        },
        put: {
          tags: ['admin'],
          summary: 'Actualizar el tope de casos activos por psicólogo (admin, auditado)',
          security: bearer,
          requestBody: jsonBody(assignmentSettingsSchema),
          responses: { '200': { description: '{ max_active_caseload } actualizado' }, '403': { description: 'Sin permiso' } },
        },
      },
      '/admin/crisis-lines': {
        get: {
          tags: ['admin'],
          summary: 'Listar todas las líneas de crisis (admin)',
          security: bearer,
          responses: { '200': { description: 'Lista de líneas' }, '403': { description: 'Sin permiso' } },
        },
        post: {
          tags: ['admin'],
          summary: 'Crear una línea de crisis (admin, auditado)',
          security: bearer,
          requestBody: jsonBody(crisisLineCreateSchema),
          responses: { '201': { description: 'Línea creada' }, '403': { description: 'Sin permiso' } },
        },
      },
      '/admin/crisis-lines/{id}': {
        patch: {
          tags: ['admin'],
          summary: 'Actualizar una línea de crisis (admin, auditado)',
          security: bearer,
          parameters: [idParam],
          requestBody: jsonBody(crisisLineUpdateSchema),
          responses: { '200': { description: 'Línea actualizada' }, '404': { description: 'No encontrada' }, '403': { description: 'Sin permiso' } },
        },
        delete: {
          tags: ['admin'],
          summary: 'Desactivar (soft-delete) una línea de crisis (admin, auditado)',
          security: bearer,
          parameters: [idParam],
          responses: { '200': { description: 'Línea desactivada' }, '404': { description: 'No encontrada' }, '403': { description: 'Sin permiso' } },
        },
      },
      '/admin/coordinators/invitations': {
        get: {
          tags: ['admin'],
          summary: 'Listar invitaciones de coordinador (admin)',
          security: bearer,
          responses: { '200': { description: 'Lista de invitaciones' }, '403': { description: 'Sin permiso' } },
        },
        post: {
          tags: ['admin'],
          summary: 'Invitar a un coordinador (admin, auditado; devuelve el token una sola vez)',
          security: bearer,
          requestBody: jsonBody(coordinatorInviteSchema),
          responses: { '201': { description: 'Invitación creada (+ token)' }, '403': { description: 'Sin permiso' } },
        },
      },
      '/admin/coordinators/invitations/{id}': {
        delete: {
          tags: ['admin'],
          summary: 'Revocar una invitación de coordinador pendiente (admin, auditado)',
          security: bearer,
          parameters: [idParam],
          responses: {
            '200': { description: 'Invitación revocada' },
            '404': { description: 'No encontrada' },
            '409': { description: 'La invitación no está pendiente' },
            '403': { description: 'Sin permiso' },
          },
        },
      },
      '/reports/closed-cases': {
        get: {
          tags: ['reports'],
          summary:
            'Reporte de casos cerrados (coordinador/admin, paginado). Reproduce el cierre tal como se guardó, con etiquetas legibles y SIN los campos de identidad del solicitante. Cada consulta se audita (ADR-0017)',
          security: bearer,
          parameters: closedCaseFilterParams,
          responses: {
            '200': { description: '{ total, limit, offset, items[] } de casos cerrados' },
            '400': { description: 'Filtros inválidos' },
            '403': { description: 'Sin permiso (un psicólogo solo ve sus propios casos)' },
          },
        },
      },
      '/reports/closed-cases.xlsx': {
        get: {
          tags: ['reports'],
          summary:
            'Descarga el reporte como libro de Excel con formato (encabezado fijo, anchos y tipos reales de fecha/número). Mismos filtros que la vista; cada descarga se audita',
          security: bearer,
          parameters: closedCaseFilterParams,
          responses: {
            '200': {
              description: 'Archivo .xlsx (adjunto)',
              content: {
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
                  schema: { type: 'string', format: 'binary' },
                },
              },
            },
            '403': { description: 'Sin permiso' },
          },
        },
      },
      '/reports/closed-cases.csv': {
        get: {
          tags: ['reports'],
          summary:
            'Descarga el reporte como CSV (BOM UTF-8 para Excel en es-VE), para importar a otras herramientas. Mismos filtros; cada descarga se audita',
          security: bearer,
          parameters: closedCaseFilterParams,
          responses: {
            '200': {
              description: 'Archivo .csv (adjunto)',
              content: { 'text/csv': { schema: { type: 'string' } } },
            },
            '403': { description: 'Sin permiso' },
          },
        },
      },
      '/admin/audit': {
        get: {
          tags: ['admin'],
          summary: 'Consultar el log de auditoría (admin, paginado con actor resuelto: nombre + cédula)',
          security: bearer,
          parameters: [
            { name: 'accion', in: 'query', required: false, schema: { type: 'string' } },
            { name: 'registro', in: 'query', required: false, schema: { type: 'string' } },
            { name: 'usuario', in: 'query', required: false, schema: { type: 'string' } },
            { name: 'limit', in: 'query', required: false, schema: { type: 'integer' } },
            { name: 'offset', in: 'query', required: false, schema: { type: 'integer' } },
          ],
          responses: { '200': { description: '{ total, items[] } de auditoría' }, '403': { description: 'Sin permiso' } },
        },
      },
      '/cron/check-sla': {
        get: {
          tags: ['cron'],
          summary: 'Revisión de SLA + asignación (invocado por Vercel Cron)',
          security: [{ cronSecret: [] }],
          responses: { '200': { description: 'Resumen { escalated, assigned }' }, '401': { description: 'Secreto inválido' } },
        },
        post: {
          tags: ['cron'],
          summary: 'Revisión de SLA + asignación (POST)',
          security: [{ cronSecret: [] }],
          responses: { '200': { description: 'Resumen { escalated, assigned }' }, '401': { description: 'Secreto inválido' } },
        },
      },
    },
  };
}
