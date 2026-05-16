# Copilot Agent Instructions for Solitaire Repository

## Repository Overview

**Solitaire (Klondike) card game** - Monorepo with game logic libraries and React app.

**Stack:** React 19.2 + TypeScript 5.9 + Vite 8 + Zustand 5.0 + Tailwind 4 + Vitest 4 + Playwright | Node 24.x LTS + pnpm 11 | Monorepo (3 packages)

## Essential Commands

**ALWAYS run `npm ci` first, then `npm run build:libs`** to build core library before running app.

```bash
npm ci                  # Install all workspace dependencies
npm run build:libs      # Build @chayuto/solitaire-core and @chayuto/solitaire-mcts
npm run lint            # ESLint (~1-2s) - Must pass for CI
npm run test:run        # Vitest (~1s, 90 tests) - Must pass for CI
npm run build           # App build: tsc -b && vite build (~1-2s) - Must pass for CI
npm run build:all       # Build all packages
npm run dev             # Dev server :5173 (~200ms)
npm run preview         # Preview build :4173
npm test                # Tests in watch mode
npm run test:libs       # Test core and mcts libraries
npm run typecheck       # Type check all packages
```

**Known Issue:** `npm run test:coverage` requires missing `@vitest/coverage-v8` - skip unless specifically needed.

## CI/CD - Must Pass All Jobs

`.github/workflows/ci.yml` runs 4 parallel jobs: **Lint**, **Test**, **E2E**, **Build** on Node 24 + pnpm 11. Each installs deps, runs `build:libs`, then its command (E2E also installs the Playwright Chromium browser).

**Validate before committing:** `pnpm install && pnpm run build:libs && pnpm run lint && pnpm run test:run && pnpm run build` (must all pass; run `pnpm run test:e2e` for UI changes)

## High-Fidelity / Agentic Testing

The app supports deterministic, agent-friendly UI testing — see the
`high-fidelity-frontend-testing` skill (`.claude/skills/`).

- **Seeds:** `/?seed=42` (and `&difficulty=1..5`) give an identical deal every
  run (`packages/app/src/store/urlConfig.ts`).
- **Test bridge:** `window.__solitaire` (`packages/app/src/testBridge.ts`) — a
  typed API to introspect and drive the game.
- **Selectors:** cards/piles/controls carry `data-testid`; add them to new
  interactive elements.
- **e2e:** `packages/app/e2e/*.spec.ts` (Playwright); `pnpm run test:e2e`.
- **Playwright MCP:** `.mcp.json` registers `@playwright/mcp`.

## Monorepo Structure

```
/
├── packages/
│   ├── core/                  # @chayuto/solitaire-core v0.1.0
│   │   ├── src/
│   │   │   ├── types/        # Core game types (Card, GameState, Move, etc.)
│   │   │   ├── utils/        # Card/deck utils, validation, hashing
│   │   │   ├── rules/        # Game rules (tableau, foundation, stock)
│   │   │   ├── scoring/      # Difficulty & progress calculation
│   │   │   ├── engine/       # Game engine
│   │   │   └── index.ts      # Public API
│   │   ├── tests/            # Core library tests
│   │   ├── vite.config.ts    # Library build config
│   │   └── package.json      # ESM + CJS, zero dependencies
│   │
│   ├── mcts/                  # @chayuto/solitaire-mcts v0.1.0
│   │   ├── src/              # MCTS solver (placeholder)
│   │   └── package.json      # Depends on @chayuto/solitaire-core
│   │
│   └── app/                   # Main application
│       ├── src/
│       │   ├── components/   # React components (8 total)
│       │   ├── store/
│       │   │   ├── gameStore.ts    # Zustand store (uses @chayuto/solitaire-core)
│       │   │   └── uiHelpers.ts    # UI-specific helpers (90 tests)
│       │   ├── adapters/     # Core↔UI state adapters
│       │   ├── constants/    # UI-specific constants
│       │   ├── types/        # UI-specific types
│       │   └── App.tsx       # Main App component
│       ├── vite.config.ts    # App build config
│       └── package.json      # Depends on @chayuto/solitaire-core
│
├── package.json              # Root workspace config (npm workspaces)
├── tsconfig.base.json        # Shared TypeScript config
└── docs/                     # Documentation
    ├── internal/             # Architecture & planning docs
    └── reports/              # Task reports

Build outputs: packages/*/dist/ (ignored), node_modules/ (ignored)
```

