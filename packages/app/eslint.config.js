import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'coverage']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },

  // -------------------------------------------------------------------------
  // Architectural boundaries (stage-5; see CLAUDE.md and docs/adr/0005).
  // A deliberate exception needs an inline disable WITH a reason:
  //   // eslint-disable-next-line no-restricted-imports -- <why + ADR ref>
  // -------------------------------------------------------------------------

  // 1. ai/ must never import the store — store access is injected
  //    (AdvisorDeps, stage-2a), keeping the advisor store-agnostic.
  {
    files: ['src/ai/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/store/**', '../store', '../store/*'],
              message:
                'ai/ receives store access via AdvisorDeps injection (stage-2a); never import the store.',
            },
          ],
        },
      ],
    },
  },

  // 2. Components and hooks consume the ai/ public surface (src/ai/index.ts)
  //    and the provider registry — never internal modules or concrete
  //    providers — and never mutate the board through the engine directly.
  {
    files: ['src/components/**/*.{ts,tsx}', 'src/hooks/**/*.{ts,tsx}'],
    ignores: ['**/*.test.*'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/ai/*', '**/ai/*/**', '!**/ai/index'],
              message: "Import from the ai/ public surface ('../ai') — not internal modules.",
            },
          ],
          paths: [
            {
              name: '@chayuto/solitaire-core',
              importNames: ['GameEngine'],
              message: 'Board mutations go through store actions (ADR-0005), not a direct engine instance.',
            },
          ],
        },
      ],
    },
  },
])
