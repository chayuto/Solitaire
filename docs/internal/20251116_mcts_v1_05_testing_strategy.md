# MCTS v1 - Testing Strategy

**Date:** 2025-11-16  
**Version:** v1.0  
**Purpose:** Comprehensive testing approach for MCTS implementation  
**Author:** GitHub Copilot Agent

---

## Overview

This document outlines the **complete testing strategy** for MCTS v1, including unit tests, integration tests, property-based tests, performance tests, and quality validation.

**Testing Goals**:
- >80% code coverage for MCTS module
- 100% of critical paths covered
- No regressions in existing functionality
- Performance targets validated
- Win rate improvement confirmed

---

## Test Pyramid

```
        /\
       /  \  E2E Tests (10%)
      /    \  ~250 LOC
     /------\
    /        \  Integration Tests (20%)
   /  Inte-  \  ~800 LOC
  /   gration \
 /--------------\
/                \  Unit Tests (70%)
/  Unit Tests    \  ~2000 LOC
/------------------\
```

**Distribution**:
- **Unit Tests**: 70% (testing individual functions/classes)
- **Integration Tests**: 20% (testing module interactions)
- **E2E Tests**: 10% (testing user workflows)

---

## Unit Tests (70% of Test Suite)

### Core Module Tests

**MCTSNode Class** (`tests/core/MCTSNode.test.ts`):
```typescript
describe('MCTSNode', () => {
  describe('constructor', () => {
    it('should create node with correct state');
    it('should shuffle untried moves');
    it('should initialize visits to 0');
    it('should initialize value to 0');
  });
  
  describe('isFullyExpanded', () => {
    it('should return false when untried moves exist');
    it('should return true when all moves expanded');
  });
  
  describe('getAverageValue', () => {
    it('should return 0 for unvisited node');
    it('should calculate correct average');
  });
  
  describe('popUntriedMove', () => {
    it('should return and remove one move');
    it('should return undefined when empty');
  });
});
```

**MCTSSolver Class** (`tests/core/MCTSSolver.test.ts`):
```typescript
describe('MCTSSolver', () => {
  // Use simple Tic-Tac-Toe for testing
  let policy: TicTacToePolicy;
  let solver: MCTSSolver<Board, Move>;
  
  describe('runSearch', () => {
    it('should complete N iterations without error');
    it('should build valid tree structure');
    it('should update root statistics');
    it('should not mutate initial state');
  });
  
  describe('getBestMove', () => {
    it('should return move with max visits');
    it('should return move with max value');
    it('should return null if no children');
  });
  
  describe('UCB1 calculation', () => {
    it('should return Infinity for unvisited nodes');
    it('should balance exploitation and exploration');
    it('should use correct formula');
  });
  
  describe('four phases', () => {
    it('should select node with highest UCB1');
    it('should expand one child per call');
    it('should simulate to terminal state');
    it('should backpropagate without negation');
  });
});
```

### Policy Module Tests

**KlondikePolicy** (`tests/policies/KlondikePolicy.test.ts`):
```typescript
describe('KlondikePolicy', () => {
  let policy: KlondikePolicy;
  let engine: GameEngine;
  
  beforeEach(() => {
    policy = new KlondikePolicy();
    engine = new GameEngine();
  });
  
  describe('getLegalMoves', () => {
    it('should return all legal moves for initial state');
    it('should return draw move when stock has cards');
    it('should return recycle move when stock empty');
    it('should return foundation moves when valid');
    it('should return tableau moves when valid');
  });
  
  describe('applyMove', () => {
    it('should return new state (not mutate)');
    it('should apply draw move correctly');
    it('should apply tableau-to-foundation correctly');
    it('should flip tableau card after move');
  });
  
  describe('isTerminal', () => {
    it('should return true when all cards in foundation');
    it('should return true when no legal moves');
    it('should return false for in-progress game');
  });
  
  describe('getScore', () => {
    it('should return 0 for initial state');
    it('should return 548 for winning state');
    it('should give 10 points per foundation card');
    it('should give 1 point per face-up tableau card');
  });
});
```

### Heuristics Module Tests

