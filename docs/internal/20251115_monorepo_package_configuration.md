# Monorepo Package Configuration Implementation

**Date:** 2025-11-15  
**Tasks:** TASK-002, TASK-003, TASK-004  
**Status:** ✅ Complete

## Overview

This document summarizes the implementation of the monorepo package configuration for the Solitaire project. The work involved setting up two library packages (`@chayuto/solitaire-core` and `@chayuto/solitaire-mcts`) with proper build tooling, TypeScript configuration, and workspace integration.

## Objectives Achieved

### TASK-002: Set up Library 1 package configuration
✅ Created `@chayuto/solitaire-core` package structure  
✅ Configured for dual ESM/CJS builds with TypeScript declarations  
✅ Set up Vite build system with vite-plugin-dts  
✅ Implemented directory structure: types/, engine/, rules/, utils/, scoring/  
✅ Build succeeds: `npm run build -w @chayuto/solitaire-core`

### TASK-003: Set up Library 2 package configuration
✅ Created `@chayuto/solitaire-mcts` package structure  
✅ Configured peer dependency on `@chayuto/solitaire-core ^0.1.0`  
✅ Set up identical build system with proper externalization  
✅ Build succeeds: `npm run build -w @chayuto/solitaire-mcts`

### TASK-004: Configure shared TypeScript build
✅ Created `tsconfig.base.json` at repository root  
✅ All packages extend base config  
✅ Workspace-wide builds succeed: `npm run build:all`  
✅ Type checking works across all packages

## Implementation Details

### 1. Root Configuration

#### tsconfig.base.json
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020"],
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true
  }
}
```

Key decisions:
- **ES2020 target**: Modern JavaScript with good browser support
- **Strict mode**: Ensures type safety across all packages
- **Bundler resolution**: Works with Vite and modern build tools
- **Declaration files**: Required for library packages

#### Root package.json Scripts
```json
{
  "build:libs": "npm run build -w @chayuto/solitaire-core && npm run build -w @chayuto/solitaire-mcts",
  "build:all": "npm run build --workspaces --if-present",
  "test:libs": "npm run test -w @chayuto/solitaire-core && npm run test -w @chayuto/solitaire-mcts",
  "typecheck": "npm run typecheck --workspaces --if-present"
}
```

### 2. @chayuto/solitaire-core Package

#### Directory Structure
```
packages/core/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── .npmignore
├── README.md
├── src/
│   ├── index.ts
│   ├── types/index.ts
│   ├── engine/index.ts
│   ├── rules/index.ts
│   ├── utils/index.ts
│   └── scoring/index.ts
└── tests/
    └── index.test.ts
```

#### Package Configuration Highlights

**Dual Module Format:**
- ESM: `dist/index.js`
- CJS: `dist/index.cjs`
- Types: `dist/index.d.ts`

**Exports Field:**
```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  }
}
```

Note: "types" must come first in the exports to avoid warnings.

**Build System:**
- Vite 7.2.2 for fast bundling
- vite-plugin-dts for TypeScript declaration generation
- Sourcemaps enabled for debugging
- Tree-shaking friendly (sideEffects: false)

#### Vite Configuration
```typescript
import { defineConfig } from 'vite'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [dts({ rollupTypes: true })],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'SolitaireCore',
      formats: ['es', 'cjs'],
      fileName: (format) => format === 'es' ? 'index.js' : 'index.cjs'
    },
    sourcemap: true,
  },
  test: {
    globals: true,
    environment: 'node',
  },
})
```

Key features:
- `rollupTypes: true`: Bundles all type declarations into single file
- Library mode with explicit format configuration
- Node test environment (no DOM needed)

### 3. @chayuto/solitaire-mcts Package

Similar structure to core package with additional configurations:

**Peer Dependency:**
```json
{
  "peerDependencies": {
    "@chayuto/solitaire-core": "^0.1.0"
  }
}
```

**Externalized Dependencies:**
```typescript
export default defineConfig({
  build: {
    rollupOptions: {
      external: ['@chayuto/solitaire-core'],
    },
  },
})
```

This ensures the core package is not bundled into mcts, allowing consumers to provide their own version.

### 4. App Package Updates

Updated `packages/app/tsconfig.app.json` to extend base config:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    // App-specific overrides
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "noEmit": true,
    // ... other React-specific settings
  }
}
```

Strategy: Extend base for common settings, override for React-specific needs.

## Build Artifacts

Each library package generates:

```
dist/
├── index.js        # ESM bundle
├── index.js.map    # ESM sourcemap
├── index.cjs       # CommonJS bundle
├── index.cjs.map   # CJS sourcemap
└── index.d.ts      # TypeScript declarations
```

All artifacts are:
- Minified for production
- Include sourcemaps for debugging
- Type-safe with full declaration files

## Testing Infrastructure

Added basic test infrastructure for both libraries:

