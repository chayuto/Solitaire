# Testing & Quality Assurance Recommendations

**Date:** December 27, 2025  
**Status:** 📋 Recommendations for AI Coding Agents  
**Priority:** 🔴 High

---

## Executive Summary

This document provides comprehensive recommendations for improving testing practices, code coverage, and quality assurance in the Solitaire monorepo to make it more robust and AI agent-friendly.

---

## Current State Analysis

### Strengths ✅
1. **Vitest** testing framework properly configured
2. **90 tests** covering game store and UI components
3. **CI/CD pipeline** runs lint, test, build in parallel
4. **Testing Library** for React component testing
5. **Co-located tests** with source files

### Areas for Improvement 🔧
1. **No coverage reporting** configured (missing `@vitest/coverage-v8`)
2. **Core library tests** are minimal - only one test file
3. **No integration tests** for complete game flows
4. **Missing snapshot tests** for UI components
5. **No performance/regression tests**
6. **Test helpers not centralized** - duplication across test files

---

## Recommendations

### 1. Add Test Coverage Tracking

**Priority:** 🔴 High  
**Effort:** 1-2 hours  
**Impact:** Identify untested code paths

**Current Issue:**
```bash
# npm run test:coverage fails
Error: @vitest/coverage-v8 is not installed
```

**Recommendation:**
```bash
# Install coverage dependency
npm install -D @vitest/coverage-v8 -w app
```

```typescript
// packages/app/vite.config.ts
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/test/**',
        'src/**/*.test.{ts,tsx}',
        'src/main.tsx',
        'src/vite-env.d.ts',
      ],
      thresholds: {
        statements: 70,
        branches: 60,
        functions: 70,
        lines: 70,
      },
    },
  },
});
```

**Add to CI:**
```yaml
# .github/workflows/ci.yml
test:
  steps:
    - run: npm run test:run
    - run: npm run test:coverage
    - uses: codecov/codecov-action@v4
      with:
        files: ./packages/app/coverage/lcov.info
```

---

### 2. Create Test Factory Functions

**Priority:** 🔴 High  
**Effort:** 2-3 hours  
**Impact:** DRY test code, easier state creation

**Current Issue:**
Test files duplicate game state creation:
```typescript
// Repeated in multiple test files
const testState = {
  drawPile: [],
  discardPile: [],
  foundations: {
    hearts: [],
    diamonds: [],
    clubs: [],
    spades: [],
  },
  tableau: [...],
  // Many more fields...
};
```

**Recommendation:**
Create test factories:

```typescript
// packages/app/src/test/factories/gameStateFactory.ts
import type { GameState, Card, Suit, Rank } from '../../types';

export function createTestCard(
  suit: Suit,
  rank: Rank,
  faceUp = true
): Card {
  return {
    suit,
    rank,
    faceUp,
    id: `${suit}-${rank}`,
  };
}

export function createEmptyGameState(
  overrides: Partial<GameState> = {}
): GameState {
  return {
    drawPile: [],
    discardPile: [],
    foundations: {
      hearts: [],
      diamonds: [],
      clubs: [],
      spades: [],
    },
    tableau: [[], [], [], [], [], [], []],
    selectedCard: undefined,
    moveHistory: [],
    showValidMoves: true,
    godMode: false,
    autoPlayEnabled: false,
    autoPlayInProgress: false,
    autoPlayStateHistory: [],
    difficulty: 3,
    gameWon: false,
    completionProgress: 0,
    replayMode: false,
    replayIndex: 0,
    replayPaused: false,
    replaySpeed: 1000,
    ...overrides,
  };
}

export function createWinningGameState(): GameState {
  const hearts = ['A','2','3','4','5','6','7','8','9','10','J','Q','K']
    .map(r => createTestCard('hearts', r as Rank));
  // ... similar for other suits
  return createEmptyGameState({
    foundations: { hearts, diamonds, clubs, spades },
    gameWon: true,
    completionProgress: 100,
  });
}

export function createDeadEndState(): GameState {
  // State with no valid moves
}

export function createNearWinState(): GameState {
  // State that can be won in 1-2 moves
}
```

```typescript
// packages/app/src/test/factories/index.ts
export * from './gameStateFactory';
export * from './moveFactory';
export * from './cardFactory';
```

