#!/usr/bin/env node
/**
 * Genera secretos de PRODUCCIÓN frescos y aleatorios.
 *
 *   node scripts/gen-secrets.mjs
 *
 * Copia la salida a las variables de entorno de tu host (Vercel → Settings →
 * Environment Variables). Estos valores NO deben commitearse ni compartirse en
 * chats/logs. Cada ejecución produce valores nuevos (genera un set por entorno:
 * staging y producción por separado).
 *
 * - JWT_SECRET             firma de tokens (ADR-0005)
 * - ENCRYPTION_KEY         AES-256-GCM de datos clínicos; decodifica a 32 bytes (ADR-0004)
 * - PSEUDONYMIZATION_SALT  HMAC PII↔clínico (ADR-0011) — rotarla rompe los seudónimos
 * - CRON_SECRET            protege el endpoint de cron de Vercel (ADR-0009)
 */
import { randomBytes } from 'node:crypto';

const b64 = (n) => randomBytes(n).toString('base64');
const hex = (n) => randomBytes(n).toString('hex');

const secrets = {
  JWT_SECRET: b64(48),
  ENCRYPTION_KEY: b64(32), // 32 bytes exactos (AES-256)
  PSEUDONYMIZATION_SALT: b64(32),
  CRON_SECRET: hex(32),
};

// Sanity check: la clave de cifrado debe decodificar a exactamente 32 bytes.
if (Buffer.from(secrets.ENCRYPTION_KEY, 'base64').length !== 32) {
  console.error('ENCRYPTION_KEY no decodificó a 32 bytes; reintenta.');
  process.exit(1);
}

console.log('# Secretos generados — pégalos en Vercel y NO los commitees.');
for (const [k, v] of Object.entries(secrets)) console.log(`${k}=${v}`);
