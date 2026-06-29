import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CrisisLinesPanel } from '../src/components/crisis-lines-panel';
import { FALLBACK_CRISIS_LINES } from '../src/lib/crisis-lines';

describe('CrisisLinesPanel', () => {
  it('renders the active and backup crisis numbers', () => {
    const { container } = render(<CrisisLinesPanel lines={FALLBACK_CRISIS_LINES} />);
    const text = container.textContent ?? '';
    expect(text).toContain('+584242907338');
    expect(text).toContain('911');
  });

  it('renders nothing crashy when there is no active line (only backups)', () => {
    const { container } = render(
      <CrisisLinesPanel lines={{ active: null, backups: [{ name: 'VEN-911', phone: '911' }] }} />,
    );
    expect(container.textContent).toContain('911');
  });
});
