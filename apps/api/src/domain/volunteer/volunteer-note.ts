/**
 * Confidential coordinator note about a volunteer (RF-2.4). Visible/editable only
 * to coordinators and admins; never to the volunteer or requesters.
 */
export interface VolunteerNote {
  id: string;
  volunteerId: string;
  authorId?: string;
  content: string;
  createdAt: Date;
}

export interface NewVolunteerNote {
  volunteerId: string;
  authorId: string;
  content: string;
}

export interface VolunteerNoteRepository {
  create(input: NewVolunteerNote): Promise<VolunteerNote>;
  /** Notes for a volunteer, most recent first. */
  listByVolunteerId(volunteerId: string): Promise<VolunteerNote[]>;
}
