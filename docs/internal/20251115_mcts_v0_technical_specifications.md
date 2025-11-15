# MCTS Technical Specifications - API Contracts & Interfaces

**Date:** 2025-11-15  
**Version:** v0.1  
**Status:** Planning Phase  
**Author:** GitHub Copilot Agent

---

## Table of Contents

1. [API Overview](#1-api-overview)
2. [Type Definitions](#2-type-definitions)
3. [Core API Reference](#3-core-api-reference)
4. [Klondike API Reference](#4-klondike-api-reference)
5. [Integration API Reference](#5-integration-api-reference)
6. [Error Handling](#6-error-handling)
7. [Performance Contracts](#7-performance-contracts)

---

## 1. API Overview

### 1.1 Public API Surface

The MCTS module exposes a minimal, well-defined API:

```typescript
// Main entry point: src/mcts/index.ts
export {
  // Core classes
  MCTSSolver,
  MCTSNode,
  
  // Klondike-specific
  KlondikePolicy,
  uiStateToMCTS,
  mctsStateToUI,
  
  // Types
  type MCTSGameState,
  type MCTSCard,
  type GameMove,
  type SolverOptions,
  type SolverResult,
  
  // Utilities
  normalizeScore,
  hashState,
};
```

### 1.2 Internal APIs (Not Exported)

These are implementation details not exposed to consumers:

- Move generation helpers (`addStockMoves`, `canMoveToTableau`, etc.)
- State transition helpers (`applyDrawFromStock`, etc.)
- Heuristic internals (`classifyMovePriority`, etc.)
- Performance profiling utilities

---

## 2. Type Definitions

### 2.1 Core MCTS Types

#### MCTSCard

```typescript
/**
 * Immutable card representation for MCTS domain
 * 
 * @property suit - Card suit (CLUBS, DIAMONDS, HEARTS, SPADES)
 * @property rank - Card rank as numeric value (1=Ace, 13=King)
 * @property isFaceUp - Whether card is face-up (visible)
 * 
 * @example
 * const card: MCTSCard = {
 *   suit: MCTSSuit.HEARTS,
 *   rank: MCTSRank.Ace,
 *   isFaceUp: true
 * };
 */
export interface MCTSCard {
  readonly suit: MCTSSuit;
  readonly rank: MCTSRank;
  readonly isFaceUp: boolean;
}
```

#### MCTSGameState

```typescript
/**
 * Complete game state for MCTS - fully immutable
 * 
 * Excludes UI-specific fields (selectedCard, replayMode, etc.)
 * All arrays are deeply readonly for safety
 * 
 * @property tableau - 7 columns of cards (index 0-6)
 * @property foundations - 4 foundation piles in CDHS order (index 0-3)
 * @property stock - Draw pile (top card at end of array)
 * @property waste - Discard pile (top card at end of array)
 * @property stockCycleCount - Number of times waste was recycled into stock
 * 
 * @invariant tableau.length === 7
 * @invariant foundations.length === 4
 * @invariant Sum of all card arrays === 52
 * 
 * @example
 * const state: MCTSGameState = {
 *   tableau: [[], [], [], [], [], [], []],  // Empty tableaus
 *   foundations: [[], [], [], []],           // Empty foundations
 *   stock: [...deck],                        // Full deck in stock
 *   waste: [],                               // No cards in waste
 *   stockCycleCount: 0
 * };
 */
export interface MCTSGameState {
  readonly tableau: readonly (readonly MCTSCard[])[];
  readonly foundations: readonly (readonly MCTSCard[])[];
  readonly stock: readonly MCTSCard[];
  readonly waste: readonly MCTSCard[];
  readonly stockCycleCount: number;
}
```

#### GameMove

```typescript
/**
 * Union type representing all legal game actions
 * 
 * Three variants:
 * 1. MoveCards - Move card(s) between piles
 * 2. DrawFromStock - Draw one card from stock to waste
 * 3. RecycleWaste - Move all waste cards back to stock (when stock empty)
 * 
 * @see MoveCards
 * @see DrawFromStock
 * @see RecycleWaste
 */
export type GameMove = MoveCards | DrawFromStock | RecycleWaste;

/**
 * Move one or more cards from one pile to another
 * 
 * Handles:
 * - Waste → Tableau (single card)
 * - Waste → Foundation (single card)
 * - Tableau → Tableau (single card or stack)
 * - Tableau → Foundation (single card)
 * - Foundation → Tableau (single card, strategic regression)
 * 
 * @property from.pileType - Source pile type
 * @property from.pileIndex - Source pile index (0-6 tableau, 0-3 foundation, 0 waste)
 * @property from.cardIndex - Index of first card to move (for stacks)
 * @property to.pileType - Destination pile type
 * @property to.pileIndex - Destination pile index
 * 
 * @example
 * // Move top card from waste to tableau column 3
 * const move: MoveCards = {
 *   type: 'MOVE_CARDS',
 *   from: { pileType: 'WASTE', pileIndex: 0, cardIndex: 0 },
 *   to: { pileType: 'TABLEAU', pileIndex: 3 }
 * };
 */
export interface MoveCards {
  readonly type: 'MOVE_CARDS';
  readonly from: {
    readonly pileType: PileType;
    readonly pileIndex: number;
    readonly cardIndex: number;
  };
  readonly to: {
    readonly pileType: PileType;
    readonly pileIndex: number;
  };
}
```

### 2.2 Solver Configuration Types

#### SolverOptions

```typescript
/**
 * Configuration options for MCTSSolver
 * 
 * @property explorationConstant - UCB1 exploration parameter (C)
 *   - Theoretical value: Math.sqrt(2) ≈ 1.414
 *   - Higher values → more exploration
 *   - Lower values → more exploitation
 *   - Typical range: [0.1, 2.0]
 * 
 * @property maxTheoreticalScore - Maximum possible score for normalization
 *   - For Klondike: (52 cards × 10) + (28 tableau × 1) = 548
 *   - Used to normalize scores to [0, 1] for UCB1
 * 
 * @property maxSimulationDepth - Max moves in simulation before cutoff
 *   - Default: 100
 *   - Prevents infinite loops
 * 
 * @property useHeuristicPlayout - Use greedy policy vs random in simulation
 *   - Default: true (recommended)
 *   - Greedy: ~13% win rate, Random: ~7% win rate
 * 
 * @property enableCycleDetection - Detect and break infinite loops
 *   - Default: true
 *   - Uses state hashing (FNV-1a)
 * 
 * @example
 * const options: SolverOptions = {
 *   explorationConstant: Math.sqrt(2),
 *   maxTheoreticalScore: 548,
 *   maxSimulationDepth: 100,
 *   useHeuristicPlayout: true,
 *   enableCycleDetection: true
 * };
 */
export interface SolverOptions {
  explorationConstant: number;
  maxTheoreticalScore: number;
  maxSimulationDepth?: number;
  useHeuristicPlayout?: boolean;
  enableCycleDetection?: boolean;
}
```

#### SolverResult

```typescript
/**
 * Result returned from MCTS search
 * 
 * @property bestMove - Best move found (null if no legal moves)
 * @property statistics - Performance metrics
 * @property confidence - Confidence score [0, 1]
 * @property moveAnalysis - Per-move statistics (optional, for debugging)
 * 
 * @example
 * const result: SolverResult = {
 *   bestMove: { type: 'MOVE_CARDS', ... },
 *   statistics: {
 *     totalIterations: 10000,
 *     rootVisits: 10000,
 *     bestMoveVisits: 4523,
 *     bestMoveValue: 0.68,
 *     searchTimeMs: 2100,
 *     iterationsPerSecond: 4761,
 *     treeSize: 8742
 *   },
 *   confidence: 0.4523,  // 45.23%
 *   moveAnalysis: [...]  // Optional
 * };
 */
export interface SolverResult {
  bestMove: GameMove | null;
  statistics: {
    totalIterations: number;
    rootVisits: number;
    bestMoveVisits: number;
    bestMoveValue: number;
    searchTimeMs: number;
    iterationsPerSecond: number;
    treeSize: number;
  };
  confidence: number;
  moveAnalysis?: Array<{
    move: GameMove;
    visits: number;
    value: number;
    averageValue: number;
  }>;
}
```

---

## 3. Core API Reference

### 3.1 MCTSSolver Class

#### Constructor

```typescript
/**
 * Creates a new MCTS solver instance
 * 
 * @template TState - Game state type
 * @template TMove - Move type
 * 
 * @param initialState - Starting game state
 * @param policy - Game policy implementation
 * @param options - Solver configuration
 * 
 * @throws {Error} If explorationConstant <= 0
 * @throws {Error} If maxTheoreticalScore <= 0
 * 
 * @example
 * const solver = new MCTSSolver(
 *   gameState,
 *   new KlondikePolicy(),
 *   {
 *     explorationConstant: Math.sqrt(2),
 *     maxTheoreticalScore: 548
 *   }
 * );
 */
constructor(
  initialState: TState,
  policy: GamePolicy<TState, TMove>,
  options: SolverOptions
);
```

#### runSearch

```typescript
/**
 * Run MCTS search for a specified number of iterations
 * 
 * Each iteration performs:
 * 1. Selection (UCB1 tree traversal)
 * 2. Expansion (add one new child)
 * 3. Simulation (playout to terminal)
 * 4. Backpropagation (update statistics)
 * 
 * @param iterations - Number of MCTS cycles to perform
 * 
 * @throws {Error} If iterations <= 0
 * 
 * @performance
 * - Typical: 5,000-15,000 iterations/second
 * - Depends on: state complexity, playout depth, hardware
 * 
 * @example
 * solver.runSearch(10000);  // Run 10,000 iterations
 */
public runSearch(iterations: number): void;
```

#### getBestMove

```typescript
/**
 * Get the best move after search completes
 * 
 * @param criteria - Selection criteria
 *   - 'visits': Most robust (recommended, default)
 *   - 'value': Highest average score
 * 
 * @returns Best move, or null if no children exist
 * 
 * @example
 * const move = solver.getBestMove('visits');
 * if (move) {
 *   // Apply move to game
 * }
 */
public getBestMove(criteria: 'visits' | 'value' = 'visits'): TMove | null;
```

#### getResult

```typescript
/**
 * Get comprehensive result with statistics
 * 
 * @param searchTimeMs - Time spent searching (for iter/s calculation)
 * 
 * @returns Complete solver result with statistics
 * 
 * @example
 * const startTime = Date.now();
 * solver.runSearch(10000);
 * const result = solver.getResult(Date.now() - startTime);
 * 
 * console.log(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);
 * console.log(`Speed: ${result.statistics.iterationsPerSecond.toFixed(0)} iter/s`);
 */
public getResult(searchTimeMs: number): SolverResult;
```

### 3.2 GamePolicy Interface

```typescript
/**
 * Abstract game policy interface
 * 
 * Allows MCTSSolver to be domain-agnostic.
 * Concrete implementations provide game-specific logic.
 * 
 * @template TState - Game state type
 * @template TMove - Move type
 * 
 * @example
 * // Implementing for a custom game
 * class MyGamePolicy implements GamePolicy<MyState, MyMove> {
 *   getLegalMoves(state: MyState): MyMove[] { ... }
 *   applyMove(state: MyState, move: MyMove): MyState { ... }
 *   isTerminal(state: MyState): boolean { ... }
 *   getScore(state: MyState): number { ... }
 *   selectSimulationMove(state: MyState, moves: MyMove[]): MyMove { ... }
 * }
 */
export interface GamePolicy<TState, TMove> {
  getLegalMoves(state: TState): TMove[];
  applyMove(state: TState, move: TMove): TState;
  isTerminal(state: TState): boolean;
  getScore(state: TState): number;
  selectSimulationMove(state: TState, legalMoves: TMove[]): TMove;
}
```

---

## 4. Klondike API Reference

### 4.1 KlondikePolicy Class

```typescript
/**
 * Concrete GamePolicy implementation for Klondike Solitaire (Draw 1)
 * 
 * @implements {GamePolicy<MCTSGameState, GameMove>}
 * 
 * @example
 * const policy = new KlondikePolicy({ useHeuristicSimulation: true });
 * const moves = policy.getLegalMoves(state);
 */
export class KlondikePolicy implements GamePolicy<MCTSGameState, GameMove> {
  /**
   * @param options.useHeuristicSimulation - Use greedy policy (default: true)
   */
  constructor(options?: { useHeuristicSimulation?: boolean });
  
  /**
   * Generate all legal moves from state
   * 
   * @param state - Current game state
   * @returns Array of all legal moves (empty if terminal)
   * 
   * @complexity O(n) where n = number of cards in play
   * @performance Typically <1ms for mid-game position
   * 
   * @example
   * const moves = policy.getLegalMoves(state);
   * console.log(`${moves.length} legal moves available`);
   */
  public getLegalMoves(state: MCTSGameState): GameMove[];
  
  /**
   * Apply move to state immutably
   * 
   * @param state - Current state (unchanged)
   * @param move - Move to apply
   * @returns New state after move
   * 
   * @throws {Error} If move is illegal (in debug mode)
   * 
   * @performance <1ms per move via structural sharing
   * 
   * @example
   * const newState = policy.applyMove(state, move);
   * // state is unchanged, newState is new object
   */
  public applyMove(state: MCTSGameState, move: GameMove): MCTSGameState;
  
  /**
   * Check if state is terminal (game over)
   * 
   * @param state - State to check
   * @returns True if win (52 cards in foundations) or no moves
   * 
   * @example
   * if (policy.isTerminal(state)) {
   *   const score = policy.getScore(state);
   *   if (score === 548) console.log('Win!');
   *   else console.log('Loss');
   * }
   */
  public isTerminal(state: MCTSGameState): boolean;
  
  /**
   * Get raw, unnormalized score for state
   * 
   * Scoring:
   * - 10 points per card in foundation (max 520)
   * - 1 point per face-up tableau card (max 28)
   * - Total max: 548
   * 
   * @param state - State to evaluate
   * @returns Score in range [0, 548]
   * 
   * @example
   * const score = policy.getScore(state);
   * const progress = (score / 548) * 100;
   * console.log(`${progress.toFixed(1)}% complete`);
   */
  public getScore(state: MCTSGameState): number;
  
  /**
   * Select move for simulation using heuristic policy
   * 
   * If useHeuristicSimulation=true:
   * - Classifies moves by priority (1-8, research Table 2)
   * - Selects random move from highest-priority bucket
   * 
   * If useHeuristicSimulation=false:
   * - Selects uniformly at random
   * 
   * @param state - Current state
   * @param legalMoves - All legal moves from state
   * @returns Selected move
   * 
   * @example
   * const move = policy.selectSimulationMove(state, moves);
   */
  public selectSimulationMove(
    state: MCTSGameState,
    legalMoves: GameMove[]
  ): GameMove;
}
```

### 4.2 State Adapter Functions

```typescript
/**
 * Convert UI GameState to MCTS GameState
 * 
 * Strips UI-specific fields:
 * - selectedCard
 * - moveHistory
 * - replayMode, replayIndex, replayPaused, replaySpeed
 * - showValidMoves, godMode, autoPlayEnabled, etc.
 * 
 * Converts types:
 * - Suit: 'hearts' → MCTSSuit.HEARTS
 * - Rank: 'A' → MCTSRank.Ace
 * - Foundations: named fields → array [CDHS order]
 * 
 * @param uiState - UI game state
 * @returns MCTS game state (readonly, immutable)
 * 
 * @example
 * const uiState = useGameStore.getState();
 * const mctsState = uiStateToMCTS(uiState);
 * const solver = new MCTSSolver(mctsState, policy, options);
 */
export function uiStateToMCTS(uiState: GameState): MCTSGameState;

/**
 * Convert MCTS GameState back to UI format
 * 
 * Generates:
 * - Card IDs for UI (e.g., "hearts-A")
 * - Converts back to UI types
 * 
 * Note: Only converts game state, not UI state.
 * Does not restore selectedCard, replay state, etc.
 * 
 * @param mctsState - MCTS game state
 * @returns Partial UI game state (game fields only)
 * 
 * @example
 * const mctsState = policy.applyMove(state, move);
 * const uiPartial = mctsStateToUI(mctsState);
 * // Merge with existing UI state:
 * set({ ...uiPartial });
 */
export function mctsStateToUI(mctsState: MCTSGameState): Partial<GameState>;
```

---

## 5. Integration API Reference

### 5.1 Zustand Store MCTS Actions

```typescript
/**
 * MCTS-related actions in Zustand store
 * 
 * Add to src/store/gameStore.ts:
 */
interface GameStore extends GameState {
  // ... existing actions
  
  /**
   * Request MCTS hint for current position
   * 
   * @param searchTimeMs - Time budget for search (default: 2000ms)
   * @returns Promise resolving to solver result
   * 
   * @async
   * @throws {Error} If MCTS is disabled
   * @throws {Error} If game is already won/lost
   * 
   * @example
   * const result = await requestMCTSHint(2000);
   * if (result.bestMove) {
   *   console.log(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);
   * }
   */
  requestMCTSHint: (searchTimeMs?: number) => Promise<SolverResult>;
  
  /**
   * Apply an MCTS move to the game state
   * 
   * Converts MCTS GameMove format to UI actions:
   * - MOVE_CARDS → moveCardToTableau / moveCardToFoundation
   * - DRAW_FROM_STOCK → drawCard
   * - RECYCLE_WASTE → (handled automatically by drawCard)
   * 
   * @param move - Move from MCTS solver
   * 
   * @throws {Error} If move is illegal
   * 
   * @example
   * const result = await requestMCTSHint();
   * if (result.bestMove) {
   *   applyMCTSMove(result.bestMove);
   * }
   */
  applyMCTSMove: (move: GameMove) => void;
  
  /**
   * MCTS configuration settings
   */
  mctsSettings: {
    enabled: boolean;
    autoApply: boolean;
    searchTime: number;
    explorationConstant: number;
  };
  
  /**
   * Update MCTS settings
   * 
   * @param settings - Partial settings to update
   * 
   * @example
   * updateMCTSSettings({ searchTime: 5000, autoApply: true });
   */
  updateMCTSSettings: (settings: Partial<typeof mctsSettings>) => void;
}
```

---

## 6. Error Handling

### 6.1 Error Types

```typescript
/**
 * MCTS-specific error types
 */

/** Thrown when solver is misconfigured */
export class MCTSConfigurationError extends Error {
  constructor(message: string) {
    super(`MCTS Configuration Error: ${message}`);
    this.name = 'MCTSConfigurationError';
  }
}

/** Thrown when illegal move is attempted */
export class IllegalMoveError extends Error {
  constructor(move: GameMove, reason: string) {
    super(`Illegal Move: ${JSON.stringify(move)} - ${reason}`);
    this.name = 'IllegalMoveError';
  }
}

/** Thrown when state is invalid */
export class InvalidStateError extends Error {
  constructor(reason: string) {
    super(`Invalid State: ${reason}`);
    this.name = 'InvalidStateError';
  }
}
```

### 6.2 Error Handling Best Practices

```typescript
// Example: Robust hint request with error handling
async function requestHintSafely(): Promise<SolverResult | null> {
  try {
    const result = await requestMCTSHint(2000);
    return result;
  } catch (error) {
    if (error instanceof MCTSConfigurationError) {
      console.error('MCTS not configured correctly:', error.message);
      // Show user-friendly message
    } else if (error instanceof IllegalMoveError) {
      console.error('MCTS suggested illegal move:', error.message);
      // This should never happen - indicates bug
      reportBug(error);
    } else {
      console.error('Unexpected error:', error);
    }
    return null;
  }
}
```

---

## 7. Performance Contracts

### 7.1 Time Complexity

| Function | Complexity | Notes |
|----------|------------|-------|
| `getLegalMoves()` | O(n) | n = cards in play (~52) |
| `applyMove()` | O(n) | Structural sharing, n = cards in pile |
| `isTerminal()` | O(1) | Checks foundation count |
| `getScore()` | O(n) | n = tableau cards (~28) |
| `hashState()` | O(n) | n = total cards (52) |
| `normalizeScore()` | O(1) | Simple division |
| **MCTS iteration** | O(n × d) | n = legal moves, d = simulation depth |

### 7.2 Space Complexity

| Structure | Complexity | Notes |
|-----------|------------|-------|
| `MCTSNode` | O(1) | ~200 bytes per node |
| Tree with N nodes | O(N) | ~200N bytes |
| `MCTSGameState` | O(1) | ~4KB per state (52 cards) |
| Simulation (recursive) | O(d) | d = max depth (100) |

### 7.3 Performance Targets

```typescript
/**
 * Performance SLA (Service Level Agreement)
 * 
 * These are guaranteed minimum performance levels.
 * Actual performance typically exceeds these targets.
 */
export const PERFORMANCE_TARGETS = {
  /** Minimum iterations per second */
  MIN_ITERATIONS_PER_SECOND: 5000,
  
  /** Maximum time for first hint (ms) */
  MAX_TIME_TO_HINT: 5000,
  
  /** Maximum memory per node (bytes) */
  MAX_MEMORY_PER_NODE: 2048,
  
  /** Maximum state hash time (ms) */
  MAX_HASH_TIME: 1,
  
  /** Minimum win rate with heuristic playout (%) */
  MIN_WIN_RATE_HEURISTIC: 10,
};
```

### 7.4 Performance Monitoring

```typescript
/**
 * Example: Monitor and report performance
 */
function monitorPerformance(result: SolverResult): void {
  const { statistics } = result;
  
  // Check iterations/second
  if (statistics.iterationsPerSecond < PERFORMANCE_TARGETS.MIN_ITERATIONS_PER_SECOND) {
    console.warn(
      `Performance degraded: ${statistics.iterationsPerSecond.toFixed(0)} iter/s ` +
      `(target: ${PERFORMANCE_TARGETS.MIN_ITERATIONS_PER_SECOND})`
    );
  }
  
  // Check search time
  if (statistics.searchTimeMs > PERFORMANCE_TARGETS.MAX_TIME_TO_HINT) {
    console.warn(
      `Search took too long: ${statistics.searchTimeMs}ms ` +
      `(target: ${PERFORMANCE_TARGETS.MAX_TIME_TO_HINT}ms)`
    );
  }
  
  // Check memory usage (tree size * bytes per node)
  const estimatedMemory = statistics.treeSize * 200; // ~200 bytes/node
  const maxMemory = statistics.treeSize * PERFORMANCE_TARGETS.MAX_MEMORY_PER_NODE;
  if (estimatedMemory > maxMemory) {
    console.warn(
      `High memory usage: ${(estimatedMemory / 1024).toFixed(1)}KB ` +
      `(${(estimatedMemory / statistics.treeSize).toFixed(0)} bytes/node)`
    );
  }
}
```

---

## 8. Code Examples

### 8.1 Basic Usage

```typescript
import {
  MCTSSolver,
  KlondikePolicy,
  uiStateToMCTS,
  type SolverOptions,
} from '@/mcts';

// Get current game state from Zustand store
const uiState = useGameStore.getState();

// Convert to MCTS format
const mctsState = uiStateToMCTS(uiState);

// Configure solver
const options: SolverOptions = {
  explorationConstant: Math.sqrt(2),
  maxTheoreticalScore: 548,
  useHeuristicPlayout: true,
};

// Create solver
const policy = new KlondikePolicy();
const solver = new MCTSSolver(mctsState, policy, options);

// Run search (2 seconds)
const startTime = Date.now();
const iterations = 10000;
solver.runSearch(iterations);
const searchTime = Date.now() - startTime;

// Get result
const result = solver.getResult(searchTime);

console.log('MCTS Result:');
console.log(`  Best Move: ${JSON.stringify(result.bestMove)}`);
console.log(`  Confidence: ${(result.confidence * 100).toFixed(1)}%`);
console.log(`  Iterations: ${result.statistics.totalIterations}`);
console.log(`  Speed: ${result.statistics.iterationsPerSecond.toFixed(0)} iter/s`);
```

### 8.2 Time-Bounded Search

```typescript
/**
 * Run MCTS search with time limit
 */
async function runTimedSearch(
  state: MCTSGameState,
  timeLimitMs: number
): Promise<SolverResult> {
  const policy = new KlondikePolicy();
  const solver = new MCTSSolver(state, policy, {
    explorationConstant: Math.sqrt(2),
    maxTheoreticalScore: 548,
  });
  
  const startTime = Date.now();
  let iterations = 0;
  
  // Run in batches to check time
  while (Date.now() - startTime < timeLimitMs) {
    solver.runSearch(100);
    iterations += 100;
    
    // Optional: yield to event loop
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  
  return solver.getResult(Date.now() - startTime);
}
```

### 8.3 Progressive Hints with Callbacks

```typescript
/**
 * Run MCTS with progress callbacks
 */
async function runWithProgress(
  state: MCTSGameState,
  timeLimitMs: number,
  onProgress: (iterations: number, elapsed: number) => void
): Promise<SolverResult> {
  const policy = new KlondikePolicy();
  const solver = new MCTSSolver(state, policy, {
    explorationConstant: Math.sqrt(2),
    maxTheoreticalScore: 548,
  });
  
  const startTime = Date.now();
  let iterations = 0;
  
  while (Date.now() - startTime < timeLimitMs) {
    solver.runSearch(100);
    iterations += 100;
    
    const elapsed = Date.now() - startTime;
    onProgress(iterations, elapsed);
    
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  
  return solver.getResult(Date.now() - startTime);
}

// Usage
runWithProgress(state, 5000, (iterations, elapsed) => {
  console.log(`${iterations} iterations in ${elapsed}ms`);
  updateUI({ iterations, elapsed });
});
```

---

## Related Documents

- **[20251115_mcts_v0_analysis_overview.md](./20251115_mcts_v0_analysis_overview.md)**: Strategic analysis
- **[20251115_mcts_v0_architecture_design.md](./20251115_mcts_v0_architecture_design.md)**: Detailed architecture
- **[20251115_mcts_v0_task_breakdown.md](./20251115_mcts_v0_task_breakdown.md)**: Atomic tasks
- **[20251115_mcts_v0_implementation_roadmap.md](./20251115_mcts_v0_implementation_roadmap.md)**: Phase timeline
- **[20251115_mcts_v0_testing_strategy.md](./20251115_mcts_v0_testing_strategy.md)**: Test plan

---

**Document Status:** DRAFT v0.1  
**Last Updated:** 2025-11-15  
**Next Review:** During Phase 1 implementation
