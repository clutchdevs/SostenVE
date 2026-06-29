import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  CrisisLine,
  CrisisLineRepository,
  NewCrisisLine,
} from '../../domain/crisis-line/crisis-line';

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
}
