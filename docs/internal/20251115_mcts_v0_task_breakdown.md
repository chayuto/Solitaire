# MCTS Implementation - Atomic Task Breakdown

**Date:** 2025-11-15  
**Version:** v0.1  
**Status:** Planning Phase  
**Author:** GitHub Copilot Agent

---

## Overview

This document breaks down the MCTS integration into **atomic, self-contained tasks** suitable for coding agents. Each task is designed to be:

- **Independent**: Can be worked on without blocking other tasks (where possible)
- **Testable**: Has clear acceptance criteria and unit tests
- **Small**: 50-200 lines of code per task
- **Focused**: Single responsibility, clear scope

**Total Tasks**: 47 tasks across 6 phases  
**Estimated Total Effort**: 6-9 weeks (single developer)

---

## Task Dependency Graph

```
PHASE 1 (Foundation)
  ├─ TASK-001 (Types) ───┬─→ TASK-006 (MCTSNode)
  ├─ TASK-002 (Types)    │
  ├─ TASK-003 (Types)    │
  ├─ TASK-004 (Utility)  │
  └─ TASK-005 (Utility)  │
                         ↓
PHASE 2 (Core MCTS)      ↓
  ├─ TASK-006 (Node)  ───┼─→ TASK-009 (Solver)
  ├─ TASK-007 (Policy)   │
  ├─ TASK-008 (Policy)   │
  └─ TASK-009 (Solver) ──┤
         ↓               ↓
PHASE 3 (Klondike Logic) ↓
  ├─ TASK-015 (Adapter)  │
  ├─ TASK-016-025 (Moves)├─→ TASK-026 (Policy)
  └─ TASK-026 (Policy) ──┤
         ↓               ↓
PHASE 4 (Heuristics)     ↓
  ├─ TASK-027-032 ───────┴─→ TASK-033 (Integration)
                         ↓
PHASE 5 (Integration)    ↓
  └─ TASK-033-039 ───────┴─→ PHASE 6 (Tests)
                         ↓
PHASE 6 (Testing)
  └─ TASK-040-047
```

---

## PHASE 1: Foundation & Types (7 tasks)

**Goal**: Establish type system and basic utilities
**Duration**: 3-5 days
**Dependencies**: None

### TASK-001: Create MCTS Core Types (State & Card)
**File**: `src/mcts/types/state.ts`  
**Lines**: ~100  
**Priority**: CRITICAL  
**Dependencies**: None

**Description**: Define core MCTS types for card and game state

**Acceptance Criteria**:
- [ ] `MCTSSuit` enum defined (CLUBS, DIAMONDS, HEARTS, SPADES)
- [ ] `MCTSRank` enum defined (Ace=1, Two=2, ..., King=13)
- [ ] `MCTSCard` interface with readonly properties
- [ ] `MCTSGameState` interface with readonly arrays
- [ ] `getCardColor()` helper function
- [ ] `isRankSequential()` helper function
- [ ] All types exported from `src/mcts/types/index.ts`

**Test Coverage**:
```typescript
// src/mcts/types/__tests__/state.test.ts
- getCardColor() returns 'RED' for HEARTS/DIAMONDS
- getCardColor() returns 'BLACK' for CLUBS/SPADES
- isRankSequential() validates rank sequences
- MCTSCard enforces readonly at compile-time
```

---

### TASK-002: Create MCTS Move Types
**File**: `src/mcts/types/moves.ts`  
**Lines**: ~80  
**Priority**: CRITICAL  
**Dependencies**: None

**Description**: Define move type system for Klondike actions

**Acceptance Criteria**:
- [ ] `PileType` type defined
- [ ] `MoveCards` interface with from/to piles
- [ ] `DrawFromStock` interface
- [ ] `RecycleWaste` interface
- [ ] `GameMove` union type
- [ ] Type guard functions (isMoveCards, etc.)
- [ ] All types exported

**Test Coverage**:
```typescript
// src/mcts/types/__tests__/moves.test.ts
- Type guards correctly identify move types
- MoveCards enforces readonly properties
- All move variants covered
```

---

### TASK-003: Create MCTS Solver Configuration Types
**File**: `src/mcts/types/solver.ts`  
**Lines**: ~70  
**Priority**: CRITICAL  
**Dependencies**: None

**Description**: Define solver configuration and result types

**Acceptance Criteria**:
- [ ] `SolverOptions` interface defined
- [ ] `SolverResult` interface with statistics
- [ ] Default values documented
- [ ] All types exported

**Test Coverage**:
```typescript
// src/mcts/types/__tests__/solver.test.ts
- SolverOptions has sensible defaults
- SolverResult structure is complete
```

---

### TASK-004: Implement State Hashing Utility
**File**: `src/mcts/utils/stateHash.ts`  
**Lines**: ~60  
**Priority**: HIGH  
**Dependencies**: TASK-001

**Description**: Implement FNV-1a hash for cycle detection

**Acceptance Criteria**:
- [ ] `hashState()` function implemented
- [ ] FNV-1a algorithm used (fast, good distribution)
- [ ] Hash collision rate acceptable (<0.01% for 10,000 states)
- [ ] Performance: <1ms per hash

**Test Coverage**:
```typescript
// src/mcts/utils/__tests__/stateHash.test.ts
- Same state produces same hash
- Different states produce different hashes
- Hash is consistent across calls
- Performance benchmark (<1ms)
```

