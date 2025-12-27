# Code Architecture & Organization Recommendations

**Date:** December 27, 2025  
**Status:** 📋 Recommendations for AI Coding Agents  
**Priority:** 🔴 High

---

## Executive Summary

This document provides actionable recommendations to improve code architecture and organization in the Solitaire monorepo, making it more maintainable and AI agent-friendly.

---

## Current State Analysis

### Strengths ✅
1. **Clean monorepo structure** with npm workspaces (packages/core, packages/mcts, packages/app)
2. **Good separation of concerns** between game logic (core) and UI (app)
3. **Pure functions** in core library with immutability patterns
4. **TypeScript strict mode** enabled across packages
5. **Barrel exports** in index.ts files

### Areas for Improvement 🔧
1. **gameStore.ts is too large** (~1400 lines) - violates Single Responsibility Principle
2. **Auto-play logic** (~500 lines) embedded in store - should be extracted
3. **No clear boundary** between core/UI types - duplicate definitions exist
4. **Missing dependency injection** patterns - makes testing harder
5. **Magic numbers** scattered in scoring/strategy code

---

## Recommendations

### 1. Extract Auto-Play to Dedicated Module

**Priority:** 🔴 High  
**Effort:** 4-6 hours  
**Impact:** Major improvement in testability and maintainability

**Current State:**
```typescript
// packages/app/src/store/gameStore.ts - 500+ lines of auto-play logic
performAutoPlayMove: () => {
  // Complex scoring, strategy, loop detection all in one place
}
```

**Recommended Structure:**
```
packages/app/src/autoplay/
├── index.ts              # Barrel export
├── types.ts              # AutoPlayMove, ScoringConfig interfaces
├── strategy.ts           # Move scoring and selection
├── loopDetection.ts      # State history and loop detection
├── scoring/
│   ├── foundationScore.ts
│   ├── tableauScore.ts
│   └── index.ts
└── __tests__/
    ├── strategy.test.ts
    └── loopDetection.test.ts
```

**Benefits:**
- Each module is <200 lines
- Easy to test scoring algorithms in isolation
- AI agents can modify strategy without touching store
- Clear interfaces for extending with ML-based strategies

**Implementation Guide for AI Agents:**
```typescript
// packages/app/src/autoplay/strategy.ts
export interface MoveScore {
  move: PossibleMove;
  score: number;
  reasons: string[]; // Explainable AI
}

export function scoreMove(
  move: PossibleMove,
  state: GameState,
  config: ScoringConfig
): MoveScore {
  // Pure function - easy to test
}

export function selectBestMove(
  moves: PossibleMove[],
  state: GameState,
  stateHistory: string[]
): PossibleMove | null {
  // Combine scoring with loop detection
}
```

---

### 2. Implement Module Boundaries with Explicit APIs

**Priority:** 🔴 High  
**Effort:** 2-3 hours  
**Impact:** Clearer interfaces for AI modifications

**Current Issue:**
- Unclear which functions are "public API" vs implementation details
- AI agents sometimes modify internal functions breaking other code

**Recommendation:**
Add `@public` and `@internal` JSDoc tags consistently:

```typescript
/**
 * @public
 * Check if a card can be moved to a tableau column
 * AI agents: Safe to use, stable API
 */
export function canMoveToTableau(card: Card, targetColumn: Card[]): boolean;

/**
 * @internal
 * Helper for partial shuffle - implementation detail
 * AI agents: Avoid modifying unless requested
 */
function partialShuffleRange(deck: Card[], start: number, end: number): void;
```

**Create API surface documentation:**
```
packages/core/src/PUBLIC_API.ts
// Re-export only stable public APIs
export { canMoveToTableau } from './rules/tableau';
export { GameEngine } from './engine';
// ... explicit list
```

---

### 3. Centralize Configuration Constants

**Priority:** 🟡 Medium  
**Effort:** 1-2 hours  
**Impact:** Easier to tune game balance

**Current Issue:**
Magic numbers embedded in code:
```typescript
// Scattered across gameStore.ts
score += 1000000; // Massive bonus for revealing moves
score -= 900000; // Massive penalty
const moveDelay = isAutoCompleteMode ? 100 : 1000;
```

**Recommendation:**
Create centralized config:

```typescript
// packages/app/src/constants/autoplay.ts
export const AUTOPLAY_CONFIG = {
  scoring: {
    REVEAL_CARD_BONUS: 1000000,
    EMPTY_COLUMN_PENALTY: 900000,
    ACE_TO_FOUNDATION: 50000,
    KING_TO_EMPTY_COLUMN: 100000,
    FOUNDATION_EVENNESS_PENALTY: 5000,
    USELESS_MOVE_PENALTY: 10000,
  },
  timing: {
    NORMAL_MOVE_DELAY: 1000,
    FAST_MOVE_DELAY: 100,
    SELECT_DELAY_NORMAL: 200,
    SELECT_DELAY_FAST: 50,
  },
  loopDetection: {
    MAX_STATE_HISTORY: 20,
  },
} as const;

// Type inference for configuration
export type AutoPlayConfig = typeof AUTOPLAY_CONFIG;
```

