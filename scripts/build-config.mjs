#!/usr/bin/env node
/**
 * Genera apps/api/src/config/app-config.generated.ts desde app.config.yml.
 *
 *   node scripts/build-config.mjs
 *
 * El YAML sigue siendo la fuente editable; este script lo "hornea" en un módulo TS
 * que el loader IMPORTA. Así el bundler (esbuild/Vercel) lo incluye siempre en la
 * función serverless — sin leer archivos del disco en runtime (que fallaba en
 * Vercel: "Could not locate config/app.config.yml"). Corre este script cuando
 * edites el YAML y commitea ambos; un test valida que estén en sync.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { load } from 'js-yaml';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const yamlPath = join(root, 'apps/api/config/app.config.yml');
const outPath = join(root, 'apps/api/src/config/app-config.generated.ts');

// js-yaml expands anchors/merges (<<: *default), so each env section comes out
// fully resolved.
const doc = load(readFileSync(yamlPath, 'utf8'));

const banner =
  '// AUTO-GENERATED from apps/api/config/app.config.yml by scripts/build-config.mjs.\n' +
  '// Do NOT edit by hand — edit the YAML and run `npm run config:build`.\n';

const body = `export const CONFIG_SECTIONS: Record<string, unknown> = ${JSON.stringify(doc, null, 2)};\n`;

writeFileSync(outPath, banner + body);
console.log(`generado ${outPath} (${Object.keys(doc).join(', ')})`);
