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
  priority: number;
  active: boolean;
}

export interface NewCrisisLine {
  name: string;
  phone: string;
  coverage?: string;
  startHour?: number;
  endHour?: number;
  priority?: number;
  active?: boolean;
}

export interface CrisisLineRepository {
  create(input: NewCrisisLine): Promise<CrisisLine>;
  listActive(): Promise<CrisisLine[]>;
}
