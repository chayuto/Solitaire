# MCTS v1 - Consolidated Task Breakdown

**Date:** 2025-11-16  
**Version:** v1.0  
**Purpose:** Complete list of all 63 atomic tasks organized by phase and category  
**Author:** GitHub Copilot Agent

---

## Overview

This document provides the **complete task breakdown** for MCTS v1 implementation. Each task is designed to be:

- **Atomic**: Single responsibility, 50-200 LOC
- **Self-contained**: Can be worked on independently (where possible)
- **Testable**: Clear acceptance criteria
- **Documented**: Full specification included

**Total Tasks**: 63  
**Total Estimated LOC**: ~4,200 (source) + ~2,500 (tests)  
**Duration**: 6-8 weeks (single developer)

---

## Task Index by Phase

| Phase | Category | Tasks | LOC | Duration |
|-------|----------|-------|-----|----------|
| **Phase 1** | Core MCTS | 12 | 600 + 500 tests | 1-2 weeks |
| **Phase 2** | Game Policy | 8 | 550 + 450 tests | 1 week |
| **Phase 3** | Heuristics | 10 | 600 + 400 tests | 1-2 weeks |
| **Phase 4** | Integration | 15 | 1200 + 600 tests | 1-2 weeks |
| **Phase 5** | Testing | 18 | 1250 + 550 tests | 1 week |
| **TOTAL** | - | **63** | **4200 + 2500** | **6-8 weeks** |

---

## PHASE 1: Core MCTS Algorithm (12 tasks)

### Core Algorithm (Tasks 001-010)

**TASK-1-001: MCTSNode Class**
- **File**: `packages/mcts/src/core/MCTSNode.ts`
- **LOC**: 120
- **Dependencies**: None
- **Description**: Tree node with state, children, statistics
- **Acceptance**:
  - Generic over TState, TMove
  - Readonly state property
  - Shuffled untried moves (Fisher-Yates)
  - Methods: isFullyExpanded(), isTreeLeaf(), getAverageValue(), popUntriedMove()
  - Unit tests: construction, expansion, statistics

**TASK-1-002: GamePolicy Interface**
- **File**: `packages/mcts/src/core/GamePolicy.ts`
- **LOC**: 60
- **Dependencies**: None
- **Description**: Abstract game interface
- **Acceptance**:
  - Methods: getLegalMoves(), applyMove(), isTerminal(), getScore(), selectSimulationMove()
  - Full JSDoc with examples
  - Type-safe generics
  - No implementation (interface only)

**TASK-1-003: Score Normalization Utility**
- **File**: `packages/mcts/src/utils/normalize.ts`
- **LOC**: 30
- **Dependencies**: None
- **Description**: Normalize raw score to [0,1]
- **Acceptance**:
  - Function: normalizeScore(rawScore, maxScore): number
  - Clamps to [0, 1]
  - Handles edge cases (negative, over-max)
  - Unit tests: boundary conditions
  - Performance: inline, <0.001ms

**TASK-1-004: UCB1 Calculation**
- **File**: `packages/mcts/src/core/MCTSSolver.ts` (private method)
- **LOC**: 40
- **Dependencies**: TASK-1-001
- **Description**: Upper Confidence Bound formula
- **Acceptance**:
  - Returns Infinity for unvisited nodes (FPU)
  - Formula: (value/visits) + C * sqrt(ln(parent.visits)/visits)
  - Uses normalized values [0,1]
  - Configurable C parameter
  - Unit tests: FPU, balance exploration/exploitation

**TASK-1-005: Selection Phase**
- **File**: `packages/mcts/src/core/MCTSSolver.ts` (private method)
- **LOC**: 30
- **Dependencies**: TASK-1-004
- **Description**: Navigate tree via UCB1
- **Acceptance**:
  - Selects child with highest UCB1 score
  - Stops at non-terminal, non-fully-expanded node
  - Handles edge cases: no children, terminal state
  - Unit tests: correct node selection

