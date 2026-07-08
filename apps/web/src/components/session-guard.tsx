'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { clearSession, isSessionActive, touchActivity } from '../lib/session';

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart'] as const;
const CHECK_INTERVAL_MS = 30_000;

/**
 * Enforces session lifetime in staff areas (RF-2.7). User interaction refreshes
 * the idle window; a periodic check signs the user out once the session expires
 * by inactivity or absolute token expiry, sending them back to the login screen.
 * Throttles activity writes to at most one per second to avoid hammering storage.
 */
export function SessionGuard() {
  const router = useRouter();

  useEffect(() => {
    if (!isSessionActive()) {
      clearSession();
      router.replace('/login');
      return;
    }

    let lastTouch = 0;
    const onActivity = () => {
      const now = Date.now();
      if (now - lastTouch > 1_000) {
        lastTouch = now;
        touchActivity();
      }
    };
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true });
    }

    const timer = window.setInterval(() => {
      if (!isSessionActive()) {
        clearSession();
        router.replace('/login');
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity);
      }
      window.clearInterval(timer);
    };
  }, [router]);

  return null;
}