**Evaluation Function** (`tests/heuristics/evaluation.test.ts`):
```typescript
describe('evaluateState', () => {
  it('should return 0 for initial dealt state');
  it('should return 548 for complete game');
  it('should increase score when card moved to foundation');
  it('should increase score when tableau card flipped');
  it('should be fast (<0.01ms per call)');
  
  describe('edge cases', () => {
    it('should handle empty tableau columns');
    it('should handle full foundations');
    it('should handle all face-down tableau');
  });
});
```

**Simulation Policy** (`tests/heuristics/simulation.test.ts`):
```typescript
describe('selectGreedyMove', () => {
  it('should select tableau-to-foundation over waste-to-foundation');
  it('should select revealing moves over non-revealing');
  it('should select draw as last resort');
  it('should handle ties with random selection');
  
  describe('priority levels', () => {
    it('should classify priority 1 correctly');
    it('should classify priority 2 correctly');
    // ... for all 8 priorities
  });
});
```

### Utilities Tests

**Normalization** (`tests/utils/normalize.test.ts`):
```typescript
describe('normalizeScore', () => {
  it('should return 0 for score 0');
  it('should return 1 for max score');
  it('should return 0.5 for half max');
  it('should clamp negative scores to 0');
  it('should clamp over-max scores to 1');
});
```

---

## Integration Tests (20% of Test Suite)

### MCTS + Klondike Integration

**File**: `tests/integration/klondikeMCTS.test.ts`

```typescript
describe('MCTS with Klondike', () => {
  let engine: GameEngine;
  let policy: KlondikePolicy;
  let solver: MCTSSolver<GameState, MoveCommand>;
  
  beforeEach(() => {
    engine = new GameEngine();
    policy = new KlondikePolicy();
  });
  
  it('should run search on initial game state', () => {
    const state = engine.initialize();
    solver = new MCTSSolver(state, policy, {
      explorationConstant: Math.sqrt(2),
      maxTheoreticalScore: 548,
    });
    
    solver.runSearch(1000);
    const result = solver.getResult(1000);
    
    expect(result.bestMove).toBeDefined();
    expect(result.statistics.totalIterations).toBe(1000);
  });
  
  it('should return legal moves only', () => {
    const state = engine.initialize();
    solver = new MCTSSolver(state, policy, options);
    solver.runSearch(1000);
    
    const bestMove = solver.getBestMove();
    expect(bestMove).not.toBeNull();
    
    const legalMoves = policy.getLegalMoves(state);
    expect(legalMoves).toContainEqual(bestMove);
  });
  
  it('should improve with more iterations', () => {
    const state = engine.initialize();
    
    // Run 1000 iterations
    solver = new MCTSSolver(state, policy, options);
    solver.runSearch(1000);
    const confidence1000 = solver.getResult(1000).confidence;
    
    // Run 10000 iterations
    solver = new MCTSSolver(state, policy, options);
    solver.runSearch(10000);
    const confidence10000 = solver.getResult(10000).confidence;
    
    expect(confidence10000).toBeGreaterThanOrEqual(confidence1000);
  });
  
  it('should handle near-win states', () => {
    // Create state with 51 cards in foundation
    const state = createNearWinState();
    solver = new MCTSSolver(state, policy, options);
    solver.runSearch(1000);
    
    const bestMove = solver.getBestMove();
    // Should find the winning move
    expect(bestMove?.type).toBe('tableau_to_foundation');
  });
});
```

### Performance Integration

**File**: `tests/integration/performance.test.ts`

```typescript
describe('Performance Benchmarks', () => {
  it('should achieve >10k iterations/second', () => {
    const state = engine.initialize();
    const solver = new MCTSSolver(state, policy, options);
    
    const startTime = Date.now();
    solver.runSearch(100000);
    const elapsedMs = Date.now() - startTime;
    
    const iterPerSec = 100000 / (elapsedMs / 1000);
    expect(iterPerSec).toBeGreaterThan(10000);
  });
  
  it('should not leak memory', () => {
    const initialMem = process.memoryUsage().heapUsed;
    
    // Run 10 searches
    for (let i = 0; i < 10; i++) {
      const state = engine.initialize();
      const solver = new MCTSSolver(state, policy, options);
      solver.runSearch(10000);
    }
    
    // Force GC
    global.gc?.();
    
    const finalMem = process.memoryUsage().heapUsed;
    const growth = finalMem - initialMem;
    
    // Should not grow more than 10MB
    expect(growth).toBeLessThan(10 * 1024 * 1024);
  });
});
```