**Usage in tests:**
```typescript
import { createEmptyGameState, createTestCard } from '../test/factories';

it('should move ace to foundation', () => {
  const state = createEmptyGameState({
    tableau: [
      [createTestCard('hearts', 'A')],
      [], [], [], [], [], [],
    ],
  });
  // Test code...
});
```

---

### 3. Add Integration Tests for Game Flows

**Priority:** 🔴 High  
**Effort:** 4-6 hours  
**Impact:** Catch regressions in end-to-end scenarios

**Recommendation:**
Create integration test file:

```typescript
// packages/app/src/test/integration/gameFlows.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../../store/gameStore';
import { createTestCard } from '../factories';

describe('Game Flow Integration Tests', () => {
  beforeEach(() => {
    useGameStore.getState().initializeGame();
  });

  describe('Complete Game Win', () => {
    it('should win game when all cards moved to foundations', async () => {
      // Set up near-win state
      // Execute winning moves
      // Verify gameWon = true
    });

    it('should trigger auto-complete when conditions met', async () => {
      // Set up auto-complete state (all tableau face-up, empty draw pile)
      // Trigger auto-complete
      // Verify game completes
    });
  });

  describe('Save/Load Cycle', () => {
    it('should restore exact game state after save/load', () => {
      const store = useGameStore.getState();
      
      // Make some moves
      store.drawCard();
      store.drawCard();
      
      // Export and import
      const exported = store.exportGameState();
      store.initializeGame(); // Reset
      const imported = store.importGameState(exported);
      
      expect(imported).toBe(true);
      // Verify state matches
    });
  });

  describe('Replay System', () => {
    it('should replay moves accurately', () => {
      const store = useGameStore.getState();
      
      // Make moves
      store.drawCard();
      const afterFirstMove = store.exportGameState();
      
      store.drawCard();
      store.drawCard();
      
      // Start replay
      store.startReplay();
      store.goToReplayIndex(1);
      
      // Verify state matches after first move
    });
  });

  describe('Auto-Play Edge Cases', () => {
    it('should detect loop and stop', async () => {
      // Set up looping state
      // Enable auto-play
      // Wait for loop detection
      // Verify stopped with loop message
    });

    it('should detect deadend and stop', () => {
      // Set up deadend state
      // Enable auto-play
      // Verify stopped with deadend message
    });
  });
});
```

---

### 4. Add Core Library Unit Tests

**Priority:** 🔴 High  
**Effort:** 4-6 hours  
**Impact:** Ensure library reliability

**Current Issue:**
Only one test file in `packages/core/tests/index.test.ts`

**Recommendation:**
Add comprehensive tests:

```typescript
// packages/core/tests/rules/tableau.test.ts
import { describe, it, expect } from 'vitest';
// Note: Import paths should match actual core library exports
// Check packages/core/src/index.ts for actual function names
import { 
  canMoveToTableau, 
  canMoveSequence, 
  getValidTableauDestinations,
  createCard 
} from '@chayuto/solitaire-core';

describe('Tableau Rules', () => {
  describe('canMoveToTableau', () => {
    it('should allow King on empty column', () => {
      const king = createCard('hearts', 'K');
      expect(canMoveToTableau(king, [])).toBe(true);
    });

    it('should reject non-King on empty column', () => {
      const queen = createCard('hearts', 'Q');
      expect(canMoveToTableau(queen, [])).toBe(false);
    });

    it('should allow opposite color one rank lower', () => {
      const redSeven = createCard('hearts', '7', true);
      const blackEight = createCard('spades', '8', true);
      expect(canMoveToTableau(redSeven, [blackEight])).toBe(true);
    });

    it('should reject same color', () => {
      const redSeven = createCard('hearts', '7', true);
      const redEight = createCard('diamonds', '8', true);
      expect(canMoveToTableau(redSeven, [redEight])).toBe(false);
    });

    it('should reject wrong rank', () => {
      const redSeven = createCard('hearts', '7', true);
      const blackNine = createCard('spades', '9', true);
      expect(canMoveToTableau(redSeven, [blackNine])).toBe(false);
    });
  });

  describe('canMoveSequence', () => {
    it('should validate proper alternating sequence', () => {
      const sequence = [
        createCard('hearts', '7', true),
        createCard('spades', '6', true),
        createCard('diamonds', '5', true),
      ];
      const target = [createCard('clubs', '8', true)];
      expect(canMoveSequence(sequence, target)).toBe(true);
    });

    it('should reject invalid sequence', () => {
      const invalidSequence = [
        createCard('hearts', '7', true),
        createCard('diamonds', '6', true), // Same color!
      ];
      const target = [createCard('clubs', '8', true)];
      expect(canMoveSequence(invalidSequence, target)).toBe(false);
    });
  });
});
```

