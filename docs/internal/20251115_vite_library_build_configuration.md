# TASK-005: Vite Library Build Configuration

**Date:** 2025-11-15  
**Task:** Configure Vite for library builds (ESM and CJS outputs)  
**Status:** ✅ Complete

## Summary

Successfully configured Vite build system for both `@chayuto/solitaire-core` and `@chayuto/solitaire-mcts` packages to produce dual-format library builds with complete type definitions and sourcemaps.

## Changes Made

### 1. Updated `packages/core/vite.config.ts`

Added the following configuration options to match TASK-005 requirements:

- **fileName format**: Updated to use template literal syntax for consistency
- **rollupOptions.output.exports**: Set to `'named'` for proper CommonJS compatibility
- **minify**: Set to `false` with comment for debugging readability

### 2. Updated `packages/mcts/vite.config.ts`

Applied identical changes to the MCTS package configuration:

- **fileName format**: Updated to template literal syntax
- **rollupOptions.output.exports**: Set to `'named'`
- **minify**: Set to `false` with explanatory comment

## Build Outputs

Both packages now generate the following artifacts in their `dist/` directories:

### ESM Output
- **index.js** - ES Module format
- **index.js.map** - Sourcemap for ESM

### CJS Output
- **index.cjs** - CommonJS format  
- **index.cjs.map** - Sourcemap for CJS

### Type Declarations
- **index.d.ts** - TypeScript type definitions (bundled via vite-plugin-dts)

## Verification

All acceptance criteria verified:

✅ **Vite config in both packages**: `core` and `mcts` both configured  
✅ **Build produces ESM (.js) and CJS (.cjs)**: Both formats generated  
✅ **Type declarations (.d.ts) generated**: Single bundled declaration file created  
✅ **Sourcemaps included**: Both `.js.map` and `.cjs.map` present  

## Testing Results

- **Build**: ✅ Both packages build successfully
- **Tests**: ✅ All tests pass (1/1 for core, 1/1 for mcts)
- **TypeCheck**: ✅ No TypeScript errors

## Configuration Details

### Key Vite Build Options

```typescript
build: {
  lib: {
    entry: resolve(__dirname, 'src/index.ts'),
    name: 'SolitaireCore', // or 'SolitaireMCTS'
    formats: ['es', 'cjs'],
    fileName: (format) => `index.${format === 'es' ? 'js' : 'cjs'}`,
  },
  rollupOptions: {
    external: [], // or ['@chayuto/solitaire-core'] for mcts
    output: {
      exports: 'named', // Ensures proper CommonJS exports
    },
  },
  sourcemap: true, // Generate sourcemaps
  minify: false, // Keep readable for debugging
}
```

### Package.json Exports

Both packages use the modern `exports` field for proper dual-format support:

```json
{
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  }
}
```

## Notes

- **vite-plugin-dts**: Already configured with `rollupTypes: true` to bundle type declarations
- **No breaking changes**: Configuration updates are additive and maintain backward compatibility
- **Performance**: Unminified builds are slightly larger but more debuggable as intended
- **Dependencies**: MCTS package correctly declares `@chayuto/solitaire-core` as external dependency

## Commands

```bash
# Build both libraries
npm run build:libs

# Test both libraries  
npm run test:libs

# Type check all packages
npm run typecheck
```

## Estimated vs Actual

- **Estimated Time**: 2 hours
- **Actual Time**: ~30 minutes (configuration was mostly in place)
- **Estimated LOC**: 50 (config)
- **Actual LOC**: ~10 lines changed (minor adjustments to existing config)

## Dependencies

- ✅ TASK-002: Package structure (completed)
- ✅ TASK-003: TypeScript configuration (completed)
