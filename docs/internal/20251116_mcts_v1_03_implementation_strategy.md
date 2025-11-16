# MCTS v1 - Implementation Strategy & Phased Roadmap

**Date:** 2025-11-16  
**Version:** v1.0  
**Purpose:** Phase-by-phase implementation approach with dependencies, risks, and validation checkpoints  
**Author:** GitHub Copilot Agent

---

## Overview

This document outlines the **5-phase implementation strategy** for integrating MCTS into the Klondike Solitaire project. Each phase is designed to be:

- **Self-contained**: Delivers working functionality
- **Testable**: Has clear validation criteria
- **Incremental**: Builds on previous phases
- **Risk-mitigated**: Addresses potential issues early

**Total Duration**: 6-8 weeks (single full-time developer)  
**Total Tasks**: 63 atomic tasks  
**Estimated LOC**: ~4,200 lines (including tests)

---

## Phase Summary

| Phase | Duration | Tasks | Goal | Key Deliverable |
|-------|----------|-------|------|----------------|
| **1** | 1-2 weeks | 12 | Core MCTS algorithm | MCTSSolver + MCTSNode classes |
| **2** | 1 week | 8 | Game policy | KlondikePolicy wrapping Core |
| **3** | 1-2 weeks | 10 | Heuristics | Evaluation + simulation policies |
| **4** | 1-2 weeks | 15 | Integration & UI | Hint button, move visualization |
| **5** | 1 week | 18 | Testing & polish | >80% coverage, optimization |

---

## Phase 1: Core MCTS Algorithm (Weeks 1-2)

### 1.1 Goal

Build domain-agnostic MCTS engine that works with any game satisfying the `GamePolicy` interface.

### 1.2 Deliverables

- [x] MCTSNode class (tree node data structure)
- [x] MCTSSolver class (four-phase MCTS loop)
- [x] GamePolicy interface (abstract game logic)
- [x] Core utilities (score normalization, UCB1 calculation)
- [x] Unit tests for all classes

### 1.3 Tasks (12 total)

#### TASK-1-001: Create MCTSNode class
**File**: `packages/mcts/src/core/MCTSNode.ts`  
**LOC**: ~120  
**Description**: Tree node with state, move, parent, children, visits, value  
**Acceptance**:
- [ ] Generic over TState, TMove
- [ ] Readonly state property
- [ ] Shuffled untried moves
- [ ] isFullyExpanded(), isTreeLeaf(), getAverageValue() methods

#### TASK-1-002: Create GamePolicy interface
**File**: `packages/mcts/src/core/GamePolicy.ts`  
**LOC**: ~60  
**Description**: Abstract interface for game-specific logic  
**Acceptance**:
- [ ] getLegalMoves(), applyMove(), isTerminal(), getScore(), selectSimulationMove()
- [ ] Full JSDoc documentation
- [ ] Type-safe with generics

#### TASK-1-003: Implement UCB1 calculation
**File**: `packages/mcts/src/core/MCTSSolver.ts` (private method)  
**LOC**: ~40  
**Description**: Upper Confidence Bound formula  
**Acceptance**:
- [ ] Returns Infinity for unvisited nodes (FPU)
- [ ] Exploitation + exploration terms
- [ ] Uses normalized scores [0,1]
- [ ] Configurable exploration constant C

#### TASK-1-004: Implement selection phase
**File**: `packages/mcts/src/core/MCTSSolver.ts` (private method)  
**LOC**: ~30  
**Description**: Traverse tree using UCB1  
**Acceptance**:
- [ ] Selects child with highest UCB1
- [ ] Stops at non-terminal, non-fully-expanded node
- [ ] Handles edge cases (no children, terminal state)

#### TASK-1-005: Implement expansion phase
**File**: `packages/mcts/src/core/MCTSSolver.ts` (private method)  
**LOC**: ~30  
**Description**: Add one new child node  
**Acceptance**:
- [ ] Pops one untried move
- [ ] Creates new MCTSNode with policy.applyMove()
- [ ] Adds to parent's children array
- [ ] Returns new child

#### TASK-1-006: Implement simulation phase
**File**: `packages/mcts/src/core/MCTSSolver.ts` (private method)  
**LOC**: ~50  
**Description**: Playout from node to terminal  
**Acceptance**:
- [ ] Uses policy.selectSimulationMove()
- [ ] Respects max depth limit (100)
- [ ] Optional cycle detection via state hashing
- [ ] Returns raw score from policy.getScore()