**TASK-1-006: Expansion Phase**
- **File**: `packages/mcts/src/core/MCTSSolver.ts` (private method)
- **LOC**: 30
- **Dependencies**: TASK-1-002
- **Description**: Add one new child node
- **Acceptance**:
  - Pops one untried move from node
  - Calls policy.applyMove() to get new state
  - Creates MCTSNode, adds to parent.children
  - Returns new child node
  - Unit tests: correct expansion

**TASK-1-007: Simulation Phase**
- **File**: `packages/mcts/src/core/MCTSSolver.ts` (private method)
- **LOC**: 50
- **Dependencies**: TASK-1-002
- **Description**: Playout from node to terminal
- **Acceptance**:
  - Uses policy.selectSimulationMove()
  - Respects max depth limit (100 moves)
  - Optional cycle detection (state hashing)
  - Returns raw score from policy.getScore()
  - Unit tests: depth limit, terminal detection

**TASK-1-008: Backpropagation Phase**
- **File**: `packages/mcts/src/core/MCTSSolver.ts` (private method)
- **LOC**: 20
- **Dependencies**: TASK-1-001
- **Description**: Update statistics from leaf to root
- **Acceptance**:
  - Increments visits for all ancestors
  - Adds normalized score to value (no negation)
  - Traverses parent chain to root
  - Unit tests: correct updates, SP-MCTS property

**TASK-1-009: Main Search Loop**
- **File**: `packages/mcts/src/core/MCTSSolver.ts`
- **LOC**: 50
- **Dependencies**: TASK-1-005 to 1-008
- **Description**: runSearch() method
- **Acceptance**:
  - Loops for N iterations
  - Calls four phases in order: select, expand, simulate, backprop
  - Normalizes score before backprop
  - No mutations of root state
  - Unit tests: completes without errors

**TASK-1-010: Best Move Extraction**
- **File**: `packages/mcts/src/core/MCTSSolver.ts`
- **LOC**: 40
- **Dependencies**: TASK-1-009
- **Description**: getBestMove() and getResult() methods
- **Acceptance**:
  - getBestMove(criteria): returns move with max visits or value
  - getResult(): returns SolverResult with statistics
  - Calculates confidence, iterations/sec, tree size
  - Optional moveAnalysis for all root children
  - Unit tests: correct selection

### Testing & Documentation (Tasks 011-012)

**TASK-1-011: Core Unit Tests**
- **File**: `packages/mcts/tests/core/*.test.ts`
- **LOC**: 500
- **Dependencies**: TASK-1-001 to 1-010
- **Description**: Comprehensive test suite
- **Acceptance**:
  - MCTSNode tests: construction, expansion, statistics
  - MCTSSolver tests: with toy game (Tic-Tac-Toe)
  - Phase tests: selection, expansion, simulation, backprop
  - Edge cases: no moves, terminal states, cycles
  - Coverage: >85% for core module

**TASK-1-012: Core Documentation**
- **File**: `packages/mcts/src/core/README.md`
- **LOC**: 200 (markdown)
- **Dependencies**: All Phase 1 tasks
- **Description**: Module documentation
- **Acceptance**:
  - Algorithm overview
  - API reference (classes, interfaces)
  - Usage examples
  - Performance characteristics

---

## PHASE 2: Game Policy Implementation (8 tasks)

### Klondike Policy (Tasks 001-004)

**TASK-2-001: KlondikePolicy Class**
- **File**: `packages/mcts/src/policies/KlondikePolicy.ts`
- **LOC**: 120
- **Dependencies**: @chayuto/solitaire-core, TASK-1-002
- **Description**: Implements GamePolicy for Klondike
- **Acceptance**:
  - Wraps Core GameEngine
  - getLegalMoves() delegates to engine.getLegalMoves()
  - applyMove() delegates to engine.applyMove()
  - isTerminal() checks gameWon || no legal moves
  - getScore() delegates to heuristics (placeholder: return 0)
  - selectSimulationMove() random for now (Phase 3 adds heuristic)
  - Unit tests: method delegation, immutability

