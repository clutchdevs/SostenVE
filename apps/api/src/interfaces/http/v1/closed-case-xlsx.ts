import writeXlsxFile, { type Column } from 'write-excel-file/node';
import type { ClosedCaseReportRow } from '../../../application/reports/ports.js';

/**
 * Excel rendering of the closed-case report (issue #169).
 *
 * A flat CSV made the Federation do the formatting work themselves — and worse, it
 * handed everything over as text, so dates sorted alphabetically and minutes could not
 * be summed. Here every column carries its real type (Date, Number, String), so Excel
 * sorts, filters and aggregates correctly out of the box.
 *
 * Layout choices: the header row is frozen and styled so it survives scrolling through
 * hundreds of rows; widths are sized per column so nothing shows as `####` or gets cut;
 * and the long free-text columns wrap instead of spilling across the sheet.
 */
const BRAND = '#0B3D6B';
const HEADER_TEXT = '#FFFFFF';

/** Booleans read better as words in a report someone prints or hands over. */
const yesNo = (value: boolean): string => (value ? 'Sí' : 'No');
/** Arrays live in one cell as a readable list, not as JSON. */
const list = (values: string[]): string | null => (values.length > 0 ? values.join('; ') : null);

function header(value: string) {
  return { value, fontWeight: 'bold' as const, backgroundColor: BRAND, textColor: HEADER_TEXT, align: 'left' as const };
}

// An empty cell is `undefined`, not `null`: passing null makes the library emit a typed
// cell with no value, which Excel shows as a blank it still treats as text.
const text = (value: string | null, wrap = false) =>
  ({ value: value ?? undefined, type: String, wrap }) as const;
const num = (value: number | null) => ({ value: value ?? undefined, type: Number }) as const;
const date = (iso: string) => ({ value: new Date(iso), type: Date, format: 'dd/mm/yyyy hh:mm' }) as const;

const COLUMNS: Column<ClosedCaseReportRow>[] = [
  { header: header('Caso'), cell: (r) => text(r.casoId), width: 38 },
  { header: header('Creado'), cell: (r) => date(r.creadoEn), width: 17 },
  { header: header('Cerrado'), cell: (r) => date(r.cerradoEn), width: 17 },
  { header: header('Psicólogo'), cell: (r) => text(r.psicologo), width: 26 },
  { header: header('Rama'), cell: (r) => text(r.rama), width: 10 },
  { header: header('Nivel de riesgo'), cell: (r) => text(r.nivelRiesgo), width: 16 },
  { header: header('Score urgencia'), cell: (r) => num(r.scoreUrgencia), width: 14 },
  { header: header('Urgencia (Likert)'), cell: (r) => num(r.urgenciaRespuesta), width: 16 },
  { header: header('Tipo solicitante'), cell: (r) => text(r.tipoSolicitante), width: 16 },
  { header: header('Zona'), cell: (r) => text(r.zona), width: 24 },
  { header: header('Modalidad'), cell: (r) => text(r.modalidad), width: 13 },
  { header: header('Método de contacto'), cell: (r) => text(r.metodoContacto), width: 17 },
  { header: header('Edad'), cell: (r) => num(r.edad), width: 8 },
  { header: header('Síntomas (intake)'), cell: (r) => text(list(r.sintomasIntake), true), width: 30 },
  { header: header('Cambio de hábitos'), cell: (r) => text(list(r.cambioHabitos), true), width: 26 },
  { header: header('Hubo contacto'), cell: (r) => text(yesNo(r.contacto)), width: 14 },
  { header: header('Motivo sin contacto'), cell: (r) => text(r.motivoNoContacto), width: 20 },
  { header: header('Sexo'), cell: (r) => text(r.sexo), width: 12 },
  { header: header('Destinatario'), cell: (r) => text(r.destinatario), width: 16 },
  { header: header('Síntomas (cierre)'), cell: (r) => text(list(r.sintomas), true), width: 30 },
  { header: header('Otro síntoma'), cell: (r) => text(r.otroSintoma, true), width: 28 },
  { header: header('Medio de contacto'), cell: (r) => text(r.medioContacto), width: 16 },
  { header: header('Técnicas'), cell: (r) => text(list(r.tecnicas), true), width: 30 },
  { header: header('Motivo de cierre'), cell: (r) => text(r.motivoCierre), width: 22 },
  { header: header('Derivación'), cell: (r) => text(r.derivacionTipo), width: 14 },
  { header: header('Destinos derivación'), cell: (r) => text(list(r.derivacionDestinos), true), width: 26 },
  { header: header('Minutos'), cell: (r) => num(r.minutos), width: 10 },
  { header: header('Comentario'), cell: (r) => text(r.comentario, true), width: 60 },
];

export async function closedCasesToXlsx(rows: readonly ClosedCaseReportRow[]): Promise<Buffer> {
  return writeXlsxFile([...rows], {
    columns: COLUMNS,
    sheet: 'Casos cerrados',
    // Keeps the headers visible while scrolling a long report.
    stickyRowsCount: 1,
  }).toBuffer();
}

/** `reporte-casos-cerrados-2026-07-21.xlsx` */
export function xlsxFilename(now: Date = new Date()): string {
  return `reporte-casos-cerrados-${now.toISOString().slice(0, 10)}.xlsx`;
}
