# Copilot Agent Instructions for Solitaire Repository

## Repository Overview

This is a **Solitaire (Klondike) card game** web application built as a modern single-page application. The project is a solo development effort focused on implementing a fully-functional card game with save/load functionality, move history tracking, and smooth drag-and-drop interactions.

**Tech Stack:**
- **Frontend:** React 19.2.0 with TypeScript 5.9.3
- **Build Tool:** Vite 7.2.2 (fast dev server on port 5173, preview on port 4173)
- **State Management:** Zustand 5.0.8
- **Styling:** Tailwind CSS 4.1.17 with PostCSS
- **Drag & Drop:** @dnd-kit/core 6.3.1
- **Animations:** Framer Motion 12.23.24
- **Testing:** Vitest 4.0.8 with React Testing Library and jsdom
- **Code Quality:** ESLint 9.39.1 with TypeScript support
- **Runtime:** Node.js 20.x (confirmed working with 20.19.5)

**Project Size:** ~1,500 lines of code across 8 React components, 1 store, and comprehensive TypeScript types.

## Quick Start Commands

**ALWAYS install dependencies first after cloning or when node_modules is missing:**
```bash
npm ci  # Use 'npm ci' for CI builds, 'npm install' for development
```

**Build & Development:**
```bash
npm run dev       # Start dev server (http://localhost:5173/) - takes ~200ms
npm run build     # TypeScript compile + Vite production build (~1-2s)
npm run preview   # Preview production build (http://localhost:4173/)
```

**Testing:**
```bash
npm test          # Run tests in watch mode
npm run test:run  # Run tests once (used in CI) - takes ~1s, 15 tests
npm run test:ui   # Run tests with Vitest UI
```

**Code Quality:**
```bash
npm run lint      # Run ESLint on all TypeScript/TSX files (~1-2s)
```

**Important Notes:**
- `npm run test:coverage` requires `@vitest/coverage-v8` which is NOT installed by default - skip this command unless coverage is specifically needed
- Build command is `tsc -b && vite build` - TypeScript compilation happens first, then Vite bundles
- All commands work from a fresh clone after running `npm ci`
- No special environment setup required beyond Node.js 20.x and npm

## CI/CD Pipeline

The repository uses GitHub Actions CI with **three separate jobs** that run in parallel:

1. **Lint Job** (`.github/workflows/ci.yml`)
   - Runs: `npm ci` → `npm run lint`
   - Must pass: No ESLint errors

2. **Test Job**
   - Runs: `npm ci` → `npm run test:run`
   - Must pass: All 15 tests in 2 test files

3. **Build Job**
   - Runs: `npm ci` → `npm run build`
   - Must pass: Clean TypeScript compilation and Vite build
   - Uploads `dist/` folder as artifact

**To ensure your changes pass CI:**
```bash
npm ci              # Fresh install
npm run lint        # Must complete with exit code 0
npm run test:run    # Must show all tests passing
npm run build       # Must create dist/ folder successfully
```

## Project Structure

```
/
├── .github/
│   └── workflows/ci.yml          # CI pipeline definition
├── src/
│   ├── components/               # React components (8 files)
│   │   ├── Card.tsx             # Individual card display (96 lines)
│   │   ├── DrawPile.tsx         # Draw pile UI (27 lines)
│   │   ├── DiscardPile.tsx      # Discard pile UI (43 lines)
│   │   ├── FoundationPile.tsx   # Foundation pile UI (58 lines)
│   │   ├── TableauColumn.tsx    # Tableau column UI (103 lines)
│   │   ├── GameBoard.tsx        # Main board layout (43 lines)
│   │   ├── ControlPanel.tsx     # Save/load/new game controls (183 lines)
│   │   ├── ActivityLog.tsx      # Move history display (146 lines)
│   │   └── index.ts             # Component exports
│   ├── store/
│   │   ├── gameStore.ts         # Zustand game state (501 lines) - MAIN LOGIC
│   │   └── gameStore.test.ts    # Store tests (14 tests)
│   ├── types/
│   │   └── index.ts             # TypeScript types: Card, GameState, Move, etc. (55 lines)
│   ├── test/
│   │   └── setup.ts             # Test setup (imports @testing-library/jest-dom)
│   ├── assets/
│   │   └── react.svg            # React logo
│   ├── App.tsx                  # App entry (renders GameBoard)
│   ├── App.test.tsx             # Basic smoke test
│   ├── App.css                  # App-specific styles
│   ├── main.tsx                 # React DOM root
│   └── index.css                # Global styles + Tailwind imports
├── public/
│   └── vite.svg                 # Vite favicon
├── docs/reports/                # Task documentation (16 markdown files)
├── dist/                        # Build output (generated, in .gitignore)
├── node_modules/                # Dependencies (generated, in .gitignore)
├── package.json                 # Dependencies and scripts
├── package-lock.json            # Locked dependency versions
├── tsconfig.json                # TypeScript root config (references only)
├── tsconfig.app.json            # App TypeScript config (strict mode)
├── tsconfig.node.json           # Node TypeScript config (for Vite config)
├── vite.config.ts               # Vite config with Vitest setup
├── eslint.config.js             # ESLint flat config with TypeScript
├── tailwind.config.js           # Tailwind CSS configuration
├── postcss.config.js            # PostCSS with Tailwind plugin
├── index.html                   # HTML entry point
├── .gitignore                   # Ignores node_modules, dist, logs
└── README.md                    # Project documentation
```