---

### TASK-005: Implement Score Normalization Utility
**File**: `src/mcts/utils/normalize.ts`  
**Lines**: ~40  
**Priority**: HIGH  
**Dependencies**: None

**Description**: Normalize raw scores to [0,1] range for UCT formula

**Acceptance Criteria**:
- [ ] `normalizeScore()` function implemented
- [ ] Clamps to [0, 1] range
- [ ] Handles edge cases (negative, over-max)
- [ ] Inline documented with formula

**Test Coverage**:
```typescript
// src/mcts/utils/__tests__/normalize.test.ts
- normalizeScore(0, 548) = 0
- normalizeScore(548, 548) = 1
- normalizeScore(274, 548) = 0.5
- normalizeScore(-10, 548) = 0 (clamp)
- normalizeScore(1000, 548) = 1 (clamp)
```

---

### TASK-006: Create Module Index Files
**Files**: `src/mcts/index.ts`, `src/mcts/types/index.ts`, `src/mcts/utils/index.ts`  
**Lines**: ~30  
**Priority**: MEDIUM  
**Dependencies**: TASK-001 to TASK-005

**Description**: Set up public API exports

**Acceptance Criteria**:
- [ ] All types exported from `src/mcts/types/index.ts`
- [ ] All utils exported from `src/mcts/utils/index.ts`
- [ ] Main module exports from `src/mcts/index.ts`
- [ ] No internal implementation details exposed

**Test Coverage**:
- Manual verification of import paths

---

### TASK-007: Set up MCTS Test Infrastructure
**Files**: `src/mcts/__tests__/setup.ts`, `vitest.config.ts` update  
**Lines**: ~50  
**Priority**: HIGH  
**Dependencies**: None

**Description**: Configure testing environment for MCTS module

**Acceptance Criteria**:
- [ ] Vitest configured to find `src/mcts/__tests__/**/*.test.ts`
- [ ] Test utilities created (mock state generator, etc.)
- [ ] Coverage reporting enabled for mcts/ directory
- [ ] Test scripts work: `npm run test:mcts`

---

## PHASE 2: Core MCTS Algorithm (8 tasks)

**Goal**: Implement generic, domain-agnostic MCTS solver
**Duration**: 1-2 weeks  
**Dependencies**: PHASE 1 complete

### TASK-008: Implement MCTSNode Class
**File**: `src/mcts/core/MCTSNode.ts`  
**Lines**: ~120  
**Priority**: CRITICAL  
**Dependencies**: TASK-001, TASK-002

**Description**: Build the tree node data structure

**Acceptance Criteria**:
- [ ] Generic class `MCTSNode<TState, TMove>`
- [ ] Properties: state, move, parent, children, visits, value
- [ ] Private property: untriedMoves (shuffled)
- [ ] Methods: isFullyExpanded(), isTreeLeaf(), getAverageValue()
- [ ] Fisher-Yates shuffle in constructor
- [ ] Full inline documentation

**Test Coverage**:
```typescript
// src/mcts/core/__tests__/MCTSNode.test.ts
- Node stores state and move correctly
- isFullyExpanded() returns true when untriedMoves is empty
- isTreeLeaf() returns true when children is empty
- getAverageValue() handles zero visits
- Untried moves are shuffled (statistical test)
- popUntriedMove() removes and returns moves
```

---

### TASK-009: Define GamePolicy Interface
**File**: `src/mcts/core/GamePolicy.ts`  
**Lines**: ~50  
**Priority**: CRITICAL  
**Dependencies**: TASK-001, TASK-002

**Description**: Abstract interface for game-specific logic

**Acceptance Criteria**:
- [ ] Generic interface `GamePolicy<TState, TMove>`
- [ ] Method signatures: getLegalMoves, applyMove, isTerminal, getScore, selectSimulationMove
- [ ] Full JSDoc documentation
- [ ] Example usage in comments

**Test Coverage**:
- Interface-only, no tests needed

---

### TASK-010: Implement MCTSSolver - Constructor & Setup
**File**: `src/mcts/core/MCTSSolver.ts` (Part 1)  
**Lines**: ~80  
**Priority**: CRITICAL  
**Dependencies**: TASK-008, TASK-009

**Description**: Solver class initialization and configuration

**Acceptance Criteria**:
- [ ] Generic class `MCTSSolver<TState, TMove>`
- [ ] Constructor accepts initialState, policy, options
- [ ] Private fields initialized correctly
- [ ] Root node created with initial state
- [ ] Options validated (exploration constant > 0, etc.)

**Test Coverage**:
```typescript
// src/mcts/core/__tests__/MCTSSolver.test.ts
- Constructor creates root node
- Options are stored correctly
- Invalid options throw errors
```

---

### TASK-011: Implement MCTSSolver - Selection Phase
**File**: `src/mcts/core/MCTSSolver.ts` (Part 2)  
**Lines**: ~60  
**Priority**: CRITICAL  
**Dependencies**: TASK-010

**Description**: UCB1 selection and tree traversal

**Acceptance Criteria**:
- [ ] `selectNode()` method traverses tree
- [ ] `getUCB1()` calculates UCB1 score correctly
- [ ] First-play urgency implemented (Infinity for unvisited)
- [ ] Stops at unexpanded or terminal nodes
- [ ] Formula matches research: exploitation + C * sqrt(ln(parent)/visits)