### Win Rate Validation

**File**: `tests/integration/winRate.test.ts`

```typescript
describe('Win Rate Benchmarks', () => {
  const GAMES_TO_SIMULATE = 100;
  
  it('random simulation: ~7% win rate', async () => {
    const wins = await simulateGames(GAMES_TO_SIMULATE, {
      useHeuristic: false,
      iterations: 1000,
    });
    const winRate = wins / GAMES_TO_SIMULATE;
    
    expect(winRate).toBeGreaterThan(0.05);
    expect(winRate).toBeLessThan(0.10);
  });
  
  it('greedy only: ~13% win rate', async () => {
    const wins = await simulateGames(GAMES_TO_SIMULATE, {
      useHeuristic: true,
      iterations: 0, // Pure greedy, no MCTS
    });
    const winRate = wins / GAMES_TO_SIMULATE;
    
    expect(winRate).toBeGreaterThan(0.10);
    expect(winRate).toBeLessThan(0.16);
  });
  
  it('MCTS + greedy: >20% win rate', async () => {
    const wins = await simulateGames(GAMES_TO_SIMULATE, {
      useHeuristic: true,
      iterations: 10000,
    });
    const winRate = wins / GAMES_TO_SIMULATE;
    
    expect(winRate).toBeGreaterThan(0.20);
  }, 600000); // 10 minute timeout
});
```

---

## Property-Based Tests

**File**: `tests/properties/mcts.test.ts`

Uses `fast-check` library for generative testing:

```typescript
import fc from 'fast-check';

describe('MCTS Properties', () => {
  it('property: child visits ≤ parent visits', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        (iterations) => {
          const state = engine.initialize();
          const solver = new MCTSSolver(state, policy, options);
          solver.runSearch(iterations);
          
          // Check all nodes in tree
          const violations = findViolations(solver.root, (node) =>
            node.children.every(child => child.visits <= node.visits)
          );
          
          expect(violations).toHaveLength(0);
        }
      )
    );
  });
  
  it('property: normalized value ∈ [0, node.visits]', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        (iterations) => {
          const state = engine.initialize();
          const solver = new MCTSSolver(state, policy, options);
          solver.runSearch(iterations);
          
          const violations = findViolations(solver.root, (node) =>
            node.value >= 0 && node.value <= node.visits
          );
          
          expect(violations).toHaveLength(0);
        }
      )
    );
  });
  
  it('property: state immutability', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (iterations) => {
          const state = engine.initialize();
          const frozenState = deepFreeze(state);
          
          const solver = new MCTSSolver(frozenState, policy, options);
          
          // Should not throw (state is never mutated)
          expect(() => solver.runSearch(iterations)).not.toThrow();
        }
      )
    );
  });
});
```

---

## E2E Tests

**File**: `packages/app/tests/e2e/mcts.spec.ts`

Uses Playwright for browser testing:

```typescript
import { test, expect } from '@playwright/test';

test.describe('MCTS Hint Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Start new game
    await page.click('button:has-text("New Game")');
  });
  
  test('user can request and apply hint', async ({ page }) => {
    // Click "Get Hint" button
    await page.click('button:has-text("Get Hint")');
    
    // Wait for hint to appear (max 3 seconds)
    await expect(page.locator('[data-testid="hint-confidence"]'))
      .toBeVisible({ timeout: 3000 });
    
    // Check confidence is displayed
    const confidence = await page.textContent('[data-testid="hint-confidence"]');
    expect(confidence).toMatch(/\d+%/);
    
    // Check move is highlighted
    await expect(page.locator('[data-testid="highlighted-card"]'))
      .toBeVisible();
    
    // Click "Apply Hint"
    await page.click('button:has-text("Apply Hint")');
    
    // Move should be executed
    // (Check that highlighted card moved)
    await expect(page.locator('[data-testid="highlighted-card"]'))
      .not.toBeVisible();
  });
  
  test('hint completes within 2 seconds', async ({ page }) => {
    const startTime = Date.now();
    
    await page.click('button:has-text("Get Hint")');
    await page.waitForSelector('[data-testid="hint-confidence"]');
    
    const elapsedMs = Date.now() - startTime;
    expect(elapsedMs).toBeLessThan(2000);
  });
  
  test('keyboard shortcut H requests hint', async ({ page }) => {
    await page.keyboard.press('h');
    
    await expect(page.locator('[data-testid="hint-confidence"]'))
      .toBeVisible({ timeout: 3000 });
  });
});
```

