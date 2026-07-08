import { describe, expect, it, vi } from 'vitest';
import { __redactForTest, logger } from '../../src/shared/logger.js';

describe('logger PII redaction', () => {
  it('redacts sensitive fields and keeps safe ones', () => {
    const redacted = __redactForTest({
      id: 'case-1',
      status: 'PENDING',
      name: 'Ana Pérez',
      contact: '+584120000000',
      diagnosis: 'acute stress reaction',
    }) as Record<string, unknown>;

    expect(redacted.id).toBe('case-1');
    expect(redacted.status).toBe('PENDING');
    expect(redacted.name).toBe('[REDACTED]');
    expect(redacted.contact).toBe('[REDACTED]');
    expect(redacted.diagnosis).toBe('[REDACTED]');
  });

  it('redacts sensitive fields in nested structures', () => {
    const redacted = __redactForTest({
      case: { id: 'c1', contact: '+58000', notes: [{ content: 'secret note' }] },
    }) as { case: { id: string; contact: string; notes: Array<{ content: string }> } };

    expect(redacted.case.id).toBe('c1');
    expect(redacted.case.contact).toBe('[REDACTED]');
    expect(redacted.case.notes[0]!.content).toBe('[REDACTED]');
  });

  it('matches sensitive keys case-insensitively (snake/camel)', () => {
    const redacted = __redactForTest({
      full_name: 'X',
      professionalId: 'V-123',
      password_hash: '$argon2id$...',
    }) as Record<string, unknown>;

    expect(redacted.full_name).toBe('[REDACTED]');
    expect(redacted.professionalId).toBe('[REDACTED]');
    expect(redacted.password_hash).toBe('[REDACTED]');
  });

  it('writes a JSON line without leaking PII in plaintext', () => {
    const spy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    logger.info('case created', { caseId: 'c1', name: 'Ana Pérez', contact: '+584120000000' });

    expect(spy).toHaveBeenCalledOnce();
    const output = spy.mock.calls[0]![0] as string;
    expect(output).not.toContain('Ana Pérez');
    expect(output).not.toContain('+584120000000');
    expect(output).toContain('[REDACTED]');
    expect(output).toContain('case created');

    spy.mockRestore();
  });
});