**Test Coverage**:
```typescript
- getUCB1() returns Infinity for unvisited nodes
- getUCB1() calculates correct score for visited nodes
- selectNode() traverses to leaf correctly
- selectNode() stops at unexpanded nodes
- selectNode() stops at terminal nodes
```

---

### TASK-012: Implement MCTSSolver - Expansion Phase
**File**: `src/mcts/core/MCTSSolver.ts` (Part 3)  
**Lines**: ~40  
**Priority**: CRITICAL  
**Dependencies**: TASK-011

**Description**: Node expansion logic

**Acceptance Criteria**:
- [ ] `expandNode()` method creates one new child
- [ ] Pops move from parent's untriedMoves
- [ ] Uses policy.applyMove() to get new state
- [ ] Uses policy.getLegalMoves() for child's moves
- [ ] Adds child to parent's children array
- [ ] Returns newly created child

**Test Coverage**:
```typescript
- expandNode() creates exactly one child
- Child has correct state (via applyMove)
- Child's untriedMoves are initialized
- Parent's children array grows by 1
- Handles fully expanded nodes gracefully
```

---

### TASK-013: Implement MCTSSolver - Simulation Phase
**File**: `src/mcts/core/MCTSSolver.ts` (Part 4)  
**Lines**: ~70  
**Priority**: CRITICAL  
**Dependencies**: TASK-012

**Description**: Playout from leaf to terminal state

**Acceptance Criteria**:
- [ ] `simulate()` method plays out game
- [ ] Uses policy.selectSimulationMove() for move selection
- [ ] Respects maxSimulationDepth limit
- [ ] Cycle detection if enabled (uses state hash)
- [ ] Returns raw score from policy.getScore()
- [ ] Handles no-move states gracefully

**Test Coverage**:
```typescript
- simulate() reaches terminal state
- simulate() respects max depth limit
- simulate() detects cycles and breaks
- simulate() returns score from policy
- simulate() uses policy.selectSimulationMove()
```

---

### TASK-014: Implement MCTSSolver - Backpropagation Phase
**File**: `src/mcts/core/MCTSSolver.ts` (Part 5)  
**Lines**: ~30  
**Priority**: CRITICAL  
**Dependencies**: TASK-013

**Description**: Propagate score up the tree (SP-MCTS style)

**Acceptance Criteria**:
- [ ] `backpropagate()` method updates stats
- [ ] Increments visits for all ancestors
- [ ] Adds normalized score to value (NO negation)
- [ ] Traverses from node to root
- [ ] Handles null parent (root) correctly

**Test Coverage**:
```typescript
- backpropagate() updates all ancestor visits
- backpropagate() adds score to all ancestor values
- backpropagate() does NOT negate scores (SP-MCTS)
- backpropagate() stops at root correctly
```

---

### TASK-015: Implement MCTSSolver - Main Loop & Best Move
**File**: `src/mcts/core/MCTSSolver.ts` (Part 6)  
**Lines**: ~80  
**Priority**: CRITICAL  
**Dependencies**: TASK-014

**Description**: Main search loop and result extraction

**Acceptance Criteria**:
- [ ] `runSearch()` method runs N iterations
- [ ] Each iteration: select, expand, simulate, backpropagate
- [ ] `getBestMove()` returns most visited child move
- [ ] `getResult()` returns SolverResult with statistics
- [ ] `countNodes()` helper for tree size
- [ ] `normalizeScore()` helper applied to simulation results

**Test Coverage**:
```typescript
- runSearch() executes correct number of iterations
- runSearch() calls all four phases
- getBestMove('visits') returns most visited child
- getBestMove('value') returns highest value child
- getResult() includes all statistics
- countNodes() correctly counts tree size
```

---

## PHASE 3: Klondike Game Logic (12 tasks)

**Goal**: Implement Klondike-specific game rules
**Duration**: 2-3 weeks  
**Dependencies**: PHASE 2 complete

### TASK-016: Implement State Adapter - UI to MCTS
**File**: `src/mcts/klondike/stateAdapter.ts` (Part 1)  
**Lines**: ~100  
**Priority**: CRITICAL  
**Dependencies**: TASK-001

**Description**: Convert UI GameState to MCTSGameState

**Acceptance Criteria**:
- [ ] `uiStateToMCTS()` function implemented
- [ ] Converts tableau (7 columns)
- [ ] Converts foundations (4 piles, CDHS order)
- [ ] Converts drawPile → stock
- [ ] Converts discardPile → waste
- [ ] Strips UI-only fields (selectedCard, replayMode, etc.)
- [ ] Ensures all readonly properties

**Test Coverage**:
```typescript
// src/mcts/klondike/__tests__/stateAdapter.test.ts
- uiStateToMCTS() preserves card positions
- uiStateToMCTS() converts suits correctly
- uiStateToMCTS() converts ranks correctly
- uiStateToMCTS() strips UI fields
- Round-trip conversion is lossless for game state
```

---

### TASK-017: Implement State Adapter - MCTS to UI
**File**: `src/mcts/klondike/stateAdapter.ts` (Part 2)  
**Lines**: ~100  
**Priority**: HIGH  
**Dependencies**: TASK-016

**Description**: Convert MCTSGameState back to UI format

