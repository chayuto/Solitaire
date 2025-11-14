# Copilot Agent Instructions for Solitaire Repository

## Repository Overview

**Solitaire (Klondike) card game** - Modern React SPA with save/load, move history, and drag-and-drop.

**Stack:** React 19.2 + TypeScript 5.9 + Vite 7.2 + Zustand 5.0 + Tailwind 4.1 + @dnd-kit 6.3 + Vitest 4.0 | Node 20.x | ~1,500 LOC, 8 components

## Essential Commands

**ALWAYS run `npm ci` first** (or `npm install` for dev). All commands work from fresh clone after `npm ci`.

```bash
npm run lint      # ESLint (~1-2s) - Must pass for CI
npm run test:run  # Vitest (~1s, 15 tests) - Must pass for CI
npm run build     # tsc -b && vite build (~1-2s) - Must pass for CI
npm run dev       # Dev server :5173 (~200ms)
npm run preview   # Preview build :4173
npm test          # Tests in watch mode
```

**Known Issue:** `npm run test:coverage` requires missing `@vitest/coverage-v8` - skip unless specifically needed.

## CI/CD - Must Pass All Three Jobs

`.github/workflows/ci.yml` runs 3 parallel jobs: **Lint**, **Test**, **Build**. Each runs `npm ci` then its command.

**Validate before committing:** `npm ci && npm run lint && npm run test:run && npm run build` (must all pass)

## Project Structure

```
src/
  components/        # 8 React components (Card, DrawPile, DiscardPile, FoundationPile, 
                     #   TableauColumn, GameBoard, ControlPanel, ActivityLog)
  store/
    gameStore.ts     # ALL GAME LOGIC (501 lines) - Zustand store with game rules
    gameStore.test.ts # 14 tests
  types/index.ts     # Card, GameState, Move, Suit, Rank types (55 lines)
  test/setup.ts      # Vitest config (@testing-library/jest-dom)
  App.tsx            # Entry (renders GameBoard)
  main.tsx           # React DOM root
  index.css          # Global styles + Tailwind imports

Config: tsconfig.json (root), tsconfig.app.json (src/, strict), tsconfig.node.json (vite.config.ts)
        vite.config.ts (React plugin + Vitest), eslint.config.js (flat config), tailwind.config.js
        postcss.config.js (@tailwindcss/postcss)
        
CI: .github/workflows/ci.yml
Docs: docs/reports/ (16 task planning docs)
Build output: dist/ (ignored), node_modules/ (ignored)
```

## Architecture

**gameStore.ts (501 lines) - ALL game logic lives here:**
- Functions: `initializeGame()`, `drawCard()`, `selectCard()`, `moveCardToTableau()`, `moveCardToFoundation()`
- Validation: `canMoveToTableau()`, `canMoveToFoundation()`
- Export/import: `exportGameState()`, `importGameState()`, `exportMoveHistory()`, `exportBoardSetup()`

**types/index.ts:** Card (suit, rank, faceUp, id), GameState (drawPile, discardPile, foundations, tableau, moveHistory), Move

**Components:** GameBoard (main layout) → ControlPanel + ActivityLog + DrawPile + DiscardPile + FoundationPile×4 + TableauColumn×7
All use `useGameStore()` hook. @dnd-kit for drag-and-drop.

**Tests:** `.test.ts`/`.test.tsx` next to source. Vitest + @testing-library/react. Setup: `src/test/setup.ts`

## Key Config Notes

**TypeScript:** tsconfig.app.json (strict mode), tsconfig.node.json (vite config)
**ESLint:** Flat config (v9+), ignores dist/
**Vite:** vite.config.ts has React plugin + Vitest (jsdom)
**Tailwind:** Scans index.html + src/**/*.{js,ts,jsx,tsx}

## Patterns & Conventions

**Adding features:** Update types/index.ts → gameStore.ts (logic) → components/ → add .test.ts → lint/test/build

**Style:** Functional React + strict TypeScript (no `any`), Tailwind utilities, Zustand `useGameStore()` hook
**Naming:** PascalCase.tsx (components), camelCase.ts (utils), .test.ts/.test.tsx (tests)
**Imports:** `import type { Card } from '../types'` for types, relative paths, named exports (except React components)

## Agent Workflow Guidelines

**Analysis & Research:**
- Spend as much time as needed to analyze and understand the context before making changes
- ALWAYS check online references/documentation if applicable to ensure accuracy and best practices

**Documentation:**
- Put new documentation or reports in `/docs/internal/` with `YYYYMMDD_<filename>.md` format
- Towards the end of the task, ALWAYS create new summary documents that capture the work done, decisions made, and outcomes

## Validation Checklist

**Required:** `npm run lint && npm run test:run && npm run build` (all must pass, verify dist/ created)
**Optional:** `npm run dev` (:5173) or `npm run preview` (:4173) to verify manually

## Known Issues

1. `npm run test:coverage` fails (missing @vitest/coverage-v8) - skip unless specifically needed
2. No watch scripts - use `npm test` (watch) or `npm run dev` (HMR) during development
3. TypeScript creates .tsbuildinfo in node_modules/.tmp/ - auto-cleaned, ignore

## Troubleshooting

If commands fail: verify Node 20.x → `rm -rf node_modules dist` → `npm ci` → retry
**Reference:** .github/workflows/ci.yml shows exact passing sequence