**Core:**
```typescript
import { describe, it, expect } from 'vitest'
import { VERSION } from '../src/index'

describe('@chayuto/solitaire-core', () => {
  it('should export VERSION', () => {
    expect(VERSION).toBe('0.1.0')
  })
})
```

This provides:
- Vitest test runner configured
- Basic smoke test to ensure build works
- Foundation for future unit tests

## Validation Results

All acceptance criteria met:

### Build Validation
```bash
$ npm run build:all
✓ app@0.0.0 build: 1.90s
✓ @chayuto/solitaire-core@0.1.0 build: 2.14s
✓ @chayuto/solitaire-mcts@0.1.0 build: 2.13s
```

### Type Checking
```bash
$ npm run typecheck
✓ @chayuto/solitaire-core@0.1.0 typecheck
✓ @chayuto/solitaire-mcts@0.1.0 typecheck
```

### Testing
```bash
$ npm run test:libs
✓ core: 1 test passed
✓ mcts: 1 test passed

$ npm run test:run (app)
✓ 79 tests passed
```

### Linting
```bash
$ npm run lint
✓ No ESLint errors
```

## Key Decisions and Trade-offs

### 1. Workspace Protocol
**Decision:** Use version range (`^0.1.0`) instead of `workspace:*`  
**Reason:** npm doesn't support the `workspace:*` protocol; pnpm and Yarn do  
**Impact:** Must manually update version in peer dependency when core version changes

### 2. TypeScript Version Warning
**Observed:** vite-plugin-dts warns about TypeScript 5.9.3 vs bundled 5.8.2  
**Decision:** Accept warning for now  
**Reason:** Doesn't affect functionality; upgrading API Extractor is out of scope  
**Future:** Consider using newer dts plugin or pinning TypeScript version

### 3. Directory Structure
**Decision:** Create all subdirectories (types, engine, rules, utils, scoring) upfront  
**Reason:** Matches task requirements; provides clear organization for future code  
**Impact:** Empty placeholder files for now; will be populated in future tasks

### 4. Build Tool Choice
**Decision:** Use Vite for all library packages  
**Reason:** 
- Already used in app package
- Fast builds
- Excellent TypeScript support
- Modern ESM-first approach
**Alternative considered:** tsc + rollup (more complex setup)

### 5. Test Infrastructure
**Decision:** Add minimal tests now, expand later  
**Reason:** Satisfies "build succeeds" acceptance criteria without overengineering  
**Future:** Add comprehensive test suites when implementing actual functionality

## Dependencies Added

### packages/core/package.json
- `vite-plugin-dts@^4.3.0` (dev) - TypeScript declaration generation

### packages/mcts/package.json
- `vite-plugin-dts@^4.3.0` (dev) - TypeScript declaration generation

Total new dependencies: 79 packages (mostly transitive from vite-plugin-dts)

## File Changes Summary

**Created:**
- `tsconfig.base.json` (shared config)
- `packages/core/`: 10 files (config, src, tests, docs)
- `packages/mcts/`: 10 files (config, src, tests, docs)

**Modified:**
- `package.json` (root scripts)
- `package-lock.json` (new dependencies)
- `packages/app/tsconfig.app.json` (extend base)
- `packages/core/package.json` (from stub to full config)
- `packages/mcts/package.json` (from stub to full config)
- `packages/core/README.md` (documentation)
- `packages/mcts/README.md` (documentation)

**Total LOC:** ~300 lines of configuration code

## Next Steps

### Immediate (TASK-005+)
1. Implement actual game logic in `@chayuto/solitaire-core`
2. Implement MCTS solver in `@chayuto/solitaire-mcts`
3. Add comprehensive test suites
4. Set up CI/CD for library publishing

### Future Enhancements
1. Consider using TypeScript project references for better incremental builds
2. Add documentation generation (e.g., TypeDoc)
3. Set up automated version bumping and changelog generation
4. Add performance benchmarks for libraries

## Lessons Learned

1. **npm workspace protocol:** Not all workspace features are universal across package managers
2. **Export order matters:** TypeScript "types" export must come first in package.json exports field
3. **Vite library mode:** Simple and powerful for building TypeScript libraries
4. **Incremental approach:** Starting with minimal configuration and expanding is better than overengineering

## Conclusion

The monorepo package configuration is now complete and fully functional. Both library packages (`@chayuto/solitaire-core` and `@chayuto/solitaire-mcts`) are:

- ✅ Properly configured with dual ESM/CJS builds
- ✅ Generate TypeScript declaration files
- ✅ Extend shared base TypeScript configuration
- ✅ Include basic test infrastructure
- ✅ Integrated with workspace-wide build scripts
- ✅ Pass all validation checks (lint, test, build, typecheck)

The foundation is solid for implementing the actual game logic and MCTS solver in subsequent tasks.

---

**Implementation Time:** ~2 hours  
**Complexity:** Medium (configuration and tooling setup)  
**Risk Level:** Low (no breaking changes to existing app)