#### TASK-1-007: Implement backpropagation phase
**File**: `packages/mcts/src/core/MCTSSolver.ts` (private method)  
**LOC**: ~20  
**Description**: Update statistics from leaf to root  
**Acceptance**:
- [ ] Increments visits
- [ ] Adds normalized score to value
- [ ] No negation (SP-MCTS, not minimax)
- [ ] Traverses parent chain to root

#### TASK-1-008: Implement runSearch method
**File**: `packages/mcts/src/core/MCTSSolver.ts`  
**LOC**: ~30  
**Description**: Main search loop  
**Acceptance**:
- [ ] Runs N iterations
- [ ] Calls four phases in order
- [ ] Normalizes scores before backprop
- [ ] No mutations of root state

#### TASK-1-009: Implement getBestMove method
**File**: `packages/mcts/src/core/MCTSSolver.ts`  
**LOC**: ~25  
**Description**: Extract best move after search  
**Acceptance**:
- [ ] Criteria: 'visits' (robust) or 'value' (greedy)
- [ ] Returns child move with max visits/value
- [ ] Returns null if no children

#### TASK-1-010: Implement getResult method
**File**: `packages/mcts/src/core/MCTSSolver.ts`  
**LOC**: ~40  
**Description**: Comprehensive search result  
**Acceptance**:
- [ ] Returns SolverResult with statistics
- [ ] Calculates confidence (bestMoveVisits / rootVisits)
- [ ] Optional moveAnalysis for all children
- [ ] Includes iterations/sec, tree size

#### TASK-1-011: Create score normalization utility
**File**: `packages/mcts/src/utils/normalize.ts`  
**LOC**: ~20  
**Description**: Normalize raw score to [0,1]  
**Acceptance**:
- [ ] Clamps to [0, 1] range
- [ ] Handles negative and over-max scores
- [ ] Fast (inline calculation)

#### TASK-1-012: Write unit tests for core classes
**Files**: `packages/mcts/tests/core/*.test.ts`  
**LOC**: ~500  
**Description**: Comprehensive test coverage  
**Acceptance**:
- [ ] MCTSNode tests (construction, expansion, statistics)
- [ ] MCTSSolver tests (with toy game, e.g., Tic-Tac-Toe)
- [ ] UCB1 tests (FPU, balance exploration/exploitation)
- [ ] All four phases tested independently
- [ ] >80% coverage for core module

### 1.4 Validation Checkpoint

**Test with Toy Game** (e.g., Tic-Tac-Toe):
```typescript
// Simple TicTacToe policy for validation
class TicTacToePolicy implements GamePolicy<Board, Move> { ... }

// Should converge to optimal move
const solver = new MCTSSolver(initialBoard, policy, options);
solver.runSearch(10000);
const bestMove = solver.getBestMove();
// Verify: bestMove blocks opponent's win or creates own win
```

**Success Criteria**:
- [ ] Solver finds known-optimal moves in simple positions
- [ ] Tree structure is valid (no circular references)
- [ ] Statistics are consistent (child visits ≤ parent visits)
- [ ] Performance: >10k iterations/second

---

## Phase 2: Game Policy Implementation (Week 3)

### 2.1 Goal

Implement `KlondikePolicy` that wraps `@chayuto/solitaire-core` library.

### 2.2 Deliverables

- [x] KlondikePolicy class
- [x] Adapter for UI ↔ Core state conversion
- [x] Integration tests with real Klondike states
- [x] Benchmark MCTS search speed

### 2.3 Tasks (8 total)

#### TASK-2-001: Create KlondikePolicy class
**File**: `packages/mcts/src/policies/KlondikePolicy.ts`  
**LOC**: ~100  
**Description**: Implements GamePolicy for Klondike  
**Acceptance**:
- [ ] Wraps Core GameEngine
- [ ] getLegalMoves() delegates to engine
- [ ] applyMove() delegates to engine
- [ ] isTerminal() checks gameWon || no moves
- [ ] getScore() delegates to heuristics (placeholder for now)
- [ ] selectSimulationMove() uses random (to be replaced in Phase 3)

#### TASK-2-002: Create state adapter
**File**: `packages/mcts/src/adapters/gameStateAdapter.ts`  
**LOC**: ~80  
**Description**: Convert UI ↔ Core state  
**Acceptance**:
- [ ] uiToCore() strips UI fields
- [ ] coreToUI() restores UI fields
- [ ] Type-safe conversions
- [ ] Preserves immutability