**TASK-2-002: State Adapter**
- **File**: `packages/mcts/src/adapters/gameStateAdapter.ts`
- **LOC**: 100
- **Dependencies**: Core types, App types
- **Description**: Convert UI ↔ Core GameState
- **Acceptance**:
  - uiToCore(): strips selectedCard, replayMode, autoPlayActive
  - coreToUI(): restores UI fields from original
  - Type-safe conversions
  - Preserves immutability
  - Unit tests: round-trip conversion

**TASK-2-003: Policy Unit Tests**
- **File**: `packages/mcts/tests/policies/KlondikePolicy.test.ts`
- **LOC**: 250
- **Dependencies**: TASK-2-001
- **Description**: Test policy correctness
- **Acceptance**:
  - getLegalMoves() returns valid moves from various states
  - applyMove() preserves immutability
  - All moves are executable (no invalid moves)
  - isTerminal() correct for wins, losses, in-progress
  - Coverage: >80%

**TASK-2-004: Integration Tests**
- **File**: `packages/mcts/tests/integration/klondikeMCTS.test.ts`
- **LOC**: 200
- **Dependencies**: TASK-1-009, TASK-2-001
- **Description**: End-to-end MCTS + Klondike
- **Acceptance**:
  - Solver runs without errors on real Klondike states
  - Returns legal, executable moves
  - Tree structure is valid after search
  - No memory leaks after 100k iterations
  - Multiple test states: early game, mid game, near win

### Performance & Documentation (Tasks 005-008)

**TASK-2-005: Performance Benchmark**
- **File**: `packages/mcts/tests/integration/performance.test.ts`
- **LOC**: 150
- **Dependencies**: TASK-2-004
- **Description**: Measure iterations/second
- **Acceptance**:
  - Runs 10k, 50k, 100k iterations
  - Calculates iterations/sec
  - Target: >5k iter/sec (minimum for Phase 2)
  - Stretch: >10k iter/sec
  - Identifies hot paths via profiling

**TASK-2-006: Module Exports**
- **File**: `packages/mcts/src/index.ts`
- **LOC**: 50
- **Dependencies**: All Phase 1-2 tasks
- **Description**: Public API exports
- **Acceptance**:
  - Exports: MCTSNode, MCTSSolver, GamePolicy, KlondikePolicy
  - Type exports: SolverOptions, SolverResult
  - Utility exports: normalizeScore
  - No internal implementation details exposed

**TASK-2-007: Package README**
- **File**: `packages/mcts/README.md`
- **LOC**: 300 (markdown)
- **Dependencies**: TASK-2-006
- **Description**: Library documentation
- **Acceptance**:
  - Installation instructions
  - Quick start example (Klondike)
  - API overview
  - Configuration options
  - Performance tips

**TASK-2-008: Example Usage**
- **File**: `packages/mcts/examples/basic.ts`
- **LOC**: 100
- **Dependencies**: TASK-2-001
- **Description**: Standalone example
- **Acceptance**:
  - Creates Klondike game
  - Runs MCTS search
  - Prints best move and statistics
  - Runnable via `npm run example`

---

## PHASE 3: Heuristics & Optimization (10 tasks)

### Heuristic Functions (Tasks 001-004)

**TASK-3-001: Heuristic Evaluation Function**
- **File**: `packages/mcts/src/heuristics/evaluation.ts`
- **LOC**: 80
- **Dependencies**: @chayuto/solitaire-core
- **Description**: Evaluate Klondike state
- **Acceptance**:
  - 10 points per foundation card (max 520)
  - 1 point per face-up tableau card (max 28)
  - Total range: [0, 548]
  - Fast: <0.01ms per call
  - Unit tests: boundary cases, correctness

**TASK-3-002: Move Priority Classification**
- **File**: `packages/mcts/src/heuristics/priorities.ts`
- **LOC**: 150
- **Dependencies**: @chayuto/solitaire-core
- **Description**: Classify moves into 8 priority levels
- **Acceptance**:
  - classifyMove(state, move): returns priority 1-8
  - Priority 1: Tableau→Foundation (reveals card)
  - Priority 2: Waste→Foundation
  - Priority 3: Tableau→Foundation (no reveal)
  - Priority 4: Tableau→Tableau (reveals card)
  - Priority 5: Waste→Tableau
  - Priority 6: Foundation→Tableau (strategic)
  - Priority 7: Draw/Recycle
  - Priority 8: Tableau→Tableau (no reveal)
  - Unit tests: all move types, edge cases