## Architecture & Key Files

**State Management (src/store/gameStore.ts - 501 lines):**
- Single Zustand store manages entire game state
- Key functions: `initializeGame()`, `drawCard()`, `selectCard()`, `moveCardToTableau()`, `moveCardToFoundation()`
- Export/import: `exportGameState()`, `importGameState()`, `exportMoveHistory()`, `exportBoardSetup()`
- Move validation: `canMoveToTableau()`, `canMoveToFoundation()`
- All game logic lives here - modify this for game rule changes

**Type Definitions (src/types/index.ts):**
- `Card`: suit, rank, faceUp, id
- `Suit`: 'hearts' | 'diamonds' | 'clubs' | 'spades'
- `Rank`: 'A' | '2' | '3' | ... | 'K'
- `Move`: type, timestamp, card, from, to
- `GameState`: drawPile, discardPile, foundations, tableau, selectedCard, moveHistory

**Component Architecture:**
- `GameBoard.tsx`: Main layout container, renders all other components
- `ControlPanel.tsx`: New game, save/load, export buttons
- `ActivityLog.tsx`: Displays move history from store
- Card components use @dnd-kit for drag-and-drop
- All components consume `useGameStore` hook

**Testing Pattern:**
- Test files use `.test.ts` or `.test.tsx` suffix
- Located next to source files (e.g., `gameStore.test.ts` next to `gameStore.ts`)
- Use Vitest with `describe`, `it`, `expect`, `beforeEach`
- React components tested with `@testing-library/react`
- Setup in `src/test/setup.ts` imports `@testing-library/jest-dom`

## Configuration Files

**TypeScript (3 files):**
- `tsconfig.json`: Root config (only references, no options)
- `tsconfig.app.json`: Source code config (strict: true, includes src/)
- `tsconfig.node.json`: Config files config (includes vite.config.ts)

**ESLint:** `eslint.config.js` uses flat config format (ESLint 9+) with TypeScript, React Hooks, and React Refresh plugins. Ignores `dist/` folder.

**Vite:** `vite.config.ts` configures React plugin and Vitest test environment (jsdom).

**Tailwind:** `tailwind.config.js` scans `index.html` and `src/**/*.{js,ts,jsx,tsx}`. PostCSS config in `postcss.config.js` uses `@tailwindcss/postcss`.

## Common Patterns & Conventions

**When adding new features:**
1. Add types to `src/types/index.ts` if needed
2. Add state and logic to `src/store/gameStore.ts`
3. Create or modify components in `src/components/`
4. Add tests alongside source files (`.test.ts` or `.test.tsx`)
5. **Always run in order:** `npm run lint` → `npm run test:run` → `npm run build`

**Code style:**
- Functional React components with TypeScript
- Use Zustand hooks: `useGameStore()` or `useGameStore.getState()`
- Tailwind for all styling (utility classes in JSX)
- Strict TypeScript: all types must be explicitly defined
- No `any` types - use proper TypeScript types
- ESLint will enforce React Hooks rules and React Refresh best practices

**File naming:**
- Components: PascalCase.tsx (e.g., `GameBoard.tsx`)
- Tests: same name with `.test.tsx` or `.test.ts` suffix
- Utilities/stores: camelCase.ts (e.g., `gameStore.ts`)
- Types: index.ts in types/ folder

**Import conventions:**
- Type imports: `import type { Card, GameState } from '../types'`
- Named exports preferred (no default exports except for React components)
- Relative imports for project files

## Validation Before Completing Tasks

**Required validation steps (run in this order):**
```bash
npm run lint        # ESLint must pass
npm run test:run    # All 15+ tests must pass
npm run build       # Build must succeed
ls dist/            # Verify dist/ folder created with index.html and assets/
```

**Optional validation:**
```bash
npm run dev         # Verify dev server starts on http://localhost:5173/
npm run preview     # Verify preview server works after build
```

## Known Issues & Workarounds

1. **Coverage Command:** `npm run test:coverage` will fail with "Cannot find dependency '@vitest/coverage-v8'" - this is expected. Coverage is not configured in this project. Do not add this package unless specifically requested.

2. **TypeScript Build Info:** TypeScript creates `.tsbuildinfo` files in `node_modules/.tmp/` during builds - these are automatically cleaned up and ignored.

3. **No Watch Mode:** The project doesn't have watch scripts for tests or builds. Use `npm test` (watch mode) or `npm run dev` (Vite HMR) during development.

## Documentation

- **README.md**: High-level project description, features, and commands
- **docs/reports/**: Contains 16+ task planning documents and project state report
- **No CONTRIBUTING.md**: Solo project, no contribution guidelines

## Final Notes

**Trust these instructions.** All commands have been verified to work from a fresh clone. If you encounter issues:
1. Verify Node.js 20.x is installed (`node --version`)
2. Clean: `rm -rf node_modules dist`
3. Reinstall: `npm ci`
4. Retry the command

**When in doubt:** Check the GitHub Actions CI workflow (`.github/workflows/ci.yml`) - it shows the exact sequence that must pass.