```typescript
// packages/core/tests/engine/gameEngine.test.ts
import { describe, it, expect } from 'vitest';
import { GameEngine } from '../../src/engine';

describe('GameEngine', () => {
  const engine = new GameEngine();

  describe('initialize', () => {
    it('should create valid initial state', () => {
      const state = engine.initialize();
      expect(state.tableau.flat().length).toBe(28);
      expect(state.drawPile.length).toBe(24);
      expect(state.discardPile.length).toBe(0);
    });

    it('should produce reproducible games with seed', () => {
      const state1 = engine.initialize({ seed: 12345 });
      const state2 = engine.initialize({ seed: 12345 });
      expect(state1.drawPile.map(c => c.id))
        .toEqual(state2.drawPile.map(c => c.id));
    });
  });

  describe('getLegalMoves', () => {
    it('should return draw move when draw pile not empty', () => {
      const state = engine.initialize();
      const moves = engine.getLegalMoves(state);
      expect(moves.some(m => m.type === 'draw_card')).toBe(true);
    });
  });

  describe('isWon', () => {
    it('should return false for initial state', () => {
      const state = engine.initialize();
      expect(engine.isWon(state)).toBe(false);
    });
  });
});
```

---

### 5. Add Property-Based Testing

**Priority:** 🟡 Medium  
**Effort:** 3-4 hours  
**Impact:** Find edge cases automatically

**Recommendation:**
Use `fast-check` for property-based testing:

```bash
npm install -D fast-check -w @chayuto/solitaire-core
```

```typescript
// packages/core/tests/properties/gameState.property.test.ts
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { GameEngine } from '../../src/engine';
import { countCards, isValidGameState } from '../../src/utils/validation';

describe('GameState Properties', () => {
  const engine = new GameEngine();

  it('should always have exactly 52 cards', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 5 }), (difficulty) => {
        const state = engine.initialize({ difficulty });
        return countCards(state) === 52;
      })
    );
  });

  it('should maintain 52 cards after any legal move', () => {
    fc.assert(
      fc.property(fc.integer({ min: 12345, max: 99999 }), (seed) => {
        let state = engine.initialize({ seed });
        const moves = engine.getLegalMoves(state);
        
        for (const move of moves.slice(0, 5)) {
          if (engine.canApplyMove(state, move)) {
            state = engine.applyMove(state, move);
            if (countCards(state) !== 52) return false;
          }
        }
        return true;
      })
    );
  });

  it('should produce valid states from any random seed', () => {
    fc.assert(
      fc.property(fc.integer(), (seed) => {
        const state = engine.initialize({ seed: Math.abs(seed) });
        return isValidGameState(state);
      })
    );
  });
});
```

---

### 6. Add Snapshot Tests for Components

**Priority:** 🟡 Medium  
**Effort:** 2-3 hours  
**Impact:** Catch unintended UI changes

**Recommendation:**
```typescript
// packages/app/src/components/Card.snapshot.test.tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import Card from './Card';

describe('Card Snapshots', () => {
  it('renders face-up red card correctly', () => {
    const { container } = render(
      <Card
        card={{ suit: 'hearts', rank: 'A', faceUp: true, id: 'hearts-A' }}
        isSelected={false}
        isValidTarget={false}
      />
    );
    expect(container).toMatchSnapshot();
  });

  it('renders face-down card correctly', () => {
    const { container } = render(
      <Card
        card={{ suit: 'spades', rank: 'K', faceUp: false, id: 'spades-K' }}
        isSelected={false}
        isValidTarget={false}
      />
    );
    expect(container).toMatchSnapshot();
  });

  it('renders selected card correctly', () => {
    const { container } = render(
      <Card
        card={{ suit: 'diamonds', rank: 'Q', faceUp: true, id: 'diamonds-Q' }}
        isSelected={true}
        isValidTarget={false}
      />
    );
    expect(container).toMatchSnapshot();
  });
});
```

