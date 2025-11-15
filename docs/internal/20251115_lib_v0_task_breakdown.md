# Library Extraction Task Breakdown - Complete Implementation Guide

**Date:** 2025-11-15  
**Version:** v0.1  
**Status:** Task Planning  
**Author:** GitHub Copilot Agent  
**Document Type:** Task Breakdown

---

## Executive Summary

This document breaks down the library extraction work into **62 small, self-contained tasks** suitable for coding agents. Each task includes:

- Clear objective
- Acceptance criteria
- Dependencies
- Estimated LOC
- Test requirements
- Implementation hints

**Total Estimated Effort**: 8-12 weeks  
**Total Estimated LOC**: ~4,500 lines (including tests)  
**Total Tests**: ~150+ new tests

---

## Table of Contents

1. [Task Index](#1-task-index)
2. [Phase 1: Foundation & Setup (7 tasks)](#2-phase-1-foundation--setup)
3. [Phase 2: Extract Library 1 (24 tasks)](#3-phase-2-extract-library-1)
4. [Phase 3: Integrate Library 1 (6 tasks)](#4-phase-3-integrate-library-1)
5. [Phase 4: Build Library 2 Foundation (10 tasks)](#5-phase-4-build-library-2-foundation)
6. [Phase 5: Build Library 2 Klondike (10 tasks)](#6-phase-5-build-library-2-klondike)
7. [Phase 6: Integration & Polish (5 tasks)](#7-phase-6-integration--polish)
8. [Dependency Graph](#8-dependency-graph)

---

## 1. Task Index

### Phase 1: Foundation & Setup (Week 1)
- TASK-001: Create monorepo workspace structure
- TASK-002: Set up Library 1 package configuration
- TASK-003: Set up Library 2 package configuration  
- TASK-004: Configure shared TypeScript build
- TASK-005: Configure Vite for library builds
- TASK-006: Set up CI/CD for multi-package repo
- TASK-007: Create project documentation structure

### Phase 2: Extract Library 1 (Weeks 2-4)
**Week 2: Core Types & Utilities**
- TASK-008: Extract core type definitions
- TASK-009: Implement Card utilities
- TASK-010: Implement Deck utilities
- TASK-011: Implement ValidationUtils
- TASK-012: Implement HashUtils (state hashing)

**Week 3: Game Engine**
- TASK-013: Create GameEngine class skeleton
- TASK-014: Implement game initialization
- TASK-015: Extract TableauRules module
- TASK-016: Extract FoundationRules module
- TASK-017: Extract StockRules module
- TASK-018: Implement getLegalMoves()
- TASK-019: Implement applyMove() - tableau moves
- TASK-020: Implement applyMove() - foundation moves
- TASK-021: Implement applyMove() - stock moves

**Week 4: Scoring & Finalization**
- TASK-022: Implement scoring functions
- TASK-023: Implement win/loss detection
- TASK-024: Implement state import/export
- TASK-025: Create main library entry point
- TASK-026: Write comprehensive tests (>90% coverage)
- TASK-027: Generate API documentation
- TASK-028: Write library README and examples
- TASK-029: Build and validate library bundle
- TASK-030: Publish Library 1 alpha release
- TASK-031: Create Library 1 changelog

### Phase 3: Integrate Library 1 (Week 5)
- TASK-032: Install library in main app
- TASK-033: Create state adapter (UI ↔ Library)
- TASK-034: Refactor gameStore to use library
- TASK-035: Update all tests to pass
- TASK-036: Performance benchmarking
- TASK-037: Publish Library 1 stable (v1.0.0)

### Phase 4: Build Library 2 Foundation (Weeks 6-7)
**Generic MCTS Core**
- TASK-038: Extract MCTS type definitions
- TASK-039: Implement MCTSNode class
- TASK-040: Implement GamePolicy interface
- TASK-041: Implement MCTSSolver - Selection phase
- TASK-042: Implement MCTSSolver - Expansion phase
- TASK-043: Implement MCTSSolver - Simulation phase
- TASK-044: Implement MCTSSolver - Backpropagation phase
- TASK-045: Implement UCB1 calculation
- TASK-046: Validate with Tic-Tac-Toe test
- TASK-047: Write MCTS core tests

### Phase 5: Build Library 2 Klondike (Weeks 8-10)
**Klondike-Specific Implementation**
- TASK-048: Create KlondikePolicy class
- TASK-049: Implement MCTS move generator
- TASK-050: Implement MCTS state transitions
- TASK-051: Create state adapter (Core ↔ MCTS)
- TASK-052: Implement Heuristic Evaluation Function
- TASK-053: Implement greedy simulation policy
- TASK-054: Implement move prioritization
- TASK-055: Add cycle detection
- TASK-056: Tune exploration constant
- TASK-057: Write Klondike MCTS tests

### Phase 6: Integration & Polish (Weeks 11-12)
- TASK-058: Integrate MCTS into main app
- TASK-059: Create MCTS UI components
- TASK-060: End-to-end testing
- TASK-061: Performance optimization
- TASK-062: Documentation & publish Library 2

---

## 2. Phase 1: Foundation & Setup

### TASK-001: Create monorepo workspace structure
**Objective**: Set up npm workspaces for multi-package repo

**Files to Create**:
```
/ (root)
├── package.json (workspace root)
├── packages/
│   ├── core/ (placeholder)
│   ├── mcts/ (placeholder)
│   └── app/ (move existing src/ here)
└── .gitignore (update)
```

**Steps**:
1. Create `packages/` directory
2. Move existing project to `packages/app/`
3. Create root `package.json` with workspaces config
4. Update paths in package.json scripts
5. Test: `npm install` succeeds, app still runs

**Acceptance Criteria**:
- ✅ `packages/app/` contains existing code
- ✅ `packages/core/` and `packages/mcts/` directories exist
- ✅ Root `package.json` has `"workspaces": ["packages/*"]`
- ✅ `npm run dev -w app` starts the app
- ✅ All 79 tests still pass

**Estimated Time**: 2-3 hours  
**Estimated LOC**: 50 (config files)  
**Dependencies**: None  
**Blocker**: Must complete before any library work

---

### TASK-002: Set up Library 1 package configuration
**Objective**: Create package structure for `@chayuto/solitaire-core`

**Files to Create**:
```
packages/core/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── index.ts
│   ├── types/
│   ├── engine/
│   ├── rules/
│   ├── utils/
│   └── scoring/
├── tests/
├── README.md
└── .npmignore
```

**package.json template**:
```json
{
  "name": "@chayuto/solitaire-core",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"],
  "sideEffects": false,
  "scripts": {
    "build": "vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "~5.9.3",
    "vite": "^7.2.2",
    "vitest": "^4.0.8"
  },
  "keywords": ["solitaire", "klondike", "card-game", "typescript"],
  "license": "MIT"
}
```

**Acceptance Criteria**:
- ✅ Package structure matches template
- ✅ `npm run build -w @chayuto/solitaire-core` succeeds (empty build)
- ✅ TypeScript configured with strict mode
- ✅ Vite configured for library mode

**Estimated Time**: 2-3 hours  
**Estimated LOC**: 100 (config)  
**Dependencies**: TASK-001  

---

### TASK-003: Set up Library 2 package configuration
**Objective**: Create package structure for `@chayuto/solitaire-mcts`

**Similar to TASK-002, but with peer dependency**:
```json
{
  "name": "@chayuto/solitaire-mcts",
  "peerDependencies": {
    "@chayuto/solitaire-core": "workspace:*"
  }
}
```

**Acceptance Criteria**:
- ✅ Package structure created
- ✅ Peer dependency on solitaire-core configured
- ✅ Build system works (empty build)

**Estimated Time**: 2 hours  
**Estimated LOC**: 100 (config)  
**Dependencies**: TASK-001, TASK-002

---

### TASK-004: Configure shared TypeScript build
**Objective**: Set up shared TypeScript config for all packages

**Files**:
```
/ (root)
├── tsconfig.base.json (shared config)
packages/core/tsconfig.json (extends base)
packages/mcts/tsconfig.json (extends base)
packages/app/tsconfig.json (extends base)
```

**tsconfig.base.json**:
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

**Acceptance Criteria**:
- ✅ Shared config at root
- ✅ All packages extend base config
- ✅ `npm run build --workspaces` succeeds
- ✅ Type checking works across packages

**Estimated Time**: 1-2 hours  
**Estimated LOC**: 50 (config)  
**Dependencies**: TASK-001, TASK-002, TASK-003

---

### TASK-005: Configure Vite for library builds
**Objective**: Set up Vite to build both ESM and CJS outputs

**File**: `packages/core/vite.config.ts`
```typescript
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'SolitaireCore',
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'js' : 'cjs'}`,
    },
    rollupOptions: {
      external: [],
      output: {
        exports: 'named',
      },
    },
    sourcemap: true,
    minify: false, // Keep readable for debugging
  },
});
```

**Acceptance Criteria**:
- ✅ Vite config in both core and mcts packages
- ✅ Build produces ESM (.js) and CJS (.cjs)
- ✅ Type declarations (.d.ts) generated
- ✅ Sourcemaps included

**Estimated Time**: 2 hours  
**Estimated LOC**: 50 (config)  
**Dependencies**: TASK-002, TASK-003

---

### TASK-006: Set up CI/CD for multi-package repo
**Objective**: Update GitHub Actions workflow for monorepo

**File**: `.github/workflows/ci.yml`
```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run lint --workspaces --if-present
      - run: npm run test:run --workspaces --if-present
      - run: npm run build --workspaces

  publish-core:
    needs: test
    if: startsWith(github.ref, 'refs/tags/core-v')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run build -w @chayuto/solitaire-core
      - run: npm publish -w @chayuto/solitaire-core
        env:
          NODE_AUTH_TOKEN: ${{secrets.NPM_TOKEN}}

  publish-mcts:
    needs: test
    if: startsWith(github.ref, 'refs/tags/mcts-v')
    runs-on: ubuntu-latest
    steps:
      # Similar to publish-core
```

**Acceptance Criteria**:
- ✅ CI runs on all packages
- ✅ Separate publish jobs for each library
- ✅ Tag-based releases configured

**Estimated Time**: 2-3 hours  
**Estimated LOC**: 100 (config)  
**Dependencies**: TASK-001 through TASK-005

---

### TASK-007: Create project documentation structure
**Objective**: Organize docs for multi-package repo

**Files**:
```
docs/
├── library-1-core/
│   ├── API.md
│   ├── QUICKSTART.md
│   └── EXAMPLES.md
├── library-2-mcts/
│   ├── API.md
│   ├── ALGORITHM.md
│   └── USAGE.md
└── internal/ (existing)
```

**Acceptance Criteria**:
- ✅ Documentation structure created
- ✅ Placeholder docs written
- ✅ Each library has own docs folder

**Estimated Time**: 1-2 hours  
**Estimated LOC**: 200 (markdown)  
**Dependencies**: None (can be done anytime)

---

## 3. Phase 2: Extract Library 1

### TASK-008: Extract core type definitions
**Objective**: Move type definitions from UI to library

**Source**: `packages/app/src/types/index.ts`  
**Target**: `packages/core/src/types/index.ts`

**Files to Create**:
```
packages/core/src/types/
├── index.ts (main export)
├── Card.ts
├── GameState.ts
├── Move.ts
├── Difficulty.ts
└── index.test.ts
```

**Key Changes**:
- Add `readonly` to all properties
- Remove UI-specific fields (`selectedCard`, `replayMode`, etc.)
- Keep only pure game state

**Example**:
```typescript
// Card.ts
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  readonly suit: Suit;
  readonly rank: Rank;
  readonly faceUp: boolean;
  readonly id: string;
}
```

**Tests to Write**:
1. Type guards work correctly
2. Card IDs are unique
3. Type compatibility with original

**Acceptance Criteria**:
- ✅ All types extracted
- ✅ Types are readonly/immutable
- ✅ No UI-specific fields
- ✅ Tests pass (>95% coverage)
- ✅ Exports correctly from library

**Estimated Time**: 3-4 hours  
**Estimated LOC**: 150 (types) + 100 (tests)  
**Dependencies**: TASK-002

---

### TASK-009: Implement Card utilities
**Objective**: Extract card helper functions

**Source**: `packages/app/src/store/helpers/*`  
**Target**: `packages/core/src/utils/card.ts`

**Functions to Extract**:
```typescript
export function isRed(card: Card): boolean;
export function isBlack(card: Card): boolean;
export function getColor(card: Card): 'red' | 'black';
export function getRankValue(rank: Rank): number;
export function compareRanks(rank1: Rank, rank2: Rank): number;
export function createCard(suit: Suit, rank: Rank, faceUp?: boolean): Card;
export function flipCard(card: Card): Card;
```

**Tests to Write**:
1. `isRed()` identifies hearts and diamonds
2. `getRankValue()` returns correct numbers (A=1, K=13)
3. `compareRanks()` sorts correctly
4. `flipCard()` is immutable

**Acceptance Criteria**:
- ✅ All functions pure (no mutations)
- ✅ 100% test coverage
- ✅ Type-safe

**Estimated Time**: 2-3 hours  
**Estimated LOC**: 100 (code) + 150 (tests)  
**Dependencies**: TASK-008

---

### TASK-010: Implement Deck utilities
**Objective**: Extract deck creation and shuffling

**Target**: `packages/core/src/utils/deck.ts`

**Functions to Implement**:
```typescript
export function createDeck(faceUp?: boolean): Card[];
export function shuffleDeck(deck: readonly Card[], seed?: number): Card[];
export function arrangeDeckByDifficulty(difficulty: Difficulty, seed?: number): Card[];
```

**Tests to Write**:
1. `createDeck()` creates all 52 cards
2. `shuffleDeck()` shuffles (statistical test)
3. `shuffleDeck()` with same seed produces same result
4. `arrangeDeckByDifficulty()` creates valid deck

**Acceptance Criteria**:
- ✅ Creates exactly 52 unique cards
- ✅ Shuffle is reproducible with seed
- ✅ 100% test coverage

**Estimated Time**: 3-4 hours  
**Estimated LOC**: 150 (code) + 200 (tests)  
**Dependencies**: TASK-008, TASK-009

---

### TASK-011: Implement ValidationUtils
**Objective**: State validation functions

**Target**: `packages/core/src/utils/validation.ts`

**Functions to Implement**:
```typescript
export function validateGameState(state: GameState): void; // Throws if invalid
export function isValidGameState(state: GameState): boolean;
export function countCards(state: GameState): number;
export function findDuplicates(state: GameState): string[];
```

**Validation Rules**:
1. Exactly 52 cards total
2. No duplicate card IDs
3. All cards are valid (valid suit/rank combinations)
4. Foundation piles are sequential (A, 2, 3...)
5. Tableau face-up cards form valid sequences

**Tests to Write**:
1. Valid state passes
2. Missing cards detected
3. Duplicate cards detected
4. Invalid foundation sequence detected

**Acceptance Criteria**:
- ✅ Comprehensive validation
- ✅ Clear error messages
- ✅ 100% test coverage

**Estimated Time**: 4-5 hours  
**Estimated LOC**: 200 (code) + 250 (tests)  
**Dependencies**: TASK-008

---

### TASK-012: Implement HashUtils (state hashing)
**Objective**: FNV-1a hashing for cycle detection

**Target**: `packages/core/src/utils/hash.ts`

**Functions to Implement**:
```typescript
export function hashGameState(state: GameState): string;
export function hashAfterMove(state: GameState, command: MoveCommand): string;
```

**Algorithm**: FNV-1a (fast, collision-resistant)
```typescript
function fnv1a(str: string): string {
  let hash = 2166136261; // FNV offset basis
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619); // FNV prime
  }
  return hash.toString(36);
}
```

**Tests to Write**:
1. Same state produces same hash
2. Different states produce different hashes
3. Hash is fast (<1ms for typical state)
4. Collision rate is low (<0.1% for 10k states)

**Acceptance Criteria**:
- ✅ Fast (<1ms per hash)
- ✅ Deterministic
- ✅ Low collision rate
- ✅ Test coverage >95%

**Estimated Time**: 3-4 hours  
**Estimated LOC**: 100 (code) + 150 (tests)  
**Dependencies**: TASK-008

---

### TASK-013: Create GameEngine class skeleton
**Objective**: Set up main game engine class

**Target**: `packages/core/src/engine/GameEngine.ts`

**Class Structure**:
```typescript
export class GameEngine {
  // Initialization
  public initialize(options?: InitializeOptions): GameState { /* TODO */ }

  // Move application
  public applyMove(state: GameState, command: MoveCommand): GameState { /* TODO */ }
  public canApplyMove(state: GameState, command: MoveCommand): boolean { /* TODO */ }
  public getLegalMoves(state: GameState): MoveCommand[] { /* TODO */ }

  // Game state queries
  public isWon(state: GameState): boolean { /* TODO */ }
  public isLost(state: GameState): boolean { /* TODO */ }
  public getCompletionProgress(state: GameState): number { /* TODO */ }
  public getPerceivedDifficulty(state: GameState): number { /* TODO */ }

  // Import/export
  public exportState(state: GameState): string { /* TODO */ }
  public importState(json: string): GameState { /* TODO */ }
}
```

**Acceptance Criteria**:
- ✅ Class defined with all methods
- ✅ Methods have JSDoc comments
- ✅ Methods throw NotImplementedError

**Estimated Time**: 2 hours  
**Estimated LOC**: 150 (skeleton)  
**Dependencies**: TASK-008

---

### TASK-014: Implement game initialization
**Objective**: Implement `GameEngine.initialize()`

**Source**: `packages/app/src/store/gameStore.ts` (initializeGameState)  
**Target**: `packages/core/src/engine/GameEngine.ts`

**Implementation**:
```typescript
public initialize(options?: InitializeOptions): GameState {
  const difficulty = options?.difficulty ?? 3;
  const deck = options?.customDeck ?? arrangeDeckByDifficulty(difficulty);

  // Deal to tableau (1, 2, 3, ..., 7 cards)
  const tableau: Card[][] = Array(7).fill(null).map(() => []);
  let deckIndex = 0;
  for (let col = 0; col < 7; col++) {
    for (let row = 0; row <= col; row++) {
      const card = deck[deckIndex];
      tableau[col].push({
        ...card,
        faceUp: row === col, // Top card is face up
      });
      deckIndex++;
    }
  }

  // Remaining cards go to stock
  const drawPile = deck.slice(deckIndex);

  return {
    drawPile,
    discardPile: [],
    foundations: { hearts: [], diamonds: [], clubs: [], spades: [] },
    tableau,
    difficulty,
    gameWon: false,
    completionProgress: 0,
  };
}
```

**Tests to Write**:
1. Creates valid initial state
2. Deals correct number of cards to tableau
3. Top cards are face up
4. Remaining cards in draw pile
5. Custom deck works

**Acceptance Criteria**:
- ✅ Correctly deals cards
- ✅ Validates deck size (52 cards)
- ✅ 100% test coverage

**Estimated Time**: 3-4 hours  
**Estimated LOC**: 100 (code) + 150 (tests)  
**Dependencies**: TASK-010, TASK-013

---

### TASK-015: Extract TableauRules module
**Objective**: Tableau move validation

**Source**: `packages/app/src/store/helpers/`  
**Target**: `packages/core/src/rules/tableau.ts`

**Functions to Implement**:
```typescript
export function canMoveToTableau(card: Card, targetColumn: readonly Card[]): boolean {
  if (targetColumn.length === 0) {
    return getRankValue(card.rank) === 13; // Only King to empty
  }
  
  const topCard = targetColumn[targetColumn.length - 1];
  return (
    getColor(card) !== getColor(topCard) && // Opposite colors
    getRankValue(card.rank) === getRankValue(topCard.rank) - 1 // One rank lower
  );
}

export function canMoveSequence(cards: readonly Card[], targetColumn: readonly Card[]): boolean;
export function getValidTableauDestinations(card: Card, tableau: readonly (readonly Card[])[], sourceColumn?: number): number[];
```

**Tests to Write**:
1. King to empty column allowed
2. Non-King to empty column disallowed
3. Opposite color, sequential rank allowed
4. Same color disallowed
5. Non-sequential rank disallowed

**Acceptance Criteria**:
- ✅ All rules correctly implemented
- ✅ 100% test coverage
- ✅ No mutations

**Estimated Time**: 4-5 hours  
**Estimated LOC**: 150 (code) + 200 (tests)  
**Dependencies**: TASK-008, TASK-009

---

### TASK-016: Extract FoundationRules module
**Objective**: Foundation move validation

**Target**: `packages/core/src/rules/foundation.ts`

**Functions to Implement**:
```typescript
export function canMoveToFoundation(card: Card, foundationPile: readonly Card[]): boolean {
  if (foundationPile.length === 0) {
    return getRankValue(card.rank) === 1; // Only Ace to empty
  }
  
  const topCard = foundationPile[foundationPile.length - 1];
  return (
    card.suit === topCard.suit && // Same suit
    getRankValue(card.rank) === getRankValue(topCard.rank) + 1 // One rank higher
  );
}

export function getNextFoundationRank(foundationPile: readonly Card[]): Rank | null;
export function hasValidFoundationDestination(card: Card, foundations: Foundations): boolean;
```

**Tests to Write**:
1. Ace to empty foundation allowed
2. Non-Ace to empty foundation disallowed
3. Same suit, sequential rank allowed
4. Wrong suit disallowed
5. Non-sequential rank disallowed

**Acceptance Criteria**:
- ✅ All rules correctly implemented
- ✅ 100% test coverage

**Estimated Time**: 3-4 hours  
**Estimated LOC**: 100 (code) + 150 (tests)  
**Dependencies**: TASK-008, TASK-009

---

### TASK-017: Extract StockRules module
**Objective**: Stock/waste operations

**Target**: `packages/core/src/rules/stock.ts`

**Functions to Implement**:
```typescript
export function canDraw(state: GameState): boolean {
  return state.drawPile.length > 0;
}

export function draw(state: GameState): GameState {
  if (!canDraw(state)) {
    throw new Error('Cannot draw: draw pile is empty');
  }
  
  const drawnCard = { ...state.drawPile[state.drawPile.length - 1], faceUp: true };
  return {
    ...state,
    drawPile: state.drawPile.slice(0, -1),
    discardPile: [...state.discardPile, drawnCard],
  };
}

export function recycle(state: GameState): GameState {
  return {
    ...state,
    drawPile: [...state.discardPile].reverse().map(c => ({ ...c, faceUp: false })),
    discardPile: [],
  };
}
```

**Tests to Write**:
1. Draw moves card from stock to waste
2. Card is flipped face up
3. Recycle moves all cards back
4. Cards are face down after recycle
5. Order is reversed

**Acceptance Criteria**:
- ✅ Immutable operations
- ✅ 100% test coverage

**Estimated Time**: 2-3 hours  
**Estimated LOC**: 80 (code) + 120 (tests)  
**Dependencies**: TASK-008

---

### TASK-018: Implement getLegalMoves()
**Objective**: Generate all legal moves from state

**Target**: `packages/core/src/engine/GameEngine.ts`

**Implementation**:
```typescript
public getLegalMoves(state: GameState): MoveCommand[] {
  const moves: MoveCommand[] = [];

  // 1. Draw/recycle
  if (canDraw(state)) {
    moves.push({ type: 'draw' });
  } else if (state.discardPile.length > 0) {
    moves.push({ type: 'recycle' });
  }

  // 2. Discard pile moves
  if (state.discardPile.length > 0) {
    const topCard = state.discardPile[state.discardPile.length - 1];
    
    // Discard to foundation
    if (hasValidFoundationDestination(topCard, state.foundations)) {
      moves.push({
        type: 'discard_to_foundation',
        to: { suit: topCard.suit },
      });
    }
    
    // Discard to tableau
    const tableauDests = getValidTableauDestinations(topCard, state.tableau);
    for (const col of tableauDests) {
      moves.push({
        type: 'discard_to_tableau',
        to: { column: col },
      });
    }
  }

  // 3. Tableau moves
  for (let col = 0; col < 7; col++) {
    const pile = state.tableau[col];
    if (pile.length === 0) continue;
    
    // Tableau to foundation (top card only)
    const topCard = pile[pile.length - 1];
    if (topCard.faceUp && hasValidFoundationDestination(topCard, state.foundations)) {
      moves.push({
        type: 'tableau_to_foundation',
        from: { column: col, cardIndex: pile.length - 1 },
        to: { suit: topCard.suit },
      });
    }
    
    // Tableau to tableau (all face-up sequences)
    for (let cardIdx = 0; cardIdx < pile.length; cardIdx++) {
      const card = pile[cardIdx];
      if (!card.faceUp) continue;
      
      const sequence = pile.slice(cardIdx);
      const tableauDests = getValidTableauDestinations(card, state.tableau, col);
      for (const destCol of tableauDests) {
        moves.push({
          type: 'tableau_to_tableau',
          from: { column: col, cardIndex: cardIdx },
          to: { column: destCol },
        });
      }
    }
  }

  return moves;
}
```

**Tests to Write**:
1. Finds all draw/recycle moves
2. Finds all discard moves
3. Finds all tableau moves
4. Returns empty array for lost state

**Acceptance Criteria**:
- ✅ Finds ALL legal moves
- ✅ No invalid moves included
- ✅ Performance <10ms for typical state

**Estimated Time**: 5-6 hours  
**Estimated LOC**: 200 (code) + 300 (tests)  
**Dependencies**: TASK-015, TASK-016, TASK-017

---

### TASK-019: Implement applyMove() - tableau moves
**Objective**: Apply tableau-to-tableau and tableau-to-foundation moves

**Target**: `packages/core/src/engine/GameEngine.ts`

**Key Logic**:
```typescript
if (command.type === 'tableau_to_tableau') {
  const { column: srcCol, cardIndex } = command.from;
  const { column: destCol } = command.to;
  
  const sourcePile = state.tableau[srcCol];
  const cardsToMove = sourcePile.slice(cardIndex);
  const remainingCards = sourcePile.slice(0, cardIndex);
  
  // Flip new top card if needed
  if (remainingCards.length > 0 && !remainingCards[remainingCards.length - 1].faceUp) {
    const topCard = remainingCards[remainingCards.length - 1];
    remainingCards[remainingCards.length - 1] = { ...topCard, faceUp: true };
  }
  
  const newTableau = state.tableau.map((pile, idx) => {
    if (idx === srcCol) return remainingCards;
    if (idx === destCol) return [...pile, ...cardsToMove];
    return pile;
  });
  
  return { ...state, tableau: newTableau };
}
```

**Tests to Write**:
1. Moves single card
2. Moves sequence
3. Flips new top card
4. Immutable (doesn't modify original state)

**Acceptance Criteria**:
- ✅ Correctly moves cards
- ✅ Flips cards when needed
- ✅ Immutable
- ✅ 100% test coverage

**Estimated Time**: 4-5 hours  
**Estimated LOC**: 150 (code) + 200 (tests)  
**Dependencies**: TASK-013, TASK-015

---

### TASK-020: Implement applyMove() - foundation moves
**Objective**: Apply moves to/from foundations

**Similar to TASK-019, for foundation moves**

**Estimated Time**: 3-4 hours  
**Estimated LOC**: 100 (code) + 150 (tests)  
**Dependencies**: TASK-013, TASK-016

---

### TASK-021: Implement applyMove() - stock moves
**Objective**: Apply draw and recycle moves

**Uses**: `StockRules.draw()` and `StockRules.recycle()`

**Estimated Time**: 2 hours  
**Estimated LOC**: 50 (code) + 80 (tests)  
**Dependencies**: TASK-013, TASK-017

---

### TASK-022: Implement scoring functions
**Objective**: Completion progress and perceived difficulty

**Target**: `packages/core/src/scoring/index.ts`

**Functions**:
```typescript
export function getCompletionProgress(state: GameState): number {
  const cardsInFoundations = Object.values(state.foundations)
    .reduce((sum, pile) => sum + pile.length, 0);
  return (cardsInFoundations / 52) * 100;
}

export function getPerceivedDifficulty(state: GameState): number {
  // Based on: hidden cards, card distribution, etc.
  let score = 0;
  
  // Hidden cards (harder)
  const hiddenCards = state.tableau.flat().filter(c => !c.faceUp).length;
  score += hiddenCards * 2;
  
  // Kings buried (harder)
  // Cards out of sequence (harder)
  // ...
  
  return Math.min(100, score);
}
```

**Tests to Write**:
1. Empty game = 0%
2. Won game = 100%
3. Perceived difficulty calculation

**Acceptance Criteria**:
- ✅ Correct calculations
- ✅ Test coverage >90%

**Estimated Time**: 3-4 hours  
**Estimated LOC**: 150 (code) + 150 (tests)  
**Dependencies**: TASK-008

---

### TASK-023: Implement win/loss detection
**Objective**: `isWon()` and `isLost()` methods

**Target**: `packages/core/src/engine/GameEngine.ts`

**Implementation**:
```typescript
public isWon(state: GameState): boolean {
  return state.gameWon || this.getCompletionProgress(state) === 100;
}

public isLost(state: GameState): boolean {
  return this.getLegalMoves(state).length === 0 && !this.isWon(state);
}
```

**Tests to Write**:
1. Won game detected
2. Lost game detected
3. In-progress game returns false

**Acceptance Criteria**:
- ✅ Correct detection
- ✅ 100% test coverage

**Estimated Time**: 2 hours  
**Estimated LOC**: 30 (code) + 80 (tests)  
**Dependencies**: TASK-018, TASK-022

---

### TASK-024: Implement state import/export
**Objective**: JSON serialization

**Target**: `packages/core/src/engine/GameEngine.ts`

**Implementation**:
```typescript
public exportState(state: GameState): string {
  return JSON.stringify(state);
}

public importState(json: string): GameState {
  const state = JSON.parse(json);
  validateGameState(state); // Throws if invalid
  return state;
}
```

**Tests to Write**:
1. Export then import produces identical state
2. Invalid JSON throws error
3. Invalid state throws error

**Acceptance Criteria**:
- ✅ Correct serialization
- ✅ Validation works
- ✅ 100% test coverage

**Estimated Time**: 2 hours  
**Estimated LOC**: 40 (code) + 80 (tests)  
**Dependencies**: TASK-011, TASK-013

---

### TASK-025: Create main library entry point
**Objective**: Export all public APIs

**Target**: `packages/core/src/index.ts`

```typescript
// Main exports
export { GameEngine } from './engine/GameEngine';

// Type exports
export type {
  Card,
  Suit,
  Rank,
  GameState,
  Foundations,
  Move,
  MoveCommand,
  MoveType,
  Difficulty,
  InitializeOptions,
} from './types';

// Rule exports
export * as TableauRules from './rules/tableau';
export * as FoundationRules from './rules/foundation';
export * as StockRules from './rules/stock';

// Utility exports
export * as DeckUtils from './utils/deck';
export * as CardUtils from './utils/card';
export * as ValidationUtils from './utils/validation';
export * as HashUtils from './utils/hash';
```

**Acceptance Criteria**:
- ✅ All public APIs exported
- ✅ Tree shaking works
- ✅ TypeScript types exported

**Estimated Time**: 1 hour  
**Estimated LOC**: 50  
**Dependencies**: All TASK-008 through TASK-024

---

### TASK-026: Write comprehensive tests (>90% coverage)
**Objective**: Ensure library has excellent test coverage

**Target**: `packages/core/tests/`

**Test Suites**:
1. Unit tests for all functions
2. Integration tests for GameEngine
3. Edge case tests
4. Performance tests

**Acceptance Criteria**:
- ✅ >90% code coverage
- ✅ All edge cases covered
- ✅ Performance tests pass

**Estimated Time**: 8-10 hours  
**Estimated LOC**: 500+ (tests)  
**Dependencies**: TASK-025

---

### TASK-027: Generate API documentation
**Objective**: Create comprehensive API docs

**Tool**: TypeDoc or similar

**Files**:
```
packages/core/docs/
├── api/
│   ├── GameEngine.md
│   ├── Types.md
│   ├── Rules.md
│   └── Utils.md
└── index.html
```

**Acceptance Criteria**:
- ✅ All public APIs documented
- ✅ Examples included
- ✅ Searchable HTML docs

**Estimated Time**: 4-6 hours  
**Dependencies**: TASK-025

---

### TASK-028: Write library README and examples
**Objective**: User-facing documentation

**Target**: `packages/core/README.md`

**Sections**:
1. Installation
2. Quick Start
3. API Overview
4. Examples
5. Contributing
6. License

**Acceptance Criteria**:
- ✅ Clear, concise README
- ✅ Working code examples
- ✅ Badges (build status, coverage)

**Estimated Time**: 3-4 hours  
**Dependencies**: TASK-025

---

### TASK-029: Build and validate library bundle
**Objective**: Ensure library builds correctly

**Steps**:
1. Run `npm run build -w @chayuto/solitaire-core`
2. Analyze bundle size
3. Test tree shaking
4. Validate TypeScript types

**Tools**:
- `vite-plugin-bundlesize`
- `rollup-plugin-visualizer`

**Acceptance Criteria**:
- ✅ Bundle builds without errors
- ✅ Bundle size <50KB (gzipped)
- ✅ Tree shaking works
- ✅ Types are correct

**Estimated Time**: 2-3 hours  
**Dependencies**: TASK-025

---

### TASK-030: Publish Library 1 alpha release
**Objective**: Publish `@chayuto/solitaire-core@1.0.0-alpha.1`

**Steps**:
1. Update version to `1.0.0-alpha.1`
2. Build library
3. Test installation locally
4. Publish to npm: `npm publish --tag alpha`

**Acceptance Criteria**:
- ✅ Package published to npm
- ✅ Can be installed with npm
- ✅ Types work in consuming project

**Estimated Time**: 2 hours  
**Dependencies**: TASK-029

---

### TASK-031: Create Library 1 changelog
**Objective**: Document all changes

**Target**: `packages/core/CHANGELOG.md`

**Format**: Keep a Changelog

**Acceptance Criteria**:
- ✅ CHANGELOG.md created
- ✅ All features documented
- ✅ Breaking changes noted

**Estimated Time**: 1 hour  
**Dependencies**: TASK-030

---

## 4. Phase 3: Integrate Library 1

### TASK-032: Install library in main app
**Objective**: Add library as dependency

**Steps**:
1. Add to `packages/app/package.json`:
   ```json
   {
     "dependencies": {
       "@chayuto/solitaire-core": "workspace:*"
     }
   }
   ```
2. Run `npm install`
3. Verify imports work

**Acceptance Criteria**:
- ✅ Library installed
- ✅ TypeScript recognizes types
- ✅ No build errors

**Estimated Time**: 1 hour  
**Dependencies**: TASK-030

---

### TASK-033: Create state adapter (UI ↔ Library)
**Objective**: Convert between UI and library state

**Target**: `packages/app/src/adapters/coreAdapter.ts`

**Functions**:
```typescript
export function uiToCore(uiState: UIGameState): CoreGameState;
export function coreToUI(coreState: CoreGameState, uiState: UIGameState): UIGameState;
```

**Acceptance Criteria**:
- ✅ Correct conversion
- ✅ Preserves UI fields
- ✅ 100% test coverage

**Estimated Time**: 3-4 hours  
**Estimated LOC**: 150 (code) + 150 (tests)  
**Dependencies**: TASK-032

---

### TASK-034: Refactor gameStore to use library
**Objective**: Replace local game logic with library calls

**Target**: `packages/app/src/store/gameStore.ts`

**Before**:
```typescript
initializeGame: (difficulty = 3) => {
  const deck = arrangeDeckByDifficulty(difficulty);
  // ... 50 lines of dealing logic
  set({ /* new state */ });
}
```

**After**:
```typescript
engine: new GameEngine(),

initializeGame: (difficulty = 3) => {
  const { engine } = get();
  const coreState = engine.initialize({ difficulty });
  const uiState = coreToUI(coreState, get());
  set(uiState);
}
```

**Acceptance Criteria**:
- ✅ All gameStore actions use library
- ✅ No duplicated game logic
- ✅ All 79 tests still pass

**Estimated Time**: 8-10 hours  
**Estimated LOC**: -500 (removed) + 200 (refactored)  
**Dependencies**: TASK-033

---

### TASK-035: Update all tests to pass
**Objective**: Fix any broken tests

**Acceptance Criteria**:
- ✅ All 79 existing tests pass
- ✅ No test modifications needed (ideally)

**Estimated Time**: 4-6 hours  
**Dependencies**: TASK-034

---

### TASK-036: Performance benchmarking
**Objective**: Ensure no performance regression

**Tests**:
1. Game initialization time
2. Move validation time
3. State transition time
4. Memory usage

**Acceptance Criteria**:
- ✅ No regression (±5% acceptable)
- ✅ Benchmarks documented

**Estimated Time**: 3-4 hours  
**Dependencies**: TASK-035

---

### TASK-037: Publish Library 1 stable (v1.0.0)
**Objective**: Promote alpha to stable release

**Steps**:
1. Update version to `1.0.0`
2. Update CHANGELOG
3. Publish: `npm publish`
4. Tag release in git

**Acceptance Criteria**:
- ✅ v1.0.0 published
- ✅ Git tag created
- ✅ CHANGELOG updated

**Estimated Time**: 2 hours  
**Dependencies**: TASK-036

---

## 5. Phase 4: Build Library 2 Foundation

_(Tasks TASK-038 through TASK-047 follow similar pattern to Library 1)_

### TASK-038: Extract MCTS type definitions
**Objective**: Create MCTS-specific types

**Target**: `packages/mcts/src/types/`

**Files**:
- `MCTSState.ts`
- `MCTSMove.ts`
- `SolverConfig.ts`
- `SolverResult.ts`

**Estimated Time**: 3-4 hours  
**Estimated LOC**: 200 (types) + 100 (tests)  
**Dependencies**: TASK-003, TASK-037

---

### TASK-039: Implement MCTSNode class
**Objective**: Tree node data structure

**Target**: `packages/mcts/src/core/MCTSNode.ts`

**See**: Existing MCTS planning docs, section III.A

**Estimated Time**: 4-5 hours  
**Estimated LOC**: 150 (code) + 150 (tests)  
**Dependencies**: TASK-038

---

### TASK-040: Implement GamePolicy interface
**Objective**: Abstract game interface

**Target**: `packages/mcts/src/core/GamePolicy.ts`

**See**: Existing MCTS planning docs, section III.B

**Estimated Time**: 2 hours  
**Estimated LOC**: 80 (interface)  
**Dependencies**: TASK-038

---

### TASK-041-044: Implement MCTSSolver phases
**Objectives**:
- TASK-041: Selection phase
- TASK-042: Expansion phase
- TASK-043: Simulation phase
- TASK-044: Backpropagation phase

**Target**: `packages/mcts/src/core/MCTSSolver.ts`

**See**: Existing MCTS planning docs, sections III.C-F

**Estimated Time**: 12-16 hours total  
**Estimated LOC**: 400 (code) + 400 (tests)  
**Dependencies**: TASK-039, TASK-040

---

### TASK-045: Implement UCB1 calculation
**Objective**: Selection formula

**See**: Existing MCTS planning docs, section III.C

**Estimated Time**: 2-3 hours  
**Estimated LOC**: 50 (code) + 80 (tests)  
**Dependencies**: TASK-041

---

### TASK-046: Validate with Tic-Tac-Toe test
**Objective**: Prove MCTS correctness with simple game

**Create Tic-Tac-Toe policy, test that MCTS finds optimal moves

**Estimated Time**: 6-8 hours  
**Estimated LOC**: 300 (test game) + 200 (tests)  
**Dependencies**: TASK-041-045

---

### TASK-047: Write MCTS core tests
**Objective**: Comprehensive test suite

**Acceptance Criteria**:
- ✅ >80% coverage
- ✅ Correctness validated

**Estimated Time**: 8-10 hours  
**Estimated LOC**: 500+ (tests)  
**Dependencies**: TASK-046

---

## 6. Phase 5: Build Library 2 Klondike

_(Tasks TASK-048 through TASK-057)_

### TASK-048: Create KlondikePolicy class
**Objective**: Klondike-specific game policy

**Target**: `packages/mcts/src/klondike/KlondikePolicy.ts`

**Wraps**: Library 1 GameEngine

**Estimated Time**: 4-5 hours  
**Estimated LOC**: 150 (code) + 150 (tests)  
**Dependencies**: TASK-040, TASK-037

---

### TASK-049: Implement MCTS move generator
**Objective**: Generate legal moves for MCTS

**Uses**: Library 1 `getLegalMoves()`

**Estimated Time**: 3-4 hours  
**Estimated LOC**: 100 (code) + 120 (tests)  
**Dependencies**: TASK-048

---

### TASK-050: Implement MCTS state transitions
**Objective**: Apply moves for MCTS

**Uses**: Library 1 `applyMove()`

**Estimated Time**: 2-3 hours  
**Estimated LOC**: 80 (code) + 100 (tests)  
**Dependencies**: TASK-048

---

### TASK-051: Create state adapter (Core ↔ MCTS)
**Objective**: Convert between library states

**Target**: `packages/mcts/src/klondike/StateAdapter.ts`

**Estimated Time**: 3 hours  
**Estimated LOC**: 100 (code) + 100 (tests)  
**Dependencies**: TASK-048

---

### TASK-052: Implement Heuristic Evaluation Function
**Objective**: Score terminal states

**See**: Existing MCTS planning docs, section IV.C

**Formula**:
- 10 points per card in foundation
- 1 point per face-up tableau card

**Estimated Time**: 2-3 hours  
**Estimated LOC**: 50 (code) + 80 (tests)  
**Dependencies**: TASK-048

---

### TASK-053: Implement greedy simulation policy
**Objective**: Heuristic playout

**See**: Existing MCTS planning docs, section IV.B (Table 2)

**8 priority levels**

**Estimated Time**: 6-8 hours  
**Estimated LOC**: 200 (code) + 200 (tests)  
**Dependencies**: TASK-052

---

### TASK-054: Implement move prioritization
**Objective**: Priority scoring for moves

**See**: Existing MCTS planning docs, Table 2

**Estimated Time**: 3-4 hours  
**Estimated LOC**: 100 (code) + 120 (tests)  
**Dependencies**: TASK-053

---

### TASK-055: Add cycle detection
**Objective**: Prevent infinite loops

**Uses**: Library 1 `HashUtils`

**Estimated Time**: 3-4 hours  
**Estimated LOC**: 80 (code) + 100 (tests)  
**Dependencies**: TASK-051

---

### TASK-056: Tune exploration constant
**Objective**: Optimize C parameter

**Test**: Different values [0.1, 0.6, 1.0, √2, 2.0]

**Benchmark**: Win rate for each

**Estimated Time**: 4-6 hours  
**Dependencies**: TASK-048-055

---

### TASK-057: Write Klondike MCTS tests
**Objective**: Comprehensive test suite

**Acceptance Criteria**:
- ✅ >80% coverage
- ✅ Win rate >20%

**Estimated Time**: 8-10 hours  
**Estimated LOC**: 500+ (tests)  
**Dependencies**: TASK-056

---

## 7. Phase 6: Integration & Polish

### TASK-058: Integrate MCTS into main app
**Objective**: Add MCTS hint feature to app

**Target**: `packages/app/src/store/gameStore.ts`

**Add actions**:
```typescript
requestMCTSHint: async (searchTimeMs = 2000) => { /* ... */ }
applyMCTSMove: () => { /* ... */ }
```

**Estimated Time**: 4-5 hours  
**Estimated LOC**: 150 (code) + 100 (tests)  
**Dependencies**: TASK-057

---

### TASK-059: Create MCTS UI components
**Objective**: Hint button and stats display

**Components**:
- `MCTSHintButton.tsx`
- `MCTSStatsPanel.tsx`
- `MoveHighlight.tsx`

**Estimated Time**: 6-8 hours  
**Estimated LOC**: 300 (code) + 150 (tests)  
**Dependencies**: TASK-058

---

### TASK-060: End-to-end testing
**Objective**: Test complete MCTS flow

**Scenarios**:
1. User clicks hint button
2. MCTS runs for 2 seconds
3. Best move is displayed
4. User applies move
5. Game state updates

**Estimated Time**: 4-6 hours  
**Estimated LOC**: 200 (tests)  
**Dependencies**: TASK-059

---

### TASK-061: Performance optimization
**Objective**: Optimize MCTS hot paths

**Tasks**:
1. Profile with Chrome DevTools
2. Optimize simulation loop
3. Add Web Workers (optional)
4. Benchmark

**Target**: >10,000 iter/s

**Estimated Time**: 8-12 hours  
**Dependencies**: TASK-060

---

### TASK-062: Documentation & publish Library 2
**Objective**: Finalize and publish

**Tasks**:
1. API documentation
2. README and examples
3. CHANGELOG
4. Publish v1.0.0

**Estimated Time**: 6-8 hours  
**Dependencies**: TASK-061

---

## 8. Dependency Graph

```
PHASE 1 (Setup)
├── TASK-001 (workspace) → TASK-002, TASK-003
├── TASK-002 (core pkg) → TASK-004, TASK-005
├── TASK-003 (mcts pkg) → TASK-004, TASK-005
├── TASK-004 (TypeScript) → TASK-008+
├── TASK-005 (Vite) → TASK-029
├── TASK-006 (CI/CD) → parallel
└── TASK-007 (docs) → parallel

PHASE 2 (Library 1)
├── TASK-008 (types) → TASK-009-012, TASK-013
├── TASK-009 (card utils) → TASK-015, TASK-016
├── TASK-010 (deck utils) → TASK-014
├── TASK-011 (validation) → TASK-024
├── TASK-012 (hash) → TASK-055
├── TASK-013 (engine skeleton) → TASK-014-024
├── TASK-014 (initialize) → TASK-018
├── TASK-015 (tableau rules) → TASK-018, TASK-019
├── TASK-016 (foundation rules) → TASK-018, TASK-020
├── TASK-017 (stock rules) → TASK-018, TASK-021
├── TASK-018 (getLegalMoves) → TASK-023
├── TASK-019-021 (applyMove) → TASK-025
├── TASK-022 (scoring) → TASK-023
├── TASK-023 (win/loss) → TASK-025
├── TASK-024 (import/export) → TASK-025
├── TASK-025 (entry point) → TASK-026-031
├── TASK-026 (tests) → TASK-029
├── TASK-027-028 (docs) → TASK-030
├── TASK-029 (build) → TASK-030
├── TASK-030 (publish alpha) → TASK-032
└── TASK-031 (changelog) → done

PHASE 3 (Integrate Library 1)
├── TASK-032 (install) → TASK-033
├── TASK-033 (adapter) → TASK-034
├── TASK-034 (refactor store) → TASK-035
├── TASK-035 (fix tests) → TASK-036
├── TASK-036 (benchmark) → TASK-037
└── TASK-037 (publish stable) → PHASE 4

PHASE 4 (Library 2 Foundation)
├── TASK-038 (mcts types) → TASK-039-040
├── TASK-039 (MCTSNode) → TASK-041
├── TASK-040 (GamePolicy) → TASK-041
├── TASK-041 (selection) → TASK-045
├── TASK-042 (expansion) → TASK-044
├── TASK-043 (simulation) → TASK-044
├── TASK-044 (backprop) → TASK-046
├── TASK-045 (UCB1) → TASK-046
├── TASK-046 (tic-tac-toe) → TASK-047
└── TASK-047 (tests) → PHASE 5

PHASE 5 (Library 2 Klondike)
├── TASK-048 (KlondikePolicy) → TASK-049-051
├── TASK-049 (move gen) → TASK-053
├── TASK-050 (state trans) → TASK-051
├── TASK-051 (adapter) → TASK-055
├── TASK-052 (HEF) → TASK-053
├── TASK-053 (greedy policy) → TASK-054
├── TASK-054 (priorities) → TASK-056
├── TASK-055 (cycle detect) → TASK-056
├── TASK-056 (tune C) → TASK-057
└── TASK-057 (tests) → PHASE 6

PHASE 6 (Integration & Polish)
├── TASK-058 (integrate) → TASK-059
├── TASK-059 (UI) → TASK-060
├── TASK-060 (E2E tests) → TASK-061
├── TASK-061 (optimize) → TASK-062
└── TASK-062 (publish) → DONE
```

---

## Summary Statistics

**Total Tasks**: 62 tasks  
**Total Phases**: 6 phases  
**Total Estimated Time**: 8-12 weeks  
**Total Estimated LOC**: ~4,500 lines (including tests)  
**Total Tests**: ~150+ new tests  

**Critical Path**: TASK-001 → ... → TASK-037 (Library 1) → TASK-038 → ... → TASK-062 (Library 2)

**Parallel Work Opportunities**:
- TASK-006 (CI/CD) can be done anytime
- TASK-007 (docs) can be done anytime
- Documentation tasks (TASK-027, TASK-028) can overlap

---

**Document Status**: COMPLETE - Ready for Implementation  
**Next Steps**: Assign tasks to coding agents  
**Priority**: Start with TASK-001 (workspace setup)

---

_This task breakdown provides granular, self-contained tasks suitable for coding agents or developers to implement incrementally. Each task includes clear objectives, acceptance criteria, and dependencies._
