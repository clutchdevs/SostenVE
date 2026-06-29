import { branchToDb, riskToDb } from '../../../infrastructure/repositories/enum-maps';
import type { ActiveCrisisLine } from '../../../application/intake/crisis-line-routing';
import type { IntakeCaseResult } from '../../../application/intake/types';

/** Maps domain results to the Spanish contract values (see openapi.yaml). */

export function presentCrisisLines(lines: ActiveCrisisLine) {
  return { activa: lines.active, respaldo: lines.backups };
}

export function presentIntakeResult(result: IntakeCaseResult) {
  return {
    caso_id: result.caseId,
    rama: branchToDb[result.branch],
    nivel_riesgo: riskToDb[result.riskLevel],
    score_urgencia: result.urgencyScore,
    lineas_crisis: result.crisisLines ? presentCrisisLines(result.crisisLines) : undefined,
  };
}
