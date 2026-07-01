import type { ReactNode } from 'react';
import { IntakeOutboxFlusher } from '../../src/components/intake-outbox-flusher';

/**
 * Shell for the requester intake flow. Mounts the offline retry flusher once for
 * every intake screen (issue #2) so queued submissions are delivered on load and
 * on reconnect, regardless of which intake page the requester lands on.
 */
export default function IntakeLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <IntakeOutboxFlusher />
      {children}
    </>
  );
}
