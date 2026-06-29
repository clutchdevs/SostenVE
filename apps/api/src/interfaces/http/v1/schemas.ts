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

export type TriageInitialBody = z.infer<typeof triageInitialSchema>;
export type RedBranchBody = z.infer<typeof redBranchSchema>;
export type GreenBranchBody = z.infer<typeof greenBranchSchema>;
