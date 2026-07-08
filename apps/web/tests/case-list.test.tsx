import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CaseList } from '../src/features/shared/case-list';
import type { CaseSummary } from '../src/lib/types';

function makeCase(overrides: Partial<CaseSummary>): CaseSummary {
  return {
    caso_id: 'c1',
    rama: 'verde',
    nivel_riesgo: 'seguimiento',
    score_urgencia: 1,
    estado: 'pendiente',
    creado_en: new Date().toISOString(),
    sla_vence_en: null,
    ...overrides,
  };
}

describe('CaseList', () => {
  it('flags an unattended high-risk case', () => {
    const { container } = render(
      <CaseList cases={[makeCase({ nivel_riesgo: 'riesgo_alto', estado: 'pendiente' })]} />,
    );
    expect(container.textContent).toContain('Riesgo alto sin atender');
  });

  it('does not flag a follow-up case', () => {
    const { container } = render(
      <CaseList cases={[makeCase({ nivel_riesgo: 'seguimiento', estado: 'pendiente' })]} />,
    );
    expect(container.textContent).not.toContain('sin atender');
  });

  it('marks an expired SLA on a high-risk case', () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    const { container } = render(
      <CaseList
        cases={[makeCase({ nivel_riesgo: 'riesgo_alto', estado: 'asignado', sla_vence_en: past })]}
      />,
    );
    expect(container.textContent).toContain('SLA vencido');
  });
});
