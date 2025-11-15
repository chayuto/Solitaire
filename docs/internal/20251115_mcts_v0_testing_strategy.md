# MCTS Testing Strategy - Comprehensive Test Plan

**Date:** 2025-11-15  
**Version:** v0.1  
**Status:** Planning Phase  
**Author:** GitHub Copilot Agent

---

## Overview

This document outlines the comprehensive testing strategy for the MCTS integration. The strategy follows a **test pyramid** approach with emphasis on:

1. **Unit Tests** (70%): Fast, isolated tests for individual functions
2. **Integration Tests** (20%): Tests for component interactions
3. **End-to-End Tests** (10%): Full user workflow tests

**Target Coverage**: >80% for MCTS module  
**Test Framework**: Vitest 4.0 (existing project standard)  
**Test Runner**: `npm run test:mcts`

---

## Test Categories

### 1. Unit Tests (70% of tests, ~21 files)

#### 1.1 Type System Tests
**File**: `src/mcts/types/__tests__/state.test.ts`  
**Lines**: ~100

```typescript
describe('MCTS Types - State', () => {
  describe('getCardColor', () => {
    it('returns RED for HEARTS', () => {
      const card: MCTSCard = { suit: MCTSSuit.HEARTS, rank: MCTSRank.Ace, isFaceUp: true };
      expect(getCardColor(card)).toBe('RED');
    });
    
    it('returns RED for DIAMONDS', () => {
      const card: MCTSCard = { suit: MCTSSuit.DIAMONDS, rank: MCTSRank.King, isFaceUp: false };
      expect(getCardColor(card)).toBe('RED');
    });
    
    it('returns BLACK for CLUBS', () => {
      const card: MCTSCard = { suit: MCTSSuit.CLUBS, rank: MCTSRank.Two, isFaceUp: true };
      expect(getCardColor(card)).toBe('BLACK');
    });
    
    it('returns BLACK for SPADES', () => {
      const card: MCTSCard = { suit: MCTSSuit.SPADES, rank: MCTSRank.Queen, isFaceUp: true };
      expect(getCardColor(card)).toBe('BLACK');
    });
  });
  
  describe('isRankSequential', () => {
    it('returns true for sequential ranks (3 after 2)', () => {
      expect(isRankSequential(MCTSRank.Three, MCTSRank.Two)).toBe(true);
    });
    
    it('returns true for sequential ranks (King after Queen)', () => {
      expect(isRankSequential(MCTSRank.King, MCTSRank.Queen)).toBe(true);
    });
    
    it('returns false for non-sequential ranks', () => {
      expect(isRankSequential(MCTSRank.Five, MCTSRank.Two)).toBe(false);
    });
    
    it('returns false for reverse order', () => {
      expect(isRankSequential(MCTSRank.Two, MCTSRank.Three)).toBe(false);
    });
  });
});
```

#### 1.2 Utility Tests
**Files**:
- `src/mcts/utils/__tests__/stateHash.test.ts`
- `src/mcts/utils/__tests__/normalize.test.ts`

```typescript
describe('State Hashing', () => {
  it('produces consistent hash for same state', () => {
    const state = createMockState();
    const hash1 = hashState(state);
    const hash2 = hashState(state);
    expect(hash1).toBe(hash2);
  });
  
  it('produces different hashes for different states', () => {
    const state1 = createMockState();
    const state2 = createMockState({ differentCard: true });
    expect(hashState(state1)).not.toBe(hashState(state2));
  });
  
  it('completes in <1ms', () => {
    const state = createMockState();
    const start = performance.now();
    hashState(state);
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(1);
  });
});

describe('Score Normalization', () => {
  const MAX_SCORE = 548;
  
  it('normalizes min score to 0', () => {
    expect(normalizeScore(0, MAX_SCORE)).toBe(0);
  });
  
  it('normalizes max score to 1', () => {
    expect(normalizeScore(548, MAX_SCORE)).toBe(1);
  });
  
  it('normalizes mid score to 0.5', () => {
    expect(normalizeScore(274, MAX_SCORE)).toBe(0.5);
  });
  
  it('clamps negative scores to 0', () => {
    expect(normalizeScore(-10, MAX_SCORE)).toBe(0);
  });
  
  it('clamps over-max scores to 1', () => {
    expect(normalizeScore(1000, MAX_SCORE)).toBe(1);
  });
});
```