---

## Regression Tests

**File**: `packages/app/tests/regression/mcts.test.ts`

Ensures MCTS doesn't break existing features:

```typescript
describe('Regression Tests', () => {
  it('existing tests still pass', async () => {
    // Run all 90 existing tests
    // (This is handled by CI, but good to document)
  });
  
  it('game can be played without MCTS', () => {
    const store = createGameStore({ mctsEnabled: false });
    
    // Play game normally
    store.getState().draw();
    store.getState().moveCardToTableau(...);
    // ... should all work
  });
  
  it('MCTS can be disabled mid-game', () => {
    const store = createGameStore({ mctsEnabled: true });
    
    // Request hint
    store.getState().requestMCTSHint();
    
    // Disable MCTS
    store.getState().updateMCTSSettings({ enabled: false });
    
    // Game continues normally
    expect(() => store.getState().draw()).not.toThrow();
  });
});
```

---

## Coverage Targets

### Overall Target: >80%

**By Module**:
- Core MCTS: >85%
- Policies: >80%
- Heuristics: >75%
- Adapters: >90%
- UI Components: >70%

**Critical Paths: 100%**
- Four MCTS phases
- Move generation
- Move application
- Score calculation

### Coverage Enforcement

```json
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
      exclude: [
        '**/tests/**',
        '**/*.test.ts',
        '**/types/**',
      ]
    }
  }
});
```

---

## Performance Testing

### Benchmarking Infrastructure

**File**: `packages/mcts/benchmarks/iterations.bench.ts`

```typescript
import { Bench } from 'tinybench';

const bench = new Bench({ time: 5000 });

bench
  .add('1k iterations', () => {
    const solver = new MCTSSolver(state, policy, options);
    solver.runSearch(1000);
  })
  .add('10k iterations', () => {
    const solver = new MCTSSolver(state, policy, options);
    solver.runSearch(10000);
  })
  .add('100k iterations', () => {
    const solver = new MCTSSolver(state, policy, options);
    solver.runSearch(100000);
  });

await bench.run();

console.table(bench.table());
```

### Performance Regression Tests

```typescript
describe('Performance Regression', () => {
  const BASELINE_ITER_PER_SEC = 10000;
  const TOLERANCE = 0.8; // Allow 20% degradation
  
  it('should not degrade below baseline', () => {
    const startTime = Date.now();
    solver.runSearch(100000);
    const elapsedMs = Date.now() - startTime;
    
    const iterPerSec = 100000 / (elapsedMs / 1000);
    const threshold = BASELINE_ITER_PER_SEC * TOLERANCE;
    
    expect(iterPerSec).toBeGreaterThan(threshold);
  });
});
```

---

## Test Execution

### Local Development

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific suite
npm test -- mcts

# Run in watch mode
npm run test:watch

# Run benchmarks
npm run bench
```

### CI/CD Pipeline

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build:libs
      - run: npm run lint
      - run: npm run test:run
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
```

---

## Summary

**Test Suite Statistics**:
- Unit tests: ~2000 LOC, 70% of suite
- Integration tests: ~800 LOC, 20% of suite
- E2E tests: ~250 LOC, 10% of suite
- Property tests: ~250 LOC
- Total: ~3300 LOC of test code

**Coverage Targets**:
- Overall: >80%
- Core: >85%
- Critical paths: 100%

**Quality Gates**:
- All tests must pass
- Coverage must meet targets
- Performance benchmarks must pass
- No regressions in existing tests

---

**Document Status**: COMPLETE  
**Version**: v1.0  
**Last Updated**: 2025-11-16
