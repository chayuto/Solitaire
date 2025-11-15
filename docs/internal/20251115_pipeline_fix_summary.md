# Pipeline Fix Summary - November 15, 2025

## Issue Overview

The CI pipeline was failing with the error:
```
Error: Failed to resolve entry for package "@chayuto/solitaire-core". 
The package may have incorrect main/module/exports specified in its package.json.
```

This occurred when running tests in the `app` package that imported from `@chayuto/solitaire-core`.

## Root Cause Analysis

The Solitaire project is a monorepo with the following structure:
- `packages/core/` - Core game logic library (`@chayuto/solitaire-core`)
- `packages/mcts/` - Monte Carlo Tree Search library (`@chayuto/solitaire-mcts`)
- `packages/app/` - React frontend application (depends on core and mcts)

The issue occurred because:
1. The `app` package imports from `@chayuto/solitaire-core` in its tests
2. The `core` package needs to be built (via `vite build`) to generate the `dist/` folder
3. The `package.json` in `core` points to `dist/index.js` as the entry point
4. The CI workflow was running `npm ci` then immediately running tests
5. Without building the libraries first, the `dist/` folder didn't exist
6. This caused the import to fail with "Failed to resolve entry for package"

## Solution

Added a `Build libraries` step to both CI workflows (`ci.yml` and `deploy.yml`) that runs **after** `npm ci` and **before** any lint/test/build operations.

### Changes Made

#### `.github/workflows/ci.yml`
Added the following step to all three jobs (lint, test, build):
```yaml
- name: Build libraries
  run: npm run build:libs
```

#### `.github/workflows/deploy.yml`
Added the same step to the build job:
```yaml
- name: Build libraries
  run: npm run build:libs
```

### What `npm run build:libs` Does

From `package.json` in the root:
```json
"build:libs": "npm run build -w @chayuto/solitaire-core && npm run build -w @chayuto/solitaire-mcts"
```

This command:
1. Builds `@chayuto/solitaire-core` using `vite build` (generates `packages/core/dist/`)
2. Builds `@chayuto/solitaire-mcts` using `vite build` (generates `packages/mcts/dist/`)
3. Creates the necessary entry points that the app package depends on

## Verification

### Local Testing
Simulated a clean CI environment by:
1. Removing all `dist/` folders
2. Running `npm ci` (fresh install)
3. Running `npm run build:libs` (build libraries)
4. Running `npm run test:run` (run tests)
5. Running `npm run lint` (lint code)
6. Running `npm run build` (build app)

All commands passed successfully.

### Test Results
- **Core package**: 249 tests passed
- **MCTS package**: 1 test passed
- **App package**: 90 tests passed
- **Total**: 340 tests passing

### Build Results
- Core library: 26.77 kB (gzip: 5.89 kB)
- MCTS library: 0.08 kB (gzip: 0.10 kB)
- App bundle: 357.56 kB (gzip: 111.21 kB)

### Application Verification
- Started dev server successfully on http://localhost:5173/Solitaire/
- Verified the Solitaire game loads and renders correctly
- All game features functional (cards, tableau, foundations, controls)

## Impact

### Before Fix
- CI pipeline failed at test stage
- Error: "Failed to resolve entry for package @chayuto/solitaire-core"
- 6 test files failed out of 8

### After Fix
- All CI jobs will pass (lint, test, build)
- 8/8 test files pass (90 tests in app package)
- Libraries build successfully before being imported
- Deploy workflow will also work correctly

## Workflow Execution Order

### CI Workflow (ci.yml)
Each job now follows this sequence:
1. Checkout code
2. Setup Node.js 20
3. Install dependencies (`npm ci`)
4. **Build libraries** (`npm run build:libs`) ← **NEW STEP**
5. Run job-specific command (lint/test/build)

### Deploy Workflow (deploy.yml)
1. Checkout code
2. Setup Node.js 20
3. Install dependencies (`npm ci`)
4. **Build libraries** (`npm run build:libs`) ← **NEW STEP**
5. Lint
6. Test
7. Build
8. Deploy to GitHub Pages

## Lessons Learned

1. **Monorepo Dependencies**: In a workspace/monorepo setup, internal package dependencies must be built before they can be imported, even for local development
2. **Build Order Matters**: CI pipelines need to respect the dependency graph and build order
3. **Test Environment**: Tests run in a Node environment need the actual compiled output, not just TypeScript source files
4. **Root Scripts**: The root `package.json` scripts use workspace flags (`-w`) to target specific packages, making it easy to orchestrate builds

## Future Considerations

1. **Caching**: Could add caching for the library `dist/` folders in CI to speed up builds
2. **Build Script**: Could create a single `npm run build:all` script that builds libraries and app in order
3. **Workspace Build Tools**: Consider tools like Turborepo or Nx for more sophisticated monorepo build orchestration
4. **Type Checking**: The libraries use TypeScript 5.9.3 but the bundled API Extractor uses 5.8.2 - consider upgrading or pinning versions

## Files Modified

1. `.github/workflows/ci.yml` - Added library build step to lint, test, and build jobs
2. `.github/workflows/deploy.yml` - Added library build step to deploy job

## Testing Commands

To reproduce the fix locally:
```bash
# Clean environment
rm -rf packages/*/dist packages/app/dist

# Install and build (CI simulation)
npm ci
npm run build:libs

# Verify everything works
npm run lint        # Should pass
npm run test:run    # Should pass (90 tests)
npm run test:libs   # Should pass (250 tests)
npm run build       # Should pass
```

## Conclusion

The pipeline error was successfully fixed by adding a library build step to the CI workflows. This ensures that `@chayuto/solitaire-core` and `@chayuto/solitaire-mcts` are built before any code tries to import from them. The fix is minimal, surgical, and follows the existing patterns in the codebase.

All 340 tests pass, and the application runs correctly both in development and production builds.
