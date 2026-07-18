# ADR-0004: E2E runs in the official Playwright container, tag locked to the dep version

**Date:** 2026-05 (PRs #193, #195) · **Status:** accepted · **Amended:** 2026-07-17

## Context

`playwright install` browser downloads stalled CI on CDN hiccups. The official image
(`mcr.microsoft.com/playwright:vX.Y.Z-noble`) has browsers baked in — but only for its
exact Playwright version; a mismatch silently falls back to downloading again.

## Decision

The CI e2e job and the post-deploy smoke job run inside the official Playwright
container. The image tag version **must equal** the `@playwright/test` version in
`packages/app/package.json`. Bumping one without the other is a defect. (Stage 4 of
the 2026-06-10 plan adds a CI guard script that fails fast on mismatch.)

## Consequences

- No browser-download step in CI; e2e is fast and CDN-immune.
- Dependabot bumps of `@playwright/test` require a matching image-tag edit in
  `.github/workflows/ci.yml` and `deploy.yml` in the same PR.

## Amendment (2026-07-17)

The manual lockstep proved a recurring chore: every Dependabot bump of
`@playwright/test` failed the e2e job by design (guard script) and needed a
human to push the matching tag edit — Dependabot PRs could never merge on
their own (first hit: PR #221).

Both workflows now **derive** the image tag from the dependency instead of
hardcoding it: a small `playwright-version` job reads the `@playwright/test`
version from `packages/app/package.json` and feeds it into the e2e/smoke
job's `container.image` expression
(`mcr.microsoft.com/playwright:v${{ needs.playwright-version.outputs.version }}-noble`).

- The lockstep is now structural — the tag *cannot* drift, so the guard script
  (`scripts/check-playwright-lockstep.mjs`) is retired.
- Dependabot Playwright bumps pass CI without manual edits.
- If version extraction ever breaks, the derived tag is invalid and the job
  fails loudly at image pull — never the silent browser-download fallback this
  ADR exists to prevent.