**TASK-3-003: Greedy Simulation Policy**
- **File**: `packages/mcts/src/heuristics/simulation.ts`
- **LOC**: 100
- **Dependencies**: TASK-3-002
- **Description**: Select best move for playout
- **Acceptance**:
  - Buckets moves by priority (8 buckets)
  - Returns move from highest non-empty bucket
  - Random tie-breaking within bucket
  - Falls back gracefully if no moves
  - Unit tests: correct selection, priority ordering

**TASK-3-004: Integrate Heuristics into KlondikePolicy**
- **File**: `packages/mcts/src/policies/KlondikePolicy.ts` (modify)
- **LOC**: +30
- **Dependencies**: TASK-3-001, TASK-3-003
- **Description**: Use heuristics in policy
- **Acceptance**:
  - getScore() calls evaluateState()
  - selectSimulationMove() calls selectGreedyMove() if enabled
  - Constructor option: useHeuristicSimulation (default: true)
  - Can disable for testing (random fallback)

### Optimization (Tasks 005-008)

**TASK-3-005: Optimize UCB1 Calculation**
- **File**: `packages/mcts/src/core/MCTSSolver.ts` (modify)
- **LOC**: +40
- **Dependencies**: TASK-1-004
- **Description**: Performance tuning
- **Acceptance**:
  - Cache Math.log(parent.visits) (updated only on backprop)
  - Inline normalization
  - Benchmark: 20-30% faster than naive
  - No behavior changes (same move selection)

**TASK-3-006: Memory Profiling**
- **File**: `packages/mcts/tests/integration/memory.test.ts`
- **LOC**: 100
- **Dependencies**: TASK-2-004
- **Description**: Measure memory usage
- **Acceptance**:
  - Tracks memory before/after search
  - Measures tree size (nodes * bytes/node)
  - Target: <10MB for 10k iterations, <100MB for 100k
  - No memory leaks (GC cleans up old trees)

**TASK-3-007: Tune Exploration Constant**
- **File**: `packages/mcts/tests/integration/tuning.test.ts`
- **LOC**: 120
- **Dependencies**: TASK-3-004
- **Description**: Find optimal C value
- **Acceptance**:
  - Grid search: C ∈ [0.1, 0.6, 1.0, √2, 2.0]
  - Metric: win rate over 50 games per C
  - Documents best C value for Klondike
  - Configurable in SolverOptions

**TASK-3-008: Performance Regression Tests**
- **File**: `packages/mcts/tests/performance/regression.test.ts`
- **LOC**: 80
- **Dependencies**: TASK-2-005
- **Description**: Prevent slowdowns
- **Acceptance**:
  - Baseline: 10k iterations/sec (Phase 3 target)
  - Fails if drops below 8k
  - Runs in CI on every commit
  - Tracks trend over time

### Quality Validation (Tasks 009-010)

**TASK-3-009: Win Rate Benchmark**
- **File**: `packages/mcts/tests/integration/winRate.test.ts`
- **LOC**: 200
- **Dependencies**: TASK-3-004
- **Description**: Measure AI quality
- **Acceptance**:
  - Simulates 100+ games with different strategies
  - Random simulation: ~7% win rate
  - Greedy only: ~13% win rate
  - MCTS + greedy: >20% win rate (target)
  - Statistical significance (p < 0.05)

**TASK-3-010: Heuristics Documentation**
- **File**: `packages/mcts/src/heuristics/README.md`
- **LOC**: 250 (markdown)
- **Dependencies**: All Phase 3 tasks
- **Description**: Heuristics design rationale
- **Acceptance**:
  - Explains HEF design (10:1 weighting)
  - Documents 8 priority levels
  - Includes research citations
  - Performance characteristics

---

## PHASE 4: UI Integration (15 tasks)

