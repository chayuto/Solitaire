#!/usr/bin/env node
/**
 * CI guard for ADR-0004: the Playwright container image tag in every workflow
 * must match the @playwright/test version in packages/app/package.json.
 * A mismatch silently falls back to downloading browsers in CI — the exact
 * failure mode the container exists to prevent.
 *
 * Usage: node scripts/check-playwright-lockstep.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const pkg = JSON.parse(readFileSync(join(root, 'packages/app/package.json'), 'utf8'));
const declared = (pkg.devDependencies?.['@playwright/test'] ?? '').replace(/^[\^~]/, '');
if (!declared) {
  console.error('check-playwright-lockstep: @playwright/test not found in packages/app/package.json');
  process.exit(1);
}

const workflowDir = join(root, '.github/workflows');
const imageRe = /mcr\.microsoft\.com\/playwright:v(\d+\.\d+\.\d+)-/g;

let checked = 0;
let failed = false;
for (const file of readdirSync(workflowDir)) {
  if (!file.endsWith('.yml') && !file.endsWith('.yaml')) continue;
  const text = readFileSync(join(workflowDir, file), 'utf8');
  for (const match of text.matchAll(imageRe)) {
    checked++;
    if (match[1] !== declared) {
      failed = true;
      console.error(
        `${file}: Playwright image tag v${match[1]} != @playwright/test ${declared} — ` +
          `bump the container tag in lockstep (ADR-0004).`,
      );
    }
  }
}

if (checked === 0) {
  console.error('check-playwright-lockstep: no Playwright container images found in workflows');
  process.exit(1);
}
if (failed) process.exit(1);
console.log(`check-playwright-lockstep: ${checked} image tag(s) match @playwright/test ${declared}`);
