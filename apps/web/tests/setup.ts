import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// jsdom does not provide a reliable `localStorage` implementation (its `clear`
// is missing in this setup), so the crisis-line fail-safe relies on it. Install
// a deterministic in-memory Storage so cache-backed code behaves consistently.
function createMemoryStorage(): Storage {
  let store: Record<string, string> = {};
  return {
    get length(): number {
      return Object.keys(store).length;
    },
    clear(): void {
      store = {};
    },
    getItem(key: string): string | null {
      return store[key] ?? null;
    },
    key(index: number): string | null {
      return Object.keys(store)[index] ?? null;
    },
    removeItem(key: string): void {
      delete store[key];
    },
    setItem(key: string, value: string): void {
      store[key] = String(value);
    },
  } as Storage;
}

Object.defineProperty(window, 'localStorage', {
  value: createMemoryStorage(),
  configurable: true,
  writable: true,
});

// Unmount React trees and reset storage between tests so document-wide queries
// (screen) and the cache don't leak state across tests.
afterEach(() => {
  cleanup();
  window.localStorage.clear();
});
