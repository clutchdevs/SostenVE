import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ClosedCaseFilters,
  ClosedCaseReportPage,
  ClosedCaseReportRepository,
  ClosedCaseReportRow,
} from '../../application/reports/ports.js';
import { decrypt } from '../../shared/security/encryption.js';

/**
 * Closed-case report reads (issue #169, ADR-0017).
 *
 * Deliberately NOT built on the per-case repositories: those resolve one case at a time,
 * which would be an N+1 storm for a report. This does one embedded query for closures +
 * their cases, then a single batched lookup for the psychologists' names.
 *
 * The requester's identity never enters the query: `case_contacts` (name/phone) is a
 * separate table keyed by pseudonym and is simply not joined (ADR-0011, issue #25).
 * The two encrypted closure columns are decrypted here, so the report shows the record
 * as it was written (ADR-0017).
 */
interface EmbeddedCase {
  branch: string;
  risk_level: string;
  urgency_score: number;
  status: string;
  requester_type: string | null;
  zone: string | null;
  preferred_modality: string | null;
  preferred_contact_method: string | null;
  age: number | null;
  intake_tags: string[] | null;
  habit_changes: string[] | null;
  urgency_answer: number | null;
  case_created_at: string;
}

interface ClosureReportRow {
  case_id: string;
  author_volunteer_id: string;
  contacted: boolean;
  no_contact_reason: string | null;
  sex: string | null;
  recipient: string | null;
  symptoms: string[] | null;
  other_symptom_encrypted: string | null;
  contact_medium: string | null;
  techniques: string[] | null;
  close_reason: string | null;
  referral_type: string | null;
  referral_destinations: string[] | null;
  minutes: number;
  comment_encrypted: string | null;
  created_at: string;
  cases: EmbeddedCase;
}

const CASE_EMBED =
  'cases!inner(branch, risk_level, urgency_score, status, requester_type, zone, ' +
  'preferred_modality, preferred_contact_method, age, intake_tags, habit_changes, ' +
  'urgency_answer, case_created_at:created_at)';

const CLOSURE_COLUMNS =
  'case_id, author_volunteer_id, contacted, no_contact_reason, sex, recipient, symptoms, ' +
  'other_symptom_encrypted, contact_medium, techniques, close_reason, referral_type, ' +
  'referral_destinations, minutes, comment_encrypted, created_at';

export class SupabaseClosedCaseReportRepository implements ClosedCaseReportRepository {
  constructor(private readonly client: SupabaseClient) {}

  async list(filters: ClosedCaseFilters): Promise<ClosedCaseReportPage> {
    let query = this.client
      .from('case_closures')
      .select(`${CLOSURE_COLUMNS}, ${CASE_EMBED}`, { count: 'exact' })
      // Closure date: the report is about when care ended, not when the case came in.
      .order('created_at', { ascending: false })
      .range(filters.offset, filters.offset + filters.limit - 1);

    if (filters.from) query = query.gte('created_at', filters.from.toISOString());
    if (filters.to) query = query.lte('created_at', filters.to.toISOString());
    if (filters.volunteerId) query = query.eq('author_volunteer_id', filters.volunteerId);
    if (filters.closeReason) query = query.eq('close_reason', filters.closeReason);
    if (filters.referralType) query = query.eq('referral_type', filters.referralType);
    // Filtering on the embedded resource works because the join is `!inner`.
    if (filters.riskLevel) query = query.eq('cases.risk_level', filters.riskLevel);

    const { data, error, count } = await query;
    if (error) throw new Error(`Failed to list closed cases: ${error.message}`);

    const rows = (data ?? []) as unknown as ClosureReportRow[];
    const names = await this.resolveVolunteerNames(rows.map((r) => r.author_volunteer_id));

    return {
      rows: rows.map((row) => this.toReportRow(row, names)),
      total: count ?? rows.length,
    };
  }

  /** One batched lookup for every psychologist in the page (avoids N+1). */
  private async resolveVolunteerNames(ids: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids)];
    if (unique.length === 0) return new Map();
    const { data, error } = await this.client
      .from('volunteers')
      .select('id, full_name')
      .in('id', unique);
    if (error) throw new Error(`Failed to resolve volunteer names: ${error.message}`);
    return new Map((data ?? []).map((v) => [v.id as string, v.full_name as string]));
  }

  private toReportRow(row: ClosureReportRow, names: Map<string, string>): ClosedCaseReportRow {
    const c = row.cases;
    return {
      casoId: row.case_id,
      rama: c.branch,
      nivelRiesgo: c.risk_level,
      scoreUrgencia: c.urgency_score,
      tipoSolicitante: c.requester_type,
      zona: c.zone,
      modalidad: c.preferred_modality,
      metodoContacto: c.preferred_contact_method,
      edad: c.age,
      sintomasIntake: c.intake_tags ?? [],
      cambioHabitos: c.habit_changes ?? [],
      urgenciaRespuesta: c.urgency_answer,
      creadoEn: c.case_created_at,
      cerradoEn: row.created_at,
      psicologo: names.get(row.author_volunteer_id) ?? null,
      contacto: row.contacted,
      motivoNoContacto: row.no_contact_reason,
      sexo: row.sex,
      destinatario: row.recipient,
      sintomas: row.symptoms ?? [],
      otroSintoma: row.other_symptom_encrypted ? decrypt(row.other_symptom_encrypted) : null,
      medioContacto: row.contact_medium,
      tecnicas: row.techniques ?? [],
      motivoCierre: row.close_reason,
      derivacionTipo: row.referral_type,
      derivacionDestinos: row.referral_destinations ?? [],
      minutos: row.minutes,
      comentario: row.comment_encrypted ? decrypt(row.comment_encrypted) : null,
    };
  }
}
