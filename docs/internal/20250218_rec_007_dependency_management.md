# Recommendation: Automated Dependency Management

**Date:** 2025-02-18
**Status:** Proposed

## Context
Outdated dependencies are a security risk and a technical debt. Manually checking for updates is tedious and error-prone.

## Proposal
Configure Renovate or Dependabot.

## Detailed Recommendations

### 1. Renovate (Preferred)
Renovate offers more configuration options than Dependabot.
- **Config**: Create `renovate.json`.
- **Grouping**: Group updates (e.g., "all react packages", "all dev dependencies") to reduce PR noise.
- **Automerge**: Safe updates (minor/patch versions that pass tests) can be auto-merged.

### 2. Lockfile Maintenance
Ensure `package-lock.json` is always committed and respected. CI should use `npm ci`, not `npm install`.

### 3. Engine Pinning
Strictly define `engines` in `package.json` (node, npm versions) to ensure reproducible environments.

## Benefits
- **Security**: Patches are applied immediately.
- **Maintenance**: "Update dependencies" becomes a background task rather than a quarterly chore.
