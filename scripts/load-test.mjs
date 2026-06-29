import autocannon from 'autocannon';

/**
 * Load test for the intake path (the highest-write, life-critical entry point).
 * Simulates a concentrated burst like the first day after the earthquake
 * (300+ requests/day arrive in spikes). Run against a local or preview API with
 * Supabase up:
 *
 *   LOAD_URL=http://localhost:3001/api/v1/intake/green-branch \
 *   LOAD_CONNECTIONS=50 LOAD_DURATION=30 npm run load-test
 *
 * Reports throughput, latency (p50/p99) and non-2xx responses. Do NOT run against
 * a database that holds real clinical data.
 */
const url = process.env.LOAD_URL ?? 'http://localhost:3001/api/v1/intake/green-branch';
const connections = Number(process.env.LOAD_CONNECTIONS ?? 50);
const duration = Number(process.env.LOAD_DURATION ?? 20);

const body = JSON.stringify({
  contacto: `+58412${Math.floor(Math.random() * 1_000_0000)}`,
  tipo_solicitante: 'victima',
  tags: ['persistent_sadness'],
});

process.stdout.write(
  `Load test → ${url}\n  connections=${connections} duration=${duration}s\n\n`,
);

const instance = autocannon(
  {
    url,
    connections,
    duration,
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    // A fresh body per request avoids idempotency-style dedupe on contact.
    setupRequest: (req) => {
      req.body = JSON.stringify({
        contacto: `+58412${Math.floor(Math.random() * 1_000_0000)}`,
        tipo_solicitante: 'victima',
        tags: ['persistent_sadness'],
      });
      return req;
    },
    body,
  },
  (err, result) => {
    if (err) {
      process.stderr.write(`Load test failed: ${err.message}\n`);
      process.exit(1);
    }
    process.stdout.write(
      [
        `Requests/sec (avg): ${result.requests.average}`,
        `Latency p50: ${result.latency.p50} ms`,
        `Latency p99: ${result.latency.p99} ms`,
        `2xx: ${result['2xx']}  non-2xx: ${result.non2xx}`,
        `Total requests: ${result.requests.total}`,
      ].join('\n') + '\n',
    );
  },
);

autocannon.track(instance, { renderProgressBar: true });