**Benefits:**
- Easy A/B testing of different strategies
- AI agents can tune parameters without code changes
- Self-documenting configuration

---

### 4. Implement Feature Flags Pattern

**Priority:** 🟡 Medium  
**Effort:** 2-3 hours  
**Impact:** Safer rollouts, easier experimentation

**Recommendation:**
```typescript
// packages/app/src/config/features.ts
export const FEATURES = {
  // Stable features
  AUTOPLAY: true,
  REPLAY: true,
  
  // Experimental features (AI agents can toggle)
  EXPERIMENTAL_MCTS_HINTS: false,
  EXPERIMENTAL_FASTER_ANIMATIONS: false,
  DEBUG_MOVE_SCORING: import.meta.env.DEV,
} as const;

// Usage
if (FEATURES.EXPERIMENTAL_MCTS_HINTS) {
  // New code path
}
```

---

### 5. Create Adapter Pattern for Core ↔ UI State

**Priority:** 🟡 Medium  
**Effort:** 3-4 hours  
**Impact:** Cleaner boundary between packages

**Current Issue:**
`coreAdapter.ts` exists but conversions happen inconsistently throughout codebase.

**Recommendation:**
Enforce adapter usage at package boundaries:

```typescript
// packages/app/src/adapters/index.ts
export { uiToCore, coreToUI } from './coreAdapter';

// New: Add validation
export function safeUiToCore(uiState: UIGameState): Result<CoreGameState, ValidationError> {
  try {
    const coreState = uiToCore(uiState);
    validateGameState(coreState);
    return { success: true, value: coreState };
  } catch (error) {
    return { success: false, error: new ValidationError(error.message) };
  }
}
```

---

### 6. Implement Command Pattern for Moves

**Priority:** 🟢 Low (Future)  
**Effort:** 8-10 hours  
**Impact:** Enables undo/redo, better history tracking

**Current State:**
Moves are recorded but not reversible.

**Recommendation:**
```typescript
// packages/core/src/commands/MoveCommand.ts
export interface MoveCommand {
  execute(state: GameState): GameState;
  undo(state: GameState): GameState;
  describe(): string;
}

export class TableauToTableauCommand implements MoveCommand {
  constructor(
    private from: { column: number; cardIndex: number },
    private to: { column: number }
  ) {}
  
  execute(state: GameState): GameState {
    // Apply move
  }
  
  undo(state: GameState): GameState {
    // Reverse move
  }
  
  describe(): string {
    return `Move from column ${this.from.column} to ${this.to.column}`;
  }
}
```

---

## Directory Structure Recommendation

```
packages/
├── core/                     # @chayuto/solitaire-core
│   ├── src/
│   │   ├── types/           # Pure type definitions
│   │   ├── utils/           # Pure utility functions
│   │   ├── rules/           # Game rules
│   │   ├── engine/          # GameEngine class
│   │   ├── scoring/         # Scoring algorithms
│   │   ├── commands/        # NEW: Command pattern (future)
│   │   └── index.ts         # Public API only
│   └── tests/
│
├── mcts/                     # @chayuto/solitaire-mcts
│   ├── src/
│   │   ├── core/            # Core MCTS implementation
│   │   ├── policies/        # Game-specific policies
│   │   └── index.ts
│   └── tests/
│
└── app/                      # Main application
    ├── src/
    │   ├── adapters/        # Core ↔ UI adapters
    │   ├── autoplay/        # NEW: Extracted auto-play
    │   │   ├── strategy.ts
    │   │   ├── loopDetection.ts
    │   │   └── scoring/
    │   ├── components/      # React components
    │   ├── config/          # NEW: Feature flags, config
    │   ├── constants/       # App constants
    │   ├── hooks/           # NEW: Custom React hooks
    │   ├── store/           # Zustand store (smaller)
    │   ├── types/           # UI-specific types
    │   └── utils/           # UI utilities
    └── tests/
```

---

## AI Agent Implementation Checklist

When implementing these recommendations:

- [ ] Start with extracting auto-play logic (highest impact)
- [ ] Add JSDoc `@public`/`@internal` annotations
- [ ] Create AUTOPLAY_CONFIG constants
- [ ] Add feature flags infrastructure
- [ ] Improve adapter validation
- [ ] Update tests for new module structure
- [ ] Run `npm run test:run` after each change
- [ ] Run `npm run lint` to ensure code style

---

## Validation Commands

```bash
# After making changes
npm run build:libs   # Build libraries
npm run lint         # Check code style
npm run test:run     # Run all tests
npm run build        # Build app
```

---

## Related Documents

- [20251227_testing_quality_recommendations.md](./20251227_testing_quality_recommendations.md)
- [20251227_agentic_friendliness_recommendations.md](./20251227_agentic_friendliness_recommendations.md)
- [architecture.md](./architecture.md) - Current architecture docs

---

**Author:** AI Analysis  
**Last Updated:** December 27, 2025
