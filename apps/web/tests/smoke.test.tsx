import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HomePage from '../app/page';

describe('home page', () => {
  it('renders the product name', () => {
    const { container } = render(<HomePage />);
    expect(container.textContent).toContain('Sostén');
  });
});