#### 1.3 Core MCTS Tests
**Files**:
- `src/mcts/core/__tests__/MCTSNode.test.ts`
- `src/mcts/core/__tests__/MCTSSolver.test.ts`

```typescript
describe('MCTSNode', () => {
  it('initializes with correct state', () => {
    const state = createMockState();
    const moves = [createMockMove()];
    const node = new MCTSNode(state, null, null, moves);
    
    expect(node.state).toBe(state);
    expect(node.move).toBeNull();
    expect(node.parent).toBeNull();
    expect(node.visits).toBe(0);
    expect(node.value).toBe(0);
  });
  
  it('shuffles untried moves', () => {
    const moves = Array.from({ length: 10 }, (_, i) => createMockMove(i));
    const node = new MCTSNode(createMockState(), null, null, [...moves]);
    
    // Statistical test: shuffled moves should not be in original order
    const firstMoves = [];
    for (let i = 0; i < 10; i++) {
      const n = new MCTSNode(createMockState(), null, null, [...moves]);
      firstMoves.push(n.popUntriedMove());
    }
    
    // At least one shuffle should differ
    const allSame = firstMoves.every(m => m === moves[moves.length - 1]);
    expect(allSame).toBe(false);
  });
  
  it('isFullyExpanded returns true when no untried moves', () => {
    const node = new MCTSNode(createMockState(), null, null, []);
    expect(node.isFullyExpanded()).toBe(true);
  });
  
  it('getAverageValue handles zero visits', () => {
    const node = new MCTSNode(createMockState(), null, null, []);
    expect(node.getAverageValue()).toBe(0);
  });
  
  it('getAverageValue calculates correctly', () => {
    const node = new MCTSNode(createMockState(), null, null, []);
    node.visits = 10;
    node.value = 7.5;
    expect(node.getAverageValue()).toBe(0.75);
  });
});

describe('MCTSSolver', () => {
  describe('Constructor', () => {
    it('initializes root node', () => {
      const solver = createTestSolver();
      expect(solver['root']).toBeDefined();
      expect(solver['root'].parent).toBeNull();
    });
    
    it('throws error for invalid exploration constant', () => {
      expect(() => {
        new MCTSSolver(createMockState(), new MockPolicy(), {
          explorationConstant: -1,
          maxTheoreticalScore: 548,
        });
      }).toThrow('explorationConstant');
    });
  });
  
  describe('runSearch', () => {
    it('executes correct number of iterations', () => {
      const solver = createTestSolver();
      solver.runSearch(100);
      expect(solver['root'].visits).toBe(100);
    });
    
    it('builds tree structure', () => {
      const solver = createTestSolver();
      solver.runSearch(100);
      expect(solver['root'].children.length).toBeGreaterThan(0);
    });
  });
  
  describe('getBestMove', () => {
    it('returns null for no children', () => {
      const solver = createTestSolver();
      expect(solver.getBestMove()).toBeNull();
    });
    
    it('returns most visited child for visits criteria', () => {
      const solver = createTestSolver();
      solver.runSearch(100);
      const bestMove = solver.getBestMove('visits');
      expect(bestMove).toBeDefined();
    });
  });
});
```

#### 1.4 Move Generation Tests
**File**: `src/mcts/klondike/__tests__/moveGenerator.test.ts`

