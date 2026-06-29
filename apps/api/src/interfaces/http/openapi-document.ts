import { zodToJsonSchema } from 'zod-to-json-schema';
import type { ZodType } from 'zod';
import {
  addNoteSchema,
  caseClosureSchema,
  greenBranchSchema,
  loginSchema,
  redBranchSchema,
  registerVolunteerSchema,
  triageInitialSchema,
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
      { name: 'auth' },
      { name: 'volunteers' },
      { name: 'cases' },
      { name: 'coordinator' },
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
          summary: 'Línea de crisis activa según la hora (ruteo dinámico)',
          responses: { '200': { description: 'Línea activa + respaldos' } },
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
          summary: 'Listar voluntarios por estado (admin)',
          security: bearer,
          parameters: [{ name: 'status', in: 'query', required: false, schema: { type: 'string' } }],
          responses: { '200': { description: 'Lista de voluntarios' }, '401': { description: 'No autenticado' }, '403': { description: 'Sin permiso' } },
        },
      },
      '/volunteers/{id}/approve': {
        post: {
          tags: ['volunteers'],
          summary: 'Aprobar un voluntario pendiente (admin)',
          security: bearer,
          parameters: [idParam],
          responses: { '200': { description: 'Aprobado' }, '403': { description: 'Sin permiso' }, '404': { description: 'No encontrado' } },
        },
      },
      '/volunteers/{id}/reject': {
        post: {
          tags: ['volunteers'],
          summary: 'Rechazar/desactivar un voluntario (admin)',
          security: bearer,
          parameters: [idParam],
          responses: { '200': { description: 'Rechazado' }, '403': { description: 'Sin permiso' }, '404': { description: 'No encontrado' } },
        },
      },
      '/cases': {
        get: {
          tags: ['cases'],
          summary: 'Listar casos (psicólogo: propios; coordinador/admin: todos)',
          security: bearer,
          responses: { '200': { description: 'Lista de casos' }, '401': { description: 'No autenticado' } },
        },
      },
      '/cases/{id}': {
        get: {
          tags: ['cases'],
          summary: 'Detalle de un caso con identidad, notas y cierre (psicólogo asignado)',
          security: bearer,
          parameters: [idParam],
          responses: { '200': { description: 'Detalle + identidad + notas + cierre' }, '403': { description: 'Caso ajeno' }, '404': { description: 'No encontrado' } },
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
