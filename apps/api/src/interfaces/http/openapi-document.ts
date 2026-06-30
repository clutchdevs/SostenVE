import { zodToJsonSchema } from 'zod-to-json-schema';
import type { ZodType } from 'zod';
import {
  acceptInvitationSchema,
  addNoteSchema,
  caseClosureSchema,
  coordinatorCloseSchema,
  coordinatorInviteSchema,
  crisisLineCreateSchema,
  crisisLineUpdateSchema,
  greenBranchSchema,
  loginSchema,
  reassignCaseSchema,
  redBranchSchema,
  registerVolunteerSchema,
  triageInitialSchema,
  volunteerNoteSchema,
} from './v1/schemas';

/**
 * OpenAPI 3.1 document for the live API. Built in code and reusing the Zod
 * request schemas (via zod-to-json-schema) so request bodies stay in sync with
 * validation. Served at GET /api/v1/openapi.json and rendered by Swagger UI at
 * /api/v1/docs. `servers.url` is relative so "Try it out" hits the same origin.
 */
function jsonBody(schema: ZodType, required = true) {
  return {
    required,
    content: {
      'application/json': {
        schema: zodToJsonSchema(schema, { target: 'openApi3' }),
      },
    },
  };
}

const bearer = [{ bearerAuth: [] }];

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
      title: 'Sostén — API (Sistema PPV 2026)',
      version: '0.3.0',
      description:
        'API de la plataforma de respuesta psicosocial. Contrato vivo de los endpoints implementados.',
    },
    servers: [{ url: '/api/v1', description: 'Base path de la API' }],
    tags: [
      { name: 'health' },
      { name: 'intake' },
      { name: 'crisis-lines' },
      { name: 'consent' },
      { name: 'auth' },
      { name: 'volunteers' },
      { name: 'cases' },
      { name: 'coordinator' },
      { name: 'coordinators' },
      { name: 'admin' },
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
          summary: 'Estado del servicio',
          responses: { '200': { description: 'OK' } },
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
      '/auth/login': {
        post: {
          tags: ['auth'],
          summary: 'Login de personal (devuelve token + rol)',
          requestBody: jsonBody(loginSchema),
          responses: { '200': { description: 'Token de sesión' }, '401': { description: 'Credenciales inválidas' } },
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