```typescript
describe('Move Generator', () => {
  describe('Stock/Waste Moves', () => {
    it('generates DRAW_FROM_STOCK when stock has cards', () => {
      const state = createMockState({ stock: [createMockCard()] });
      const moves = generateLegalMoves(state);
      expect(moves.some(m => m.type === 'DRAW_FROM_STOCK')).toBe(true);
    });
    
    it('generates RECYCLE_WASTE when stock empty and waste not empty', () => {
      const state = createMockState({ stock: [], waste: [createMockCard()] });
      const moves = generateLegalMoves(state);
      expect(moves.some(m => m.type === 'RECYCLE_WASTE')).toBe(true);
    });
    
    it('generates no stock moves when both empty', () => {
      const state = createMockState({ stock: [], waste: [] });
      const moves = generateLegalMoves(state);
      const stockMoves = moves.filter(m => 
        m.type === 'DRAW_FROM_STOCK' || m.type === 'RECYCLE_WASTE'
      );
      expect(stockMoves.length).toBe(0);
    });
  });
  
  describe('Waste to Foundation', () => {
    it('generates move for Ace to empty foundation', () => {
      const ace = createMockCard(MCTSSuit.HEARTS, MCTSRank.Ace);
      const state = createMockState({ waste: [ace], foundations: [[], [], [], []] });
      const moves = generateLegalMoves(state);
      
      const foundationMove = moves.find(m => 
        m.type === 'MOVE_CARDS' && 
        m.from.pileType === 'WASTE' && 
        m.to.pileType === 'FOUNDATION'
      );
      expect(foundationMove).toBeDefined();
    });
    
    it('generates move for sequential rank', () => {
      const ace = createMockCard(MCTSSuit.HEARTS, MCTSRank.Ace);
      const two = createMockCard(MCTSSuit.HEARTS, MCTSRank.Two);
      const state = createMockState({ 
        waste: [two], 
        foundations: [[], [], [ace], []] 
      });
      const moves = generateLegalMoves(state);
      
      const foundationMove = moves.find(m => 
        m.type === 'MOVE_CARDS' && 
        m.from.pileType === 'WASTE' && 
        m.to.pileType === 'FOUNDATION'
      );
      expect(foundationMove).toBeDefined();
    });
    
    it('does not generate move for wrong suit', () => {
      const ace = createMockCard(MCTSSuit.HEARTS, MCTSRank.Ace);
      const two = createMockCard(MCTSSuit.SPADES, MCTSRank.Two);
      const state = createMockState({ 
        waste: [two], 
        foundations: [[], [], [ace], []] 
      });
      const moves = generateLegalMoves(state);
      
      const foundationMove = moves.find(m => 
        m.type === 'MOVE_CARDS' && 
        m.from.pileType === 'WASTE' && 
        m.to.pileType === 'FOUNDATION' &&
        m.to.pileIndex === 2
      );
      expect(foundationMove).toBeUndefined();
    });
  });
  
  // ... similar tests for all move types
});
```

#### 1.5 State Transition Tests
**File**: `src/mcts/klondike/__tests__/stateTransition.test.ts`