**Acceptance Criteria**:
- [ ] `mctsStateToUI()` function implemented
- [ ] Converts tableau back to UI format
- [ ] Converts foundations (reorders CDHS → named fields)
- [ ] Converts stock → drawPile
- [ ] Converts waste → discardPile
- [ ] Generates card IDs for UI

**Test Coverage**:
```typescript
- mctsStateToUI() preserves card positions
- mctsStateToUI() generates valid card IDs
- mctsStateToUI() converts suits correctly
- mctsStateToUI() converts ranks correctly
```

---

### TASK-018: Implement Move Generator - Stock/Waste Moves
**File**: `src/mcts/klondike/moveGenerator.ts` (Part 1)  
**Lines**: ~50  
**Priority**: CRITICAL  
**Dependencies**: TASK-001, TASK-002

**Description**: Generate DrawFromStock and RecycleWaste moves

**Acceptance Criteria**:
- [ ] `addStockMoves()` helper function
- [ ] DRAW_FROM_STOCK if stock.length > 0
- [ ] RECYCLE_WASTE if stock.length === 0 && waste.length > 0
- [ ] Follows research Table 1 rules

**Test Coverage**:
```typescript
// src/mcts/klondike/__tests__/moveGenerator.test.ts
- Generates DRAW_FROM_STOCK when stock has cards
- Generates RECYCLE_WASTE when stock empty and waste not empty
- Generates no stock moves when both empty
```

---

### TASK-019: Implement Move Generator - Waste to Foundation
**File**: `src/mcts/klondike/moveGenerator.ts` (Part 2)  
**Lines**: ~40  
**Priority**: CRITICAL  
**Dependencies**: TASK-018

**Description**: Generate Waste→Foundation moves

**Acceptance Criteria**:
- [ ] `addWasteToFoundationMoves()` helper
- [ ] `canMoveToFoundation()` validation helper
- [ ] Ace can go to empty foundation
- [ ] Card can go if suit matches and rank is sequential
- [ ] Follows research Table 1 rules

**Test Coverage**:
```typescript
- Generates move for Ace to empty foundation
- Generates move for sequential rank
- Does not generate move for wrong suit
- Does not generate move for non-sequential rank
```

---

### TASK-020: Implement Move Generator - Waste to Tableau
**File**: `src/mcts/klondike/moveGenerator.ts` (Part 3)  
**Lines**: ~40  
**Priority**: CRITICAL  
**Dependencies**: TASK-019

**Description**: Generate Waste→Tableau moves

**Acceptance Criteria**:
- [ ] `addWasteToTableauMoves()` helper
- [ ] `canMoveToTableau()` validation helper
- [ ] King can go to empty tableau
- [ ] Card can go if opposite color and descending rank
- [ ] Checks all 7 tableau columns

**Test Coverage**:
```typescript
- Generates move for King to empty column
- Generates move for opposite color descending
- Does not generate move for same color
- Does not generate move for ascending rank
```

---

### TASK-021: Implement Move Generator - Tableau to Foundation
**File**: `src/mcts/klondike/moveGenerator.ts` (Part 4)  
**Lines**: ~50  
**Priority**: CRITICAL  
**Dependencies**: TASK-020

**Description**: Generate Tableau→Foundation moves

**Acceptance Criteria**:
- [ ] `addTableauToFoundationMoves()` helper
- [ ] Only top card of each tableau can move
- [ ] Uses same validation as Waste→Foundation
- [ ] Checks all 7 tableau columns

**Test Coverage**:
```typescript
- Generates moves for tableau top cards
- Does not generate moves for middle cards
- Validates suit and rank correctly
```

---

### TASK-022: Implement Move Generator - Tableau to Tableau
**File**: `src/mcts/klondike/moveGenerator.ts` (Part 5)  
**Lines**: ~60  
**Priority**: CRITICAL  
**Dependencies**: TASK-021

**Description**: Generate Tableau→Tableau moves (including stacks)

**Acceptance Criteria**:
- [ ] `addTableauToTableauMoves()` helper
- [ ] Iterates through all face-up cards in pile
- [ ] Can move card sequences (stacks)
- [ ] Validates against all other 6 columns
- [ ] Does not generate self-moves

**Test Coverage**:
```typescript
- Generates moves for single cards
- Generates moves for card stacks
- Does not generate moves for face-down cards
- Does not generate moves to same column
- Validates color and rank correctly
```

---

### TASK-023: Implement Move Generator - Foundation to Tableau
**File**: `src/mcts/klondike/moveGenerator.ts` (Part 6)  
**Lines**: ~50  
**Priority**: MEDIUM  
**Dependencies**: TASK-022

**Description**: Generate Foundation→Tableau moves (strategic regression)

**Acceptance Criteria**:
- [ ] `addFoundationToTableauMoves()` helper
- [ ] Only top card of foundation can move
- [ ] Validates like Waste→Tableau
- [ ] Checks all 4 foundations × 7 tableaus

**Test Coverage**:
```typescript
- Generates moves for foundation tops
- Validates correctly against tableau rules
- Handles empty foundations
```

---

### TASK-024: Implement Move Generator - Main Function
**File**: `src/mcts/klondike/moveGenerator.ts` (Part 7)  
**Lines**: ~50  
**Priority**: CRITICAL  
**Dependencies**: TASK-023

**Description**: Main generateLegalMoves() orchestration