#### TASK-2-003: Write KlondikePolicy tests
**File**: `packages/mcts/tests/policies/KlondikePolicy.test.ts`  
**LOC**: ~200  
**Description**: Test policy correctness  
**Acceptance**:
- [ ] getLegalMoves() returns valid moves
- [ ] applyMove() preserves immutability
- [ ] isTerminal() detects wins and losses
- [ ] All moves from policy.getLegalMoves() are executable

#### TASK-2-004: Integration test with MCTS
**File**: `packages/mcts/tests/integration/klondikeMCTS.test.ts`  
**LOC**: ~150  
**Description**: End-to-end MCTS + Klondike  
**Acceptance**:
- [ ] Solver runs without errors on real Klondike states
- [ ] Returns legal moves
- [ ] Tree structure is valid
- [ ] No memory leaks after 100k iterations

#### TASK-2-005: Benchmark search speed
**File**: `packages/mcts/tests/integration/performance.test.ts`  
**LOC**: ~100  
**Description**: Measure iterations/second  
**Acceptance**:
- [ ] Achieves >5k iterations/sec (minimum acceptable)
- [ ] Target: >10k iterations/sec
- [ ] Profiling data collected
- [ ] Identifies hot paths for optimization

#### TASK-2-006-008: Documentation and exports
**Files**: Various  
**LOC**: ~100  
**Description**: Public API, README, examples  
**Acceptance**:
- [ ] Public exports from `packages/mcts/src/index.ts`
- [ ] README with usage examples
- [ ] API documentation (JSDoc)

### 2.4 Validation Checkpoint

**Integration Test**:
```typescript
const coreState = uiToCore(gameStore.getState());
const policy = new KlondikePolicy();
const solver = new MCTSSolver(coreState, policy, options);

solver.runSearch(10000);
const result = solver.getResult();

expect(result.bestMove).toBeDefined();
expect(result.statistics.iterationsPerSecond).toBeGreaterThan(5000);
```

**Success Criteria**:
- [ ] MCTS returns legal moves for Klondike
- [ ] Search completes without errors
- [ ] Performance: >5k iterations/sec (minimum)

---

## Phase 3: Heuristics & Optimization (Weeks 4-5)

### 3.1 Goal

Implement high-quality heuristic evaluation and simulation policies. Optimize performance to >10k iterations/sec.

### 3.2 Deliverables

- [x] Heuristic Evaluation Function (HEF)
- [x] 8-priority greedy simulation policy
- [x] Performance optimizations (hot path tuning)
- [x] Benchmarks confirming win rate improvement

### 3.3 Tasks (10 total)

#### TASK-3-001: Implement HEF
**File**: `packages/mcts/src/heuristics/evaluation.ts`  
**LOC**: ~60  
**Description**: Evaluate Klondike state  
**Acceptance**:
- [ ] 10 points per foundation card (max 520)
- [ ] 1 point per face-up tableau card (max 28)
- [ ] Total range: [0, 548]
- [ ] Fast: <0.01ms per evaluation

#### TASK-3-002: Implement move priorities
**File**: `packages/mcts/src/heuristics/priorities.ts`  
**LOC**: ~100  
**Description**: Classify moves by priority (8 levels)  
**Acceptance**:
- [ ] Priority 1: Tableau→Foundation (reveals card)
- [ ] Priority 2: Waste→Foundation
- [ ] Priority 3: Tableau→Foundation (no reveal)
- [ ] ... (full 8 levels from research Table 2)

#### TASK-3-003: Implement greedy simulation
**File**: `packages/mcts/src/heuristics/simulation.ts`  
**LOC**: ~80  
**Description**: Select best move during playout  
**Acceptance**:
- [ ] Buckets moves by priority
- [ ] Selects from highest non-empty bucket
- [ ] Random tie-breaking within bucket
- [ ] Falls back gracefully if no moves

#### TASK-3-004: Integrate heuristics into KlondikePolicy
**File**: `packages/mcts/src/policies/KlondikePolicy.ts` (modify)  
**LOC**: ~20  
**Description**: Use heuristics in policy  
**Acceptance**:
- [ ] getScore() calls evaluateState()
- [ ] selectSimulationMove() calls selectGreedyMove()
- [ ] Configurable (can still use random for testing)