## Architecture

**@chayuto/solitaire-core (pure game logic library):**
- Zero dependencies, framework-agnostic
- Types: Card, GameState, Move, Difficulty, Foundations
- Utils: Card/deck creation, shuffle, validation, hashing
- Rules: canMoveToTableau(), canMoveToFoundation(), draw(), recycle()
- Scoring: getCompletionProgress(), getPerceivedDifficulty()
- Engine: GameEngine class (initialize, applyMove, getLegalMoves)
- Build: ESM + CJS + TypeScript declarations

**packages/app/src/store/gameStore.ts (Zustand store):**
- Imports game logic from @chayuto/solitaire-core
- Wraps core functions with UI state management
- Handles card selection, move execution, autoplay, replay
- 90 tests covering all game scenarios

**packages/app/src/store/uiHelpers.ts (UI-specific helpers):**
- getGameStateHash() - Loop detection for autoplay
- getStateHashAfterMove() - Predictive hashing
- hasAnyValidDestination() - Card selection logic
- hasAnyValidMoves() - Deadend detection
- isGameWon() - Win condition check
- canAutoComplete() - Autoplay trigger

**packages/app/src/adapters/coreAdapter.ts:**
- uiToCore() - Convert UI GameState to Core GameState
- coreToUI() - Convert Core GameState back to UI GameState

**Components:** GameBoard → ControlPanel + ActivityLog + DrawPile + DiscardPile + FoundationPile×4 + TableauColumn×7
All use `useGameStore()` hook. @dnd-kit for drag-and-drop.

**Tests:** `.test.ts`/`.test.tsx` next to source. Vitest + @testing-library/react. 90 tests total.

## Key Config Notes

**TypeScript:** tsconfig.app.json (strict mode), tsconfig.node.json (vite config)
**ESLint:** Flat config (v9+), ignores dist/
**Vite:** vite.config.ts has React plugin + Vitest (jsdom)
**Tailwind:** Scans index.html + src/**/*.{js,ts,jsx,tsx}

## Patterns & Conventions

**Adding game logic features:** Update packages/core/src/ → rebuild libs → update app → tests → lint/build

**Adding UI features:** Update packages/app/src/ (components/store) → add .test.ts → lint/test/build

**Style:** Functional React + strict TypeScript (no `any`), Tailwind utilities, Zustand `useGameStore()` hook
**Naming:** PascalCase.tsx (components), camelCase.ts (utils), .test.ts/.test.tsx (tests)
**Imports:** 
- Core library: `import { canMoveToTableau } from '@chayuto/solitaire-core'`
- Types: `import type { Card } from '../types'`
- Relative paths for local modules
- Named exports (except React components)

## Agent Workflow Guidelines

**Analysis & Research:**
- Spend as much time as needed to analyze and understand the context before making changes
- ALWAYS check online references/documentation if applicable to ensure accuracy and best practices

**Documentation:**
- Put new documentation or reports in `/docs/internal/` with `YYYYMMDD_<filename>.md` format
- Towards the end of the task, ALWAYS create new summary documents that capture the work done, decisions made, and outcomes

## Validation Checklist

**Required:**
1. `pnpm install` - Install dependencies
2. `pnpm run build:libs` - Build core and mcts libraries
3. `pnpm run lint` - Must pass with 0 errors
4. `pnpm run test:run` - All unit tests must pass
5. `pnpm run build` - Must succeed, verify packages/app/dist/ created

**Optional:**
- `pnpm run test:e2e` - Playwright e2e (run for any UI change)
- `pnpm run dev` (:5173) to test manually
- `pnpm run preview` (:4173) to verify production build
- `pnpm run test:libs` to test libraries separately

## Known Issues

1. `npm run test:coverage` fails (missing @vitest/coverage-v8) - skip unless specifically needed
2. No watch scripts - use `npm test` (watch) or `npm run dev` (HMR) during development
3. TypeScript creates .tsbuildinfo in node_modules/.tmp/ - auto-cleaned, ignore

## Troubleshooting

If commands fail: verify Node 24.x LTS + pnpm 11 → `rm -rf node_modules dist` → `pnpm install` → retry
**Reference:** .github/workflows/ci.yml shows exact passing sequence
