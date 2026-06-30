import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  NewVolunteerNote,
  VolunteerNote,
  VolunteerNoteRepository,
} from '../../domain/volunteer/volunteer-note';

interface VolunteerNoteRow {
  id: string;
  volunteer_id: string;
  author_id: string | null;
  content: string;
  created_at: string;
}

function toDomain(row: VolunteerNoteRow): VolunteerNote {
  return {
    id: row.id,
    volunteerId: row.volunteer_id,
    authorId: row.author_id ?? undefined,
    content: row.content,
    createdAt: new Date(row.created_at),
  };
}

export class SupabaseVolunteerNoteRepository implements VolunteerNoteRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(input: NewVolunteerNote): Promise<VolunteerNote> {
    const { data, error } = await this.client
      .from('volunteer_notes')
      .insert({ volunteer_id: input.volunteerId, author_id: input.authorId, content: input.content })
      .select()
      .single();
    if (error) throw new Error(`Failed to create volunteer note: ${error.message}`);
    return toDomain(data as VolunteerNoteRow);
  }

  async listByVolunteerId(volunteerId: string): Promise<VolunteerNote[]> {
    const { data, error } = await this.client
      .from('volunteer_notes')
      .select()
      .eq('volunteer_id', volunteerId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(`Failed to list volunteer notes: ${error.message}`);
    return (data as VolunteerNoteRow[]).map(toDomain);
  }
}
