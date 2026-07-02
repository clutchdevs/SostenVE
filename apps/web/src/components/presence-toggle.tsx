'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api-client';
import { PRESENCE_HEARTBEAT_INTERVAL_SECONDS } from '../lib/config';

const AVAILABLE_KEY = 'sostenve.available';

async function sendPresence(disponible: boolean): Promise<void> {
  try {
    await apiFetch('/volunteers/me/presence', { method: 'POST', body: { disponible } });
  } catch {
    // Presence is best-effort; the server TTL expires it if heartbeats stop.
  }
}

/**
 * Availability toggle + presence heartbeat for the psychologist PWA (RF-2.5,
 * RF-4.3). While "Disponible" the app pings the backend every
 * PRESENCE_HEARTBEAT_INTERVAL_SECONDS so it stays Online (65 s TTL server-side)
 * and eligible for assignment; switching to "En pausa" marks it offline at once,
 * removing it from the queue. Also reflects the browser's connection state
 * (RF-4.3.2). The choice persists across navigation via localStorage.
 */
export function PresenceToggle() {
  const [available, setAvailable] = useState(true);
  const [connected, setConnected] = useState(true);
  const [hydrated, setHydrated] = useState(false);

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
      void sendPresence(false);
      return;
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

  if (!hydrated) return null;

  const online = available && connected;
  const label = !connected ? 'Sin conexión' : available ? 'Disponible' : 'En pausa';

  return (
    <button
      type="button"
      onClick={() => setAvailable((a) => !a)}
      aria-pressed={available}
      title="Cambia tu disponibilidad para recibir casos"
      className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
    >
      <span
        className={`h-2.5 w-2.5 rounded-full ${
          online ? 'bg-emerald-500' : !connected ? 'bg-amber-500' : 'bg-slate-400'
        }`}
        aria-hidden
      />
      {label}
    </button>
  );
}
