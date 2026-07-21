import { Hono } from 'hono';
import type { Context } from 'hono';
import { listClosedCases } from '../../../application/reports/list-closed-cases.js';
import type { ClosedCaseFilters } from '../../../application/reports/ports.js';
import { ValidationError } from '../../../shared/errors/api-error.js';
import { getAuthUser, requireAuth } from '../middleware/auth.js';
import { closedCasesToCsv, csvFilename } from './closed-case-csv.js';
import { closedCasesToXlsx, xlsxFilename } from './closed-case-xlsx.js';
import { getReportDeps } from './dependencies.js';
import { closedCasesQuerySchema } from './schemas.js';

const REPORT_ROLES = ['coordinator', 'admin'];

/** Rows returned when the client does not paginate; also the CSV page size. */
const DEFAULT_LIMIT = 100;
const CSV_MAX_ROWS = 5000;

/**
 * Closed-case reports for the Federation (issue #169, ADR-0017).
 *
 * Coordinator/admin only — a psychologist keeps seeing just their own cases. Every read
 * is audited in the use case, which is the traceability countermeasure for the bulk
 * download this feature introduces (threat-model, DREAD "g").
 */
export function createReportsRouter(): Hono {
  const router = new Hono();

  router.get('/closed-cases', requireAuth({ roles: REPORT_ROLES }), async (c) => {
    const { filters } = parseFilters(c);
    const user = getAuthUser(c);
    const page = await listClosedCases(
      filters,
      { id: user.sub, role: user.role },
      'view',
      getReportDeps(),
    );
    return c.json({ total: page.total, limit: filters.limit, offset: filters.offset, items: page.rows });
  });

  // Excel is the primary download: the audience opens this to read it, and a typed
  // workbook sorts, filters and sums correctly, which a flat CSV cannot do.
  router.get('/closed-cases.xlsx', requireAuth({ roles: REPORT_ROLES }), async (c) => {
    const { filters } = parseFilters(c, CSV_MAX_ROWS);
    const user = getAuthUser(c);
    const page = await listClosedCases(
      filters,
      { id: user.sub, role: user.role },
      'download',
      getReportDeps(),
    );
    const workbook = await closedCasesToXlsx(page.rows);
    return new Response(new Uint8Array(workbook), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${xlsxFilename()}"`,
        'Cache-Control': 'no-store',
      },
    });
  });

  // CSV stays for anyone importing this into another tool.
  router.get('/closed-cases.csv', requireAuth({ roles: REPORT_ROLES }), async (c) => {
    // The download must match the table the coordinator is looking at, so it takes the
    // same filters and simply lifts the page size.
    const { filters } = parseFilters(c, CSV_MAX_ROWS);
    const user = getAuthUser(c);
    const page = await listClosedCases(
      filters,
      { id: user.sub, role: user.role },
      'download',
      getReportDeps(),
    );
    return new Response(closedCasesToCsv(page.rows), {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${csvFilename()}"`,
        // A report is a point-in-time extract; never let a proxy or the browser reuse it.
        'Cache-Control': 'no-store',
      },
    });
  });

  return router;
}

function parseFilters(c: Context, defaultLimit = DEFAULT_LIMIT): { filters: ClosedCaseFilters } {
  const parsed = closedCasesQuerySchema.safeParse(
    Object.fromEntries(new URL(c.req.url).searchParams),
  );
  if (!parsed.success) {
    throw new ValidationError('Filtros inválidos', parsed.error.flatten());
  }
  const q = parsed.data;
  return {
    filters: {
      from: q.desde ? parseDate(q.desde, 'desde') : undefined,
      to: q.hasta ? parseDate(q.hasta, 'hasta') : undefined,
      riskLevel: q.nivel_riesgo,
      volunteerId: q.voluntario_id,
      closeReason: q.motivo_cierre,
      referralType: q.derivacion_tipo,
      limit: q.limit ?? defaultLimit,
      offset: q.offset ?? 0,
    },
  };
}

/** Accepts `YYYY-MM-DD` or a full ISO instant; a bare date means the whole day started. */
function parseDate(value: string, field: string): Date {
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00.000Z` : value);
  if (Number.isNaN(date.getTime())) {
    throw new ValidationError(`Fecha inválida en ${field}`);
  }
  return date;
}
