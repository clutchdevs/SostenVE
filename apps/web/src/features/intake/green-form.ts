/** Venezuelan states for the quick-select location screen (RF-1.3 pantalla 3). */
export const VENEZUELA_STATES: readonly string[] = [
  'Amazonas',
  'Anzoátegui',
  'Apure',
  'Aragua',
  'Barinas',
  'Bolívar',
  'Carabobo',
  'Cojedes',
  'Delta Amacuro',
  'Distrito Capital',
  'Falcón',
  'Guárico',
  'La Guaira',
  'Lara',
  'Mérida',
  'Miranda',
  'Monagas',
  'Nueva Esparta',
  'Portuguesa',
  'Sucre',
  'Táchira',
  'Trujillo',
  'Yaracuy',
  'Zulia',
];

/** Habit-change options (RF-1.3 pantalla 5). Codes match the API enum. */
export const HABIT_CHANGES: readonly { code: string; label: string }[] = [
  { code: 'alimentacion', label: 'Alimentación' },
  { code: 'concentracion', label: 'Concentración' },
  { code: 'aseo', label: 'Aseo personal' },
  { code: 'relaciones', label: 'Relaciones interpersonales' },
  { code: 'sueno', label: 'Sueño' },
];

export type ContactMethod = 'whatsapp' | 'llamada';

export interface GreenFormState {
  tags: string[];
  estado: string;
  ciudad: string;
  habitChanges: string[];
  name: string;
  contact: string;
  /** Preferred contact channel (RF-1.3 screen 2); empty until chosen. */
  contactMethod: ContactMethod | '';
}

export const EMPTY_GREEN_FORM: GreenFormState = {
  tags: [],
  estado: '',
  ciudad: '',
  habitChanges: [],
  name: '',
  contact: '',
  contactMethod: '',
};

/** Request body for POST /intake/green-branch (omits empty optionals). */
export function buildGreenPayload(form: GreenFormState): Record<string, unknown> {
  const body: Record<string, unknown> = {
    contacto: form.contact.trim(),
    tags: form.tags,
    cambio_habitos: form.habitChanges,
  };
  if (form.name.trim()) body.nombre = form.name.trim();
  if (form.estado) body.estado = form.estado;
  if (form.ciudad.trim()) body.ciudad = form.ciudad.trim();
  if (form.contactMethod) body.metodo_contacto = form.contactMethod;
  return body;
}