---

### 7. Add Performance Regression Tests

**Priority:** 🟡 Medium  
**Effort:** 2-3 hours  
**Impact:** Prevent performance degradation

**Recommendation:**
```typescript
// packages/app/src/test/performance/gameStore.perf.test.ts
import { describe, it, expect } from 'vitest';
import { useGameStore } from '../../store/gameStore';

describe('Performance Tests', () => {
  it('should initialize game under 50ms', () => {
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      useGameStore.getState().initializeGame();
    }
    const elapsed = performance.now() - start;
    expect(elapsed / 100).toBeLessThan(50);
  });

  it('should calculate legal moves under 10ms', () => {
    useGameStore.getState().initializeGame();
    const state = useGameStore.getState();
    
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      // Trigger move calculation
    }
    const elapsed = performance.now() - start;
    expect(elapsed / 100).toBeLessThan(10);
  });

  it('should hash state under 5ms', () => {
    useGameStore.getState().initializeGame();
    const state = useGameStore.getState();
    
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      // Hash calculation
    }
    const elapsed = performance.now() - start;
    expect(elapsed / 1000).toBeLessThan(5);
  });
});
```

---

### 8. Create Test Documentation

**Priority:** 🟢 Low  
**Effort:** 1-2 hours  
**Impact:** Easier onboarding

**Recommendation:**
Create `TESTING.md`:

```markdown
# Testing Guide

## Running Tests

```bash
# Run all tests
npm run test:run

# Run tests in watch mode
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm run test:run -- gameStore.test.ts

# Run tests matching pattern
npm run test:run -- -t "should move ace"
```

## Test Organization

- Unit tests: Co-located with source files (`*.test.ts`)
- Integration tests: `src/test/integration/`
- Performance tests: `src/test/performance/`
- Factories: `src/test/factories/`

## Writing Tests

### Game State Tests
Use factories to create test states:
```typescript
import { createEmptyGameState, createTestCard } from '../test/factories';
```

### Component Tests
Use React Testing Library:
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
```

### Async Tests
For auto-play and timing:
```typescript
import { waitFor } from '@testing-library/react';
await waitFor(() => expect(condition).toBe(true));
```
```

---

## Test Directory Structure

```
packages/app/src/
├── test/
│   ├── setup.ts              # Vitest setup
│   ├── factories/            # Test state factories
│   │   ├── gameStateFactory.ts
│   │   ├── cardFactory.ts
│   │   └── index.ts
│   ├── integration/          # Integration tests
│   │   └── gameFlows.test.ts
│   ├── performance/          # Performance tests
│   │   └── gameStore.perf.test.ts
│   └── mocks/                # Mock implementations
│       └── mockLocalStorage.ts
├── store/
│   ├── gameStore.ts
│   └── gameStore.test.ts     # Unit tests
├── components/
│   ├── Card.tsx
│   ├── Card.test.tsx         # Component tests
│   └── Card.snapshot.test.tsx # Snapshot tests

packages/core/tests/
├── index.test.ts
├── rules/
│   ├── tableau.test.ts
│   ├── foundation.test.ts
│   └── stock.test.ts
├── engine/
│   └── gameEngine.test.ts
├── utils/
│   ├── card.test.ts
│   └── deck.test.ts
└── properties/
    └── gameState.property.test.ts
```

---

## AI Agent Testing Checklist

When adding new features:

- [ ] Write unit tests for pure functions
- [ ] Write integration tests for user flows
- [ ] Add snapshot tests for new components
- [ ] Use factories for test state creation
- [ ] Run `npm run test:run` - all tests pass
- [ ] Run `npm run test:coverage` - coverage maintained
- [ ] Check for flaky tests (run 3x)

---

## Validation Commands

```bash
npm run test:run          # All tests pass
npm run test:coverage     # Coverage meets thresholds
npm run lint              # No lint errors
npm run build             # Builds successfully
```

---

**Author:** AI Analysis  
**Last Updated:** December 27, 2025
