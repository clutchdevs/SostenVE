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

export type RequesterType = 'victima' | 'familiar' | 'voluntario';

/** Who is asking for help (RF-4.2.3). Shown to the requester at intake. */
export const REQUESTER_TYPES: readonly { code: RequesterType; label: string }[] = [
  { code: 'victima', label: 'La persona afectada (yo)' },
  { code: 'familiar', label: 'Un familiar o allegado' },
  { code: 'voluntario', label: 'Voluntario / rescatista' },
];

export interface GreenFormState {
  tags: string[];
  estado: string;
  ciudad: string;
  habitChanges: string[];
  name: string;
  contact: string;
  /** Who requests the help (RF-4.2.3); empty until chosen. */
  requesterType: RequesterType | '';
  /** Preferred contact channel (RF-1.3 screen 2); empty until chosen. */
  contactMethod: ContactMethod | '';
  /**
   * Age of the person who needs the support (RF-1.3). Kept as a string for the
   * input; a value under 18 routes the case to a child specialist (RF-2.5). Empty
   * when not provided.
   */
  age: string;
}

export const EMPTY_GREEN_FORM: GreenFormState = {
  tags: [],
  estado: '',
  ciudad: '',
  habitChanges: [],
  name: '',
  contact: '',
  requesterType: '',
  contactMethod: '',
  age: '',
};

/** Request body for POST /intake/green-branch (omits empty optionals). */
export function buildGreenPayload(form: GreenFormState): Record<string, unknown> {
  const body: Record<string, unknown> = {
    contacto: form.contact.trim(),
    tags: form.tags,
    cambio_habitos: form.habitChanges,
  };
  if (form.name.trim()) body.nombre = form.name.trim();
  if (form.requesterType) body.tipo_solicitante = form.requesterType;
  if (form.estado) body.estado = form.estado;
  if (form.ciudad.trim()) body.ciudad = form.ciudad.trim();
  if (form.contactMethod) body.metodo_contacto = form.contactMethod;
  // Only send a valid age; the API routes age < 18 to a child specialist.
  const age = Number.parseInt(form.age, 10);
  if (form.age.trim() !== '' && Number.isFinite(age) && age >= 0 && age <= 120) {
    body.edad = age;
  }
  return body;
}
