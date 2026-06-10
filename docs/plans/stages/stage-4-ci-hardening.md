# Stage 4 — CI hardening

**Parent plan:** §4 Phase 4
**Behavior change:** none (CI/tooling)
**Lands as:** one commit

## Changes

### 1. Composite setup action

`.github/actions/setup/action.yml` (composite): checkout is left in each job (composite
actions can't checkout first), then pnpm setup → node 24 + pnpm cache → 
`pnpm install --frozen-lockfile` → `pnpm run build:libs`. Replaces the 5 copies of the
block across `ci.yml` (4 jobs incl. the Stage 0a typecheck job) and `deploy.yml`
(build + smoke jobs). Inputs: none initially (keep it dumb).

### 2. Coverage

- Add `@vitest/coverage-v8` to `packages/app` and `packages/core` devDeps (the
  copilot doc has noted it missing for months).
- `test:coverage` scripts: `vitest run --coverage`.
- Thresholds in vite/vitest config — `packages/core`: lines 90% (it's a pure library,
  currently well-tested); `packages/app`: lines 60% to start (no ratchet theater;
  raise after Stage 2b lands and slices are unit-testable).
- CI Test job runs the coverage variant; upload `coverage/` as an artifact
  (7-day retention). No external coverage service.

### 3. Playwright lockstep guard (enforces ADR-0004)

`scripts/check-playwright-lockstep.mjs` (node, no deps):

1. Read `@playwright/test` version from `packages/app/package.json` (strip `^`).
2. Grep `.github/workflows/*.yml` for `mcr.microsoft.com/playwright:v<version>-`.
3. Exit 1 with a fix-it message if any workflow image tag mismatches.

Wire as the first step of the e2e job (fails in seconds, before installs) and into the
deploy smoke job. This converts the comment-based convention (`ci.yml:106–111`) into an
enforced invariant — Dependabot bumping `@playwright/test` now fails CI until the image
tags are bumped in lockstep, instead of silently re-downloading browsers.

### 4. Deliberately skipped (recorded so it isn't re-litigated)

- **Repo-wide Prettier reformat** — pollutes blame across every file for zero behavior
  value; the codebase is already consistently formatted. Revisit only as
  format-on-touch.
- **Husky/pre-commit hooks** — CI is the gate; local hooks slow down the loop and
  surprise agent sessions.
- **External coverage/quality services** — artifact upload suffices at this scale.

## Acceptance

- `ci.yml` + `deploy.yml` contain one copy of the setup logic (the composite) per job,
  not five inline copies.
- Editing the Playwright image tag to a wrong version fails the e2e job's first step.
- Coverage artifact appears on CI runs; thresholds fail the job when violated.

## Risks

- Composite action paths are relative to the repo — use `uses: ./.github/actions/setup`.
- Coverage thresholds set too aggressively cause red CI noise → start at the measured
  baseline minus a small margin (measure locally first, then set).
