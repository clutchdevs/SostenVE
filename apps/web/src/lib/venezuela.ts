/**
 * Venezuelan states, used for the "Colegio de Psicólogos" dropdown on the
 * psychologist registration form (#128). The Colegios de Psicólogos are organized
 * by state; picking one here fills the `colegio` field. "Otro" lets the applicant
 * type a value that isn't in the list.
 */
export const VE_ESTADOS = [
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
] as const;

/** Sentinel for the "Otro" option (free-text colegio). */
export const COLEGIO_OTRO = 'Otro';