```typescript
describe('State Transition', () => {
  describe('applyDrawFromStock', () => {
    it('moves card from stock to waste', () => {
      const card = createMockCard();
      const state = createMockState({ stock: [card], waste: [] });
      const newState = applyDrawFromStock(state);
      
      expect(newState.stock.length).toBe(0);
      expect(newState.waste.length).toBe(1);
      expect(newState.waste[0].suit).toBe(card.suit);
    });
    
    it('flips card face-up', () => {
      const card = createMockCard({ isFaceUp: false });
      const state = createMockState({ stock: [card], waste: [] });
      const newState = applyDrawFromStock(state);
      
      expect(newState.waste[0].isFaceUp).toBe(true);
    });
    
    it('does not mutate input state', () => {
      const state = createMockState({ stock: [createMockCard()], waste: [] });
      const stateCopy = JSON.parse(JSON.stringify(state));
      applyDrawFromStock(state);
      
      expect(state).toEqual(stateCopy);
    });
  });
  
  describe('applyRecycleWaste', () => {
    it('moves all waste cards to stock', () => {
      const cards = [createMockCard(1), createMockCard(2), createMockCard(3)];
      const state = createMockState({ stock: [], waste: cards });
      const newState = applyRecycleWaste(state);
      
      expect(newState.waste.length).toBe(0);
      expect(newState.stock.length).toBe(3);
    });
    
    it('reverses order (LIFO)', () => {
      const card1 = createMockCard(MCTSSuit.HEARTS, MCTSRank.Ace);
      const card2 = createMockCard(MCTSSuit.SPADES, MCTSRank.Two);
      const state = createMockState({ stock: [], waste: [card1, card2] });
      const newState = applyRecycleWaste(state);
      
      // Last card in waste should be first in stock (to be drawn first)
      expect(newState.stock[newState.stock.length - 1].rank).toBe(MCTSRank.Two);
    });
    
    it('flips cards face-down', () => {
      const cards = [createMockCard({ isFaceUp: true })];
      const state = createMockState({ stock: [], waste: cards });
      const newState = applyRecycleWaste(state);
      
      expect(newState.stock[0].isFaceUp).toBe(false);
    });
    
    it('increments cycle count', () => {
      const state = createMockState({ 
        stock: [], 
        waste: [createMockCard()], 
        stockCycleCount: 2 
      });
      const newState = applyRecycleWaste(state);
      
      expect(newState.stockCycleCount).toBe(3);
    });
  });
  
  describe('applyMoveCards', () => {
    it('flips newly exposed tableau card', () => {
      const faceDown = createMockCard({ isFaceUp: false });
      const faceUp = createMockCard({ isFaceUp: true });
      const state = createMockState({ 
        tableau: [[faceDown, faceUp], ...Array(6).fill([])]
      });
      
      const move: MoveCards = {
        type: 'MOVE_CARDS',
        from: { pileType: 'TABLEAU', pileIndex: 0, cardIndex: 1 },
        to: { pileType: 'TABLEAU', pileIndex: 1 }
      };
      
      const newState = applyMoveCards(state, move);
      expect(newState.tableau[0][0].isFaceUp).toBe(true);
    });
    
    it('preserves immutability', () => {
      const state = createMockState();
      const stateCopy = JSON.parse(JSON.stringify(state));
      
      const move: MoveCards = {
        type: 'MOVE_CARDS',
        from: { pileType: 'WASTE', pileIndex: 0, cardIndex: 0 },
        to: { pileType: 'TABLEAU', pileIndex: 0 }
      };
      
      applyMoveCards(state, move);
      expect(state).toEqual(stateCopy);
    });
    
    it('uses structural sharing for unaffected piles', () => {
      const state = createMockState();
      const move: MoveCards = {
        type: 'MOVE_CARDS',
        from: { pileType: 'TABLEAU', pileIndex: 0, cardIndex: 0 },
        to: { pileType: 'TABLEAU', pileIndex: 1 }
      };
      
      const newState = applyMoveCards(state, move);
      
      // Piles 2-6 should be same reference (structural sharing)
      for (let i = 2; i < 7; i++) {
        expect(newState.tableau[i]).toBe(state.tableau[i]);
      }
    });
  });
});
```

#### 1.6 Heuristic Tests
**Files**:
- `src/mcts/klondike/heuristics/__tests__/evaluation.test.ts`
- `src/mcts/klondike/heuristics/__tests__/priorities.test.ts`
- `src/mcts/klondike/heuristics/__tests__/simulation.test.ts`

