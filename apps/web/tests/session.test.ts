import { describe, expect, it } from 'vitest';
import {
  clearSession,
  getToken,
  isSessionActive,
  isSessionIdle,
  saveSession,
  touchActivity,
} from '../src/lib/session';
import { SESSION_IDLE_TIMEOUT_MINUTES } from '../src/lib/config';

/** Builds a minimal JWT-shaped string whose payload carries the given `exp`. */
function tokenWithExp(expSeconds: number): string {
  const payload = Buffer.from(JSON.stringify({ exp: expSeconds })).toString('base64url');
  return `header.${payload}.signature`;
}

const IDLE_MS = SESSION_IDLE_TIMEOUT_MINUTES * 60_000;
const futureToken = tokenWithExp(Math.floor(Date.now() / 1000) + 3600);

describe('session idle expiration (RF-2.7)', () => {
  it('keeps the session active right after login', () => {
    saveSession(futureToken, 'coordinator');
    expect(isSessionIdle()).toBe(false);
    expect(isSessionActive()).toBe(true);
  });

  it('expires and clears the session after the inactivity timeout', () => {
    saveSession(futureToken, 'coordinator');
    // Simulate the last activity happening just past the idle window.
    window.localStorage.setItem('sostenve.lastActivity', String(Date.now() - IDLE_MS - 1));
    expect(isSessionIdle()).toBe(true);
    expect(isSessionActive()).toBe(false);
    // isSessionActive cleared the stored token as a side effect.
    expect(getToken()).toBeNull();
  });

  it('touchActivity resets the idle window', () => {
    saveSession(futureToken, 'coordinator');
    window.localStorage.setItem('sostenve.lastActivity', String(Date.now() - IDLE_MS - 1));
    expect(isSessionIdle()).toBe(true);
    touchActivity();
    expect(isSessionIdle()).toBe(false);
    expect(isSessionActive()).toBe(true);
  });

  it('expires an absolutely-expired token even when not idle', () => {
    saveSession(tokenWithExp(Math.floor(Date.now() / 1000) - 10), 'coordinator');
    expect(isSessionIdle()).toBe(false);
    expect(isSessionActive()).toBe(false);
  });

  it('clearSession removes the activity marker', () => {
    saveSession(futureToken, 'coordinator');
    clearSession();
    expect(window.localStorage.getItem('sostenve.lastActivity')).toBeNull();
  });
});
