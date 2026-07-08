/**
 * Clinical closure record for a case (Module 4, RF-4.2). Coded fields use the
 * contract (Spanish) values; free-text (`comment`, `otherSymptom`) is restricted
 * and encrypted at rest by the infrastructure adapter. One closure per case.
 */
export interface CaseClosure {
  id: string;
  caseId: string;
  authorVolunteerId: string;
  contacted: boolean;
  noContactReason?: string;
  sex?: string;
  recipient?: string;
  symptoms: string[];
  otherSymptom?: string;
  contactMedium?: string;
  techniques: string[];
  closeReason?: string;
  referralType?: string;
  referralDestination?: string;
  hours: number;
  comment?: string;
  createdAt: Date;
}

export interface NewCaseClosure {
  caseId: string;
  authorVolunteerId: string;
  contacted: boolean;
  noContactReason?: string;
  sex?: string;
  recipient?: string;
  symptoms?: string[];
  otherSymptom?: string;
  contactMedium?: string;
  techniques?: string[];
  closeReason?: string;
  referralType?: string;
  referralDestination?: string;
  hours: number;
  comment?: string;
}

export interface CaseClosureRepository {
  create(input: NewCaseClosure): Promise<CaseClosure>;
  findByCaseId(caseId: string): Promise<CaseClosure | null>;
}
