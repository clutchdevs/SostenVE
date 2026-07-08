/**
 * Runtime-configurable assignment settings (admin-editable). Kept as a repository
 * port so the value lives in the DB (single row) and can be changed from the admin
 * panel without a redeploy. The default (6) is enforced by the DB column and the
 * adapter's fallback.
 */
export interface AssignmentSettings {
  /** Max active cases a psychologist may hold before the balancer skips them. */
  maxActiveCaseload: number;
}

export interface AssignmentSettingsRepository {
  get(): Promise<AssignmentSettings>;
  update(settings: AssignmentSettings): Promise<AssignmentSettings>;
}

/** Fallback used when the settings row is missing or the store is unreachable. */
export const DEFAULT_MAX_ACTIVE_CASELOAD = 6;