### Zustand Integration (Tasks 001-003)

**TASK-4-001: Add MCTS to Game Store**
- **File**: `packages/app/src/store/gameStore.ts` (modify)
- **LOC**: +150
- **Dependencies**: @chayuto/solitaire-mcts
- **Description**: Integrate MCTS API
- **Acceptance**:
  - New actions: requestMCTSHint(), applyMCTSMove()
  - New state: mctsSettings, mctsResult, mctsLoading
  - updateMCTSSettings() for configuration
  - Error handling (catch and log)

**TASK-4-002: Adapter Integration**
- **File**: `packages/app/src/store/gameStore.ts` (modify)
- **LOC**: +50
- **Dependencies**: TASK-2-002, TASK-4-001
- **Description**: Use state adapters
- **Acceptance**:
  - requestMCTSHint() calls uiToCore()
  - Result processed without UI fields
  - applyMCTSMove() uses Core MoveCommand

**TASK-4-003: Store Unit Tests**
- **File**: `packages/app/src/store/gameStore.test.ts` (modify)
- **LOC**: +200
- **Dependencies**: TASK-4-001, TASK-4-002
- **Description**: Test MCTS actions
- **Acceptance**:
  - requestMCTSHint() returns valid move
  - applyMCTSMove() updates game state
  - Loading states correct
  - Error handling works

### UI Components (Tasks 004-007)

**TASK-4-004: MCTSPanel Component**
- **File**: `packages/app/src/components/MCTSPanel.tsx`
- **LOC**: 200
- **Dependencies**: TASK-4-001
- **Description**: MCTS control panel
- **Acceptance**:
  - "Get Hint" button (calls requestMCTSHint)
  - Loading spinner during search
  - Displays: confidence %, iterations, search time
  - "Apply Hint" button
  - Settings button (opens modal)
  - Responsive layout (mobile/desktop)

**TASK-4-005: Move Highlighting**
- **File**: `packages/app/src/components/GameBoard.tsx` (modify)
- **LOC**: +100
- **Dependencies**: TASK-4-001
- **Description**: Visual feedback for hint
- **Acceptance**:
  - Highlights source card(s) (glow effect)
  - Highlights destination pile (border)
  - Animation on hint received
  - Clears on next user move or new hint

**TASK-4-006: Settings Modal**
- **File**: `packages/app/src/components/MCTSSettingsModal.tsx`
- **LOC**: 180
- **Dependencies**: TASK-4-001
- **Description**: MCTS configuration UI
- **Acceptance**:
  - Toggle: Enable/Disable MCTS
  - Slider: Search time (1-10 seconds)
  - Slider: Exploration constant C (0.1-2.0)
  - Checkbox: Auto-apply hints
  - Save/Cancel buttons
  - Validates inputs

**TASK-4-007: Component Tests**
- **File**: `packages/app/src/components/*.test.tsx`
- **LOC**: 300
- **Dependencies**: TASK-4-004 to 4-006
- **Description**: React component tests
- **Acceptance**:
  - MCTSPanel: button clicks, loading state
  - GameBoard: highlighting, animations
  - SettingsModal: input validation, save/cancel
  - Coverage: >70% for UI components

### Performance & Advanced Features (Tasks 008-012)

**TASK-4-008: Web Worker Setup**
- **File**: `packages/app/src/workers/mctsWorker.ts`
- **LOC**: 150
- **Dependencies**: @chayuto/solitaire-mcts
- **Description**: Background MCTS search
- **Acceptance**:
  - Worker receives state, runs solver
  - Posts progress updates every 500ms
  - Can be terminated mid-search
  - Returns SolverResult
  - Fallback to main thread if Worker unavailable

**TASK-4-009: Progressive Results**
- **File**: `packages/app/src/store/gameStore.ts` (modify)
- **LOC**: +80
- **Dependencies**: TASK-4-008
- **Description**: Show incremental results
- **Acceptance**:
  - Updates UI every 500ms with current best move
  - Shows "Searching..." with iteration count
  - Final result updates after completion
  - User can cancel mid-search

