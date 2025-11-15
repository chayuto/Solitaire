# Library API Design - Complete Interface Specifications

**Date:** 2025-11-15  
**Version:** v0.1  
**Status:** API Design  
**Author:** GitHub Copilot Agent  
**Document Type:** Technical Specification

---

## Executive Summary

This document provides the complete API design for both publishable libraries:

1. **`@chayuto/solitaire-core`** - Game engine API
2. **`@chayuto/solitaire-mcts`** - AI solver API

The API design follows these principles:
- **Immutability**: All state operations return new objects
- **Type Safety**: Full TypeScript with strict mode
- **Functional**: Pure functions where possible
- **Composable**: Small, focused modules
- **Tree-Shakeable**: Named exports, no side effects

---

## Table of Contents

1. [Library 1: solitaire-core API](#1-library-1-solitaire-core-api)
2. [Library 2: solitaire-mcts API](#2-library-2-solitaire-mcts-api)
3. [Type Compatibility](#3-type-compatibility)
4. [Usage Examples](#4-usage-examples)
5. [Migration Guide](#5-migration-guide)

---

## 1. Library 1: solitaire-core API

### 1.1 Core Types (`@chayuto/solitaire-core/types`)

```typescript
/**
 * Card suit enum
 */
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';

/**
 * Card rank enum
 */
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

/**
 * Game difficulty level
 * 1 = Very Easy, 2 = Easy, 3 = Normal, 4 = Hard, 5 = Very Hard
 */
export type Difficulty = 1 | 2 | 3 | 4 | 5;

/**
 * Card interface - immutable card representation
 */
export interface Card {
  /** Card suit */
  readonly suit: Suit;
  
  /** Card rank */
  readonly rank: Rank;
  
  /** Whether card is face up (visible) */
  readonly faceUp: boolean;
  
  /** Unique identifier (format: "suit-rank", e.g., "hearts-A") */
  readonly id: string;
}

/**
 * Foundation piles (one per suit)
 */
export interface Foundations {
  readonly hearts: readonly Card[];
  readonly diamonds: readonly Card[];
  readonly clubs: readonly Card[];
  readonly spades: readonly Card[];
}

/**
 * Pure game state (no UI concerns)
 * All properties are readonly for immutability
 */
export interface GameState {
  /** Draw pile (stock) */
  readonly drawPile: readonly Card[];
  
  /** Discard pile (waste) */
  readonly discardPile: readonly Card[];
  
  /** Foundation piles (goal: move all 52 cards here) */
  readonly foundations: Foundations;
  
  /** Tableau columns (7 columns) */
  readonly tableau: readonly (readonly Card[])[];
  
  /** Game difficulty */
  readonly difficulty: Difficulty;
  
  /** Whether game is won (all cards in foundations) */
  readonly gameWon: boolean;
  
  /** Game completion percentage (0-100) */
  readonly completionProgress: number;
  
  /** Perceived difficulty score (0-100, based on initial layout) */
  readonly perceivedDifficulty?: number;
}

/**
 * Move type enum
 */
export type MoveType = 
  | 'draw_card'
  | 'tableau_to_tableau'
  | 'tableau_to_foundation'
  | 'discard_to_tableau'
  | 'discard_to_foundation';

/**
 * Move descriptor (for history tracking)
 */
export interface Move {
  /** Move type */
  readonly type: MoveType;
  
  /** Timestamp */
  readonly timestamp: number;
  
  /** Card being moved */
  readonly card: Card;
  
  /** Source location */
  readonly from?: {
    readonly source: 'tableau' | 'discard' | 'draw';
    readonly columnIndex?: number;
    readonly cardIndex?: number;
  };
  
  /** Destination location */
  readonly to?: {
    readonly target: 'tableau' | 'foundation';
    readonly columnIndex?: number;
    readonly suit?: Suit;
  };
}

/**
 * Move command (for applying moves)
 */
export type MoveCommand = 
  | { type: 'draw' }
  | { 
      type: 'tableau_to_tableau';
      from: { column: number; cardIndex: number };
      to: { column: number };
    }
  | {
      type: 'tableau_to_foundation';
      from: { column: number; cardIndex: number };
      to: { suit: Suit };
    }
  | {
      type: 'discard_to_tableau';
      to: { column: number };
    }
  | {
      type: 'discard_to_foundation';
      to: { suit: Suit };
    };
```

### 1.2 GameEngine Class (`@chayuto/solitaire-core/engine`)

```typescript
/**
 * Game initialization options
 */
export interface InitializeOptions {
  /** Game difficulty (default: 3) */
  difficulty?: Difficulty;
  
  /** Custom deck (for testing or specific layouts) */
  customDeck?: Card[];
  
  /** Random seed (for reproducible games) */
  seed?: number;
}

/**
 * Main game engine class
 * Provides all game logic operations
 */
export class GameEngine {
  /**
   * Initialize a new game
   * @param options - Initialization options
   * @returns Initial game state
   * 
   * @example
   * const engine = new GameEngine();
   * const initialState = engine.initialize({ difficulty: 3 });
   */
  public initialize(options?: InitializeOptions): GameState;

  /**
   * Apply a move to the game state
   * @param state - Current game state (immutable)
   * @param command - Move command to apply
   * @returns New game state after move
   * @throws {Error} If move is invalid
   * 
   * @example
   * const nextState = engine.applyMove(state, {
   *   type: 'tableau_to_foundation',
   *   from: { column: 0, cardIndex: 5 },
   *   to: { suit: 'hearts' }
   * });
   */
  public applyMove(state: GameState, command: MoveCommand): GameState;

  /**
   * Check if a move is valid
   * @param state - Current game state
   * @param command - Move command to validate
   * @returns True if move is legal
   * 
   * @example
   * const isValid = engine.canApplyMove(state, command);
   */
  public canApplyMove(state: GameState, command: MoveCommand): boolean;

  /**
   * Get all legal moves from current state
   * @param state - Current game state
   * @returns Array of legal move commands
   * 
   * @example
   * const legalMoves = engine.getLegalMoves(state);
   * console.log(`${legalMoves.length} legal moves available`);
   */
  public getLegalMoves(state: GameState): MoveCommand[];

  /**
   * Check if game is won
   * @param state - Current game state
   * @returns True if all 52 cards are in foundations
   */
  public isWon(state: GameState): boolean;

  /**
   * Check if game is lost (no legal moves)
   * @param state - Current game state
   * @returns True if no legal moves available
   */
  public isLost(state: GameState): boolean;

  /**
   * Calculate game completion progress
   * @param state - Current game state
   * @returns Completion percentage (0-100)
   */
  public getCompletionProgress(state: GameState): number;

  /**
   * Calculate perceived difficulty of initial layout
   * @param state - Initial game state
   * @returns Difficulty score (0-100)
   */
  public getPerceivedDifficulty(state: GameState): number;

  /**
   * Export game state to JSON string
   * @param state - Game state to export
   * @returns JSON string
   */
  public exportState(state: GameState): string;

  /**
   * Import game state from JSON string
   * @param json - JSON string from exportState
   * @returns Parsed game state
   * @throws {Error} If JSON is invalid
   */
  public importState(json: string): GameState;
}
```

### 1.3 Move Validators (`@chayuto/solitaire-core/rules`)

```typescript
/**
 * Tableau move validation
 */
export namespace TableauRules {
  /**
   * Check if card can be moved to tableau column
   * @param card - Card to move
   * @param targetColumn - Target column cards
   * @returns True if move is legal
   * 
   * Rules:
   * - Empty column: Only King can be placed
   * - Non-empty: Card must be opposite color and one rank lower than top card
   */
  export function canMoveToTableau(
    card: Card,
    targetColumn: readonly Card[]
  ): boolean;

  /**
   * Check if card sequence can be moved (for multi-card moves)
   * @param cards - Cards to move (bottom to top)
   * @param targetColumn - Target column
   * @returns True if sequence move is legal
   */
  export function canMoveSequence(
    cards: readonly Card[],
    targetColumn: readonly Card[]
  ): boolean;

  /**
   * Find all valid tableau destinations for a card
   * @param card - Card to move
   * @param tableau - All tableau columns
   * @param sourceColumn - Source column index (to exclude)
   * @returns Array of valid destination column indices
   */
  export function getValidTableauDestinations(
    card: Card,
    tableau: readonly (readonly Card[])[],
    sourceColumn?: number
  ): number[];
}

/**
 * Foundation move validation
 */
export namespace FoundationRules {
  /**
   * Check if card can be moved to foundation
   * @param card - Card to move
   * @param foundationPile - Foundation pile for card's suit
   * @returns True if move is legal
   * 
   * Rules:
   * - Empty foundation: Only Ace can be placed
   * - Non-empty: Card must be same suit and one rank higher than top card
   */
  export function canMoveToFoundation(
    card: Card,
    foundationPile: readonly Card[]
  ): boolean;

  /**
   * Get expected next card for foundation pile
   * @param foundationPile - Foundation pile
   * @returns Expected next card rank, or null if pile is full
   */
  export function getNextFoundationRank(
    foundationPile: readonly Card[]
  ): Rank | null;

  /**
   * Check if card has valid foundation destination
   * @param card - Card to check
   * @param foundations - All foundation piles
   * @returns True if card can go to its suit's foundation
   */
  export function hasValidFoundationDestination(
    card: Card,
    foundations: Foundations
  ): boolean;
}

/**
 * Stock/Waste rules
 */
export namespace StockRules {
  /**
   * Check if draw is possible
   * @param state - Game state
   * @returns True if cards remain in draw pile
   */
  export function canDraw(state: GameState): boolean;

  /**
   * Draw card from stock to waste (Draw 1 variant)
   * @param state - Current game state
   * @returns New game state with card drawn
   */
  export function draw(state: GameState): GameState;

  /**
   * Recycle waste pile back to stock
   * @param state - Current game state
   * @returns New game state with stock recycled
   */
  export function recycle(state: GameState): GameState;
}
```

### 1.4 Utilities (`@chayuto/solitaire-core/utils`)

```typescript
/**
 * Deck utilities
 */
export namespace DeckUtils {
  /**
   * Create a standard 52-card deck
   * @param faceUp - Whether all cards should start face up (default: false)
   * @returns Array of 52 cards
   */
  export function createDeck(faceUp?: boolean): Card[];

  /**
   * Shuffle a deck using Fisher-Yates algorithm
   * @param deck - Deck to shuffle (not mutated)
   * @param seed - Optional random seed for reproducibility
   * @returns Shuffled deck
   */
  export function shuffleDeck(deck: readonly Card[], seed?: number): Card[];

  /**
   * Arrange deck by difficulty
   * Higher difficulty = more hidden cards, worse initial layout
   * @param difficulty - Difficulty level (1-5)
   * @param seed - Optional random seed
   * @returns Arranged deck
   */
  export function arrangeDeckByDifficulty(
    difficulty: Difficulty,
    seed?: number
  ): Card[];
}

/**
 * Card utilities
 */
export namespace CardUtils {
  /**
   * Check if card is red
   * @param card - Card to check
   * @returns True if card is hearts or diamonds
   */
  export function isRed(card: Card): boolean;

  /**
   * Check if card is black
   * @param card - Card to check
   * @returns True if card is clubs or spades
   */
  export function isBlack(card: Card): boolean;

  /**
   * Get card color
   * @param card - Card to check
   * @returns 'red' or 'black'
   */
  export function getColor(card: Card): 'red' | 'black';

  /**
   * Get rank numeric value (A=1, 2=2, ..., K=13)
   * @param rank - Card rank
   * @returns Numeric value
   */
  export function getRankValue(rank: Rank): number;

  /**
   * Compare two ranks
   * @param rank1 - First rank
   * @param rank2 - Second rank
   * @returns Negative if rank1 < rank2, 0 if equal, positive if rank1 > rank2
   */
  export function compareRanks(rank1: Rank, rank2: Rank): number;

  /**
   * Create a new card
   * @param suit - Card suit
   * @param rank - Card rank
   * @param faceUp - Whether card is face up (default: true)
   * @returns New card
   */
  export function createCard(
    suit: Suit,
    rank: Rank,
    faceUp?: boolean
  ): Card;

  /**
   * Flip a card (toggle faceUp)
   * @param card - Card to flip (not mutated)
   * @returns New card with faceUp toggled
   */
  export function flipCard(card: Card): Card;
}

/**
 * Validation utilities
 */
export namespace ValidationUtils {
  /**
   * Validate game state integrity
   * @param state - Game state to validate
   * @throws {Error} If state is invalid (e.g., duplicate cards, wrong card count)
   */
  export function validateGameState(state: GameState): void;

  /**
   * Check if game state is valid
   * @param state - Game state to check
   * @returns True if state is valid
   */
  export function isValidGameState(state: GameState): boolean;

  /**
   * Count total cards in game state
   * @param state - Game state
   * @returns Total card count (should always be 52)
   */
  export function countCards(state: GameState): number;

  /**
   * Find duplicate cards in game state
   * @param state - Game state
   * @returns Array of duplicate card IDs (empty if none)
   */
  export function findDuplicates(state: GameState): string[];
}

/**
 * State hashing for cycle detection
 */
export namespace HashUtils {
  /**
   * Generate hash of game state
   * Uses FNV-1a algorithm for fast, collision-resistant hashing
   * @param state - Game state to hash
   * @returns Hash string
   */
  export function hashGameState(state: GameState): string;

  /**
   * Generate hash after hypothetical move
   * Useful for cycle detection without actually applying move
   * @param state - Current game state
   * @param command - Move to simulate
   * @returns Hash of resulting state
   */
  export function hashAfterMove(
    state: GameState,
    command: MoveCommand
  ): string;
}
```

### 1.5 Main Entry Point (`@chayuto/solitaire-core`)

```typescript
// Main exports
export { GameEngine } from './engine/GameEngine';
export * from './types';
export * as TableauRules from './rules/tableau';
export * as FoundationRules from './rules/foundation';
export * as StockRules from './rules/stock';
export * as DeckUtils from './utils/deck';
export * as CardUtils from './utils/card';
export * as ValidationUtils from './utils/validation';
export * as HashUtils from './utils/hash';

// Convenience re-exports for tree-shaking
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
```

---

## 2. Library 2: solitaire-mcts API

### 2.1 MCTS Core Types (`@chayuto/solitaire-mcts/types`)

```typescript
import type { GameState, Card, Move } from '@chayuto/solitaire-core';

/**
 * MCTS game state (compatible with core GameState)
 * Adds cycle detection field
 */
export interface MCTSGameState extends GameState {
  /** Number of times stock has been recycled (for cycle detection) */
  readonly stockCycleCount: number;
}

/**
 * MCTS move representation
 * Compatible with core MoveCommand but adds metadata
 */
export type MCTSMove = Move & {
  /** Move priority (for heuristic sorting) */
  readonly priority?: number;
  
  /** Whether move reveals a new card */
  readonly revealsCard?: boolean;
};

/**
 * Solver configuration
 */
export interface SolverConfig {
  /** Exploration constant (default: Math.sqrt(2) ≈ 1.414) */
  explorationConstant?: number;

  /** Maximum theoretical score for normalization (default: 548) */
  maxTheoreticalScore?: number;

  /** Maximum simulation depth to prevent infinite loops (default: 100) */
  maxSimulationDepth?: number;

  /** Use heuristic (greedy) playout vs random (default: true) */
  useHeuristicPlayout?: boolean;

  /** Enable cycle detection during simulation (default: true) */
  enableCycleDetection?: boolean;

  /** Random seed for reproducible results (default: undefined) */
  seed?: number;
}

/**
 * Solver result
 */
export interface SolverResult {
  /** Best move found by MCTS */
  bestMove: MCTSMove | null;

  /** Search statistics */
  statistics: {
    /** Total MCTS iterations performed */
    totalIterations: number;

    /** Number of times root node was visited */
    rootVisits: number;

    /** Number of times best move was visited */
    bestMoveVisits: number;

    /** Average value of best move [0, 1] */
    bestMoveValue: number;

    /** Time spent searching (milliseconds) */
    searchTimeMs: number;

    /** Iterations per second */
    iterationsPerSecond: number;

    /** Total nodes in tree */
    treeSize: number;
  };

  /** Confidence score [0, 1] */
  confidence: number;

  /** Analysis of all root children (for debugging) */
  moveAnalysis?: Array<{
    move: MCTSMove;
    visits: number;
    value: number;
    averageValue: number;
  }>;
}
```

### 2.2 MCTSSolver Class (`@chayuto/solitaire-mcts/core`)

```typescript
import type { GameState } from '@chayuto/solitaire-core';
import type { MCTSGameState, MCTSMove, SolverConfig, SolverResult } from '../types';

/**
 * Monte Carlo Tree Search solver
 * Implements Single-Player MCTS (SP-MCTS) algorithm
 */
export class MCTSSolver {
  /**
   * Create a new MCTS solver
   * @param initialState - Starting game state
   * @param config - Solver configuration
   * 
   * @example
   * const solver = new MCTSSolver(gameState, {
   *   explorationConstant: Math.sqrt(2),
   *   maxTheoreticalScore: 548,
   * });
   */
  constructor(initialState: GameState, config?: SolverConfig);

  /**
   * Run MCTS search for specified number of iterations
   * @param iterations - Number of MCTS cycles to perform
   * 
   * @example
   * solver.runSearch(10000); // Run 10k iterations
   */
  public runSearch(iterations: number): void;

  /**
   * Run MCTS search for specified time budget
   * @param milliseconds - Time budget in milliseconds
   * @returns Number of iterations completed
   * 
   * @example
   * const iterations = await solver.runSearchAsync(2000); // 2 seconds
   * console.log(`Completed ${iterations} iterations`);
   */
  public async runSearchAsync(milliseconds: number): Promise<number>;

  /**
   * Get best move after search completes
   * @param criteria - Selection criteria ('visits' or 'value')
   * @returns Best move or null if no moves available
   * 
   * Recommendation: Use 'visits' (most robust)
   */
  public getBestMove(criteria?: 'visits' | 'value'): MCTSMove | null;

  /**
   * Get comprehensive result with statistics
   * @returns Full solver result
   * 
   * @example
   * const result = solver.getResult();
   * console.log(`Confidence: ${result.confidence}`);
   * console.log(`Best move: ${JSON.stringify(result.bestMove)}`);
   */
  public getResult(): SolverResult;

  /**
   * Reset solver to new state
   * Discards existing tree and starts fresh
   * @param newState - New starting state
   */
  public reset(newState: GameState): void;

  /**
   * Get current root node visits (progress indicator)
   * @returns Number of times root has been visited
   */
  public getProgress(): number;

  /**
   * Export solver state for debugging
   * @returns JSON string with tree statistics
   */
  public exportTree(): string;
}
```

### 2.3 KlondikePolicy Class (`@chayuto/solitaire-mcts/klondike`)

```typescript
import { GameEngine, type GameState, type MoveCommand } from '@chayuto/solitaire-core';
import type { MCTSGameState, MCTSMove } from '../types';

/**
 * Klondike-specific game policy for MCTS
 * Implements the GamePolicy interface required by MCTSSolver
 */
export class KlondikePolicy {
  /**
   * Create Klondike policy
   * @param options - Policy configuration
   */
  constructor(options?: {
    /** Use heuristic simulation (default: true) */
    useHeuristicSimulation?: boolean;
  });

  /**
   * Generate all legal moves from state
   * @param state - Current game state
   * @returns Array of legal moves
   */
  public getLegalMoves(state: GameState): MCTSMove[];

  /**
   * Apply a move to state (immutable)
   * @param state - Current game state
   * @param move - Move to apply
   * @returns New game state after move
   */
  public applyMove(state: GameState, move: MCTSMove): GameState;

  /**
   * Check if state is terminal (game over)
   * @param state - Game state to check
   * @returns True if game is won or no legal moves
   */
  public isTerminal(state: GameState): boolean;

  /**
   * Get raw score for state (Heuristic Evaluation Function)
   * @param state - Game state to score
   * @returns Raw score (will be normalized by solver)
   * 
   * Scoring:
   * - 10 points per card in foundation (max 520)
   * - 1 point per face-up tableau card (max 28)
   * - Total range: [0, 548]
   */
  public getScore(state: GameState): number;

  /**
   * Select move during simulation (playout)
   * Uses greedy heuristic policy if enabled
   * @param state - Current state
   * @param legalMoves - All legal moves from state
   * @returns Selected move
   */
  public selectSimulationMove(state: GameState, legalMoves: MCTSMove[]): MCTSMove;
}
```

### 2.4 State Adapter (`@chayuto/solitaire-mcts/klondike`)

```typescript
import type { GameState } from '@chayuto/solitaire-core';
import type { MCTSGameState } from '../types';

/**
 * Convert core GameState to MCTS GameState
 * Adds cycle detection field
 * @param coreState - Core game state
 * @returns MCTS-compatible state
 */
export function coreToMCTS(coreState: GameState): MCTSGameState;

/**
 * Convert MCTS GameState back to core GameState
 * Removes MCTS-specific fields
 * @param mctsState - MCTS game state
 * @returns Core-compatible state
 */
export function mctsToCore(mctsState: MCTSGameState): GameState;
```

### 2.5 Heuristic Functions (`@chayuto/solitaire-mcts/heuristics`)

```typescript
import type { GameState, Move } from '@chayuto/solitaire-core';

/**
 * Move priority levels (higher = better)
 */
export enum MovePriority {
  /** Tableau to foundation, reveals card */
  TABLEAU_TO_FOUNDATION_REVEAL = 8,
  
  /** Waste to foundation */
  WASTE_TO_FOUNDATION = 7,
  
  /** Tableau to foundation, no reveal */
  TABLEAU_TO_FOUNDATION_NO_REVEAL = 6,
  
  /** Tableau to tableau, reveals card */
  TABLEAU_TO_TABLEAU_REVEAL = 5,
  
  /** Waste to tableau */
  WASTE_TO_TABLEAU = 4,
  
  /** Foundation to tableau (regression) */
  FOUNDATION_TO_TABLEAU = 3,
  
  /** Draw card or recycle */
  DRAW_RECYCLE = 2,
  
  /** Tableau to tableau, no reveal */
  TABLEAU_TO_TABLEAU_NO_REVEAL = 1,
}

/**
 * Get move priority for greedy simulation
 * @param move - Move to prioritize
 * @param state - Current game state
 * @returns Priority level
 */
export function getMovePriority(move: Move, state: GameState): MovePriority;

/**
 * Sort moves by priority (high to low)
 * @param moves - Moves to sort
 * @param state - Current game state
 * @returns Sorted moves
 */
export function sortMovesByPriority(moves: Move[], state: GameState): Move[];

/**
 * Select greedy move (highest priority)
 * @param moves - Available moves
 * @param state - Current game state
 * @returns Selected move
 */
export function selectGreedyMove(moves: Move[], state: GameState): Move;
```

### 2.6 Main Entry Point (`@chayuto/solitaire-mcts`)

```typescript
// Core exports
export { MCTSSolver } from './core/MCTSSolver';
export { MCTSNode } from './core/MCTSNode';
export type { GamePolicy } from './core/GamePolicy';

// Klondike-specific exports
export { KlondikePolicy } from './klondike/KlondikePolicy';
export { coreToMCTS, mctsToCore } from './klondike/StateAdapter';

// Heuristic exports
export {
  MovePriority,
  getMovePriority,
  sortMovesByPriority,
  selectGreedyMove,
} from './heuristics';

// Type exports
export type {
  MCTSGameState,
  MCTSMove,
  SolverConfig,
  SolverResult,
} from './types';

// Re-export core types for convenience
export type { GameState, Card, Move } from '@chayuto/solitaire-core';
```

---

## 3. Type Compatibility

### 3.1 Core ↔ MCTS Type Mapping

```typescript
// Library 1 (core) types
import { GameState as CoreGameState, Card, Move } from '@chayuto/solitaire-core';

// Library 2 (mcts) types
import { MCTSGameState, MCTSMove } from '@chayuto/solitaire-mcts';

// Compatibility:
// ✅ Card: Identical across both libraries
// ✅ MCTSGameState extends CoreGameState (compatible)
// ✅ MCTSMove extends Move (compatible)

// Example: Convert between types
import { coreToMCTS, mctsToCore } from '@chayuto/solitaire-mcts';

const coreState: CoreGameState = { /* ... */ };
const mctsState: MCTSGameState = coreToMCTS(coreState);
const backToCore: CoreGameState = mctsToCore(mctsState);
```

### 3.2 UI ↔ Library Integration

```typescript
// Current UI (Zustand store) types
interface UIGameState {
  drawPile: Card[];
  discardPile: Card[];
  foundations: { hearts: Card[]; diamonds: Card[]; clubs: Card[]; spades: Card[] };
  tableau: Card[][];
  selectedCard?: { /* ... */ };  // UI-specific
  showValidMoves: boolean;       // UI-specific
  godMode: boolean;              // UI-specific
  // ... other UI fields
}

// Library core types (pure game logic)
interface LibraryGameState {
  drawPile: readonly Card[];    // Immutable
  discardPile: readonly Card[];
  foundations: Foundations;
  tableau: readonly (readonly Card[])[];
  difficulty: Difficulty;
  gameWon: boolean;
  completionProgress: number;
  // No UI fields
}

// Adapter function
function uiToLibrary(uiState: UIGameState): LibraryGameState {
  return {
    drawPile: uiState.drawPile,
    discardPile: uiState.discardPile,
    foundations: uiState.foundations,
    tableau: uiState.tableau,
    difficulty: uiState.difficulty || 3,
    gameWon: isGameWon(uiState),
    completionProgress: calculateProgress(uiState),
  };
}

function libraryToUI(libState: LibraryGameState, uiState: UIGameState): UIGameState {
  return {
    ...uiState, // Preserve UI fields
    drawPile: [...libState.drawPile],      // Convert back to mutable
    discardPile: [...libState.discardPile],
    foundations: { ...libState.foundations },
    tableau: libState.tableau.map(col => [...col]),
  };
}
```

---

## 4. Usage Examples

### 4.1 Basic Game Engine Usage

```typescript
import { GameEngine, type GameState } from '@chayuto/solitaire-core';

// Create engine
const engine = new GameEngine();

// Initialize game
const initialState = engine.initialize({ difficulty: 3 });
console.log(`Game started with ${engine.getCompletionProgress(initialState)}% complete`);

// Get legal moves
const legalMoves = engine.getLegalMoves(initialState);
console.log(`${legalMoves.length} legal moves available`);

// Apply first move
const firstMove = legalMoves[0];
const newState = engine.applyMove(initialState, firstMove);

// Check if won
if (engine.isWon(newState)) {
  console.log('Game won!');
}

// Export state for saving
const savedState = engine.exportState(newState);
localStorage.setItem('solitaire-save', savedState);

// Import state to resume
const resumedState = engine.importState(localStorage.getItem('solitaire-save')!);
```

### 4.2 MCTS Solver Usage

```typescript
import { GameEngine } from '@chayuto/solitaire-core';
import { MCTSSolver, KlondikePolicy } from '@chayuto/solitaire-mcts';

// Initialize game
const engine = new GameEngine();
const initialState = engine.initialize({ difficulty: 3 });

// Create MCTS solver
const solver = new MCTSSolver(initialState, {
  explorationConstant: Math.sqrt(2),
  maxTheoreticalScore: 548,
  useHeuristicPlayout: true,
});

// Run search for 2 seconds
const startTime = Date.now();
await solver.runSearchAsync(2000);
const searchTime = Date.now() - startTime;

// Get result
const result = solver.getResult();
console.log(`Search complete in ${searchTime}ms`);
console.log(`Iterations: ${result.statistics.totalIterations}`);
console.log(`Best move: ${JSON.stringify(result.bestMove)}`);
console.log(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);

// Apply best move
if (result.bestMove) {
  const nextState = engine.applyMove(initialState, result.bestMove);
  console.log(`After move: ${engine.getCompletionProgress(nextState)}% complete`);
}
```

### 4.3 React Integration Example

```typescript
import { useCallback, useState } from 'react';
import { GameEngine, type GameState } from '@chayuto/solitaire-core';
import { MCTSSolver, type SolverResult } from '@chayuto/solitaire-mcts';

function useSolitaireMCTS() {
  const [engine] = useState(() => new GameEngine());
  const [gameState, setGameState] = useState<GameState>(() => engine.initialize());
  const [mctsResult, setMctsResult] = useState<SolverResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const getMCTSHint = useCallback(async () => {
    setIsSearching(true);
    
    // Create solver
    const solver = new MCTSSolver(gameState, {
      explorationConstant: Math.sqrt(2),
      maxTheoreticalScore: 548,
    });

    // Run search in background
    await solver.runSearchAsync(2000);

    // Get result
    const result = solver.getResult();
    setMctsResult(result);
    setIsSearching(false);

    return result;
  }, [gameState]);

  const applyMCTSMove = useCallback(() => {
    if (!mctsResult?.bestMove) return;

    const nextState = engine.applyMove(gameState, mctsResult.bestMove);
    setGameState(nextState);
    setMctsResult(null); // Clear hint after applying
  }, [engine, gameState, mctsResult]);

  return {
    gameState,
    mctsResult,
    isSearching,
    getMCTSHint,
    applyMCTSMove,
  };
}

// Usage in component
function SolitaireGame() {
  const { gameState, mctsResult, isSearching, getMCTSHint, applyMCTSMove } = useSolitaireMCTS();

  return (
    <div>
      <button onClick={getMCTSHint} disabled={isSearching}>
        {isSearching ? 'Searching...' : 'Get Hint'}
      </button>
      {mctsResult && (
        <div>
          <p>Confidence: {(mctsResult.confidence * 100).toFixed(1)}%</p>
          <button onClick={applyMCTSMove}>Apply Move</button>
        </div>
      )}
      {/* Render game board */}
    </div>
  );
}
```

---

## 5. Migration Guide

### 5.1 From Current Monorepo to Library 1

**Before (gameStore.ts)**:
```typescript
// Current implementation (Zustand store)
export const useGameStore = create<GameStore>((set, get) => ({
  drawPile: [],
  discardPile: [],
  // ... state

  initializeGame: (difficulty = 3) => {
    const deck = arrangeDeckByDifficulty(difficulty);
    // ... deal cards
    set({ /* new state */ });
  },

  moveCardToTableau: (targetColumn) => {
    const { selectedCard, tableau } = get();
    // ... validation and state update
    set({ /* new state */ });
  },
}));
```

**After (with library)**:
```typescript
import { GameEngine, type GameState } from '@chayuto/solitaire-core';

export const useGameStore = create<GameStore>((set, get) => ({
  // Core game state (from library)
  gameState: null as GameState | null,
  
  // UI-specific state
  selectedCard: null,
  showValidMoves: false,
  
  // Engine instance
  engine: new GameEngine(),

  initializeGame: (difficulty = 3) => {
    const { engine } = get();
    const gameState = engine.initialize({ difficulty });
    set({ gameState });
  },

  moveCardToTableau: (targetColumn) => {
    const { engine, gameState, selectedCard } = get();
    if (!gameState || !selectedCard) return;

    // Create move command
    const command = {
      type: 'discard_to_tableau' as const,
      to: { column: targetColumn },
    };

    // Validate and apply
    if (engine.canApplyMove(gameState, command)) {
      const newState = engine.applyMove(gameState, command);
      set({ gameState: newState, selectedCard: null });
    }
  },
}));
```

### 5.2 Adding MCTS to Existing App

```typescript
import { useGameStore } from './store/gameStore';
import { MCTSSolver } from '@chayuto/solitaire-mcts';

// Add MCTS action to store
export const useGameStore = create<GameStore>((set, get) => ({
  // ... existing state and actions

  mctsResult: null as SolverResult | null,
  isSearchingMCTS: false,

  requestMCTSHint: async (searchTimeMs = 2000) => {
    const { gameState } = get();
    if (!gameState) return null;

    set({ isSearchingMCTS: true });

    // Create solver
    const solver = new MCTSSolver(gameState, {
      explorationConstant: Math.sqrt(2),
      maxTheoreticalScore: 548,
    });

    // Run search
    await solver.runSearchAsync(searchTimeMs);

    // Get result
    const result = solver.getResult();
    set({ mctsResult: result, isSearchingMCTS: false });

    return result;
  },

  applyMCTSMove: () => {
    const { engine, gameState, mctsResult } = get();
    if (!gameState || !mctsResult?.bestMove) return;

    const newState = engine.applyMove(gameState, mctsResult.bestMove);
    set({ gameState: newState, mctsResult: null });
  },
}));
```

---

## 6. API Stability and Versioning

### 6.1 Semantic Versioning

Both libraries follow [semver](https://semver.org/):

- **MAJOR** (X.0.0): Breaking API changes
- **MINOR** (1.X.0): New features, backward compatible
- **PATCH** (1.0.X): Bug fixes, backward compatible

**Example**:
- `1.0.0` → `1.0.1`: Bug fix in `canMoveToTableau()` (patch)
- `1.0.1` → `1.1.0`: Add `getDifficulty()` method (minor)
- `1.1.0` → `2.0.0`: Rename `GameEngine` to `SolitaireEngine` (major)

### 6.2 Deprecation Policy

Breaking changes will be deprecated in a minor release before removal:

```typescript
/**
 * @deprecated Use `applyMove()` instead. Will be removed in v2.0.0
 */
export function applyMoveOld(state: GameState, move: Move): GameState {
  console.warn('applyMoveOld is deprecated, use applyMove instead');
  return applyMove(state, move);
}
```

### 6.3 API Stability Guarantees

**Library 1 (solitaire-core)**:
- **Stable**: Types (Card, GameState, Move)
- **Stable**: GameEngine public methods
- **Stable**: Rule validation functions
- **Unstable (may change)**: Internal utilities (not exported)

**Library 2 (solitaire-mcts)**:
- **Stable**: MCTSSolver public methods
- **Stable**: SolverConfig, SolverResult types
- **Experimental**: Heuristic functions (may be optimized)
- **Unstable**: Internal MCTS tree structure

---

**Document Status**: COMPLETE - Ready for Implementation  
**Next Steps**: Use this API design as reference during library extraction  
**Approval Required**: Yes (before starting implementation)

---

_This API design provides the complete interface specifications for both publishable libraries, ensuring type safety, immutability, and clean separation of concerns._
