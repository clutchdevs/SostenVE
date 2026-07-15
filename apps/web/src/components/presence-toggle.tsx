'use client';

import { usePresence } from '../features/psychologist-portal/presence-context';

/**
 * Availability toggle for the psychologist PWA (RF-2.5, RF-4.3). Presence state and
 * the heartbeat live in the shared PresenceProvider; this button just reflects and
 * flips it. "Disponible" keeps the app Online (eligible for assignment and polling
 * the case list); "En pausa" marks it offline at once, removing it from the queue.
 */
export function PresenceToggle() {
  const { available, connected, online, hydrated, setAvailable } = usePresence();

  if (!hydrated) return null;

  const label = !connected ? 'Sin conexión' : available ? 'Disponible' : 'En pausa';

  return (
    <button
      type="button"
      onClick={() => setAvailable(!available)}
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