**TASK-4-010: Keyboard Shortcuts**
- **File**: `packages/app/src/components/GameBoard.tsx` (modify)
- **LOC**: +50
- **Dependencies**: TASK-4-001
- **Description**: Keyboard controls
- **Acceptance**:
  - H key: Request hint
  - Shift+H: Apply hint
  - Esc: Cancel search (if running)
  - Works when game has focus

**TASK-4-011: Mobile Layout**
- **File**: `packages/app/src/components/MCTSPanel.tsx` (modify)
- **LOC**: +60
- **Dependencies**: TASK-4-004
- **Description**: Mobile-friendly design
- **Acceptance**:
  - Compact layout on small screens
  - Touch-friendly buttons (min 44px)
  - Hint button prominent
  - Statistics collapse to modal

**TASK-4-012: Accessibility**
- **File**: Various component files (modify)
- **LOC**: +100
- **Dependencies**: TASK-4-004 to 4-006
- **Description**: A11y compliance
- **Acceptance**:
  - ARIA labels for all buttons
  - Screen reader announcements (hint ready)
  - Keyboard navigation works
  - Focus management (modal traps focus)
  - Color contrast meets WCAG AA

### Feature Flags & Analytics (Tasks 013-015)

**TASK-4-013: Feature Flag Integration**
- **File**: `packages/app/src/config/features.ts`
- **LOC**: 80
- **Dependencies**: TASK-4-001
- **Description**: Gradual rollout infrastructure
- **Acceptance**:
  - Environment variable: VITE_ENABLE_MCTS
  - Runtime check: isMCTSEnabled()
  - UI hides/shows based on flag
  - Can enable for specific users (if auth exists)

**TASK-4-014: Analytics Events**
- **File**: `packages/app/src/store/gameStore.ts` (modify)
- **LOC**: +60
- **Dependencies**: TASK-4-001
- **Description**: Track MCTS usage
- **Acceptance**:
  - Event: mcts_hint_requested (search time, confidence)
  - Event: mcts_hint_applied (move type, success)
  - Event: mcts_settings_changed (new values)
  - Event: mcts_error (error type)
  - Respects user privacy settings

**TASK-4-015: E2E Tests**
- **File**: `packages/app/tests/e2e/mcts.spec.ts`
- **LOC**: 250
- **Dependencies**: All Phase 4 tasks
- **Description**: End-to-end user flow
- **Acceptance**:
  - User starts game
  - Clicks "Get Hint"
  - Hint appears within 2 seconds
  - Move is highlighted
  - Clicks "Apply Hint"
  - Move executes correctly
  - Game continues normally
  - No errors in console

---

## PHASE 5: Testing & Polish (18 tasks)

### Test Coverage (Tasks 001-006)

**TASK-5-001: Fill Core Coverage Gaps**
- **File**: Various `packages/mcts/tests/core/*.test.ts`
- **LOC**: 300
- **Dependencies**: Phase 1 tasks
- **Description**: Achieve >85% core coverage
- **Acceptance**:
  - MCTSNode: 90% coverage
  - MCTSSolver: 85% coverage
  - All edge cases covered
  - Mutation tests pass

**TASK-5-002: Fill Policy Coverage Gaps**
- **File**: Various `packages/mcts/tests/policies/*.test.ts`
- **LOC**: 200
- **Dependencies**: Phase 2 tasks
- **Description**: Achieve >80% policy coverage
- **Acceptance**:
  - KlondikePolicy: 80% coverage
  - State adapter: 85% coverage
  - All move types tested

**TASK-5-003: Fill Heuristics Coverage Gaps**
- **File**: Various `packages/mcts/tests/heuristics/*.test.ts`
- **LOC**: 200
- **Dependencies**: Phase 3 tasks
- **Description**: Achieve >75% heuristics coverage
- **Acceptance**:
  - Evaluation: 80% coverage
  - Simulation: 75% coverage
  - Priorities: 70% coverage

