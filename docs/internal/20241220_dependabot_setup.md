# Dependabot Setup - Solitaire Monorepo

**Date:** 2024-12-20  
**Task:** Setup Dependabot for automated dependency management

## Configuration Overview

A Dependabot configuration has been added to automatically manage dependencies for this monorepo project.

**File:** `.github/dependabot.yml`

## What's Configured

### 1. npm Dependencies (Monorepo)
- **Target:** Root directory (`/`) - This handles all workspace packages (app, core, mcts)
- **Schedule:** Weekly updates on Monday at 09:00 UTC
- **Grouping Strategy:**
  - **production-dependencies**: All production dependencies grouped together (excluding dev tools)
  - **development-dependencies**: Dev dependencies grouped separately (@types/*, testing libraries, build tools)
- **Commit message prefix:**
  - `deps` for production dependencies
  - `deps-dev` for development dependencies
- **Labels:** `dependencies`, `npm`
- **PR limit:** Up to 10 open PRs

### 2. GitHub Actions
- **Target:** Root directory (`/`) - Checks `.github/workflows/` for action updates
- **Schedule:** Weekly updates on Monday at 09:00 UTC
- **Grouping:** All GitHub Actions updates in a single PR
- **Commit message prefix:** `ci`
- **Labels:** `dependencies`, `github-actions`
- **PR limit:** Up to 5 open PRs

## Why This Configuration?

### Monorepo Best Practices
- **Single root directory:** By targeting `/`, Dependabot updates the root `package-lock.json`, keeping all workspace packages in sync
- **Grouped updates:** Reduces PR noise by bundling related updates together
- **Separate prod/dev groups:** Makes it easier to prioritize critical production dependency updates

### Benefits
1. **Automated security updates:** Dependabot will automatically create PRs for security vulnerabilities
2. **Stay up-to-date:** Regular weekly checks ensure dependencies don't become stale
3. **Reduced maintenance:** Grouped PRs reduce the review burden
4. **CI validation:** All Dependabot PRs will run through the existing CI pipeline (lint, test, build)

## How It Works

1. **Dependabot scans** the repository weekly on Monday mornings
2. **Creates PRs** for outdated dependencies, grouped by configuration
3. **CI runs automatically** on all Dependabot PRs
4. **Manual review & merge** required (can be automated further if desired)

## Expected PR Types

### npm Updates
- "deps: bump production-dependencies group" - Updates to React, Zustand, @dnd-kit, etc.
- "deps-dev: bump development-dependencies group" - Updates to TypeScript, Vite, ESLint, Vitest, etc.

### GitHub Actions Updates
- "ci: bump github-actions group" - Updates to actions/checkout, actions/setup-node, etc.

## Future Enhancements

If needed, the configuration can be extended to:
- Add auto-merge for patch-level updates
- Configure ignore rules for specific dependencies
- Add more granular grouping strategies
- Adjust update frequency (daily for security-critical projects)

## References

- [Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)
- [Dependabot for npm workspaces](https://github.com/dependabot/dependabot-core/issues/4993)
- [Keeping actions up to date](https://docs.github.com/en/code-security/dependabot/working-with-dependabot/keeping-your-actions-up-to-date-with-dependabot)

## Testing

To verify Dependabot is working:
1. Check the "Insights" > "Dependency graph" > "Dependabot" tab in GitHub
2. Wait for the first scheduled run or trigger manually from the GitHub UI
3. Review PRs created by `dependabot[bot]`

## Notes

- Dependabot runs as GitHub Actions workflows (2024 migration)
- No impact on Actions minutes (runs at no cost)
- Dependabot PRs run with read-only tokens (cannot access secrets)
- All updates must pass CI checks before merging
