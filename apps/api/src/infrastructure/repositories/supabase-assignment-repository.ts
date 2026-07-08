import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Assignment,
  AssignmentRepository,
  NewAssignment,
} from '../../domain/assignment/assignment.js';

interface AssignmentRow {
  id: string;
  case_id: string;
  volunteer_id: string;
  assigned_at: string;
  accepted_at: string | null;
  contact_channel: string | null;
}

function toDomain(row: AssignmentRow): Assignment {
  return {
    id: row.id,
    caseId: row.case_id,
    volunteerId: row.volunteer_id,
    assignedAt: new Date(row.assigned_at),
    acceptedAt: row.accepted_at ? new Date(row.accepted_at) : undefined,
    contactChannel: row.contact_channel ?? undefined,
  };
}

export class SupabaseAssignmentRepository implements AssignmentRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(input: NewAssignment): Promise<Assignment> {
    const { data, error } = await this.client
      .from('assignments')
      .insert({
        case_id: input.caseId,
        volunteer_id: input.volunteerId,
        contact_channel: input.contactChannel ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(`Failed to create assignment: ${error.message}`);
    return toDomain(data as AssignmentRow);
  }

  async findByCaseId(caseId: string): Promise<Assignment[]> {
    const { data, error } = await this.client.from('assignments').select().eq('case_id', caseId);
    if (error) throw new Error(`Failed to list assignments: ${error.message}`);
    return (data as AssignmentRow[]).map(toDomain);
  }

  async findByCaseIds(caseIds: string[]): Promise<Assignment[]> {
    if (caseIds.length === 0) return [];
    const { data, error } = await this.client
      .from('assignments')
      .select()
      .in('case_id', caseIds);
    if (error) throw new Error(`Failed to list assignments: ${error.message}`);
    return (data as AssignmentRow[]).map(toDomain);
  }

  async findByVolunteerId(volunteerId: string): Promise<Assignment[]> {
    const { data, error } = await this.client
      .from('assignments')
      .select()
      .eq('volunteer_id', volunteerId);
    if (error) throw new Error(`Failed to list assignments: ${error.message}`);
    return (data as AssignmentRow[]).map(toDomain);
  }

  async markAccepted(id: string, acceptedAt: Date): Promise<void> {
    const { error } = await this.client
      .from('assignments')
      .update({ accepted_at: acceptedAt.toISOString() })
      .eq('id', id);
    if (error) throw new Error(`Failed to mark assignment accepted: ${error.message}`);
  }

  async deleteByCaseId(caseId: string): Promise<void> {
    const { error } = await this.client.from('assignments').delete().eq('case_id', caseId);
    if (error) throw new Error(`Failed to revoke assignments: ${error.message}`);
  }
}
