# MCTS Architecture Design - Detailed Technical Specification

**Date:** 2025-11-15  
**Version:** v0.1  
**Status:** Planning Phase  
**Author:** GitHub Copilot Agent

---

## Table of Contents

1. [Module Structure](#1-module-structure)
2. [Type System Design](#2-type-system-design)
3. [Core Classes](#3-core-classes)
4. [Klondike Implementation](#4-klondike-implementation)
5. [Integration Layer](#5-integration-layer)
6. [Data Flow](#6-data-flow)
7. [API Contracts](#7-api-contracts)

---

## 1. Module Structure

### 1.1 Directory Layout

```
src/mcts/
├── index.ts                    # Public API exports
├── types/
│   ├── index.ts               # Re-export all types
│   ├── state.ts               # MCTSGameState, MCTSCard
│   ├── moves.ts               # GameMove union types
│   └── solver.ts              # SolverOptions, SolverResult
├── core/
│   ├── MCTSNode.ts            # Tree node data structure
│   ├── MCTSSolver.ts          # Main MCTS algorithm
│   ├── GamePolicy.ts          # Abstract game interface
│   └── index.ts               # Export core classes
├── klondike/
│   ├── index.ts               # Export Klondike-specific exports
│   ├── KlondikePolicy.ts      # Concrete GamePolicy implementation
│   ├── types.ts               # Klondike-specific helper types
│   ├── moveGenerator.ts       # getLegalMoves() logic
│   ├── stateTransition.ts     # applyMove() pure functions
│   ├── heuristics/
│   │   ├── index.ts           # Export heuristic functions
│   │   ├── evaluation.ts      # Heuristic Evaluation Function (HEF)
│   │   ├── simulation.ts      # Greedy playout policy
│   │   └── priorities.ts      # Move priority rankings
│   └── stateAdapter.ts        # UI GameState ↔ MCTSGameState
├── utils/
│   ├── index.ts               # Export utilities
│   ├── stateHash.ts           # FNV-1a hash for cycle detection
│   ├── normalize.ts           # Score normalization [0,1]
│   └── performance.ts         # Profiling helpers
└── __tests__/
    ├── core/
    │   ├── MCTSNode.test.ts
    │   └── MCTSSolver.test.ts
    ├── klondike/
    │   ├── KlondikePolicy.test.ts
    │   ├── moveGenerator.test.ts
    │   ├── stateTransition.test.ts
    │   └── heuristics.test.ts
    └── integration/
        └── endToEnd.test.ts
```

**File Count**: ~25 files
**Estimated LOC**: ~3,000 lines (excluding tests)

### 1.2 Dependency Graph

```
MCTSSolver (core)
    ↓ depends on
GamePolicy (interface)
    ↑ implements
KlondikePolicy
    ↓ uses
├── moveGenerator
├── stateTransition  
└── heuristics
    ├── evaluation
    ├── simulation
    └── priorities

stateAdapter (glue layer)
    ↓ converts between
UI GameState ↔ MCTSGameState
```

---

## 2. Type System Design

### 2.1 MCTS Core Types

**File**: `src/mcts/types/state.ts`

```typescript
/**
 * Suit enum - matches research document specification
 * Maps to UI Suit type but uses uppercase for MCTS domain
 */
export enum MCTSSuit {
  CLUBS = 'CLUBS',
  DIAMONDS = 'DIAMONDS',
  HEARTS = 'HEARTS',
  SPADES = 'SPADES',
}

/**
 * Rank enum - numeric representation for easier comparisons
 * Research recommends numeric over string for performance
 */
export enum MCTSRank {
  Ace = 1,
  Two = 2,
  Three = 3,
  Four = 4,
  Five = 5,
  Six = 6,
  Seven = 7,
  Eight = 8,
  Nine = 9,
  Ten = 10,
  Jack = 11,
  Queen = 12,
  King = 13,
}

/**
 * Immutable card representation for MCTS
 * readonly enforced at compile-time for safety
 */
export interface MCTSCard {
  readonly suit: MCTSSuit;
  readonly rank: MCTSRank;
  readonly isFaceUp: boolean;
}

/**
 * Complete game state for MCTS - fully immutable
 * Excludes UI-specific fields (selectedCard, replayMode, etc.)
 */
export interface MCTSGameState {
  readonly tableau: readonly (readonly MCTSCard[])[];  // 7 columns
  readonly foundations: readonly (readonly MCTSCard[])[]; // 4 piles (CDHS order)
  readonly stock: readonly MCTSCard[];
  readonly waste: readonly MCTSCard[];
  readonly stockCycleCount: number; // Track recycles for cycle detection
}

/**
 * Helper function to get card color
 * Used extensively in tableau move validation
 */
export function getCardColor(card: MCTSCard): 'RED' | 'BLACK' {
  return card.suit === MCTSSuit.DIAMONDS || card.suit === MCTSSuit.HEARTS 
    ? 'RED' 
    : 'BLACK';
}

/**
 * Helper to compare ranks
 */
export function isRankSequential(upper: MCTSRank, lower: MCTSRank): boolean {
  return upper === lower + 1;
}
```

### 2.2 Move Types

**File**: `src/mcts/types/moves.ts`

```typescript
/**
 * Pile type enumeration for move specification
 */
export type PileType = 'WASTE' | 'TABLEAU' | 'FOUNDATION' | 'STOCK';

/**
 * Move cards from one pile to another
 * Handles: Waste→Tableau, Waste→Foundation, Tableau→Tableau,
 *          Tableau→Foundation, Foundation→Tableau
 */
export interface MoveCards {
  readonly type: 'MOVE_CARDS';
  readonly from: {
    readonly pileType: PileType;
    readonly pileIndex: number;  // 0-6 for tableau, 0-3 for foundation, 0 for waste
    readonly cardIndex: number;  // Index of first card to move (for tableau stacks)
  };
  readonly to: {
    readonly pileType: PileType;
    readonly pileIndex: number;
  };
}

/**
 * Draw one card from stock to waste (Draw 1 variant)
 */
export interface DrawFromStock {
  readonly type: 'DRAW_FROM_STOCK';
}

/**
 * Recycle waste back into stock when stock is empty
 */
export interface RecycleWaste {
  readonly type: 'RECYCLE_WASTE';
}

/**
 * Union type representing all legal game moves
 * This is the "TMove" generic parameter in MCTSSolver<TState, TMove>
 */
export type GameMove = MoveCards | DrawFromStock | RecycleWaste;

/**
 * Type guard functions
 */
export function isMoveCards(move: GameMove): move is MoveCards {
  return move.type === 'MOVE_CARDS';
}

export function isDrawFromStock(move: GameMove): move is DrawFromStock {
  return move.type === 'DRAW_FROM_STOCK';
}

export function isRecycleWaste(move: GameMove): move is RecycleWaste {
  return move.type === 'RECYCLE_WASTE';
}
```

### 2.3 Solver Configuration Types

**File**: `src/mcts/types/solver.ts`

```typescript
/**
 * Configuration options for MCTSSolver
 */
export interface SolverOptions {
  /**
   * Exploration constant (C) for UCT formula
   * Theoretical value: Math.sqrt(2) ≈ 1.414
   * Can be tuned: common values [0.1, 0.6, 1.0, 1.414, 2.0]
   */
  explorationConstant: number;

  /**
   * Maximum theoretical score for normalization
   * For Klondike: (52 cards × 10) + (28 tableau face-up × 1) = 548
   */
  maxTheoreticalScore: number;

  /**
   * Maximum simulation depth to prevent infinite loops
   * Research recommends: 100 moves
   */
  maxSimulationDepth?: number;

  /**
   * Use heuristic (greedy) playout or random playout
   * Heuristic: ~13% win rate, Random: ~7% win rate
   * Default: true (heuristic)
   */
  useHeuristicPlayout?: boolean;

  /**
   * Enable cycle detection during simulation
   * Uses state hashing (FNV-1a)
   * Default: true
   */
  enableCycleDetection?: boolean;
}

/**
 * Result returned from MCTS search
 */
export interface SolverResult {
  /**
   * Best move found by MCTS
   * null if no legal moves available
   */
  bestMove: GameMove | null;

  /**
   * Statistics from the search
   */
  statistics: {
    totalIterations: number;
    rootVisits: number;
    bestMoveVisits: number;
    bestMoveValue: number;  // Average normalized score
    searchTimeMs: number;
    iterationsPerSecond: number;
    treeSize: number;  // Total nodes in tree
  };

  /**
   * Confidence score [0,1]
   * Calculated as: bestMoveVisits / rootVisits
   */
  confidence: number;

  /**
   * All root children with their statistics (for debugging)
   */
  moveAnalysis?: Array<{
    move: GameMove;
    visits: number;
    value: number;
    averageValue: number;
  }>;
}
```

---

## 3. Core Classes

### 3.1 MCTSNode Class

**File**: `src/mcts/core/MCTSNode.ts`

```typescript
/**
 * Represents a single node in the Monte Carlo Search Tree
 * 
 * Generic parameters:
 * @template TState - Game state type (e.g., MCTSGameState)
 * @template TMove - Move type (e.g., GameMove)
 */
export class MCTSNode<TState, TMove> {
  /** Immutable game state represented by this node */
  public readonly state: TState;

  /** Move that led from parent to this node (null for root) */
  public readonly move: TMove | null;

  /** Parent node reference (null for root) */
  public readonly parent: MCTSNode<TState, TMove> | null;

  /** Array of expanded child nodes */
  public children: MCTSNode<TState, TMove>[] = [];

  /** Number of simulations backpropagated through this node */
  public visits: number = 0;

  /** Total normalized value accumulated from simulations */
  public value: number = 0;

  /** 
   * Moves that haven't been expanded yet
   * Shuffled on creation to ensure random expansion order
   * @private - managed by expandNode()
   */
  private untriedMoves: TMove[];

  /**
   * Creates a new MCTS node
   * 
   * @param state - Immutable game state
   * @param move - Move that led to this state
   * @param parent - Parent node reference
   * @param allMoves - All legal moves from this state
   */
  constructor(
    state: TState,
    move: TMove | null,
    parent: MCTSNode<TState, TMove> | null,
    allMoves: TMove[]
  ) {
    this.state = state;
    this.move = move;
    this.parent = parent;

    // Shuffle untried moves to prevent expansion bias
    this.untriedMoves = this.shuffleArray([...allMoves]);
  }

  /**
   * Check if all legal moves have been expanded into children
   */
  public isFullyExpanded(): boolean {
    return this.untriedMoves.length === 0;
  }

  /**
   * Check if this node has no children (tree leaf)
   */
  public isTreeLeaf(): boolean {
    return this.children.length === 0;
  }

  /**
   * Get the average value per visit
   * Used in move selection after search completes
   */
  public getAverageValue(): number {
    return this.visits === 0 ? 0 : this.value / this.visits;
  }

  /**
   * Pop one untried move for expansion
   * @internal - Only used by MCTSSolver.expandNode()
   */
  public popUntriedMove(): TMove | undefined {
    return this.untriedMoves.pop();
  }

  /**
   * Fisher-Yates shuffle
   * @private
   */
  private shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}
```

### 3.2 GamePolicy Interface

**File**: `src/mcts/core/GamePolicy.ts`

```typescript
/**
 * Abstract game policy interface
 * Allows MCTSSolver to be domain-agnostic
 * 
 * Concrete implementations (e.g., KlondikePolicy) provide game-specific logic
 * 
 * @template TState - Game state type
 * @template TMove - Move type
 */
export interface GamePolicy<TState, TMove> {
  /**
   * Generate all legal moves from the current state
   * 
   * @param state - Current game state
   * @returns Array of legal moves (empty if terminal)
   */
  getLegalMoves(state: TState): TMove[];

  /**
   * Apply a move to a state and return the new immutable state
   * 
   * CRITICAL: This function MUST NOT mutate the input state
   * Returns a new state object with structural sharing
   * 
   * @param state - Current game state (unchanged)
   * @param move - Move to apply
   * @returns New game state after move
   */
  applyMove(state: TState, move: TMove): TState;

  /**
   * Check if a state is terminal (game over)
   * 
   * For Klondike:
   * - True if all 52 cards are in foundations (win)
   * - True if no legal moves and stock is empty (loss)
   * 
   * @param state - Game state to check
   * @returns True if terminal
   */
  isTerminal(state: TState): boolean;

  /**
   * Get the raw, unnormalized score for a state
   * Called at end of simulation (playout)
   * 
   * For Klondike HEF:
   * - 10 points per card in foundation (max 520)
   * - 1 point per face-up tableau card (max 28)
   * - Total range: [0, 548]
   * 
   * @param state - State to evaluate
   * @returns Raw score (will be normalized by solver)
   */
  getScore(state: TState): number;

  /**
   * Select the next move during simulation (playout)
   * 
   * Two strategies:
   * - Random: Pick uniformly at random (default)
   * - Heuristic: Use greedy priority policy (recommended for Klondike)
   * 
   * @param state - Current state
   * @param legalMoves - All legal moves from state
   * @returns Selected move for simulation
   */
  selectSimulationMove(state: TState, legalMoves: TMove[]): TMove;
}
```

### 3.3 MCTSSolver Class (Skeleton)

**File**: `src/mcts/core/MCTSSolver.ts`

```typescript
import { MCTSNode } from './MCTSNode';
import { GamePolicy } from './GamePolicy';
import type { SolverOptions, SolverResult } from '../types/solver';

/**
 * Single-Player Monte Carlo Tree Search (SP-MCTS) solver
 * 
 * Generic algorithm that works with any game satisfying GamePolicy interface
 * 
 * @template TState - Game state type
 * @template TMove - Move type
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
   * Run MCTS search for a specified number of iterations
   * @param iterations - Number of MCTS cycles to perform
   */
  public runSearch(iterations: number): void {
    for (let i = 0; i < iterations; i++) {
      // 1. Selection
      let node = this.selectNode(this.root);

      // 2. Expansion
      if (!this.policy.isTerminal(node.state) && !node.isFullyExpanded()) {
        node = this.expandNode(node);
      }

      // 3. Simulation
      const rawScore = this.simulate(node);
      const normalizedScore = this.normalizeScore(rawScore);

      // 4. Backpropagation
      this.backpropagate(node, normalizedScore);
    }
  }

  /**
   * Get the best move after search completes
   * @param criteria - 'visits' (most robust) or 'value' (highest avg score)
   * @returns Best move, or null if no children
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

  /**
   * Get comprehensive result with statistics
   */
  public getResult(searchTimeMs: number): SolverResult {
    const bestMove = this.getBestMove('visits');
    const bestChild = bestMove 
      ? this.root.children.find(c => c.move === bestMove)
      : null;

    return {
      bestMove,
      statistics: {
        totalIterations: this.root.visits,
        rootVisits: this.root.visits,
        bestMoveVisits: bestChild?.visits ?? 0,
        bestMoveValue: bestChild?.getAverageValue() ?? 0,
        searchTimeMs,
        iterationsPerSecond: searchTimeMs > 0 ? (this.root.visits / searchTimeMs) * 1000 : 0,
        treeSize: this.countNodes(this.root),
      },
      confidence: this.root.visits > 0 
        ? (bestChild?.visits ?? 0) / this.root.visits 
        : 0,
      moveAnalysis: this.root.children.map(child => ({
        move: child.move!,
        visits: child.visits,
        value: child.value,
        averageValue: child.getAverageValue(),
      })),
    };
  }

  // === Private Methods (MCTS Four Phases) ===

  /**
   * Phase 1: Selection
   * Traverse tree using UCB1 until reaching unexpanded or terminal node
   */
  private selectNode(node: MCTSNode<TState, TMove>): MCTSNode<TState, TMove> {
    let current = node;

    while (!this.policy.isTerminal(current.state) && current.isFullyExpanded()) {
      if (current.children.length === 0) return current;

      // Select child with highest UCB1 score
      current = current.children.reduce((best, child) =>
        this.getUCB1(child) > this.getUCB1(best) ? child : best
      );
    }

    return current;
  }

  /**
   * Calculate UCB1 (Upper Confidence Bound) score
   * UCB1 = exploitation + exploration
   *      = (value/visits) + C * sqrt(ln(parent_visits) / visits)
   */
  private getUCB1(node: MCTSNode<TState, TMove>): number {
    // First-play urgency: unvisited nodes get highest priority
    if (node.visits === 0) return Infinity;
    if (!node.parent || node.parent.visits === 0) return Infinity;

    const exploitation = node.value / node.visits;
    const exploration = this.explorationConstant * 
      Math.sqrt(Math.log(node.parent.visits) / node.visits);

    return exploitation + exploration;
  }

  /**
   * Phase 2: Expansion
   * Create one new child node from an untried move
   */
  private expandNode(node: MCTSNode<TState, TMove>): MCTSNode<TState, TMove> {
    const move = node.popUntriedMove();
    if (!move) return node; // Should never happen if called correctly

    const newState = this.policy.applyMove(node.state, move);
    const newMoves = this.policy.getLegalMoves(newState);
    const childNode = new MCTSNode(newState, move, node, newMoves);

    node.children.push(childNode);
    return childNode;
  }

  /**
   * Phase 3: Simulation (Playout)
   * Play out game to terminal state and return score
   */
  private simulate(node: MCTSNode<TState, TMove>): number {
    let state = node.state;
    let depth = 0;
    const visitedStates = this.enableCycleDetection ? new Set<string>() : null;

    while (!this.policy.isTerminal(state) && depth < this.maxSimulationDepth) {
      // Cycle detection
      if (visitedStates) {
        const stateHash = this.hashState(state);
        if (visitedStates.has(stateHash)) break; // Detected cycle
        visitedStates.add(stateHash);
      }

      const moves = this.policy.getLegalMoves(state);
      if (moves.length === 0) break;

      const move = this.policy.selectSimulationMove(state, moves);
      state = this.policy.applyMove(state, move);
      depth++;
    }

    return this.policy.getScore(state);
  }

  /**
   * Phase 4: Backpropagation
   * Update statistics from leaf to root
   * SP-MCTS: Same score propagates up (no negamax)
   */
  private backpropagate(
    node: MCTSNode<TState, TMove> | null,
    normalizedScore: number
  ): void {
    let current = node;
    while (current !== null) {
      current.visits++;
      current.value += normalizedScore;
      current = current.parent;
    }
  }

  // === Helper Methods ===

  /**
   * Normalize raw score to [0, 1] range
   */
  private normalizeScore(rawScore: number): number {
    if (rawScore < 0) return 0;
    if (rawScore > this.maxTheoreticalScore) return 1;
    return rawScore / this.maxTheoreticalScore;
  }

  /**
   * Hash state for cycle detection (stub - implement in utils)
   */
  private hashState(state: TState): string {
    // Will be implemented using FNV-1a in utils/stateHash.ts
    return JSON.stringify(state); // Placeholder
  }

  /**
   * Count total nodes in tree (for statistics)
   */
  private countNodes(node: MCTSNode<TState, TMove>): number {
    return 1 + node.children.reduce((sum, child) => sum + this.countNodes(child), 0);
  }
}
```

---

## 4. Klondike Implementation

### 4.1 KlondikePolicy Class (Skeleton)

**File**: `src/mcts/klondike/KlondikePolicy.ts`

```typescript
import type { GamePolicy } from '../core/GamePolicy';
import type { MCTSGameState, MCTSCard } from '../types/state';
import type { GameMove } from '../types/moves';
import { generateLegalMoves } from './moveGenerator';
import { applyMoveImmutable } from './stateTransition';
import { evaluateState } from './heuristics/evaluation';
import { selectGreedyMove } from './heuristics/simulation';

/**
 * Concrete GamePolicy implementation for Klondike Solitaire (Draw 1)
 */
export class KlondikePolicy implements GamePolicy<MCTSGameState, GameMove> {
  private useHeuristicSimulation: boolean;

  constructor(options: { useHeuristicSimulation?: boolean } = {}) {
    this.useHeuristicSimulation = options.useHeuristicSimulation ?? true;
  }

  public getLegalMoves(state: MCTSGameState): GameMove[] {
    return generateLegalMoves(state);
  }

  public applyMove(state: MCTSGameState, move: GameMove): MCTSGameState {
    return applyMoveImmutable(state, move);
  }

  public isTerminal(state: MCTSGameState): boolean {
    // Win: All 52 cards in foundations
    const foundationCount = state.foundations.reduce(
      (sum, pile) => sum + pile.length,
      0
    );
    if (foundationCount === 52) return true;

    // Loss: No legal moves available
    const moves = this.getLegalMoves(state);
    return moves.length === 0;
  }

  public getScore(state: MCTSGameState): number {
    return evaluateState(state);
  }

  public selectSimulationMove(state: MCTSGameState, legalMoves: GameMove[]): GameMove {
    if (this.useHeuristicSimulation) {
      return selectGreedyMove(state, legalMoves);
    } else {
      // Random selection (fallback)
      return legalMoves[Math.floor(Math.random() * legalMoves.length)];
    }
  }
}
```

### 4.2 Move Generator (Skeleton)

**File**: `src/mcts/klondike/moveGenerator.ts`

This implements the complex logic from research Table 1 (Klondike 'Draw 1' Action Space).

```typescript
import type { MCTSGameState, MCTSCard, MCTSSuit, MCTSRank } from '../types/state';
import type { GameMove, MoveCards, DrawFromStock, RecycleWaste } from '../types/moves';
import { getCardColor, isRankSequential } from '../types/state';

/**
 * Generate all legal moves from a Klondike game state
 * Implements the complete action space from research Table 1
 */
export function generateLegalMoves(state: MCTSGameState): GameMove[] {
  const moves: GameMove[] = [];

  // 1. Stock/Waste moves
  addStockMoves(state, moves);

  // 2. Waste to Foundation/Tableau
  if (state.waste.length > 0) {
    const wasteCard = state.waste[state.waste.length - 1];
    addWasteToFoundationMoves(wasteCard, state, moves);
    addWasteToTableauMoves(wasteCard, state, moves);
  }

  // 3. Tableau to Foundation/Tableau
  for (let i = 0; i < 7; i++) {
    const pile = state.tableau[i];
    if (pile.length === 0) continue;

    // Top card to foundation
    const topCard = pile[pile.length - 1];
    if (topCard.isFaceUp) {
      addTableauToFoundationMoves(topCard, i, pile.length - 1, state, moves);
    }

    // Face-up card sequences to other tableaus
    for (let cardIdx = 0; cardIdx < pile.length; cardIdx++) {
      const card = pile[cardIdx];
      if (!card.isFaceUp) continue; // Can only move face-up cards

      addTableauToTableauMoves(card, i, cardIdx, state, moves);
    }
  }

  // 4. Foundation to Tableau (strategic regression)
  addFoundationToTableauMoves(state, moves);

  return moves;
}

// === Helper Functions ===

function addStockMoves(state: MCTSGameState, moves: GameMove[]): void {
  if (state.stock.length > 0) {
    moves.push({ type: 'DRAW_FROM_STOCK' });
  } else if (state.waste.length > 0) {
    moves.push({ type: 'RECYCLE_WASTE' });
  }
}

function addWasteToFoundationMoves(
  card: MCTSCard,
  state: MCTSGameState,
  moves: GameMove[]
): void {
  const foundationIndex = getSuitIndex(card.suit);
  const foundation = state.foundations[foundationIndex];

  if (canMoveToFoundation(card, foundation)) {
    moves.push({
      type: 'MOVE_CARDS',
      from: { pileType: 'WASTE', pileIndex: 0, cardIndex: state.waste.length - 1 },
      to: { pileType: 'FOUNDATION', pileIndex: foundationIndex },
    });
  }
}

function addWasteToTableauMoves(
  card: MCTSCard,
  state: MCTSGameState,
  moves: GameMove[]
): void {
  for (let i = 0; i < 7; i++) {
    if (canMoveToTableau(card, state.tableau[i])) {
      moves.push({
        type: 'MOVE_CARDS',
        from: { pileType: 'WASTE', pileIndex: 0, cardIndex: state.waste.length - 1 },
        to: { pileType: 'TABLEAU', pileIndex: i },
      });
    }
  }
}

function addTableauToFoundationMoves(
  card: MCTSCard,
  sourceIdx: number,
  cardIdx: number,
  state: MCTSGameState,
  moves: GameMove[]
): void {
  const foundationIndex = getSuitIndex(card.suit);
  if (canMoveToFoundation(card, state.foundations[foundationIndex])) {
    moves.push({
      type: 'MOVE_CARDS',
      from: { pileType: 'TABLEAU', pileIndex: sourceIdx, cardIndex: cardIdx },
      to: { pileType: 'FOUNDATION', pileIndex: foundationIndex },
    });
  }
}

function addTableauToTableauMoves(
  card: MCTSCard,
  sourceIdx: number,
  cardIdx: number,
  state: MCTSGameState,
  moves: GameMove[]
): void {
  for (let targetIdx = 0; targetIdx < 7; targetIdx++) {
    if (sourceIdx === targetIdx) continue;
    if (canMoveToTableau(card, state.tableau[targetIdx])) {
      moves.push({
        type: 'MOVE_CARDS',
        from: { pileType: 'TABLEAU', pileIndex: sourceIdx, cardIndex: cardIdx },
        to: { pileType: 'TABLEAU', pileIndex: targetIdx },
      });
    }
  }
}

function addFoundationToTableauMoves(state: MCTSGameState, moves: GameMove[]): void {
  for (let foundIdx = 0; foundIdx < 4; foundIdx++) {
    const foundation = state.foundations[foundIdx];
    if (foundation.length === 0) continue;

    const topCard = foundation[foundation.length - 1];
    for (let tableauIdx = 0; tableauIdx < 7; tableauIdx++) {
      if (canMoveToTableau(topCard, state.tableau[tableauIdx])) {
        moves.push({
          type: 'MOVE_CARDS',
          from: { pileType: 'FOUNDATION', pileIndex: foundIdx, cardIndex: foundation.length - 1 },
          to: { pileType: 'TABLEAU', pileIndex: tableauIdx },
        });
      }
    }
  }
}

// === Validation Functions ===

function canMoveToFoundation(card: MCTSCard, foundation: readonly MCTSCard[]): boolean {
  if (foundation.length === 0) {
    return card.rank === MCTSRank.Ace;
  }
  const topCard = foundation[foundation.length - 1];
  return card.suit === topCard.suit && isRankSequential(card.rank, topCard.rank);
}

function canMoveToTableau(card: MCTSCard, tableau: readonly MCTSCard[]): boolean {
  if (tableau.length === 0) {
    return card.rank === MCTSRank.King;
  }
  const topCard = tableau[tableau.length - 1];
  return (
    getCardColor(card) !== getCardColor(topCard) &&
    isRankSequential(topCard.rank, card.rank)
  );
}

function getSuitIndex(suit: MCTSSuit): number {
  switch (suit) {
    case MCTSSuit.CLUBS: return 0;
    case MCTSSuit.DIAMONDS: return 1;
    case MCTSSuit.HEARTS: return 2;
    case MCTSSuit.SPADES: return 3;
  }
}
```

---

## 5. Integration Layer

### 5.1 State Adapter

**File**: `src/mcts/klondike/stateAdapter.ts`

```typescript
import type { GameState, Card, Suit } from '../../../types';
import type { MCTSGameState, MCTSCard, MCTSSuit, MCTSRank } from '../types/state';

/**
 * Convert UI GameState to MCTS GameState
 * Strips UI-specific fields and ensures readonly types
 */
export function uiStateToMCTS(uiState: GameState): MCTSGameState {
  return {
    tableau: uiState.tableau.map(column => 
      column.map(card => convertCard(card))
    ),
    foundations: [
      uiState.foundations.clubs.map(convertCard),
      uiState.foundations.diamonds.map(convertCard),
      uiState.foundations.hearts.map(convertCard),
      uiState.foundations.spades.map(convertCard),
    ],
    stock: uiState.drawPile.map(convertCard),
    waste: uiState.discardPile.map(convertCard),
    stockCycleCount: 0, // Could track this in UI state if needed
  };
}

/**
 * Convert MCTS move back to UI format for execution
 */
export function mctsStateToUI(mctsState: MCTSGameState): Partial<GameState> {
  return {
    tableau: mctsState.tableau.map(column => 
      column.map(card => convertCardToUI(card))
    ),
    foundations: {
      clubs: mctsState.foundations[0].map(convertCardToUI),
      diamonds: mctsState.foundations[1].map(convertCardToUI),
      hearts: mctsState.foundations[2].map(convertCardToUI),
      spades: mctsState.foundations[3].map(convertCardToUI),
    },
    drawPile: mctsState.stock.map(convertCardToUI),
    discardPile: mctsState.waste.map(convertCardToUI),
  };
}

// === Card Conversion ===

function convertCard(uiCard: Card): MCTSCard {
  return {
    suit: convertSuit(uiCard.suit),
    rank: convertRank(uiCard.rank),
    isFaceUp: uiCard.faceUp,
  };
}

function convertCardToUI(mctsCard: MCTSCard): Card {
  return {
    suit: convertSuitToUI(mctsCard.suit),
    rank: convertRankToUI(mctsCard.rank),
    faceUp: mctsCard.isFaceUp,
    id: `${convertSuitToUI(mctsCard.suit)}-${convertRankToUI(mctsCard.rank)}`,
  };
}

function convertSuit(suit: Suit): MCTSSuit {
  switch (suit) {
    case 'clubs': return MCTSSuit.CLUBS;
    case 'diamonds': return MCTSSuit.DIAMONDS;
    case 'hearts': return MCTSSuit.HEARTS;
    case 'spades': return MCTSSuit.SPADES;
  }
}

function convertSuitToUI(suit: MCTSSuit): Suit {
  switch (suit) {
    case MCTSSuit.CLUBS: return 'clubs';
    case MCTSSuit.DIAMONDS: return 'diamonds';
    case MCTSSuit.HEARTS: return 'hearts';
    case MCTSSuit.SPADES: return 'spades';
  }
}

function convertRank(rank: string): MCTSRank {
  switch (rank) {
    case 'A': return MCTSRank.Ace;
    case '2': return MCTSRank.Two;
    case '3': return MCTSRank.Three;
    case '4': return MCTSRank.Four;
    case '5': return MCTSRank.Five;
    case '6': return MCTSRank.Six;
    case '7': return MCTSRank.Seven;
    case '8': return MCTSRank.Eight;
    case '9': return MCTSRank.Nine;
    case '10': return MCTSRank.Ten;
    case 'J': return MCTSRank.Jack;
    case 'Q': return MCTSRank.Queen;
    case 'K': return MCTSRank.King;
    default: throw new Error(`Invalid rank: ${rank}`);
  }
}

function convertRankToUI(rank: MCTSRank): string {
  const rankMap = {
    [MCTSRank.Ace]: 'A',
    [MCTSRank.Two]: '2',
    [MCTSRank.Three]: '3',
    [MCTSRank.Four]: '4',
    [MCTSRank.Five]: '5',
    [MCTSRank.Six]: '6',
    [MCTSRank.Seven]: '7',
    [MCTSRank.Eight]: '8',
    [MCTSRank.Nine]: '9',
    [MCTSRank.Ten]: '10',
    [MCTSRank.Jack]: 'J',
    [MCTSRank.Queen]: 'Q',
    [MCTSRank.King]: 'K',
  };
  return rankMap[rank];
}
```

---

## 6. Data Flow

### 6.1 End-to-End Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      USER INTERACTION                        │
│  User clicks "Get MCTS Hint" button in MCTSPanel component  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   ZUSTAND GAME STORE                         │
│  gameStore.requestMCTSHint() action called                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   STATE ADAPTER LAYER                        │
│  uiStateToMCTS(gameState) → MCTSGameState                   │
│  Strip UI fields, convert types, ensure readonly            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   MCTS SOLVER CREATION                       │
│  new MCTSSolver(mctsState, klondikePolicy, options)         │
│  Initialize root node with current game state               │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      MCTS SEARCH LOOP                        │
│  solver.runSearch(iterations) for N iterations or T seconds │
│                                                              │
│  Each iteration:                                             │
│    1. Selection (UCB1 traversal)                            │
│    2. Expansion (add one new child)                         │
│    3. Simulation (play out with heuristic policy)           │
│    4. Backpropagation (update stats up to root)             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      RESULT EXTRACTION                       │
│  solver.getResult(searchTime) → SolverResult                │
│  - bestMove: GameMove                                        │
│  - statistics: {iterations, visits, confidence, ...}         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   MOVE TRANSLATION                           │
│  Convert GameMove (MCTS format) to UI action                │
│  applyMCTSMove(bestMove) in gameStore                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      UI UPDATE                               │
│  - Highlight suggested move on board                         │
│  - Display confidence score                                  │
│  - Show statistics (iterations, time)                        │
│  - Optional: Auto-apply move if user clicks "Apply"          │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. API Contracts

### 7.1 Public API (src/mcts/index.ts)

```typescript
// Core exports
export { MCTSNode } from './core/MCTSNode';
export { MCTSSolver } from './core/MCTSSolver';
export type { GamePolicy } from './core/GamePolicy';

// Klondike-specific exports
export { KlondikePolicy } from './klondike/KlondikePolicy';
export { uiStateToMCTS, mctsStateToUI } from './klondike/stateAdapter';

// Type exports
export type {
  MCTSGameState,
  MCTSCard,
  MCTSSuit,
  MCTSRank,
} from './types/state';
export type {
  GameMove,
  MoveCards,
  DrawFromStock,
  RecycleWaste,
  PileType,
} from './types/moves';
export type {
  SolverOptions,
  SolverResult,
} from './types/solver';

// Utility exports
export { normalizeScore } from './utils/normalize';
export { hashState } from './utils/stateHash';
```

### 7.2 Zustand Integration API

```typescript
// Add to src/store/gameStore.ts

interface GameStore extends GameState {
  // ... existing actions

  /**
   * Request MCTS hint for current position
   * @param searchTimeMs - Time budget for search (default: 2000ms)
   * @returns Promise<SolverResult> with best move and statistics
   */
  requestMCTSHint: (searchTimeMs?: number) => Promise<SolverResult>;

  /**
   * Apply an MCTS move to the game state
   * Converts MCTS GameMove format to UI actions
   * @param move - GameMove from MCTS solver
   */
  applyMCTSMove: (move: GameMove) => void;

  /**
   * MCTS settings
   */
  mctsSettings: {
    enabled: boolean;
    autoApply: boolean;  // Auto-apply suggested moves
    searchTime: number;  // Default search time (ms)
    explorationConstant: number;  // UCT C value
  };

  /**
   * Update MCTS settings
   */
  updateMCTSSettings: (settings: Partial<typeof mctsSettings>) => void;
}
```

---

## Next Documents

This architecture forms the foundation for:
- **[20251115_mcts_v0_implementation_roadmap.md](./20251115_mcts_v0_implementation_roadmap.md)**: Phase-by-phase implementation plan
- **[20251115_mcts_v0_task_breakdown.md](./20251115_mcts_v0_task_breakdown.md)**: Atomic, self-contained tasks
- **[20251115_mcts_v0_technical_specifications.md](./20251115_mcts_v0_technical_specifications.md)**: Detailed function signatures
- **[20251115_mcts_v0_testing_strategy.md](./20251115_mcts_v0_testing_strategy.md)**: Test cases and coverage

---

**Document Status:** DRAFT v0.1  
**Last Updated:** 2025-11-15  
**Next Review:** After analysis overview approval
