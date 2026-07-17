# Playwright container image tag now derived from package.json

**Date:** 2026-07-17

## What changed

- `ci.yml` and `deploy.yml` each gained a small `playwright-version` job that
  reads the `@playwright/test` version from `packages/app/package.json` and
  exposes it as a job output.
- The e2e job (ci) and post-deploy smoke job (deploy) now set their container
  image to `mcr.microsoft.com/playwright:v${{ needs.playwright-version.outputs.version }}-noble`
  instead of a hardcoded tag.
- `scripts/check-playwright-lockstep.mjs` (the CI guard that failed on tag
  mismatch) is deleted — with a derived tag there is no mismatch to guard.
- ADR-0004 amended; CLAUDE.md and `.github/copilot-instructions.md` updated.

## Why

Dependabot bumps of `@playwright/test` could never merge on their own: the
guard failed the e2e job by design and a human had to push the matching
image-tag edit (first hit: PR #221, `1.59.1 → 1.60.0`). Deriving the tag makes
the lockstep structural — Dependabot Playwright bumps now go green without
manual intervention.

## Failure mode

If version extraction breaks, the image tag is malformed and the job fails
loudly at image pull. The silent browser-download fallback ADR-0004 protects
against cannot occur.
