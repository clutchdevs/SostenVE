'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch, ApiError } from '../../lib/api-client';
import type { CaseSummary } from '../../lib/types';
import { usePresence } from './presence-context';

/** Default poll cadence — mirrors the coordinator live board so the app feels uniform. */
export const CASES_REFRESH_MS = 15_000;

/**
 * Loads the psychologist's cases and keeps them fresh with a lightweight poll, so a
 * case the coordinator assigns shows up without a manual reload (issue #131
 * "auto-refresco"). The first load always runs — even while paused — so the
 * psychologist still sees their current cases. The recurring poll only runs while
 * they are **online** (available + connected): paused, they aren't receiving new
 * cases, so polling would just waste requests. Errors on a background poll are
 * cleared by the next successful refresh so a transient blip doesn't linger.
 */
export function usePolledCases(intervalMs = CASES_REFRESH_MS) {
  const { online, pauseSyncToken } = usePresence();
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const activeRef = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const list = await apiFetch<CaseSummary[]>('/cases');
      if (!activeRef.current) return;
      setCases(list);
      setError('');
    } catch (err) {
      if (!activeRef.current) return;
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) setNeedsAuth(true);
      else setError('No se pudieron cargar los casos. Intenta de nuevo.');
    } finally {
      if (activeRef.current) setLoaded(true);
    }
  }, []);

  // Initial load once on mount, regardless of availability.
  useEffect(() => {
    activeRef.current = true;
    void refresh();
    return () => {
      activeRef.current = false;
    };
  }, [refresh]);

  // Recurring poll only while online; re-enabled when the psychologist resumes.
  useEffect(() => {
    if (!online) return;
    const timer = setInterval(refresh, intervalMs);
    return () => clearInterval(timer);
  }, [online, refresh, intervalMs]);

  // One catch-up refresh right after a pause is confirmed: the server has just
  // returned our unaccepted cases to the queue (#130), so pull the fresh list and
  // the released cases drop out of view instead of lingering as stale rows.
  useEffect(() => {
    if (pauseSyncToken === 0) return;
    void refresh();
  }, [pauseSyncToken, refresh]);

  return { cases, needsAuth, error, loaded, refresh };
}