#### TASK-3-005: Optimize UCB1 calculation
**File**: `packages/mcts/src/core/MCTSSolver.ts` (modify)  
**LOC**: ~30  
**Description**: Cache expensive calculations  
**Acceptance**:
- [ ] Cache Math.log(parent.visits)
- [ ] Inline normalization
- [ ] Benchmark: 20% faster than naive

#### TASK-3-006: Benchmark win rate with heuristics
**File**: `packages/mcts/tests/integration/winRate.test.ts`  
**LOC**: ~150  
**Description**: Measure AI quality  
**Acceptance**:
- [ ] Random simulation: ~7% win rate (baseline)
- [ ] Greedy simulation: ~13% win rate
- [ ] MCTS+greedy: >20% win rate (target)
- [ ] Run 100+ games for statistical significance

#### TASK-3-007-010: Additional optimizations and tests
**Files**: Various  
**LOC**: ~300  
**Description**: Fine-tuning and validation  
**Acceptance**:
- [ ] Tune exploration constant C
- [ ] Profile and optimize hot paths
- [ ] Add performance regression tests
- [ ] Document optimization techniques

### 3.4 Validation Checkpoint

**Performance Benchmark**:
```typescript
// Target: >10k iterations/second
const startTime = Date.now();
solver.runSearch(100000);
const elapsedMs = Date.now() - startTime;
const iterationsPerSec = 100000 / (elapsedMs / 1000);
expect(iterationsPerSec).toBeGreaterThan(10000);
```

**Win Rate Benchmark** (100 games):
```typescript
const wins = simulateGames(100, { useMCTS: true, iterations: 10000 });
const winRate = wins / 100;
expect(winRate).toBeGreaterThan(0.20); // >20% win rate
```

**Success Criteria**:
- [ ] Performance: >10k iterations/sec
- [ ] Win rate: >20% (10% improvement over greedy alone)
- [ ] All tests pass
- [ ] No regressions in existing functionality

---

## Phase 4: UI Integration (Weeks 6-7)

### 4.1 Goal

Integrate MCTS into the app UI. Add hint button, move visualization, and statistics display.

### 4.2 Deliverables

- [x] MCTS hint button in control panel
- [x] Move highlighting on board
- [x] Confidence and statistics display
- [x] Web Workers for background search (optional)
- [x] Feature flags for gradual rollout

### 4.3 Tasks (15 total)

#### TASK-4-001: Add MCTS to Zustand store
**File**: `packages/app/src/store/gameStore.ts` (modify)  
**LOC**: ~100  
**Description**: Integrate MCTS API  
**Acceptance**:
- [ ] requestMCTSHint(searchTimeMs) action
- [ ] applyMCTSMove(move) action
- [ ] mctsSettings state (enabled, searchTime, C)
- [ ] updateMCTSSettings() action

#### TASK-4-002: Create MCTSPanel component
**File**: `packages/app/src/components/MCTSPanel.tsx`  
**LOC**: ~150  
**Description**: UI for MCTS features  
**Acceptance**:
- [ ] "Get Hint" button
- [ ] Loading spinner during search
- [ ] Confidence display (0-100%)
- [ ] Statistics: iterations, time, tree size
- [ ] "Apply Hint" button

#### TASK-4-003: Implement move highlighting
**File**: `packages/app/src/components/GameBoard.tsx` (modify)  
**LOC**: ~80  
**Description**: Visual feedback for MCTS hint  
**Acceptance**:
- [ ] Highlight source card(s)
- [ ] Highlight destination pile
- [ ] Animation or glow effect
- [ ] Clear on next move

#### TASK-4-004: Add Web Worker for background search
**File**: `packages/app/src/workers/mctsWorker.ts`  
**LOC**: ~120  
**Description**: Run MCTS in worker thread  
**Acceptance**:
- [ ] Worker posts progress updates
- [ ] Can be cancelled mid-search
- [ ] Returns SolverResult
- [ ] UI remains responsive

#### TASK-4-005-015: Additional UI features and tests
**Files**: Various  
**LOC**: ~800  
**Description**: Polish and testing  
**Acceptance**:
- [ ] Settings modal for MCTS configuration
- [ ] Keyboard shortcuts (H for hint)
- [ ] Mobile-friendly layout
- [ ] Accessibility (ARIA labels)
- [ ] E2E tests for hint flow
- [ ] Feature flag integration
- [ ] Analytics tracking

### 4.4 Validation Checkpoint

