import { z } from 'zod';

/** Request validation schemas for the intake endpoints (Block 3). */

export const triageInitialSchema = z.object({
  respuesta_likert: z.number().int().min(1).max(5),
});

export const redBranchSchema = z.object({
  sub_canal: z.enum(['llamar', 'recibir-llamada', 'whatsapp-silencioso']),
  nombre: z.string().min(1).optional(),
  contacto: z.string().min(1).optional(),
  edad: z.number().int().min(0).max(120).optional(),
});

/** Recent habit changes (green-branch screen 5, RF-1.3 pantalla 5). */
export const habitChangeEnum = z.enum([
  'alimentacion',
  'concentracion',
  'aseo',
  'relaciones',
  'sueno',
]);

export const greenBranchSchema = z.object({
  nombre: z.string().min(1).optional(),
  contacto: z.string().min(1),
  tipo_solicitante: z.enum(['victima', 'familiar', 'voluntario']).optional(),
  // Free-form zone kept for compatibility; location screen sends estado + ciudad.
  zona: z.string().min(1).optional(),
  estado: z.string().min(1).optional(),
  ciudad: z.string().min(1).optional(),
  modalidad: z.enum(['presencial', 'distancia']).optional(),
  edad: z.number().int().min(0).max(120).optional(),
  tags: z.array(z.string().min(1)).default([]),
  cambio_habitos: z.array(habitChangeEnum).default([]),
});

/** Complete applicant form vocab (RF-2.1.2). */
export const documentTypeEnum = z.enum(['V', 'E', 'P']);
export const modalidadEnum = z.enum(['presencial', 'distancia']);
export const diaSemanaEnum = z.enum([
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
  'domingo',
]);
export const bloqueHorarioEnum = z.enum(['manana', 'tarde', 'noche']);
export const availabilitySlotSchema = z.object({
  dia: diaSemanaEnum,
  bloque: bloqueHorarioEnum,
});

export const registerVolunteerSchema = z
  .object({
    nombre: z.string().min(1),
    // Personal identity document (RF-2.1.2): type + number, separate from the FPV.
    tipo_documento: documentTypeEnum,
    numero_documento: z.string().min(1),
    // FPV professional registration number (persisted as professional_id).
    numero_fpv: z.string().min(1),
    email: z.string().email(),
    universidad: z.string().min(1),
    anio_egreso: z
      .number()
      .int()
      .min(1950)
      .max(new Date().getFullYear()),
    colegio: z.string().min(1),
    especialidad: z.string().min(1).optional(),
    modalidad: z.array(modalidadEnum).min(1),
    disponibilidad_horaria: z.array(availabilitySlotSchema).min(1),
    // PAP (Primeros Auxilios Psicológicos): trained yes/no + detail when yes.
    pap: z.boolean(),
    pap_detalle: z.string().min(1).optional(),
    // Informed consent (RF-2.1.1): mandatory. `z.literal(true)` makes a request
    // without acceptance fail validation, so registration is blocked server-side
    // regardless of the UI. The version is the wording the client displayed.
    consentimiento: z.literal(true),
    consentimiento_version: z.string().min(1),
  })
  .refine((v) => !v.pap || (v.pap_detalle !== undefined && v.pap_detalle.length > 0), {
    message: 'pap_detalle es obligatorio cuando pap es true',
    path: ['pap_detalle'],
  });

export const loginSchema = z.object({
  email: z.string().email(),
  contrasena: z.string().min(1),
});

export const addNoteSchema = z.object({
  contenido: z.string().min(1),
  diagnostico: z.string().min(1).optional(),
  tept_diagnostico: z.boolean().optional(),
  crisis_psicotica_aguda: z.boolean().optional(),
});

export const caseClosureSchema = z.object({
  contacto: z.boolean(),
  motivo_no_contacto: z
    .enum(['abandono', 'problemas_conexion', 'solo_primer_contacto', 'solicitud_tercero'])
    .optional(),
  sexo: z.enum(['femenino', 'masculino', 'lgbtq', 'no_binario']).optional(),
  sintomas: z.array(z.string().min(1)).default([]),
  otro_sintoma: z.string().max(150).optional(),
  medio_contacto: z.enum(['celular', 'whatsapp', 'linea_fija']).optional(),
  tecnicas: z.array(z.string().min(1)).default([]),
  motivo_cierre: z.string().min(1).optional(),
  derivacion_tipo: z.enum(['urgente', 'seguimiento', 'ninguna']).optional(),
  derivacion_destino: z
    .enum(['psicologia', 'psiquiatria', 'ambos', 'medicina', 'proteccion_ninos', 'proteccion_mujer'])
    .optional(),
  horas: z.number().min(0).max(1000),
  comentario: z.string().max(1500).optional(),
});

const hour = z.number().int().min(0).max(26); // up to 26 to express ranges past midnight

export const crisisLineCreateSchema = z.object({
  nombre: z.string().min(1),
  telefono: z.string().min(1),
  cobertura: z.string().min(1).optional(),
  hora_inicio: hour.optional(),
  hora_fin: hour.optional(),
  prioridad: z.number().int().optional(),
  activa: z.boolean().optional(),
});

export const crisisLineUpdateSchema = z
  .object({
    nombre: z.string().min(1),
    telefono: z.string().min(1),
    cobertura: z.string().min(1).nullable(),
    hora_inicio: hour.nullable(),
    hora_fin: hour.nullable(),
    prioridad: z.number().int(),
    activa: z.boolean(),
  })
  .partial();

export const coordinatorInviteSchema = z.object({
  nombre: z.string().min(1),
  email: z.string().email(),
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(1),
  // The coordinator picks this password; require a reasonable minimum length.
  contrasena: z.string().min(8),
});

export const auditQuerySchema = z.object({
  accion: z.string().min(1).optional(),
  registro: z.string().min(1).optional(),
  usuario: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export type AddNoteBody = z.infer<typeof addNoteSchema>;
export type CaseClosureBody = z.infer<typeof caseClosureSchema>;
export type TriageInitialBody = z.infer<typeof triageInitialSchema>;
export type RedBranchBody = z.infer<typeof redBranchSchema>;
export type GreenBranchBody = z.infer<typeof greenBranchSchema>;
export type RegisterVolunteerBody = z.infer<typeof registerVolunteerSchema>;
export type LoginBody = z.infer<typeof loginSchema>;
export type CrisisLineCreateBody = z.infer<typeof crisisLineCreateSchema>;
export type CrisisLineUpdateBody = z.infer<typeof crisisLineUpdateSchema>;
export type CoordinatorInviteBody = z.infer<typeof coordinatorInviteSchema>;
export type AcceptInvitationBody = z.infer<typeof acceptInvitationSchema>;
export type AuditQuery = z.infer<typeof auditQuerySchema>;
