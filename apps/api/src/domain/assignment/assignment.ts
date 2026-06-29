/**
 * Assignment of a case to a volunteer and its repository port. The SLA timer and
 * acceptance flow are driven in Block 5; this defines the persistence contract.
 */
export interface Assignment {
  id: string;
  caseId: string;
  volunteerId: string;
  assignedAt: Date;
  acceptedAt?: Date;
  contactChannel?: string;
}

export interface NewAssignment {
  caseId: string;
  volunteerId: string;
  contactChannel?: string;
}

export interface AssignmentRepository {
  create(input: NewAssignment): Promise<Assignment>;
  findByCaseId(caseId: string): Promise<Assignment[]>;
  markAccepted(id: string, acceptedAt: Date): Promise<void>;
  /** Revokes (deletes) all assignments for a case, e.g. on SLA escalation. */
  deleteByCaseId(caseId: string): Promise<void>;
}
