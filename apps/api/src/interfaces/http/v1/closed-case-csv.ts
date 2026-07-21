import type { ClosedCaseReportRow } from '../../../application/reports/ports.js';

/**
 * CSV rendering of the closed-case report (issue #169).
 *
 * Emitted with a UTF-8 BOM because the audience opens these in Excel on Windows in
 * `es-VE`: without it Excel guesses the local codepage and mangles every accent.
 * Values are quoted and inner quotes doubled (RFC 4180), so free text — which the
 * Federation chose to include verbatim — cannot break the row structure.
 */
const BOM = '﻿';

const COLUMNS: ReadonlyArray<readonly [header: string, get: (r: ClosedCaseReportRow) => unknown]> = [
  ['caso_id', (r) => r.casoId],
  ['creado_en', (r) => r.creadoEn],
  ['cerrado_en', (r) => r.cerradoEn],
  ['psicologo', (r) => r.psicologo],
  ['rama', (r) => r.rama],
  ['nivel_riesgo', (r) => r.nivelRiesgo],
  ['score_urgencia', (r) => r.scoreUrgencia],
  ['urgencia_respuesta', (r) => r.urgenciaRespuesta],
  ['tipo_solicitante', (r) => r.tipoSolicitante],
  ['zona', (r) => r.zona],
  ['modalidad', (r) => r.modalidad],
  ['metodo_contacto', (r) => r.metodoContacto],
  ['edad', (r) => r.edad],
  ['sintomas_intake', (r) => r.sintomasIntake],
  ['cambio_habitos', (r) => r.cambioHabitos],
  ['contacto', (r) => r.contacto],
  ['motivo_no_contacto', (r) => r.motivoNoContacto],
  ['sexo', (r) => r.sexo],
  ['destinatario', (r) => r.destinatario],
  ['sintomas', (r) => r.sintomas],
  ['otro_sintoma', (r) => r.otroSintoma],
  ['medio_contacto', (r) => r.medioContacto],
  ['tecnicas', (r) => r.tecnicas],
  ['motivo_cierre', (r) => r.motivoCierre],
  ['derivacion_tipo', (r) => r.derivacionTipo],
  ['derivacion_destinos', (r) => r.derivacionDestinos],
  ['minutos', (r) => r.minutos],
  ['comentario', (r) => r.comentario],
];

function cell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  // Arrays become a readable, single-cell list rather than JSON.
  const text = Array.isArray(value) ? value.join('; ') : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function closedCasesToCsv(rows: readonly ClosedCaseReportRow[]): string {
  const header = COLUMNS.map(([name]) => `"${name}"`).join(',');
  const body = rows.map((row) => COLUMNS.map(([, get]) => cell(get(row))).join(','));
  // CRLF per RFC 4180 — also what Excel expects.
  return BOM + [header, ...body].join('\r\n') + '\r\n';
}

/** `reporte-casos-cerrados-2026-07-21.csv` */
export function csvFilename(now: Date = new Date()): string {
  return `reporte-casos-cerrados-${now.toISOString().slice(0, 10)}.csv`;
}
