import type { SupabaseClient } from '@supabase/supabase-js';
import {
  DEFAULT_MAX_ACTIVE_CASELOAD,
  type AssignmentSettings,
  type AssignmentSettingsRepository,
} from '../../domain/assignment/assignment-settings.js';

const SETTINGS_ID = 1;

export class SupabaseAssignmentSettingsRepository implements AssignmentSettingsRepository {
  constructor(private readonly client: SupabaseClient) {}

  async get(): Promise<AssignmentSettings> {
    const { data, error } = await this.client
      .from('assignment_settings')
      .select('max_active_caseload')
      .eq('id', SETTINGS_ID)
      .maybeSingle();
    if (error) throw new Error(`Failed to load assignment settings: ${error.message}`);
    return {
      maxActiveCaseload:
        (data as { max_active_caseload: number } | null)?.max_active_caseload ??
        DEFAULT_MAX_ACTIVE_CASELOAD,
    };
  }

  async update(settings: AssignmentSettings): Promise<AssignmentSettings> {
    const { data, error } = await this.client
      .from('assignment_settings')
      .update({
        max_active_caseload: settings.maxActiveCaseload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', SETTINGS_ID)
      .select('max_active_caseload')
      .single();
    if (error) throw new Error(`Failed to update assignment settings: ${error.message}`);
    return { maxActiveCaseload: (data as { max_active_caseload: number }).max_active_caseload };
  }
}
