import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Unmount React trees between tests so document-wide queries (screen) don't see
// elements left over from previous renders.
afterEach(() => {
  cleanup();
});