**Acceptance Criteria**:
- [ ] `generateLegalMoves()` main function
- [ ] Calls all helper functions in order
- [ ] Returns complete move list
- [ ] Handles edge cases (empty piles, etc.)
- [ ] Follows research Table 1 completely

**Test Coverage**:
```typescript
- Integration test: initial deal has correct moves
- Integration test: empty board generates stock moves only
- Integration test: won game generates no moves
- Integration test: complex mid-game position
```

---

### TASK-025: Implement State Transition - Draw and Recycle
**File**: `src/mcts/klondike/stateTransition.ts` (Part 1)  
**Lines**: ~80  
**Priority**: CRITICAL  
**Dependencies**: TASK-001, TASK-002

**Description**: Implement immutable state transitions for stock/waste moves

**Acceptance Criteria**:
- [ ] `applyDrawFromStock()` function
- [ ] `applyRecycleWaste()` function
- [ ] Both are pure functions (no mutation)
- [ ] Use spread operators for immutability
- [ ] Increment stockCycleCount on recycle
- [ ] Flip card face-up when drawing

**Test Coverage**:
```typescript
// src/mcts/klondike/__tests__/stateTransition.test.ts
- applyDrawFromStock() moves card correctly
- applyDrawFromStock() flips card face-up
- applyDrawFromStock() does not mutate input
- applyRecycleWaste() reverses waste to stock
- applyRecycleWaste() flips cards face-down
- applyRecycleWaste() increments cycle count
```

---

### TASK-026: Implement State Transition - Move Cards
**File**: `src/mcts/klondike/stateTransition.ts` (Part 2)  
**Lines**: ~150  
**Priority**: CRITICAL  
**Dependencies**: TASK-025

**Description**: Implement immutable state transitions for card moves

**Acceptance Criteria**:
- [ ] `applyMoveCards()` function
- [ ] Handles Waste→Tableau, Waste→Foundation
- [ ] Handles Tableau→Tableau, Tableau→Foundation
- [ ] Handles Foundation→Tableau
- [ ] Flips newly exposed tableau cards
- [ ] Preserves immutability (structural sharing)
- [ ] Uses slice/concat/map, no push/pop on input

**Test Coverage**:
```typescript
- applyMoveCards() handles all move combinations
- applyMoveCards() flips exposed tableau cards
- applyMoveCards() does not mutate input
- applyMoveCards() preserves unaffected piles (same reference)
- applyMoveCards() handles card stacks correctly
```

---

### TASK-027: Implement State Transition - Main Function
**File**: `src/mcts/klondike/stateTransition.ts` (Part 3)  
**Lines**: ~40  
**Priority**: CRITICAL  
**Dependencies**: TASK-026

**Description**: Main applyMoveImmutable() dispatcher

**Acceptance Criteria**:
- [ ] `applyMoveImmutable()` function
- [ ] Dispatches to correct handler based on move.type
- [ ] Type-safe (no `any` casts)
- [ ] Returns new MCTSGameState
- [ ] Handles all GameMove variants

**Test Coverage**:
```typescript
- applyMoveImmutable() dispatches DRAW_FROM_STOCK
- applyMoveImmutable() dispatches RECYCLE_WASTE
- applyMoveImmutable() dispatches MOVE_CARDS
- applyMoveImmutable() preserves type safety
```

---

### TASK-028: Implement KlondikePolicy Class
**File**: `src/mcts/klondike/KlondikePolicy.ts`  
**Lines**: ~80  
**Priority**: CRITICAL  
**Dependencies**: TASK-024, TASK-027

**Description**: Concrete GamePolicy implementation for Klondike

**Acceptance Criteria**:
- [ ] Implements `GamePolicy<MCTSGameState, GameMove>`
- [ ] `getLegalMoves()` delegates to moveGenerator
- [ ] `applyMove()` delegates to stateTransition
- [ ] `isTerminal()` checks win or no moves
- [ ] `getScore()` delegates to heuristics (stub for now)
- [ ] `selectSimulationMove()` delegates to heuristics (stub for now)

**Test Coverage**:
```typescript
// src/mcts/klondike/__tests__/KlondikePolicy.test.ts
- KlondikePolicy integrates all components
- isTerminal() detects win (52 cards in foundations)
- isTerminal() detects loss (no moves)
- All methods work together (integration test)
```

---

## PHASE 4: Heuristics & Optimization (6 tasks)

**Goal**: Implement strong heuristic evaluation and simulation
**Duration**: 1-2 weeks  
**Dependencies**: PHASE 3 complete

### TASK-029: Implement Heuristic Evaluation Function
**File**: `src/mcts/klondike/heuristics/evaluation.ts`  
**Lines**: ~60  
**Priority**: CRITICAL  
**Dependencies**: TASK-001

**Description**: Implement HEF for scoring game states

**Acceptance Criteria**:
- [ ] `evaluateState()` function
- [ ] 10 points per foundation card (max 520)
- [ ] 1 point per face-up tableau card (max 28)
- [ ] Total max score: 548
- [ ] Follows research Section IV.C

**Test Coverage**:
```typescript
// src/mcts/klondike/heuristics/__tests__/evaluation.test.ts
- evaluateState() returns 0 for initial deal
- evaluateState() returns 548 for won game
- evaluateState() scores foundations correctly
- evaluateState() scores face-up tableau cards
- evaluateState() handles mid-game positions
```