```typescript
describe('Heuristic Evaluation Function', () => {
  it('returns 0 for initial deal', () => {
    const state = createInitialDeal();
    expect(evaluateState(state)).toBe(0);
  });
  
  it('returns 548 for won game', () => {
    const state = createWonGame();
    expect(evaluateState(state)).toBe(548);
  });
  
  it('scores 10 points per foundation card', () => {
    const state = createMockState({ 
      foundations: [[createMockCard()], [], [], []] 
    });
    expect(evaluateState(state)).toBeGreaterThanOrEqual(10);
  });
  
  it('scores 1 point per face-up tableau card', () => {
    const faceUpCard = createMockCard({ isFaceUp: true });
    const state = createMockState({ 
      tableau: [[faceUpCard], ...Array(6).fill([])] 
    });
    expect(evaluateState(state)).toBeGreaterThanOrEqual(1);
  });
});

describe('Move Priority Classification', () => {
  it('assigns priority 1 to tableau→foundation revealing card', () => {
    const move = createTableauToFoundationMove({ revealsCard: true });
    expect(classifyMovePriority(move, createMockState())).toBe(1);
  });
  
  it('assigns priority 2 to waste→foundation', () => {
    const move = createWasteToFoundationMove();
    expect(classifyMovePriority(move, createMockState())).toBe(2);
  });
  
  it('assigns priority 7 to draw/recycle', () => {
    const drawMove = { type: 'DRAW_FROM_STOCK' } as GameMove;
    expect(classifyMovePriority(drawMove, createMockState())).toBe(7);
  });
});

describe('Greedy Simulation Policy', () => {
  it('selects from highest priority bucket', () => {
    const priority1Move = createMove({ priority: 1 });
    const priority8Move = createMove({ priority: 8 });
    const moves = [priority8Move, priority1Move];
    
    const selected = selectGreedyMove(createMockState(), moves);
    expect(selected).toBe(priority1Move);
  });
  
  it('randomizes within same priority', () => {
    const moves = Array.from({ length: 5 }, () => createMove({ priority: 3 }));
    const selections = new Set();
    
    for (let i = 0; i < 100; i++) {
      const selected = selectGreedyMove(createMockState(), moves);
      selections.add(moves.indexOf(selected));
    }
    
    // Should select different moves (not always same one)
    expect(selections.size).toBeGreaterThan(1);
  });
});
```

### 2. Integration Tests (20% of tests, ~6 files)

#### 2.1 Core MCTS Integration Test
**File**: `src/mcts/__tests__/integration/coreIntegration.test.ts`

```typescript
describe('Core MCTS Integration', () => {
  it('solves Tic-Tac-Toe correctly', () => {
    // Known winning position for X
    const winningState = createTicTacToeState([
      ['X', 'X', null],
      ['O', 'O', null],
      [null, null, null]
    ]);
    
    const policy = new TicTacToePolicy();
    const solver = new MCTSSolver(winningState, policy, {
      explorationConstant: Math.sqrt(2),
      maxTheoreticalScore: 1,
    });
    
    solver.runSearch(1000);
    const bestMove = solver.getBestMove();
    
    // Should find winning move (complete top row)
    expect(bestMove).toEqual({ row: 0, col: 2 });
  });
  
  it('improves with more iterations', () => {
    const state = createComplexTicTacToeState();
    const policy = new TicTacToePolicy();
    
    // Run with 100 iterations
    const solver1 = new MCTSSolver(state, policy, { 
      explorationConstant: Math.sqrt(2), 
      maxTheoreticalScore: 1 
    });
    solver1.runSearch(100);
    const result1 = solver1.getResult(1000);
    
    // Run with 10,000 iterations
    const solver2 = new MCTSSolver(state, policy, { 
      explorationConstant: Math.sqrt(2), 
      maxTheoreticalScore: 1 
    });
    solver2.runSearch(10000);
    const result2 = solver2.getResult(10000);
    
    // More iterations should increase confidence
    expect(result2.confidence).toBeGreaterThan(result1.confidence);
  });
});
```

#### 2.2 Klondike Policy Integration Test
**File**: `src/mcts/__tests__/integration/klondikeIntegration.test.ts`