**TASK-5-004: Property-Based Tests**
- **File**: `packages/mcts/tests/properties/mcts.test.ts`
- **LOC**: 250
- **Dependencies**: fast-check library
- **Description**: Generative testing
- **Acceptance**:
  - Property: child.visits ≤ parent.visits
  - Property: node.value ∈ [0, node.visits]
  - Property: state immutability (deep freeze)
  - Property: more iterations → higher confidence
  - 1000+ test cases per property

**TASK-5-005: Integration Test Suite**
- **File**: `packages/mcts/tests/integration/comprehensive.test.ts`
- **LOC**: 400
- **Dependencies**: All implementation tasks
- **Description**: Full system tests
- **Acceptance**:
  - Tests 20+ game scenarios
  - Tests error handling
  - Tests edge cases (no moves, instant win)
  - Tests performance (10k iter/sec minimum)
  - Tests memory (no leaks)

**TASK-5-006: Regression Test Suite**
- **File**: `packages/app/tests/regression/mcts.test.ts`
- **LOC**: 300
- **Dependencies**: All Phase 4 tasks
- **Description**: Ensure no breaking changes
- **Acceptance**:
  - All 90 existing tests still pass
  - New MCTS tests pass
  - Lint passes (0 errors)
  - Build succeeds
  - No type errors

### Documentation (Tasks 007-012)

**TASK-5-007: API Documentation**
- **File**: Auto-generated via TypeDoc
- **LOC**: N/A (config only)
- **Dependencies**: All implementation
- **Description**: Generate API docs
- **Acceptance**:
  - Configured in package.json
  - Generates HTML docs
  - Includes all public exports
  - Deployed to docs site

**TASK-5-008: User Guide**
- **File**: `docs/user-guide/mcts.md`
- **LOC**: 500 (markdown)
- **Dependencies**: Phase 4 tasks
- **Description**: How to use MCTS hints
- **Acceptance**:
  - What is MCTS?
  - How to request hints
  - Understanding confidence scores
  - Tips for best results
  - Screenshots

**TASK-5-009: Developer Guide**
- **File**: `docs/developer-guide/mcts-architecture.md`
- **LOC**: 800 (markdown)
- **Dependencies**: All implementation
- **Description**: Architecture overview
- **Acceptance**:
  - System architecture diagram
  - Module responsibilities
  - Data flow diagrams
  - Integration points
  - Extension guide (new games)

**TASK-5-010: Performance Tuning Guide**
- **File**: `docs/developer-guide/mcts-performance.md`
- **LOC**: 600 (markdown)
- **Dependencies**: Phase 3 tasks
- **Description**: Optimization techniques
- **Acceptance**:
  - Hot path identification
  - Profiling instructions
  - Common bottlenecks
  - Tuning exploration constant
  - Memory optimization

**TASK-5-011: Troubleshooting Guide**
- **File**: `docs/troubleshooting/mcts.md`
- **LOC**: 400 (markdown)
- **Dependencies**: All implementation
- **Description**: Common issues & solutions
- **Acceptance**:
  - Slow performance (<5k iter/sec)
  - Poor move quality (low confidence)
  - UI freezes
  - Memory issues
  - Integration errors

**TASK-5-012: CHANGELOG**
- **File**: `packages/mcts/CHANGELOG.md`
- **LOC**: 200 (markdown)
- **Dependencies**: All implementation
- **Description**: Version history
- **Acceptance**:
  - v0.1.0: Initial implementation
  - Lists all features
  - Lists breaking changes (none)
  - Migration guide (if needed)

### Production Readiness (Tasks 013-018)

**TASK-5-013: Performance Benchmarks**
- **File**: `packages/mcts/benchmarks/`
- **LOC**: 300
- **Dependencies**: Phase 3 tasks
- **Description**: Comprehensive benchmarks
- **Acceptance**:
  - Iterations/sec (target: >10k)
  - Search time by iteration count
  - Memory usage by tree size
  - Win rate by search time
  - Exports to CSV/JSON

**TASK-5-014: Monitoring Dashboard**
- **File**: Analytics configuration
- **LOC**: N/A (config only)
- **Dependencies**: TASK-4-014
- **Description**: Production monitoring
- **Acceptance**:
  - Dashboard: MCTS usage (requests/day)
  - Dashboard: Performance (avg iter/sec)
  - Dashboard: Quality (avg confidence)
  - Dashboard: Errors (rate, types)
  - Alerts if metrics degrade