---

### TASK-030: Implement Move Priority Classification
**File**: `src/mcts/klondike/heuristics/priorities.ts`  
**Lines**: ~120  
**Priority**: CRITICAL  
**Dependencies**: TASK-002, TASK-028

**Description**: Classify moves into 8 priority buckets (research Table 2)

**Acceptance Criteria**:
- [ ] `classifyMovePriority()` function
- [ ] Returns priority 1-8 for a move
- [ ] Priority 1: Tableau→Foundation (reveals card)
- [ ] Priority 2: Waste→Foundation
- [ ] Priority 3: Tableau→Foundation (no reveal)
- [ ] Priority 4: Tableau→Tableau (reveals card)
- [ ] Priority 5: Waste→Tableau
- [ ] Priority 6: Foundation→Tableau
- [ ] Priority 7: Draw/Recycle
- [ ] Priority 8: Tableau→Tableau (no reveal)
- [ ] Helper: `moveRevealsCard()` function

**Test Coverage**:
```typescript
// src/mcts/klondike/heuristics/__tests__/priorities.test.ts
- classifyMovePriority() assigns correct priorities
- moveRevealsCard() detects card reveals
- All 8 priority levels covered
- Edge cases handled (empty piles, etc.)
```

---

### TASK-031: Implement Greedy Simulation Policy
**File**: `src/mcts/klondike/heuristics/simulation.ts`  
**Lines**: ~100  
**Priority**: CRITICAL  
**Dependencies**: TASK-030

**Description**: Implement heuristic playout move selection

**Acceptance Criteria**:
- [ ] `selectGreedyMove()` function
- [ ] Classifies all legal moves by priority
- [ ] Groups moves into 8 priority buckets
- [ ] Selects random move from highest-priority non-empty bucket
- [ ] Follows research Section IV.B Table 2

**Test Coverage**:
```typescript
// src/mcts/klondike/heuristics/__tests__/simulation.test.ts
- selectGreedyMove() selects from highest priority
- selectGreedyMove() randomizes within priority
- selectGreedyMove() handles empty priorities
- selectGreedyMove() follows priority order
- Benchmark: greedy policy achieves >10% win rate (simulation)
```

---

### TASK-032: Integrate Heuristics into KlondikePolicy
**File**: `src/mcts/klondike/KlondikePolicy.ts` (Update)  
**Lines**: ~20  
**Priority**: HIGH  
**Dependencies**: TASK-029, TASK-031

**Description**: Connect heuristics to policy methods

**Acceptance Criteria**:
- [ ] `getScore()` calls `evaluateState()`
- [ ] `selectSimulationMove()` calls `selectGreedyMove()`
- [ ] Constructor accepts `useHeuristicSimulation` option
- [ ] Fallback to random if heuristic disabled

**Test Coverage**:
```typescript
- KlondikePolicy uses heuristics when enabled
- KlondikePolicy uses random when disabled
```

---

### TASK-033: Optimize State Hashing (FNV-1a)
**File**: `src/mcts/utils/stateHash.ts` (Update)  
**Lines**: ~80  
**Priority**: MEDIUM  
**Dependencies**: TASK-004

**Description**: Replace JSON.stringify with fast FNV-1a hash

**Acceptance Criteria**:
- [ ] Implement FNV-1a algorithm
- [ ] Hash only game-relevant state (not UI fields)
- [ ] Performance: <0.5ms per hash
- [ ] Low collision rate on 10,000 states

**Test Coverage**:
```typescript
- FNV-1a produces consistent hashes
- FNV-1a is faster than JSON.stringify (benchmark)
- FNV-1a has acceptable collision rate
```

---

### TASK-034: Add Performance Profiling Utilities
**File**: `src/mcts/utils/performance.ts`  
**Lines**: ~80  
**Priority**: LOW  
**Dependencies**: None

**Description**: Helper functions for profiling MCTS performance

**Acceptance Criteria**:
- [ ] `ProfileTimer` class for timing sections
- [ ] `MemoryMonitor` class for memory usage
- [ ] `PerformanceReport` type for reporting
- [ ] `formatStats()` helper for pretty-printing

**Test Coverage**:
```typescript
- ProfileTimer measures time accurately
- MemoryMonitor detects memory usage
```

---

## PHASE 5: UI Integration (7 tasks)

**Goal**: Connect MCTS to React UI
**Duration**: 1 week  
**Dependencies**: PHASE 4 complete

### TASK-035: Add MCTS Actions to Zustand Store
**File**: `src/store/gameStore.ts` (Update)  
**Lines**: ~150  
**Priority**: CRITICAL  
**Dependencies**: TASK-028, TASK-016

**Description**: Integrate MCTS solver into game store

**Acceptance Criteria**:
- [ ] `requestMCTSHint()` async action
- [ ] `applyMCTSMove()` action
- [ ] `updateMCTSSettings()` action
- [ ] `mctsSettings` state field
- [ ] Uses stateAdapter to convert states
- [ ] Runs solver in time budget
- [ ] Stores SolverResult for display

**Test Coverage**:
```typescript
// src/store/__tests__/gameStore.mcts.test.ts
- requestMCTSHint() returns valid move
- requestMCTSHint() respects time budget
- applyMCTSMove() updates game state
- Settings are persisted
```