```typescript
describe('Klondike Policy Integration', () => {
  it('plays a complete game without errors', () => {
    let state = createInitialDeal();
    const policy = new KlondikePolicy();
    
    let moveCount = 0;
    const maxMoves = 1000;
    
    while (!policy.isTerminal(state) && moveCount < maxMoves) {
      const moves = policy.getLegalMoves(state);
      expect(moves.length).toBeGreaterThan(0);
      
      const move = moves[0]; // Simple: take first legal move
      state = policy.applyMove(state, move);
      moveCount++;
    }
    
    // Should eventually reach terminal state
    expect(policy.isTerminal(state) || moveCount === maxMoves).toBe(true);
  });
  
  it('generates correct moves for known position', () => {
    // Known position with specific expected moves
    const state = createKnownPosition();
    const policy = new KlondikePolicy();
    const moves = policy.getLegalMoves(state);
    
    // Verify expected moves present
    expect(moves).toContainEqual(expectedMove1);
    expect(moves).toContainEqual(expectedMove2);
    expect(moves.length).toBe(expectedMoveCount);
  });
  
  it('heuristic playout achieves >10% win rate', () => {
    const policy = new KlondikePolicy({ useHeuristicSimulation: true });
    let wins = 0;
    const games = 100;
    
    for (let i = 0; i < games; i++) {
      let state = createInitialDeal();
      
      for (let moves = 0; moves < 1000 && !policy.isTerminal(state); moves++) {
        const legalMoves = policy.getLegalMoves(state);
        if (legalMoves.length === 0) break;
        
        const move = policy.selectSimulationMove(state, legalMoves);
        state = policy.applyMove(state, move);
      }
      
      const score = policy.getScore(state);
      if (score === 548) wins++;
    }
    
    const winRate = wins / games;
    console.log(`Heuristic win rate: ${(winRate * 100).toFixed(1)}%`);
    expect(winRate).toBeGreaterThan(0.10); // >10%
  }, 60000); // 60 second timeout
});
```

#### 2.3 State Adapter Integration Test
**File**: `src/mcts/__tests__/integration/stateAdapterIntegration.test.ts`

```typescript
describe('State Adapter Integration', () => {
  it('round-trip conversion preserves game state', () => {
    const uiState = createUIGameState();
    const mctsState = uiStateToMCTS(uiState);
    const backToUI = mctsStateToUI(mctsState);
    
    // Compare game-relevant fields
    expect(backToUI.tableau).toEqual(uiState.tableau);
    expect(backToUI.foundations).toEqual(uiState.foundations);
    expect(backToUI.drawPile).toEqual(uiState.drawPile);
    expect(backToUI.discardPile).toEqual(uiState.discardPile);
  });
  
  it('strips UI-specific fields', () => {
    const uiState = createUIGameState({
      selectedCard: { /* ... */ },
      replayMode: true,
      moveHistory: [/* ... */]
    });
    
    const mctsState = uiStateToMCTS(uiState);
    
    // MCTS state should not have these fields
    expect((mctsState as any).selectedCard).toBeUndefined();
    expect((mctsState as any).replayMode).toBeUndefined();
    expect((mctsState as any).moveHistory).toBeUndefined();
  });
});
```

### 3. End-to-End Tests (10% of tests, ~3 files)

#### 3.1 Full MCTS + UI Flow Test
**File**: `src/components/__tests__/integration/mctsUI.test.tsx`

```typescript
describe('MCTS UI Integration', () => {
  it('user can request hint and see result', async () => {
    const { getByText, findByText } = render(<GameBoard />);
    
    // Click "Get MCTS Hint" button
    const hintButton = getByText('Get Hint');
    fireEvent.click(hintButton);
    
    // Wait for hint to appear
    const confidence = await findByText(/Confidence:/);
    expect(confidence).toBeInTheDocument();
    
    // Statistics should be displayed
    expect(getByText(/Iterations:/)).toBeInTheDocument();
    expect(getByText(/Speed:/)).toBeInTheDocument();
  });
  
  it('applies MCTS move when clicked', async () => {
    const { getByText } = render(<GameBoard />);
    
    // Request hint
    const hintButton = getByText('Get Hint');
    fireEvent.click(hintButton);
    
    await waitFor(() => {
      expect(getByText('Apply Move')).toBeInTheDocument();
    });
    
    // Click "Apply Move"
    const applyButton = getByText('Apply Move');
    fireEvent.click(applyButton);
    
    // Game state should have changed
    const state = useGameStore.getState();
    expect(state.moveHistory.length).toBeGreaterThan(0);
  });
});
```

