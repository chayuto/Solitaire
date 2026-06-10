# Stage 0a — CI + DX fixes

**Parent plan:** [`docs/plans/20260610_maintainability_plan.md`](../20260610_maintainability_plan.md) §4 Phase 0 (items 0.2, 0.3, 0.4, 0.6)
**Behavior change:** none (tooling only)
**Lands as:** one commit

## Goal

Every package is typechecked, tested, and linted in CI; a fresh clone can run `pnpm dev`;
the CI build artifact actually contains the build; `mcts` is no longer built on the app's
critical path.

## Current state

- `.github/workflows/ci.yml` — 4 jobs (Lint / Test / Build / E2E). None runs
  `pnpm -r typecheck`. The Test job runs `pnpm run test:run` (app only); `test:libs`
  (core + mcts unit tests) never runs in CI. The Build job uploads
  `path: dist/` (repo root), but the app builds to `packages/app/dist` — the artifact
  is empty. `deploy.yml` already uses the correct `./packages/app/dist`.
- Root `package.json` — `"dev": "pnpm --filter app dev"` fails on a fresh clone because
  `@chayuto/solitaire-core` resolves through its `dist/`, which doesn't exist until
  `build:libs` runs. `build:libs` builds core **and** mcts; the app imports only core.
- ESLint — only `packages/app/eslint.config.js` exists. core/mcts are unlinted.
  The app config uses flat config + `typescript-eslint` (devDeps live in `packages/app`).
- `packages/mcts` — app never imports it (verified: no `solitaire-mcts` import anywhere in
  `packages/app`). Its sources import nothing from core (JSDoc mentions only), so it can
  be tested/typechecked without building core first.

## Changes

### 1. Root `package.json` scripts

```jsonc
"dev":        "pnpm run build:libs && pnpm --filter app dev",
"dev:watch":  "pnpm --filter @chayuto/solitaire-core exec vite build --watch",  // run beside `dev` when editing core
"build:libs": "pnpm --filter @chayuto/solitaire-core build",                    // mcts parked (app doesn't consume it)
"lint":       "pnpm --filter app lint && pnpm run lint:libs",
"lint:libs":  "eslint packages/core/src packages/mcts/src",
```

Keep `test:libs` as-is (core + mcts). Note `dev` cost: one extra ~1–2 s lib build at startup.

### 2. Shared lint setup for libs

- Add root devDeps: `eslint`, `@eslint/js`, `typescript-eslint` (same majors as app).
- New root `eslint.config.js`: `js.configs.recommended` + `tseslint.configs.recommended`
  over `packages/{core,mcts}/src/**/*.ts`, ignore `**/dist/**`. No React plugins (libs are
  plain TS). Fix any violations it surfaces (expect minor ones, e.g. `any` in
  `core/src/engine/index.ts:32`).

### 3. `.github/workflows/ci.yml`

- **Test job:** after `build:libs`, run `pnpm run test:run` **and** `pnpm run test:libs`.
- **New Typecheck job** (same setup steps): `pnpm run build:libs && pnpm -r typecheck`
  (app's `tsc -b` needs core's `dist/*.d.ts`, hence build first).
- **Build job:** artifact `path: packages/app/dist/`.
- **Lint job:** `pnpm run lint` now also lints libs via the root script (no yml change).

## Compatibility notes

- `build:all` (`pnpm -r build`) still builds mcts — publishing path unaffected.
- mcts tests keep running in CI (cheap, prevents rot) even though it's parked out of
  `build:libs`. Deviation from plan §0.6 ("drop from CI"): keeping tests is nearly free
  and avoids silent decay; the parking benefit was removing it from the app's critical path.

## Acceptance

- Fresh clone: `pnpm install && pnpm dev` serves the app with no manual pre-step.
- CI: typecheck job green; test job runs app + core + mcts suites; build artifact
  contains `index.html`.
- `pnpm run lint` fails on a deliberate lint error placed in `packages/core/src` (spot-check
  locally, then revert).

## Risks

- New lib lint may surface existing violations → fix them in this commit (lint-only edits).
- Root eslint deps must not conflict with the app's versions — match the app's majors.
