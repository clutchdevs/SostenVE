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

export const greenBranchSchema = z.object({
  nombre: z.string().min(1).optional(),
  contacto: z.string().min(1),
  tipo_solicitante: z.enum(['victima', 'familiar', 'voluntario']).optional(),
  zona: z.string().min(1).optional(),
  modalidad: z.enum(['presencial', 'distancia']).optional(),
  edad: z.number().int().min(0).max(120).optional(),
  tags: z.array(z.string().min(1)).default([]),
});

export const registerVolunteerSchema = z.object({
  nombre: z.string().min(1),
  cedula_profesional: z.string().min(1),
  email: z.string().email(),
  contrasena: z.string().min(8),
  especialidad: z.string().min(1).optional(),
  disponibilidad: z.string().min(1).optional(),
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

export type AddNoteBody = z.infer<typeof addNoteSchema>;
export type CaseClosureBody = z.infer<typeof caseClosureSchema>;
export type TriageInitialBody = z.infer<typeof triageInitialSchema>;
export type RedBranchBody = z.infer<typeof redBranchSchema>;
export type GreenBranchBody = z.infer<typeof greenBranchSchema>;
export type RegisterVolunteerBody = z.infer<typeof registerVolunteerSchema>;
export type LoginBody = z.infer<typeof loginSchema>;