---

## Performance Benchmarks

### Benchmark Suite
**File**: `src/mcts/__tests__/performance/benchmarks.test.ts`

```typescript
describe('Performance Benchmarks', () => {
  it('achieves >10,000 iterations/second', () => {
    const state = createMidGameState();
    const policy = new KlondikePolicy();
    const solver = new MCTSSolver(state, policy, {
      explorationConstant: Math.sqrt(2),
      maxTheoreticalScore: 548,
    });
    
    const startTime = Date.now();
    solver.runSearch(10000);
    const duration = Date.now() - startTime;
    
    const iterPerSec = 10000 / (duration / 1000);
    console.log(`Performance: ${iterPerSec.toFixed(0)} iterations/second`);
    
    expect(iterPerSec).toBeGreaterThan(10000);
  });
  
  it('state hash completes in <0.5ms', () => {
    const state = createMidGameState();
    
    const times = [];
    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      hashState(state);
      times.push(performance.now() - start);
    }
    
    const avgTime = times.reduce((a, b) => a + b) / times.length;
    console.log(`Average hash time: ${avgTime.toFixed(3)}ms`);
    
    expect(avgTime).toBeLessThan(0.5);
  });
  
  it('memory usage per node <1KB', () => {
    const state = createMidGameState();
    const policy = new KlondikePolicy();
    const solver = new MCTSSolver(state, policy, {
      explorationConstant: Math.sqrt(2),
      maxTheoreticalScore: 548,
    });
    
    // Measure memory before
    const memBefore = (performance as any).memory?.usedJSHeapSize || 0;
    
    solver.runSearch(10000);
    
    // Measure memory after
    const memAfter = (performance as any).memory?.usedJSHeapSize || 0;
    const result = solver.getResult(1000);
    
    const memoryUsed = memAfter - memBefore;
    const bytesPerNode = memoryUsed / result.statistics.treeSize;
    
    console.log(`Memory per node: ${bytesPerNode.toFixed(0)} bytes`);
    expect(bytesPerNode).toBeLessThan(1024); // <1KB
  });
});
```

---

## Test Coverage Goals

| Module | Target Coverage | Priority |
|--------|----------------|----------|
| `mcts/types/` | 100% | CRITICAL |
| `mcts/utils/` | >90% | HIGH |
| `mcts/core/` | >90% | CRITICAL |
| `mcts/klondike/` | >85% | CRITICAL |
| Integration tests | N/A | HIGH |
| UI components | >70% | MEDIUM |
| **Overall MCTS module** | **>80%** | **CRITICAL** |

---

## Test Execution Plan

### During Development (Phase 1-4)
```bash
# Run all MCTS tests
npm run test:mcts

# Run specific module
npm run test:mcts -- --grep "moveGenerator"

# Watch mode
npm run test:mcts -- --watch

# Coverage report
npm run test:mcts -- --coverage
```

### Phase 6: Final Validation
```bash
# Full test suite (existing + new)
npm run test

# Coverage for entire project
npm run test:coverage

# Performance benchmarks
npm run test:mcts -- --grep "benchmark"
```

---

## Continuous Integration

Update `.github/workflows/ci.yml`:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
      - run: npm run test       # Includes MCTS tests
      - run: npm run test:mcts -- --coverage
      - run: npm run build
      
      # Upload coverage
      - uses: codecov/codecov-action@v4
        with:
          file: ./coverage/coverage-final.json
```

---

## Related Documents

- **[20251115_mcts_v0_task_breakdown.md](./20251115_mcts_v0_task_breakdown.md)**: Task-specific test requirements
- **[20251115_mcts_v0_technical_specifications.md](./20251115_mcts_v0_technical_specifications.md)**: API contracts to test
- **[20251115_mcts_v0_implementation_roadmap.md](./20251115_mcts_v0_implementation_roadmap.md)**: Testing phases

---

**Document Status:** DRAFT v0.1  
**Last Updated:** 2025-11-15
