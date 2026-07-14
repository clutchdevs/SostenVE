/**
 * Crisis/backup line entity and repository port. Public to read (must be shown
 * even before auth) and editable by admins. Hour-based routing is applied in
 * Block 3.
 */
export interface CrisisLine {
  id: string;
  name: string;
  phone: string;
  coverage?: string;
  startHour?: number;
  endHour?: number;
  /** Spanish day names (dia_semana enum) the line operates; undefined = every day. */
  daysOfWeek?: string[];
  priority: number;
  active: boolean;
}

export interface NewCrisisLine {
  name: string;
  phone: string;
  coverage?: string;
  startHour?: number;
  endHour?: number;
  daysOfWeek?: string[];
  priority?: number;
  active?: boolean;
}

/** Partial update of a crisis line (admin CRUD). Undefined fields are untouched. */
export interface CrisisLineUpdate {
  name?: string;
  phone?: string;
  coverage?: string | null;
  startHour?: number | null;
  endHour?: number | null;
  daysOfWeek?: string[] | null;
  priority?: number;
  active?: boolean;
}

export interface CrisisLineRepository {
  create(input: NewCrisisLine): Promise<CrisisLine>;
  listActive(): Promise<CrisisLine[]>;
  listAll(): Promise<CrisisLine[]>;
  update(id: string, patch: CrisisLineUpdate): Promise<CrisisLine | null>;
  /** Soft-delete: marks the line inactive. Returns the updated line or null. */
  deactivate(id: string): Promise<CrisisLine | null>;
}
