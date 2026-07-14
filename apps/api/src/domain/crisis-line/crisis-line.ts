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
  /** Hard-delete: permanently removes the line. Returns true if a row was deleted.
   *  (The reversible soft-delete is `update(id, { active: false })`.) */
  delete(id: string): Promise<boolean>;
}
