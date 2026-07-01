'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api-client';

interface ConsentText {
  version: string;
  text: string;
}

/**
 * Informational consent/privacy notice for the requester flow (issue #1). Shown
 * on every requester screen so the notice is not only at the start. It is
 * intentionally NON-BLOCKING — a collapsible footer, no checkbox and no gate — so
 * it never adds friction to the high-risk / crisis-lines path. The text is served
 * from config (`GET /consent/requester`), never hardcoded.
 */
export function ConsentNotice() {
  const [consent, setConsent] = useState<ConsentText | null>(null);

  useEffect(() => {
    apiFetch<ConsentText>('/consent/requester', { auth: false })
      .then(setConsent)
      .catch(() => setConsent(null)); // Never block the flow if it can't load.
  }, []);

  if (!consent) return null;

  return (
    <details className="mt-8 border-t border-slate-200 pt-3 text-xs text-slate-500">
      <summary className="cursor-pointer list-none font-medium text-slate-600">
        ⓘ Servicio gratuito y confidencial de la FPV — aviso de privacidad
      </summary>
      <div className="mt-2 whitespace-pre-line leading-relaxed">{consent.text}</div>
      <p className="mt-2 text-[11px] text-slate-400">Versión {consent.version}</p>
    </details>
  );
}
