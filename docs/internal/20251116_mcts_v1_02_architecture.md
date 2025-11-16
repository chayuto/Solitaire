# MCTS v1 - Architecture & Integration Design

**Date:** 2025-11-16  
**Version:** v1.0  
**Purpose:** Detailed technical architecture for integrating MCTS with the existing @chayuto/solitaire-core library  
**Author:** GitHub Copilot Agent

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Integration with Core Library](#2-integration-with-core-library)
3. [Module Structure & Organization](#3-module-structure--organization)
4. [Type System Design](#4-type-system-design)
5. [Core Classes & Interfaces](#5-core-classes--interfaces)
6. [Game Policy Implementation](#6-game-policy-implementation)
7. [State Flow & Data Transformations](#7-state-flow--data-transformations)
8. [Performance Architecture](#8-performance-architecture)

---

## 1. Architecture Overview

### 1.1 High-Level Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                          USER INTERFACE                           │
│                    (packages/app/src/)                            │
│                                                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  GameBoard   │  │ ControlPanel │  │  MCTSPanel   │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                   │
│         └──────────────────┴──────────────────┘                   │
│                            │                                       │
└────────────────────────────┼───────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                      ZUSTAND GAME STORE                           │
│                 (packages/app/src/store/)                         │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  gameStore.ts: requestMCTSHint(), applyMove(), etc.        │ │
│  └────────────────┬─────────────────────────┬──────────────────┘ │
│                   │                         │                     │
└───────────────────┼─────────────────────────┼─────────────────────┘
                    │                         │
        ┌───────────┘                         └───────────┐
        │                                                   │
        ▼                                                   ▼
┌──────────────────────┐                         ┌──────────────────┐
│  CORE GAME LIBRARY   │                         │   MCTS LIBRARY   │
│  @chayuto/solitaire- │                         │  @chayuto/soli   │
│  core                │                         │  taire-mcts      │
│                      │                         │                  │
│ ┌──────────────────┐ │                         │ ┌──────────────┐ │
│ │ GameEngine       │ │◄────────────────────────┤ │ MCTSSolver   │ │
│ │ - initialize()   │ │  Uses for move          │ │ - runSearch()│ │
│ │ - applyMove()    │ │  generation &           │ │ - getBestMove│ │
│ │ - getLegalMoves()│ │  validation             │ └──────┬───────┘ │
│ └──────────────────┘ │                         │        │         │
│                      │                         │        ▼         │
│ ┌──────────────────┐ │                         │ ┌──────────────┐ │
│ │ Rules            │ │                         │ │KlondikePolicy│ │
│ │ - tableau        │ │                         │ │ (implements  │ │
│ │ - foundation     │ │                         │ │ GamePolicy)  │ │
│ │ - stock          │ │                         │ └──────────────┘ │
│ └──────────────────┘ │                         │                  │
│                      │                         │ ┌──────────────┐ │
│ ┌──────────────────┐ │                         │ │ Heuristics   │ │
│ │ Utils            │ │                         │ │ - evaluation │ │
│ │ - hash           │ │                         │ │ - simulation │ │
│ │ - validation     │ │                         │ └──────────────┘ │
│ └──────────────────┘ │                         │                  │
└──────────────────────┘                         └──────────────────┘
```

### 1.2 Design Principles

**1. Separation of Concerns**
- **Core library**: Pure game logic (already implemented)
- **MCTS library**: Search algorithm (to be implemented)
- **App layer**: UI and state management (minimal modifications)

**2. Dependency Inversion**
- MCTS depends on Core (via peer dependency)
- App depends on both MCTS and Core
- Core has zero dependencies

**3. Immutability Throughout**
- Core library uses `readonly` types (✅ already implemented)
- MCTS preserves immutability (via structural sharing)
- No mutations anywhere in the system

**4. Type Safety**
- TypeScript strict mode enabled
- Compile-time guarantees for immutability
- Type-safe move generation and application

---

## 2. Integration with Core Library

### 2.1 What Core Library Provides (Already Implemented)

```typescript
// From @chayuto/solitaire-core

// Type exports
export type Card, Suit, Rank, GameState, Move, MoveCommand

// GameEngine class
export class GameEngine {
  initialize(options?: InitializeOptions): GameState
  applyMove(state: GameState, command: MoveCommand): GameState
  getLegalMoves(state: GameState): MoveCommand[]
}

// Rule functions
export {
  canMoveToTableau,
  canMoveToFoundation,
  canDraw,
  draw,
  canRecycle,
  recycle,
}

// Utilities
export {
  hashGameState,         // FNV-1a hash for cycle detection
  validateGameState,     // Integrity checks
  getCompletionProgress, // Score: [0, 100]
  getPerceivedDifficulty,// Difficulty: [0, 100]
}
```

### 2.2 Key Insight: Core Library is MCTS-Ready

**Analysis of Core Library**:

✅ **Immutable by Design**
```typescript
// From packages/core/src/types/GameState.ts
export interface GameState {
  readonly drawPile: readonly Card[];
  readonly discardPile: readonly Card[];
  readonly foundations: Foundations;
  readonly tableau: readonly (readonly Card[])[];
  // ... all readonly
}
```

✅ **Pure Functions**
```typescript
// GameEngine.applyMove() returns new state, never mutates
public applyMove(state: GameState, command: MoveCommand): GameState {
  // ... creates new state with structural sharing
  return { ...state, tableau: newTableau };
}
```

✅ **Hashing for Cycle Detection**
```typescript
// Already implements FNV-1a hash
export function hashGameState(state: GameState): string {
  // ... hashes tableau, foundations, stock, waste
}
```

**Conclusion**: We don't need to rebuild game logic. We can **wrap** the core library!

### 2.3 Integration Strategy: Thin Adapter Layer

**Architecture Decision**: Use lightweight adapters instead of parallel domain models.

**v0 Approach** (NOT USED):
```
UI GameState (app types)
    ↓ [Heavy Conversion]
MCTS GameState (parallel types)
    ↓ [MCTS Processing]
MCTS Result
    ↓ [Heavy Conversion]
UI GameState (app types)
```

**v1 Approach** (SELECTED):
```
UI GameState (app types)
    ↓ [Thin Adapter: removes UI fields]
Core GameState (core types) ◄─── USED BY MCTS
    ↓ [MCTS wraps Core GameEngine]
MCTS Result (Core types)
    ↓ [Thin Adapter: adds UI fields back]
UI GameState (app types)
```

**Benefits**:
- ✅ No type duplication
- ✅ Leverage 90 existing tests
- ✅ Reuse hashGameState, validation, scoring
- ✅ Smaller adapter code (~100 lines vs ~500 lines)

### 2.4 Adapter Design

```typescript
// packages/mcts/src/adapters/gameStateAdapter.ts

/**
 * Convert UI GameState to Core GameState
 * Strips UI-specific fields (selectedCard, replayMode, etc.)
 */
export function uiToCore(uiState: UIGameState): CoreGameState {
  return {
    drawPile: uiState.drawPile,
    discardPile: uiState.discardPile,
    foundations: uiState.foundations,
    tableau: uiState.tableau,
    moveHistory: [], // MCTS doesn't need history
    difficulty: uiState.difficulty,
    gameWon: uiState.gameWon,
    completionProgress: uiState.completionProgress,
  };
}

/**
 * Convert Core GameState back to UI GameState
 * Preserves UI-specific fields from original state
 */
export function coreToUI(
  coreState: CoreGameState, 
  originalUI: UIGameState
): UIGameState {
  return {
    ...coreState,
    selectedCard: originalUI.selectedCard, // Preserve UI state
    replayMode: originalUI.replayMode,
    autoPlayActive: originalUI.autoPlayActive,
    // ... other UI fields
  };
}
```

---

## 3. Module Structure & Organization

### 3.1 Directory Structure

```
packages/mcts/
├── src/
│   ├── index.ts                  # Public API exports
│   │
│   ├── core/                     # Domain-agnostic MCTS algorithm
│   │   ├── index.ts
│   │   ├── MCTSNode.ts          # Tree node data structure
│   │   ├── MCTSSolver.ts        # Main SP-MCTS algorithm
│   │   └── GamePolicy.ts        # Abstract game interface
│   │
│   ├── policies/                 # Game-specific implementations
│   │   ├── index.ts
│   │   ├── KlondikePolicy.ts    # Klondike-specific policy
│   │   └── types.ts              # Klondike-specific types
│   │
│   ├── heuristics/               # Evaluation & simulation
│   │   ├── index.ts
│   │   ├── evaluation.ts         # Heuristic Evaluation Function
│   │   ├── simulation.ts         # Greedy simulation policy
│   │   └── priorities.ts         # Move priority rankings (8 levels)
│   │
│   ├── adapters/                 # Integration glue
│   │   ├── index.ts
│   │   └── gameStateAdapter.ts   # UI ↔ Core conversion
│   │
│   └── utils/                    # Utilities
│       ├── index.ts
│       ├── normalize.ts          # Score normalization [0,1]
│       ├── performance.ts        # Profiling helpers
│       └── constants.ts          # Configuration constants
│
├── tests/                        # Tests mirror src/
│   ├── core/
│   │   ├── MCTSNode.test.ts
│   │   └── MCTSSolver.test.ts
│   ├── policies/
│   │   └── KlondikePolicy.test.ts
│   ├── heuristics/
│   │   ├── evaluation.test.ts
│   │   └── simulation.test.ts
│   └── integration/
│       └── endToEnd.test.ts
│
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

**File Count**: ~20 source files, ~15 test files  
**Estimated LOC**: ~3,000 source, ~2,000 test

### 3.2 Module Responsibilities

#### Core Module (`src/core/`)
**Purpose**: Domain-agnostic MCTS implementation  
**Dependencies**: None (generic over TState, TMove)  
**Exports**:
- `MCTSNode<TState, TMove>` class
- `MCTSSolver<TState, TMove>` class
- `GamePolicy<TState, TMove>` interface

#### Policies Module (`src/policies/`)
**Purpose**: Klondike-specific game logic  
**Dependencies**: `@chayuto/solitaire-core`  
**Exports**:
- `KlondikePolicy implements GamePolicy<CoreGameState, MoveCommand>`

#### Heuristics Module (`src/heuristics/`)
**Purpose**: Evaluation and simulation strategies  
**Dependencies**: `@chayuto/solitaire-core`  
**Exports**:
- `evaluateState(state: CoreGameState): number`
- `selectGreedyMove(state: CoreGameState, moves: MoveCommand[]): MoveCommand`

#### Adapters Module (`src/adapters/`)
**Purpose**: Bridge UI and Core types  
**Dependencies**: App types (imported as types only)  
**Exports**:
- `uiToCore(uiState): CoreGameState`
- `coreToUI(coreState, originalUI): UIGameState`

---

## 4. Type System Design

### 4.1 Leveraging Core Library Types

**Core Library Types** (from `@chayuto/solitaire-core`):
```typescript
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | ... | 'K';

export interface Card {
  readonly suit: Suit;
  readonly rank: Rank;
  readonly faceUp: boolean;
  readonly id: string;
}

export interface GameState {
  readonly drawPile: readonly Card[];
  readonly discardPile: readonly Card[];
  readonly foundations: Foundations;
  readonly tableau: readonly (readonly Card[])[];
  readonly moveHistory: readonly Move[];
  readonly difficulty: Difficulty;
  readonly gameWon: boolean;
  readonly completionProgress: number;
}

export interface MoveCommand {
  readonly type: MoveType;
  readonly from?: { readonly column?: number; readonly cardIndex?: number };
  readonly to?: { readonly column?: number; readonly suit?: Suit };
}
```

**Decision**: **Use Core types directly in MCTS**. No parallel type system needed.

### 4.2 MCTS-Specific Types

Only add types that are MCTS-specific (not game-specific):

```typescript
// packages/mcts/src/core/types.ts

/**
 * Configuration for MCTSSolver
 */
export interface SolverOptions {
  /** Exploration constant for UCT (default: Math.sqrt(2)) */
  explorationConstant: number;
  
  /** Maximum theoretical score for normalization */
  maxTheoreticalScore: number;
  
  /** Max depth for simulation (default: 100) */
  maxSimulationDepth?: number;
  
  /** Use heuristic playout (default: true) */
  useHeuristicPlayout?: boolean;
  
  /** Enable cycle detection (default: true) */
  enableCycleDetection?: boolean;
}

/**
 * Result from MCTS search
 */
export interface SolverResult<TMove> {
  /** Best move found */
  bestMove: TMove | null;
  
  /** Search statistics */
  statistics: {
    totalIterations: number;
    rootVisits: number;
    bestMoveVisits: number;
    bestMoveValue: number;
    searchTimeMs: number;
    iterationsPerSecond: number;
    treeSize: number;
  };
  
  /** Confidence in recommendation [0,1] */
  confidence: number;
  
  /** Detailed analysis of all root children */
  moveAnalysis?: Array<{
    move: TMove;
    visits: number;
    value: number;
    averageValue: number;
  }>;
}
```

---

## 5. Core Classes & Interfaces

### 5.1 MCTSNode Class

```typescript
/**
 * Represents a single node in the Monte Carlo Search Tree
 * 
 * @template TState - Game state type (e.g., CoreGameState)
 * @template TMove - Move type (e.g., MoveCommand)
 */
export class MCTSNode<TState, TMove> {
  // === Immutable Properties ===
  
  /** Game state at this node (never mutated) */
  public readonly state: TState;
  
  /** Move that led from parent to this node */
  public readonly move: TMove | null;
  
  /** Parent node reference (null for root) */
  public readonly parent: MCTSNode<TState, TMove> | null;
  
  // === Mutable Statistics ===
  
  /** Child nodes that have been expanded */
  public children: MCTSNode<TState, TMove>[] = [];
  
  /** Number of simulations through this node */
  public visits: number = 0;
  
  /** Total normalized value from simulations */
  public value: number = 0;
  
  // === Private Expansion State ===
  
  /** Moves not yet expanded (shuffled for randomness) */
  private untriedMoves: TMove[];
  
  constructor(
    state: TState,
    move: TMove | null,
    parent: MCTSNode<TState, TMove> | null,
    allMoves: TMove[]
  ) {
    this.state = state;
    this.move = move;
    this.parent = parent;
    this.untriedMoves = this.shuffleArray([...allMoves]);
  }
  
  // === Public Methods ===
  
  isFullyExpanded(): boolean {
    return this.untriedMoves.length === 0;
  }
  
  isTreeLeaf(): boolean {
    return this.children.length === 0;
  }
  
  getAverageValue(): number {
    return this.visits === 0 ? 0 : this.value / this.visits;
  }
  
  popUntriedMove(): TMove | undefined {
    return this.untriedMoves.pop();
  }
  
  private shuffleArray<T>(array: T[]): T[] {
    // Fisher-Yates shuffle
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}
```

**Key Design Decisions**:
- ✅ Generic over TState, TMove (domain-agnostic)
- ✅ State is readonly (enforced by type system)
- ✅ Untried moves are shuffled (prevents expansion bias)
- ✅ Statistics are public (for debugging, analysis)

### 5.2 GamePolicy Interface

```typescript
/**
 * Abstract interface defining game-specific logic
 * Allows MCTSSolver to be domain-agnostic
 */
export interface GamePolicy<TState, TMove> {
  /**
   * Generate all legal moves from current state
   */
  getLegalMoves(state: TState): TMove[];
  
  /**
   * Apply move to state, return new immutable state
   * CRITICAL: Must NOT mutate input state
   */
  applyMove(state: TState, move: TMove): TState;
  
  /**
   * Check if state is terminal (game over)
   */
  isTerminal(state: TState): boolean;
  
  /**
   * Evaluate state, return raw score (will be normalized)
   */
  getScore(state: TState): number;
  
  /**
   * Select move for simulation (heuristic or random)
   */
  selectSimulationMove(state: TState, legalMoves: TMove[]): TMove;
}
```

**Why This Interface**:
- Separates MCTS algorithm from game rules
- Allows testing with toy games (e.g., Tic-Tac-Toe)
- Makes MCTS reusable for other card games

### 5.3 MCTSSolver Class (Skeleton)

```typescript
/**
 * Single-Player Monte Carlo Tree Search solver
 * Implements the four-phase MCTS cycle
 */
export class MCTSSolver<TState, TMove> {
  private root: MCTSNode<TState, TMove>;
  private policy: GamePolicy<TState, TMove>;
  private explorationConstant: number;
  private maxTheoreticalScore: number;
  private maxSimulationDepth: number;
  private useHeuristicPlayout: boolean;
  private enableCycleDetection: boolean;
  
  constructor(
    initialState: TState,
    policy: GamePolicy<TState, TMove>,
    options: SolverOptions
  ) {
    const rootMoves = policy.getLegalMoves(initialState);
    this.root = new MCTSNode(initialState, null, null, rootMoves);
    this.policy = policy;
    this.explorationConstant = options.explorationConstant;
    this.maxTheoreticalScore = options.maxTheoreticalScore;
    this.maxSimulationDepth = options.maxSimulationDepth ?? 100;
    this.useHeuristicPlayout = options.useHeuristicPlayout ?? true;
    this.enableCycleDetection = options.enableCycleDetection ?? true;
  }
  
  /**
   * Run MCTS for specified iterations
   */
  public runSearch(iterations: number): void {
    for (let i = 0; i < iterations; i++) {
      let node = this.selectNode(this.root);      // Phase 1
      
      if (!this.policy.isTerminal(node.state) && !node.isFullyExpanded()) {
        node = this.expandNode(node);             // Phase 2
      }
      
      const rawScore = this.simulate(node);       // Phase 3
      const normalizedScore = this.normalizeScore(rawScore);
      
      this.backpropagate(node, normalizedScore);  // Phase 4
    }
  }
  
  /**
   * Get best move after search
   */
  public getBestMove(criteria: 'visits' | 'value' = 'visits'): TMove | null {
    if (this.root.children.length === 0) return null;
    
    const bestChild = this.root.children.reduce((best, child) => {
      if (criteria === 'visits') {
        return child.visits > best.visits ? child : best;
      } else {
        return child.getAverageValue() > best.getAverageValue() ? child : best;
      }
    });
    
    return bestChild.move;
  }
  
  // === Private: Four-Phase Implementation ===
  // (Detailed in Section 8)
}
```

---

## 6. Game Policy Implementation

### 6.1 KlondikePolicy Class

```typescript
import type { GamePolicy } from '../core/GamePolicy';
import type { GameState, MoveCommand } from '@chayuto/solitaire-core';
import { GameEngine, hashGameState, getCompletionProgress } from '@chayuto/solitaire-core';
import { evaluateState } from '../heuristics/evaluation';
import { selectGreedyMove } from '../heuristics/simulation';

/**
 * Concrete GamePolicy for Klondike Solitaire
 * Wraps @chayuto/solitaire-core functionality
 */
export class KlondikePolicy implements GamePolicy<GameState, MoveCommand> {
  private engine: GameEngine;
  private useHeuristicSimulation: boolean;
  
  constructor(options: { useHeuristicSimulation?: boolean } = {}) {
    this.engine = new GameEngine();
    this.useHeuristicSimulation = options.useHeuristicSimulation ?? true;
  }
  
  /**
   * Get legal moves (delegates to Core library)
   */
  public getLegalMoves(state: GameState): MoveCommand[] {
    return this.engine.getLegalMoves(state);
  }
  
  /**
   * Apply move (delegates to Core library)
   */
  public applyMove(state: GameState, move: MoveCommand): GameState {
    return this.engine.applyMove(state, move);
  }
  
  /**
   * Check terminal state
   */
  public isTerminal(state: GameState): boolean {
    // Win: All cards in foundation
    if (state.gameWon) return true;
    
    // Loss: No legal moves
    const moves = this.getLegalMoves(state);
    return moves.length === 0;
  }
  
  /**
   * Evaluate state (delegates to heuristics)
   */
  public getScore(state: GameState): number {
    return evaluateState(state);
  }
  
  /**
   * Select simulation move (delegates to heuristics)
   */
  public selectSimulationMove(
    state: GameState, 
    legalMoves: MoveCommand[]
  ): MoveCommand {
    if (this.useHeuristicSimulation) {
      return selectGreedyMove(state, legalMoves);
    } else {
      // Random fallback
      return legalMoves[Math.floor(Math.random() * legalMoves.length)];
    }
  }
}
```

**Key Points**:
- ✅ Wraps Core library (no duplication)
- ✅ Delegates to heuristics module (separation of concerns)
- ✅ Implements GamePolicy interface (type-safe)
- ✅ Simple (~60 lines of code)

### 6.2 Why This Design Works

**Leverage Existing Tests**:
```typescript
// Core library already has 90 tests for:
- getLegalMoves() correctness
- applyMove() immutability
- State validation
- Hash consistency

// MCTS tests only need to verify:
- Wrapper correctness (trivial)
- Heuristic quality (new)
- MCTS algorithm (new)
```

**Performance Benefits**:
- Core library already optimized
- No overhead from type conversion
- Reuse existing hash function (FNV-1a)

**Maintenance Benefits**:
- Bug fixes in Core automatically benefit MCTS
- Type changes in Core automatically propagate
- Single source of truth for game rules

---

## 7. State Flow & Data Transformations

### 7.1 End-to-End Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  USER CLICKS "GET HINT" BUTTON                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  gameStore.requestMCTSHint()                                 │
│  - Gets current UI game state                                │
│  - Calls MCTS library                                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Adapter: uiToCore()                                         │
│  UIGameState → CoreGameState                                 │
│  - Strips: selectedCard, replayMode, autoPlayActive          │
│  - Keeps: tableau, foundations, stock, waste                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  new MCTSSolver(coreState, klondikePolicy, options)         │
│  - Creates root node with current state                      │
│  - Initializes search tree                                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  solver.runSearch(iterations)                                │
│  Loop for N iterations or T seconds:                         │
│    1. Select: Navigate tree via UCB1                         │
│    2. Expand: Add one new child node                         │
│    3. Simulate: Playout with greedy policy                   │
│    4. Backpropagate: Update stats to root                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  solver.getResult(searchTime)                                │
│  Returns: SolverResult<MoveCommand>                          │
│    - bestMove: MoveCommand from Core library                 │
│    - statistics: iterations, visits, confidence, etc.        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  gameStore processes result                                  │
│  - Highlights suggested move on UI                           │
│  - Displays confidence and statistics                        │
│  - User can click "Apply Hint" to execute move              │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Type Flow

```typescript
// 1. UI State (app types)
interface UIGameState extends CoreGameState {
  selectedCard: { column: number; index: number } | null;
  replayMode: boolean;
  autoPlayActive: boolean;
  // ... other UI fields
}

// 2. Adapter strips UI fields
function uiToCore(ui: UIGameState): CoreGameState;

// 3. MCTS uses Core types directly
class MCTSSolver<CoreGameState, MoveCommand> { ... }

// 4. Result uses Core types
interface SolverResult {
  bestMove: MoveCommand;  // From Core library
  statistics: { ... };
}

// 5. Apply move using Core engine
gameEngine.applyMove(state, result.bestMove);
```

**Zero Overhead**: No type conversions in hot path.

---

## 8. Performance Architecture

### 8.1 Hot Path Identification

**Profile Analysis** (estimated):
```
MCTS runSearch() - 100%
├─ selectNode() - 30%
│  └─ getUCB1() - 25% ◄── HOT PATH #1
├─ expandNode() - 5%
├─ simulate() - 60%
│  ├─ getLegalMoves() - 20% ◄── HOT PATH #2
│  ├─ selectGreedyMove() - 15% ◄── HOT PATH #3
│  └─ applyMove() - 20% ◄── HOT PATH #4
└─ backpropagate() - 5%
```

**Optimization Priorities**:
1. **getUCB1()**: Cache Math.log() values, inline calculations
2. **getLegalMoves()**: Core library already optimized
3. **selectGreedyMove()**: Precompute priorities, avoid allocation
4. **applyMove()**: Core library uses structural sharing (already fast)

### 8.2 Memory Management

**Tree Growth**:
- Each node: ~200 bytes (state reference + stats)
- 100,000 iterations: ~20,000 nodes (typical)
- Memory: ~4MB per search (acceptable)

**Mitigation Strategies**:
- Limit iterations to 200,000 (max ~10MB)
- Tree reuse between moves (Phase 4+)
- Pruning old subtrees (if memory issues arise)

### 8.3 Web Workers Architecture (Phase 4)

```typescript
// Main thread
const worker = new Worker('mctsWorker.ts');
worker.postMessage({ type: 'search', state: coreState });

// Worker thread
self.onmessage = (e) => {
  const { state } = e.data;
  const solver = new MCTSSolver(state, policy, options);
  solver.runSearch(200000);
  self.postMessage({ type: 'result', result: solver.getResult() });
};
```

**Benefits**:
- UI remains responsive during search
- Can run longer searches without freezing
- Progressive results (send partial results every 1s)

---

## 9. Summary & Next Steps

### Key Architectural Decisions

1. ✅ **Use Core Library Directly**: No parallel domain models
2. ✅ **Thin Adapter Layer**: Strip/add UI fields only
3. ✅ **GamePolicy Interface**: Clean separation of concerns
4. ✅ **Generic MCTSSolver**: Reusable for other games
5. ✅ **Heuristics Module**: Pluggable evaluation/simulation

### Implementation Readiness

**Ready to Start**:
- [x] Architecture designed
- [x] Integration points identified
- [x] Type system designed
- [x] Core classes specified

**Next Documents**:
- [Implementation Strategy](./20251116_mcts_v1_03_implementation_strategy.md): Phase-by-phase plan
- [Task Breakdown](./20251116_mcts_v1_04_tasks_phase1_core.md): Atomic tasks for developers

---

**Document Status**: COMPLETE  
**Version**: v1.0  
**Last Updated**: 2025-11-16  
**Total Reading Time**: ~45 minutes
