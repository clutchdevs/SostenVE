import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  CrisisLine,
  CrisisLineRepository,
  CrisisLineUpdate,
  NewCrisisLine,
} from '../../domain/crisis-line/crisis-line.js';

interface CrisisLineRow {
  id: string;
  name: string;
  phone: string;
  coverage: string | null;
  start_hour: number | null;
  end_hour: number | null;
  priority: number;
  active: boolean;
}

function toDomain(row: CrisisLineRow): CrisisLine {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    coverage: row.coverage ?? undefined,
    startHour: row.start_hour ?? undefined,
    endHour: row.end_hour ?? undefined,
    priority: row.priority,
    active: row.active,
  };
}

export class SupabaseCrisisLineRepository implements CrisisLineRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(input: NewCrisisLine): Promise<CrisisLine> {
    const { data, error } = await this.client
      .from('crisis_lines')
      .insert({
        name: input.name,
        phone: input.phone,
        coverage: input.coverage ?? null,
        start_hour: input.startHour ?? null,
        end_hour: input.endHour ?? null,
        priority: input.priority ?? 0,
        active: input.active ?? true,
      })
      .select()
      .single();
    if (error) throw new Error(`Failed to create crisis line: ${error.message}`);
    return toDomain(data as CrisisLineRow);
  }

  async listActive(): Promise<CrisisLine[]> {
    const { data, error } = await this.client
      .from('crisis_lines')
      .select()
      .eq('active', true)
      .order('priority', { ascending: false });
    if (error) throw new Error(`Failed to list crisis lines: ${error.message}`);
    return (data as CrisisLineRow[]).map(toDomain);
  }

  async listAll(): Promise<CrisisLine[]> {
    const { data, error } = await this.client
      .from('crisis_lines')
      .select()
      .order('priority', { ascending: false });
    if (error) throw new Error(`Failed to list crisis lines: ${error.message}`);
    return (data as CrisisLineRow[]).map(toDomain);
  }

  async update(id: string, patch: CrisisLineUpdate): Promise<CrisisLine | null> {
    const row: Record<string, unknown> = {};
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.phone !== undefined) row.phone = patch.phone;
    if (patch.coverage !== undefined) row.coverage = patch.coverage;
    if (patch.startHour !== undefined) row.start_hour = patch.startHour;
    if (patch.endHour !== undefined) row.end_hour = patch.endHour;
    if (patch.priority !== undefined) row.priority = patch.priority;
    if (patch.active !== undefined) row.active = patch.active;

    const { data, error } = await this.client
      .from('crisis_lines')
      .update(row)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw new Error(`Failed to update crisis line: ${error.message}`);
    return data ? toDomain(data as CrisisLineRow) : null;
  }

  async deactivate(id: string): Promise<CrisisLine | null> {
    return this.update(id, { active: false });
  }
}
