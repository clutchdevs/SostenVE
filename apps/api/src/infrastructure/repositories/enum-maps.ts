import { RiskLevel } from '../../domain/triage';
import type {
  CaseBranch,
  CaseStatus,
  ContactMethod,
  Modality,
  RequesterType,
} from '../../domain/case/case';

/**
 * Bidirectional maps between domain enums (English) and DB/contract values
 * (Spanish). Adapters use these so the domain never deals with wire values.
 */
function reverse<K extends string>(map: Record<K, string>): Record<string, K> {
  return Object.fromEntries(Object.entries(map).map(([k, v]) => [v as string, k as K])) as Record<
    string,
    K
  >;
}

export const branchToDb: Record<CaseBranch, string> = { RED: 'roja', GREEN: 'verde' };
export const branchFromDb = reverse(branchToDb);

export const riskToDb: Record<RiskLevel, string> = {
  [RiskLevel.HIGH]: 'riesgo_alto',
  [RiskLevel.MODERATE]: 'riesgo_moderado',
  [RiskLevel.FOLLOW_UP]: 'seguimiento',
};
export const riskFromDb = reverse(riskToDb);

export const statusToDb: Record<CaseStatus, string> = {
  PENDING: 'pendiente',
  ASSIGNED: 'asignado',
  ACCEPTED: 'aceptado',
  IN_FOLLOW_UP: 'en_seguimiento',
  CLOSED: 'cerrado',
};
export const statusFromDb = reverse(statusToDb);

export const requesterToDb: Record<RequesterType, string> = {
  VICTIM: 'victima',
  FAMILY: 'familiar',
  VOLUNTEER: 'voluntario',
};
export const requesterFromDb = reverse(requesterToDb);

export const modalityToDb: Record<Modality, string> = {
  IN_PERSON: 'presencial',
  REMOTE: 'distancia',
};
export const modalityFromDb = reverse(modalityToDb);

export const contactMethodToDb: Record<ContactMethod, string> = {
  WHATSAPP: 'whatsapp',
  CALL: 'llamada',
};
export const contactMethodFromDb = reverse(contactMethodToDb);
