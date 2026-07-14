import { apiFetch } from './api-client';

/**
 * Crisis-line fail-safe (non-negotiable principle): the crisis numbers must be
 * shown to a high-risk person even if the backend is slow, cold or unreachable.
 *
 * Strategy: try the API, cache the result in localStorage, and ALWAYS fall back
 * to an embedded list of verified numbers if the API and cache are unavailable.
 */
export interface CrisisLine {
  name: string;
  phone: string;
}

export interface CrisisLines {
  active: CrisisLine | null;
  backups: CrisisLine[];
}

const CACHE_KEY = 'ppv.crisisLines';

/** Verified fallback numbers (kept in sync with config/app.config.yml). */
export const FALLBACK_CRISIS_LINES: CrisisLines = {
  active: { name: 'LAPSI', phone: '+584242907338' },
  backups: [
    { name: 'Colegio de Psicólogos de Miranda', phone: '04127840112' },
    { name: 'VEN-911', phone: '911' },
  ],
};

function readCache(): CrisisLines | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CrisisLines;
  } catch {
    return null;
  }
}

function writeCache(lines: CrisisLines): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CACHE_KEY, JSON.stringify(lines));
}

interface ApiCrisisLines {
  activa: CrisisLine | null;
  respaldo: CrisisLine[];
}

/**
 * Returns the crisis lines, preferring the live API, then the cache, then the
 * embedded fallback. Never throws — showing crisis lines must not fail.
 */
export async function getCrisisLines(): Promise<CrisisLines> {
  try {
    const data = await apiFetch<ApiCrisisLines>('/crisis-lines/active', { auth: false });
    const lines: CrisisLines = { active: data.activa, backups: data.respaldo ?? [] };
    // The admin-managed API is the source of truth (the FPV controls the lines):
    // return EXACTLY what it says, even if empty — we never inject our own lines
    // over the FPV's decision. Only a non-empty set is cached, so an outage falls
    // back to the last real lines rather than to nothing.
    if (lines.active || lines.backups.length > 0) writeCache(lines);
    return lines;
  } catch {
    // Genuine API/network failure only: use the last cached (FPV) lines, then the
    // embedded verified numbers as a last resort so we can't reach a blank state.
    return readCache() ?? FALLBACK_CRISIS_LINES;
  }
}
