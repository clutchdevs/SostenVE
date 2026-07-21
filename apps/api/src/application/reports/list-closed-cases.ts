import type { ClosedCaseFilters, ClosedCaseReportPage, ReportDeps } from './ports.js';

export interface ReportActor {
  id: string;
  role: string;
}

/** How the report was consumed — recorded so a bulk download is distinguishable from browsing. */
export type ReportAccessKind = 'view' | 'download';

/**
 * Lists closed cases for the coordinator report and records the access.
 *
 * Every read is audited (PRD R5). This is the main countermeasure for the mass-exfiltration
 * vector introduced by this feature (threat-model, DREAD "g"): the download is a legitimate,
 * Federation-requested capability, so it is not blocked — it is made *traceable*. The audit
 * entry carries the access kind, the filters used and how many rows were returned, so an
 * unusual bulk extraction is visible after the fact.
 */
export async function listClosedCases(
  filters: ClosedCaseFilters,
  actor: ReportActor,
  kind: ReportAccessKind,
  deps: ReportDeps,
): Promise<ClosedCaseReportPage> {
  const page = await deps.reports.list(filters);

  await deps.audit.append({
    userId: actor.id,
    role: actor.role,
    // Not a single case: the affected record is the report itself, described by its filters.
    affectedRecordId: 'closed_case_report',
    actionType: `closed_case_report_${kind}:${describeFilters(filters)}:rows=${page.rows.length}/${page.total}`,
  });

  return page;
}

/** Compact, greppable rendering of the filters for the audit trail. */
function describeFilters(f: ClosedCaseFilters): string {
  const parts: string[] = [];
  if (f.from) parts.push(`from=${f.from.toISOString().slice(0, 10)}`);
  if (f.to) parts.push(`to=${f.to.toISOString().slice(0, 10)}`);
  if (f.riskLevel) parts.push(`risk=${f.riskLevel}`);
  if (f.volunteerId) parts.push(`volunteer=${f.volunteerId}`);
  if (f.closeReason) parts.push(`close=${f.closeReason}`);
  if (f.referralType) parts.push(`referral=${f.referralType}`);
  return parts.length > 0 ? parts.join(',') : 'all';
}
