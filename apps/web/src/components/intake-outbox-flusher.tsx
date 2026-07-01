'use client';

import { useEffect, useState } from 'react';
import { flushOutbox, pendingCount } from '../lib/intake-outbox';

/**
 * Retries any queued intake submissions (issue #2). Flushes on mount (so a
 * request captured earlier on a bad connection is sent as soon as the app loads
 * again) and whenever the browser reports it is back online. Shows an unobtrusive
 * banner while something is still pending so the requester knows it will be sent.
 */
export function IntakeOutboxFlusher() {
  const [pending, setPending] = useState(0);

  useEffect(() => {
    let active = true;
    async function run() {
      const left = await flushOutbox();
      if (active) setPending(left);
    }
    setPending(pendingCount());
    void run();

    function onOnline() {
      void run();
    }
    window.addEventListener('online', onOnline);
    return () => {
      active = false;
      window.removeEventListener('online', onOnline);
    };
  }, []);

  if (pending === 0) return null;

  return (
    <div
      role="status"
      className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-800"
    >
      Tienes {pending} solicitud{pending === 1 ? '' : 'es'} guardada{pending === 1 ? '' : 's'} sin
      enviar. La enviaremos automáticamente cuando vuelva la conexión.
    </div>
  );
}
