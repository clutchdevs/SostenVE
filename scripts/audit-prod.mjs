#!/usr/bin/env node
/**
 * Production dependency audit gate.
 *
 * `npm audit --audit-level=high` is all-or-nothing: the only way to get past a single
 * unfixable advisory is to lower the threshold for everything, which would also silence a
 * genuinely exploitable high in hono or supabase. This wrapper keeps the high/critical gate
 * and allows named exceptions instead.
 *
 * Every exception carries a reason and an expiry date. Once it expires the build fails
 * again — an accepted risk has to be re-argued, never quietly inherited.
 */
import { execFileSync } from 'node:child_process';

/**
 * @type {{ advisory: string, package: string, reason: string, until: string }[]}
 */
const ALLOWLIST = [
  {
    advisory: 'GHSA-f88m-g3jw-g9cj',
    package: 'sharp',
    reason:
      'libvips CVEs reachable only by processing hostile images. This app has no user image ' +
      'upload: next/image optimises our own bundled assets. No fix available — next@16.2.11 ' +
      '(latest) pins sharp ^0.34.5, and forcing 0.35.x breaks sharp at runtime (@img/colour ' +
      'does not resolve in the workspace tree). Drop this entry as soon as Next widens the range.',
    until: '2026-10-21',
  },
];

const BLOCKING = new Set(['high', 'critical']);

function runAudit() {
  try {
    // A non-empty report exits non-zero; that is the normal path, not an error.
    return execFileSync('npm', ['audit', '--omit=dev', '--json'], {
      encoding: 'utf8',
      shell: process.platform === 'win32',
    });
  } catch (error) {
    if (error.stdout) return error.stdout;
    throw error;
  }
}

/**
 * Walks `via` to the high/critical advisories actually behind a vulnerability. npm reports a
 * parent as vulnerable "via" its child package name, so `next` inherits both sharp (high) and
 * postcss (moderate). Only the blocking ones matter here: a moderate advisory dragged in by a
 * high parent must not be what fails the build, or excusing sharp would never clear `next`.
 */
function blockingAdvisoriesFor(name, vulnerabilities, seen = new Set()) {
  if (seen.has(name)) return [];
  seen.add(name);

  const found = [];
  for (const via of vulnerabilities[name]?.via ?? []) {
    if (typeof via === 'string') {
      found.push(...blockingAdvisoriesFor(via, vulnerabilities, seen));
    } else if (via.url && BLOCKING.has(via.severity)) {
      found.push(via.url.split('/').pop());
    }
  }
  return found;
}

const report = JSON.parse(runAudit());
const vulnerabilities = report.vulnerabilities ?? {};
const today = new Date().toISOString().slice(0, 10);

const expired = ALLOWLIST.filter((entry) => entry.until < today);
const active = new Map(ALLOWLIST.filter((e) => e.until >= today).map((e) => [e.advisory, e]));

const blocking = [];
const excused = [];

for (const [name, vulnerability] of Object.entries(vulnerabilities)) {
  if (!BLOCKING.has(vulnerability.severity)) continue;

  const advisories = [...new Set(blockingAdvisoriesFor(name, vulnerabilities))];
  const unexcused = advisories.filter((id) => !active.has(id));

  if (advisories.length > 0 && unexcused.length === 0) {
    excused.push({ name, advisories });
  } else {
    blocking.push({ name, severity: vulnerability.severity, advisories: unexcused });
  }
}

for (const { name, advisories } of excused) {
  const entry = active.get(advisories[0]);
  console.log(`· allowed: ${name} (${advisories.join(', ')}) — expires ${entry.until}`);
}

if (expired.length > 0) {
  console.error('\nExpired audit exceptions — re-review them or renew the entry:');
  for (const entry of expired) {
    console.error(`  ✗ ${entry.package} (${entry.advisory}) expired on ${entry.until}`);
  }
}

if (blocking.length > 0) {
  console.error('\nBlocking vulnerabilities in production dependencies:');
  for (const { name, severity, advisories } of blocking) {
    console.error(`  ✗ ${name} [${severity}] ${advisories.join(', ')}`);
  }
}

if (blocking.length > 0 || expired.length > 0) process.exit(1);

console.log(`\nNo blocking vulnerabilities in production dependencies (${excused.length} allowed).`);
