import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  HttpFpvVerifier,
  NotConfiguredError,
} from '../../../src/infrastructure/fpv/http-fpv-verifier';

const options = {
  baseUrl: 'https://api.sistema.fpv.org.ve',
  token: 'test-token',
  timeoutMs: 1000,
};

const input = { professionalId: '12345', nationalId: '12345678', fullName: 'María Pérez' };

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('HttpFpvVerifier', () => {
  it('sends national_id, fpv and the X-API-TOKEN header to /public/validate', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, { status: 200, data: { valid: true, status: 'active' } }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await new HttpFpvVerifier(options).verify(input);

    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.pathname).toBe('/api/v1/public/validate');
    expect(url.searchParams.get('national_id')).toBe('12345678');
    expect(url.searchParams.get('fpv')).toBe('12345');
    expect((init.headers as Record<string, string>)['X-API-TOKEN']).toBe('test-token');
  });

  it('returns valid when the licence is found and active', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(200, { status: 200, data: { valid: true, status: 'active' } }),
      ),
    );
    await expect(new HttpFpvVerifier(options).verify(input)).resolves.toEqual({ valid: true });
  });

  it('accepts the exact production envelope (status_text/message/errors present)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(200, {
          status: 200,
          status_text: 'OK',
          message: '',
          data: {
            valid: true,
            status: 'active',
            full_name: 'PAOLA ALEJANDRA HERNANDEZ CHACIN',
            fpv_number: '14675',
            national_id: 'V-18837890',
            specializations: [],
            verified_at: '2026-05-02T17:37:47-04:00',
          },
          errors: [],
        }),
      ),
    );
    await expect(new HttpFpvVerifier(options).verify(input)).resolves.toEqual({ valid: true });
  });

  it('honours the envelope status when the API always returns HTTP 200 (not found)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(200, { status: 404, data: { valid: false } })),
    );
    const result = await new HttpFpvVerifier(options).verify(input);
    expect(result.valid).toBe(false);
  });

  it('honours the envelope status when the API always returns HTTP 200 (401 token)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(200, { status: 401, message: 'Missing token' })),
    );
    await expect(new HttpFpvVerifier(options).verify(input)).rejects.toBeInstanceOf(
      NotConfiguredError,
    );
  });

  it('returns invalid on HTTP 404 (not found)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(404, { status: 404, data: { valid: false } })),
    );
    const result = await new HttpFpvVerifier(options).verify(input);
    expect(result.valid).toBe(false);
  });

  it('does NOT auto-approve a found-but-inactive licence (drops to review)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(200, { status: 200, data: { valid: true, status: 'suspended' } }),
      ),
    );
    const result = await new HttpFpvVerifier(options).verify(input);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('suspended');
  });

  it('throws NotConfiguredError on HTTP 401 (bad/missing token)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(401, { status: 401, message: 'Missing token' })),
    );
    await expect(new HttpFpvVerifier(options).verify(input)).rejects.toBeInstanceOf(
      NotConfiguredError,
    );
  });

  it('throws NotConfiguredError when the token is empty (never silently approves)', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(
      new HttpFpvVerifier({ ...options, token: '' }).verify(input),
    ).rejects.toBeInstanceOf(NotConfiguredError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws on unexpected 5xx so the circuit breaker can trip', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(503, { status: 503 })),
    );
    await expect(new HttpFpvVerifier(options).verify(input)).rejects.toThrow();
  });

  it('propagates network/timeout errors (breaker + pending_approval fallback)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    await expect(new HttpFpvVerifier(options).verify(input)).rejects.toThrow('network down');
  });
});

describe('HttpFpvVerifier.getProfile', () => {
  it('GETs /public/psicologo/{national_id} with the X-API-TOKEN header', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, { status: 200, data: { id: 1 } }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await new HttpFpvVerifier(options).getProfile('18837890');

    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.pathname).toBe('/api/v1/public/psicologo/18837890');
    expect((init.headers as Record<string, string>)['X-API-TOKEN']).toBe('test-token');
  });

  it('maps the exact production envelope to a camelCase profile', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(200, {
          status: 200,
          status_text: 'OK',
          message: '',
          data: {
            id: 14636,
            fpv_number: '14675',
            colleges: ['Miranda'],
            specializations: [],
            nationality: 'V',
            national_id: 'V-18837890',
            full_name: 'PAOLA ALEJANDRA HERNANDEZ CHACIN',
            first_name: 'PAOLA',
            middle_name: 'ALEJANDRA',
            last_name: 'HERNANDEZ',
            second_last_name: 'CHACIN',
            degree_title: 'Licenciado(a) en Psicología',
            university: 'UCV',
            created_at: '2025-02-02 21:15:54',
            updated_at: '2026-05-02 17:37:47',
          },
          errors: [],
        }),
      ),
    );

    const profile = await new HttpFpvVerifier(options).getProfile('18837890');
    expect(profile).toEqual({
      id: 14636,
      fpvNumber: '14675',
      colleges: ['Miranda'],
      specializations: [],
      nationality: 'V',
      nationalId: 'V-18837890',
      fullName: 'PAOLA ALEJANDRA HERNANDEZ CHACIN',
      firstName: 'PAOLA',
      middleName: 'ALEJANDRA',
      lastName: 'HERNANDEZ',
      secondLastName: 'CHACIN',
      degreeTitle: 'Licenciado(a) en Psicología',
      university: 'UCV',
      createdAt: '2025-02-02 21:15:54',
      updatedAt: '2026-05-02 17:37:47',
    });
  });

  it('returns null when the padrón has no record (404)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(404, { status: 404, data: null })),
    );
    await expect(new HttpFpvVerifier(options).getProfile('00000000')).resolves.toBeNull();
  });

  it('honours the envelope status when the API always returns HTTP 200 (not found)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(200, { status: 404, data: null })),
    );
    await expect(new HttpFpvVerifier(options).getProfile('00000000')).resolves.toBeNull();
  });

  it('throws NotConfiguredError on 401 (bad/missing token)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(401, { status: 401, message: 'Missing token' })),
    );
    await expect(new HttpFpvVerifier(options).getProfile('18837890')).rejects.toBeInstanceOf(
      NotConfiguredError,
    );
  });

  it('throws on unexpected 5xx so the caller can handle the outage', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(503, { status: 503 })));
    await expect(new HttpFpvVerifier(options).getProfile('18837890')).rejects.toThrow();
  });
});