**TASK-5-015: Rollout Plan**
- **File**: `docs/deployment/mcts-rollout.md`
- **LOC**: 300 (markdown)
- **Dependencies**: TASK-4-013
- **Description**: Gradual rollout strategy
- **Acceptance**:
  - Phase 1: Internal testing (1 week)
  - Phase 2: 5% of users (1 week)
  - Phase 3: 25% of users (1 week)
  - Phase 4: 50% of users (1 week)
  - Phase 5: 100% of users
  - Rollback criteria & procedures

**TASK-5-016: Rollback Procedures**
- **File**: `docs/deployment/mcts-rollback.md`
- **LOC**: 200 (markdown)
- **Dependencies**: TASK-4-013
- **Description**: Emergency procedures
- **Acceptance**:
  - How to disable feature flag
  - How to revert code deployment
  - Communication plan
  - Data impact assessment

**TASK-5-017: Release Checklist**
- **File**: `docs/deployment/mcts-release-checklist.md`
- **LOC**: 150 (markdown)
- **Dependencies**: All tasks
- **Description**: Pre-release validation
- **Acceptance**:
  - [ ] All 63 tasks complete
  - [ ] All tests passing (existing + new)
  - [ ] Coverage >80%
  - [ ] Performance >10k iter/sec
  - [ ] Win rate >20%
  - [ ] Lint 0 errors
  - [ ] Build succeeds
  - [ ] Documentation complete
  - [ ] Feature flags configured
  - [ ] Monitoring enabled
  - [ ] Rollback plan ready

**TASK-5-018: Final Smoke Tests**
- **File**: Manual test script
- **LOC**: N/A (manual)
- **Dependencies**: All tasks
- **Description**: Pre-production validation
- **Acceptance**:
  - Play 10 games with MCTS hints
  - Verify hints are legal & sensible
  - Test on multiple browsers/devices
  - Check performance metrics
  - Verify analytics events
  - Test rollback procedure

---

## Task Dependencies

### Critical Path
```
Core (Phase 1) → Policy (Phase 2) → Heuristics (Phase 3) → Integration (Phase 4) → Testing (Phase 5)
```

### Parallel Tracks

**Track A: Algorithm**
- TASK-1-001 to 1-012 (Core)
- TASK-2-001 to 2-004 (Policy)
- TASK-3-001 to 3-004 (Heuristics)

**Track B: Performance**
- TASK-2-005 (Benchmark)
- TASK-3-005 to 3-008 (Optimization)
- TASK-5-013 (Production benchmarks)

**Track C: UI**
- TASK-4-001 to 4-015 (Integration)
- TASK-5-006 (Regression tests)

**Track D: Documentation**
- TASK-1-012, 2-007, 3-010 (Module docs)
- TASK-5-007 to 5-012 (Comprehensive docs)

**Track E: Production**
- TASK-5-013 to 5-018 (Deployment)

---

## Summary Statistics

**Breakdown by Category**:
- Core Algorithm: 12 tasks, 1100 LOC
- Game Policy: 8 tasks, 1000 LOC
- Heuristics: 10 tasks, 1000 LOC
- UI Integration: 15 tasks, 1500 LOC
- Testing: 18 tasks, 1900 LOC

**Testing Distribution**:
- Unit tests: ~2000 LOC (40 tasks)
- Integration tests: ~800 LOC (8 tasks)
- E2E tests: ~250 LOC (1 task)
- Property tests: ~250 LOC (1 task)

**Documentation**:
- Code comments: Inline
- Module READMEs: ~1000 LOC markdown
- User guides: ~1000 LOC markdown
- Developer guides: ~1500 LOC markdown

---

**Document Status**: COMPLETE  
**Version**: v1.0  
**Last Updated**: 2025-11-16  
**Total Tasks**: 63  
**Total LOC**: 6,700+ (source + tests + docs)