---

### TASK-036: Create MCTSPanel Component (UI Shell)
**File**: `src/components/MCTSPanel.tsx`  
**Lines**: ~120  
**Priority**: HIGH  
**Dependencies**: TASK-035

**Description**: Build UI component for MCTS controls

**Acceptance Criteria**:
- [ ] Toggle MCTS on/off
- [ ] Search time slider (1s, 2s, 5s, 10s)
- [ ] "Get Hint" button
- [ ] Statistics display area (placeholder)
- [ ] Tailwind styling consistent with app
- [ ] Responsive layout

**Test Coverage**:
```typescript
// src/components/__tests__/MCTSPanel.test.tsx
- MCTSPanel renders without crashing
- Get Hint button calls store action
- Settings update on change
```

---

### TASK-037: Add Statistics Display to MCTSPanel
**File**: `src/components/MCTSPanel.tsx` (Update)  
**Lines**: ~80  
**Priority**: MEDIUM  
**Dependencies**: TASK-036

**Description**: Display solver statistics in UI

**Acceptance Criteria**:
- [ ] Show iterations count
- [ ] Show search time
- [ ] Show iterations/second
- [ ] Show confidence score (0-100%)
- [ ] Show tree size
- [ ] Animated number counters
- [ ] Clear button to reset stats

**Test Coverage**:
```typescript
- Statistics display correct values
- Confidence score formatted as percentage
```

---

### TASK-038: Highlight Suggested Move on Board
**File**: `src/components/GameBoard.tsx` (Update)  
**Lines**: ~60  
**Priority**: HIGH  
**Dependencies**: TASK-037

**Description**: Visually indicate MCTS suggested move

**Acceptance Criteria**:
- [ ] Read suggested move from store
- [ ] Highlight source card (glowing border)
- [ ] Highlight destination pile (dashed outline)
- [ ] Animation: pulse effect
- [ ] Clear highlight after move applied
- [ ] Works for all move types

**Test Coverage**:
```typescript
- Highlight appears when move suggested
- Highlight clears after move applied
- All move types highlighted correctly
```

---

### TASK-039: Add Auto-Apply Option for MCTS Moves
**File**: `src/components/MCTSPanel.tsx` (Update)  
**Lines**: ~40  
**Priority**: LOW  
**Dependencies**: TASK-038

**Description**: Option to automatically apply MCTS suggestions

**Acceptance Criteria**:
- [ ] Checkbox: "Auto-apply suggested moves"
- [ ] When enabled, apply move immediately after hint
- [ ] Delay: 500ms (so user can see suggestion)
- [ ] Disable during autoplay
- [ ] Add to settings persistence

**Test Coverage**:
```typescript
- Auto-apply executes move after delay
- Auto-apply can be toggled
- Auto-apply disabled during autoplay
```

---

### TASK-040: Add MCTS Documentation (User Guide)
**File**: `docs/user-guide/mcts-feature.md`  
**Lines**: ~200  
**Priority**: LOW  
**Dependencies**: TASK-039

**Description**: User-facing documentation for MCTS feature

**Acceptance Criteria**:
- [ ] What is MCTS (simple explanation)
- [ ] How to use MCTS hints
- [ ] What do the statistics mean
- [ ] Performance tips
- [ ] FAQ section
- [ ] Screenshots of UI

**Test Coverage**:
- Manual review

---

### TASK-041: Update Main README with MCTS Feature
**File**: `README.md` (Update)  
**Lines**: ~30  
**Priority**: LOW  
**Dependencies**: TASK-040

**Description**: Add MCTS to main README

**Acceptance Criteria**:
- [ ] Add "AI Hints (MCTS)" to features list
- [ ] Brief description
- [ ] Link to user guide
- [ ] Add to table of contents

---

## PHASE 6: Testing & Documentation (7 tasks)

**Goal**: Comprehensive testing and technical documentation
**Duration**: 1 week  
**Dependencies**: PHASE 5 complete

### TASK-042: Write MCTS Core Integration Tests
**File**: `src/mcts/__tests__/integration/coreIntegration.test.ts`  
**Lines**: ~150  
**Priority**: HIGH  
**Dependencies**: TASK-015

**Description**: End-to-end tests for core MCTS algorithm

**Acceptance Criteria**:
- [ ] Test with toy game (Tic-Tac-Toe or 1D Nim)
- [ ] Verify MCTS finds optimal move
- [ ] Verify search improves with iterations
- [ ] Verify statistics are accurate
- [ ] Performance benchmarks

**Test Coverage**:
```typescript
- MCTS solves trivial game in <100 iterations
- More iterations = better move quality
- All four phases execute correctly
- Tree grows as expected
```

---

### TASK-043: Write Klondike Policy Integration Tests
**File**: `src/mcts/__tests__/integration/klondikeIntegration.test.ts`  
**Lines**: ~200  
**Priority**: HIGH  
**Dependencies**: TASK-028

**Description**: End-to-end tests for Klondike game logic

**Acceptance Criteria**:
- [ ] Test move generation on complex boards
- [ ] Test state transitions preserve validity
- [ ] Test terminal detection (win/loss)
- [ ] Test heuristic scoring correctness
- [ ] Test greedy simulation policy

**Test Coverage**:
```typescript
- Generates all legal moves from known positions
- State transitions are reversible (for testing)
- Terminal detection is correct
- Heuristic scores correlate with winning
```

