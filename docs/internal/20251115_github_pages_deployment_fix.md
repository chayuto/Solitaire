# GitHub Pages Deployment Fix

**Date:** 2025-11-15  
**Issue:** GitHub Pages deployment failing with "dist: Cannot open: No such file or directory"  
**Status:** ✅ Fixed

## Problem Statement

The GitHub Pages deployment workflow was failing during the artifact upload step with the following error:

```
tar: dist: Cannot open: No such file or directory
tar: Error is not recoverable: exiting now
Process completed with exit code 2.
```

The workflow was attempting to upload artifacts from `./dist`, but this directory did not exist at the repository root.

## Root Cause

The repository uses a **monorepo structure** with npm workspaces:

```
/
├── packages/
│   ├── app/          # Main Solitaire React application
│   ├── core/         # Core game logic
│   └── mcts/         # Monte Carlo Tree Search
├── package.json      # Root package.json with workspace delegation
└── .github/
    └── workflows/
        └── deploy.yml
```

The root `package.json` delegates all commands to the `app` workspace:

```json
{
  "scripts": {
    "build": "npm run build -w app"
  }
}
```

When `npm run build` is executed, it runs `vite build` in the `packages/app` directory, which creates the output at `./packages/app/dist`, **not** at the root `./dist`.

## Solution

Updated `.github/workflows/deploy.yml` to reference the correct build output path:

```yaml
- name: Upload artifact
  uses: actions/upload-pages-artifact@v3
  with:
    path: './packages/app/dist'  # Changed from './dist'
```

## Changes Made

- **File:** `.github/workflows/deploy.yml`
- **Line 52:** Changed artifact path from `'./dist'` to `'./packages/app/dist'`
- **Impact:** Single line change, no breaking changes

## Verification

All CI checks pass after the fix:

✅ **Lint:** ESLint passes with no errors  
✅ **Test:** 79 tests pass (7 test files)  
✅ **Build:** Vite build completes successfully, creating:
  - `packages/app/dist/index.html`
  - `packages/app/dist/assets/` (CSS and JS bundles)
  - `packages/app/dist/vite.svg`

### Build Output Verification

```bash
$ npm run build
> app@0.0.0 build
> tsc -b && vite build

vite v7.2.2 building client environment for production...
✓ 444 modules transformed.
dist/index.html                   0.49 kB │ gzip:   0.30 kB
dist/assets/index-BOTZoqC_.css   26.09 kB │ gzip:   5.43 kB
dist/assets/index-BiB3Sx9V.js   355.78 kB │ gzip: 110.83 kB
✓ built in 1.95s

$ ls -la packages/app/dist/
total 20
drwxr-xr-x 3 runner runner 4096 Nov 15 14:51 .
drwxr-xr-x 6 runner runner 4096 Nov 15 14:51 ..
drwxr-xr-x 2 runner runner 4096 Nov 15 14:51 assets
-rw-r--r-- 1 runner runner  491 Nov 15 14:51 index.html
-rw-r--r-- 1 runner runner 1497 Nov 15 14:51 vite.svg
```

## Expected Outcome

The GitHub Pages deployment workflow will now:

1. ✅ Run `npm run build` successfully
2. ✅ Find the build artifacts at `./packages/app/dist`
3. ✅ Upload the artifacts to GitHub Pages
4. ✅ Deploy the site to the configured GitHub Pages URL

## Notes

- The CI workflow (`.github/workflows/ci.yml`) does not have this issue because it uploads artifacts using `path: dist/` which is relative to the workspace context
- This fix maintains consistency with the monorepo structure without requiring restructuring
- No changes to build scripts or application code were necessary

## Related Files

- `.github/workflows/deploy.yml` - Fixed deployment workflow
- `.github/workflows/ci.yml` - Reference CI workflow (no changes needed)
- `package.json` - Root package.json with workspace delegation
- `packages/app/package.json` - App workspace package.json
- `packages/app/vite.config.ts` - Vite configuration (default output: `dist/`)
