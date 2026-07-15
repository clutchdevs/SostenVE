'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiFetch } from '../../lib/api-client';
import { PRESENCE_HEARTBEAT_INTERVAL_SECONDS } from '../../lib/config';

const AVAILABLE_KEY = 'ppv.available';

interface PresenceValue {
  available: boolean;
  connected: boolean;
  /** available AND connected — i.e. receiving cases right now (worth polling for). */
  online: boolean;
  hydrated: boolean;
  setAvailable: (next: boolean) => void;
  /**
   * Increments once the server has confirmed a pause (RF-2.5) — by then it has
   * already returned this psychologist's unaccepted cases to the queue (#130).
   * Consumers watch it to pull a fresh case list so those released cases don't
   * linger in a stale view the psychologist could still act on.
   */
  pauseSyncToken: number;
}

const PresenceContext = createContext<PresenceValue | null>(null);

async function sendPresence(disponible: boolean): Promise<void> {
  try {
    await apiFetch('/volunteers/me/presence', { method: 'POST', body: { disponible } });
  } catch {
    // Presence is best-effort; the server TTL expires it if heartbeats stop.
  }
}

/**
 * Single source of truth for the psychologist's availability (RF-2.5 / RF-4.3),
 * shared across the whole portal: the PresenceToggle drives it and the case list
 * polls only while online (issue #131) — a paused psychologist isn't receiving
 * cases, so there is nothing to refresh for. Owns the heartbeat loop and the
 * localStorage persistence so the choice survives navigation.
 */
export function PresenceProvider({ children }: { children: ReactNode }) {
  const [available, setAvailable] = useState(true);
  const [connected, setConnected] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [pauseSyncToken, setPauseSyncToken] = useState(0);

  useEffect(() => {
    const stored = window.localStorage.getItem(AVAILABLE_KEY);
    setAvailable(stored === null ? true : stored === 'true');
    setConnected(navigator.onLine);
    setHydrated(true);
  }, []);

  // Reflect browser connectivity (RF-4.3.2).
  useEffect(() => {
    function update() {
      setConnected(navigator.onLine);
    }
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  // Heartbeat loop while available; mark offline immediately when paused.
  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(AVAILABLE_KEY, String(available));

    if (!available) {
      // Once the server confirms the pause it has already released our unaccepted
      // cases (#130); signal consumers to pull the fresh list so they don't linger.
      let activeBranch = true;
      void sendPresence(false).then(() => {
        if (activeBranch) setPauseSyncToken((t) => t + 1);
      });
      return () => {
        activeBranch = false;
      };
    }

    let cancelled = false;
    function beat() {
      if (cancelled || !navigator.onLine) return;
      void sendPresence(true);
    }
    beat();
    const timer = setInterval(beat, PRESENCE_HEARTBEAT_INTERVAL_SECONDS * 1000);
    window.addEventListener('online', beat);
    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener('online', beat);
    };
  }, [hydrated, available]);

  const value: PresenceValue = {
    available,
    connected,
    online: available && connected,
    hydrated,
    setAvailable,
    pauseSyncToken,
  };
  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>;
}

export function usePresence(): PresenceValue {
  const ctx = useContext(PresenceContext);
  if (!ctx) throw new Error('usePresence must be used within a PresenceProvider');
  return ctx;
}
