// Root ESLint config — lints the library packages (core, mcts), which are plain
// TypeScript with no DOM/React. The app keeps its own config in
// packages/app/eslint.config.js (React plugins, browser globals).
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['**/dist/**', '**/node_modules/**', '**/coverage/**', 'packages/app/**']),
  {
    files: ['packages/core/src/**/*.ts', 'packages/mcts/src/**/*.ts', 'packages/mcts/tests/**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
  },
  {
    // Boundary: core is the foundation — it must never import from the app
    // or the mcts package (belt-and-braces; a stray relative path would
    // otherwise compile).
    files: ['packages/core/src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/packages/app/**', '**/packages/mcts/**', '@chayuto/solitaire-mcts'],
              message: 'core imports nothing from app or mcts (see docs/architecture.md).',
            },
          ],
        },
      ],
    },
  },
  {
    // Tests legitimately cast to invalid shapes (`as any`) to exercise error paths.
    files: ['**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
])