---

### TASK-044: Write MCTS + UI Integration Tests
**File**: `src/components/__tests__/integration/mctsUI.test.tsx`  
**Lines**: ~120  
**Priority**: MEDIUM  
**Dependencies**: TASK-039

**Description**: Test MCTS feature in UI context

**Acceptance Criteria**:
- [ ] Test hint request flow
- [ ] Test move application flow
- [ ] Test statistics display
- [ ] Test highlight rendering
- [ ] Test settings persistence

**Test Coverage**:
```typescript
- User clicks "Get Hint" → move is displayed
- User applies move → state updates
- Statistics update correctly
- Highlights clear after move
```

---

### TASK-045: Write Performance Benchmark Suite
**File**: `src/mcts/__tests__/performance/benchmarks.test.ts`  
**Lines**: ~150  
**Priority**: MEDIUM  
**Dependencies**: TASK-034

**Description**: Benchmark MCTS performance

**Acceptance Criteria**:
- [ ] Measure iterations/second (target: >10,000)
- [ ] Measure memory usage per node (target: <1KB)
- [ ] Measure time to first hint (target: <2s)
- [ ] Measure state hash performance (target: <0.5ms)
- [ ] Compare heuristic vs random playout (should be 2x win rate)

**Test Coverage**:
```typescript
- All benchmarks pass target thresholds
- Performance regression detector
```

---

### TASK-046: Write MCTS Technical Documentation
**File**: `docs/technical/mcts-implementation.md`  
**Lines**: ~500  
**Priority**: HIGH  
**Dependencies**: All implementation tasks

**Description**: Comprehensive technical documentation

**Acceptance Criteria**:
- [ ] Architecture overview
- [ ] Algorithm explanation
- [ ] API reference for all public functions
- [ ] Heuristic design rationale
- [ ] Performance tuning guide
- [ ] Extension points (how to modify)
- [ ] Troubleshooting guide

**Test Coverage**:
- Manual review, code examples verified

---

### TASK-047: Create MCTS Demo Video / GIF
**File**: `docs/demos/mcts-demo.gif`  
**Priority**: LOW  
**Dependencies**: TASK-039

**Description**: Create visual demo of MCTS feature

**Acceptance Criteria**:
- [ ] Screen recording of MCTS in action
- [ ] Shows hint request
- [ ] Shows statistics
- [ ] Shows move application
- [ ] 30-60 seconds, optimized GIF
- [ ] Embedded in README

**Test Coverage**:
- Manual verification

---

## Summary Statistics

### Tasks by Phase
- **Phase 1 (Foundation)**: 7 tasks, 3-5 days
- **Phase 2 (Core MCTS)**: 8 tasks, 1-2 weeks
- **Phase 3 (Klondike)**: 12 tasks, 2-3 weeks
- **Phase 4 (Heuristics)**: 6 tasks, 1-2 weeks
- **Phase 5 (Integration)**: 7 tasks, 1 week
- **Phase 6 (Testing)**: 7 tasks, 1 week

**Total**: 47 tasks, 6-9 weeks

### Tasks by Priority
- **CRITICAL**: 25 tasks (must complete)
- **HIGH**: 14 tasks (should complete)
- **MEDIUM**: 6 tasks (nice to have)
- **LOW**: 2 tasks (optional)

### Estimated Lines of Code
- **Types**: ~300 lines
- **Core MCTS**: ~600 lines
- **Klondike Logic**: ~800 lines
- **Heuristics**: ~400 lines
- **Integration**: ~300 lines
- **Utils**: ~200 lines
- **Tests**: ~1,000 lines
- **Total**: ~3,600 lines

---

## Task Execution Guidelines

### For Coding Agents:

1. **Work sequentially within phases** - Don't skip ahead
2. **Complete all acceptance criteria** - Checklist must be 100%
3. **Write tests first or alongside** - TDD approach recommended
4. **Run lint/build/test after each task** - Catch issues early
5. **Commit after each task** - Small, atomic commits
6. **Update this document** - Mark tasks as complete
7. **Reference research document** - When implementing algorithm details
8. **Ask for clarification** - If acceptance criteria unclear

### Validation:
Each task is complete when:
- ✅ All acceptance criteria met
- ✅ All tests passing
- ✅ Lint checks pass
- ✅ Build succeeds
- ✅ Code reviewed (if applicable)
- ✅ Marked as complete in this document

---

## Related Documents

- **[20251115_mcts_v0_analysis_overview.md](./20251115_mcts_v0_analysis_overview.md)**: Strategic analysis
- **[20251115_mcts_v0_architecture_design.md](./20251115_mcts_v0_architecture_design.md)**: Detailed architecture
- **[20251115_mcts_v0_technical_specifications.md](./20251115_mcts_v0_technical_specifications.md)**: API contracts
- **[20251115_mcts_v0_testing_strategy.md](./20251115_mcts_v0_testing_strategy.md)**: Test plan
- **[20251115_mcts_v0_implementation_roadmap.md](./20251115_mcts_v0_implementation_roadmap.md)**: Phase timeline

---

**Document Status:** DRAFT v0.1  
**Last Updated:** 2025-11-15  
**Next Review:** After stakeholder approval

**Progress Tracking**: 0/47 tasks complete (0%)