**User Acceptance Test**:
1. User clicks "Get Hint" button
2. Loading spinner appears
3. Within 2 seconds, hint is displayed
4. Move is highlighted on board
5. User clicks "Apply Hint"
6. Move is executed correctly
7. Game continues normally

**Success Criteria**:
- [ ] Hint generation <2 seconds
- [ ] UI never freezes
- [ ] Hints are always legal moves
- [ ] Visual feedback is clear
- [ ] All existing features still work

---

## Phase 5: Testing & Polish (Week 8)

### 5.1 Goal

Achieve >80% test coverage, optimize performance, write documentation, and prepare for production release.

### 5.2 Deliverables

- [x] >80% test coverage for MCTS module
- [x] Performance optimizations
- [x] Comprehensive documentation
- [x] Feature flags and monitoring
- [x] Release checklist

### 5.3 Tasks (18 total)

#### TASK-5-001: Achieve 80% coverage
**Files**: Various test files  
**LOC**: ~1000  
**Description**: Fill coverage gaps  
**Acceptance**:
- [ ] Core module: >85% coverage
- [ ] Policies module: >80% coverage
- [ ] Heuristics module: >75% coverage
- [ ] Overall MCTS: >80% coverage

#### TASK-5-002: Property-based tests
**File**: `packages/mcts/tests/properties/mcts.test.ts`  
**LOC**: ~200  
**Description**: Generative testing  
**Acceptance**:
- [ ] Tree invariants (child visits ≤ parent visits)
- [ ] Value bounds (normalized [0,1])
- [ ] Immutability (state never mutated)
- [ ] Convergence (more iterations → better moves)

#### TASK-5-003: Performance regression tests
**File**: `packages/mcts/tests/performance/regression.test.ts`  
**LOC**: ~100  
**Description**: Prevent performance degradation  
**Acceptance**:
- [ ] Baseline: 10k iterations/sec
- [ ] Alert if drops below 8k
- [ ] Track over time in CI

#### TASK-5-004-018: Documentation, monitoring, and release
**Files**: Various  
**LOC**: ~500  
**Description**: Production readiness  
**Acceptance**:
- [ ] API documentation (TypeDoc)
- [ ] User guide (how to use hints)
- [ ] Developer guide (architecture overview)
- [ ] Performance tuning guide
- [ ] Monitoring dashboard (iterations/sec, win rate)
- [ ] Feature flag configuration
- [ ] Rollout plan (5% → 25% → 100%)
- [ ] Rollback procedures
- [ ] Release checklist

### 5.4 Final Validation

**Smoke Tests** (on staging):
- [ ] Play 10 games with MCTS hints
- [ ] All hints are legal and sensible
- [ ] No UI freezes or errors
- [ ] Performance metrics within targets
- [ ] Analytics events firing correctly

**Production Readiness**:
- [ ] All 63 tasks complete
- [ ] All tests passing (90 existing + new MCTS tests)
- [ ] Coverage >80%
- [ ] Performance >10k iter/sec
- [ ] Documentation complete
- [ ] Feature flags configured
- [ ] Monitoring enabled

---

## Risk Mitigation

| Risk | Phase | Mitigation |
|------|-------|-----------|
| MCTS too slow | 2-3 | Profile early, optimize hot paths, benchmark continuously |
| Heuristic weak | 3 | Follow research priorities exactly, validate win rate |
| UI freezes | 4 | Web Workers, progress callbacks, time limits |
| Memory leaks | 3-4 | Limit tree size, profile memory, stress tests |
| Integration breaks existing features | 4-5 | Feature flags, regression tests, gradual rollout |
| Can't hit 10k iter/sec | 3 | Fallback: reduce search depth, use simpler heuristic |

---

## Success Metrics

**Phase 1**:
- [ ] Core MCTS works with toy game
- [ ] >10k iterations/sec on simple game

**Phase 2**:
- [ ] MCTS returns legal Klondike moves
- [ ] >5k iterations/sec on real game

**Phase 3**:
- [ ] >10k iterations/sec on Klondike
- [ ] >20% win rate with hints

**Phase 4**:
- [ ] Hint feature works in UI
- [ ] <2 second response time
- [ ] No UI freezes

**Phase 5**:
- [ ] >80% test coverage
- [ ] All quality gates passed
- [ ] Ready for production

---

**Document Status**: COMPLETE  
**Version**: v1.0  
**Last Updated**: 2025-11-16
