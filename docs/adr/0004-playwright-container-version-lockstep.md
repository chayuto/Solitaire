# ADR-0004: E2E runs in the official Playwright container, tag locked to the dep version

**Date:** 2026-05 (PRs #193, #195) · **Status:** accepted

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
