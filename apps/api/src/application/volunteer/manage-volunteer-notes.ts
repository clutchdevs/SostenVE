import { ApiError } from '../../shared/errors/api-error.js';
import type { AuditLogRepository } from '../../domain/audit/audit.js';
import type { VolunteerRepository } from '../../domain/volunteer/volunteer.js';
import type {
  VolunteerNote,
  VolunteerNoteRepository,
} from '../../domain/volunteer/volunteer-note.js';
import type { Actor } from './manage-volunteer.js';

export interface VolunteerNotesDeps {
  notes: VolunteerNoteRepository;
  volunteers: VolunteerRepository;
  audit: AuditLogRepository;
}

/**
 * Adds a confidential coordinator note about a volunteer (RF-2.4). Verifies the
 * volunteer exists; the action is audited (the note content itself is not put in
 * the audit log, only that a note was added).
 */
export async function addVolunteerNote(
  volunteerId: string,
  content: string,
  actor: Actor,
  deps: VolunteerNotesDeps,
): Promise<VolunteerNote> {
  const volunteer = await deps.volunteers.findById(volunteerId);
  if (!volunteer) {
    throw new ApiError(404, 'NOT_FOUND', 'Volunteer not found');
  }
  const note = await deps.notes.create({ volunteerId, authorId: actor.id, content });
  await deps.audit.append({
    userId: actor.id,
    role: actor.role,
    affectedRecordId: volunteerId,
    actionType: 'volunteer_note_added',
  });
  return note;
}

export function listVolunteerNotes(
  volunteerId: string,
  deps: Pick<VolunteerNotesDeps, 'notes'>,
): Promise<VolunteerNote[]> {
  return deps.notes.listByVolunteerId(volunteerId);
}
