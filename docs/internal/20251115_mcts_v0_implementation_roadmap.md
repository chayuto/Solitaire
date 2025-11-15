# MCTS Implementation Roadmap - Phase-by-Phase Strategy

**Date:** 2025-11-15  
**Version:** v0.1  
**Status:** Planning Phase  
**Author:** GitHub Copilot Agent

---

## Executive Summary

This document provides a phased implementation strategy for integrating Monte Carlo Tree Search (MCTS) into the Klondike Solitaire project. The approach prioritizes **incremental delivery**, **risk mitigation**, and **continuous validation**.

**Total Duration**: 6-9 weeks (single developer, full-time)  
**Total Tasks**: 47 atomic tasks across 6 phases  
**Estimated LOC**: ~3,600 lines (including tests)

---

## Implementation Philosophy

### Core Principles

1. **Incremental Delivery**: Each phase produces a working, testable artifact
2. **Test-First**: Write tests alongside or before implementation
3. **Fail Fast**: Validate early to catch architectural issues
4. **No Regressions**: Existing features must continue working
5. **Documentation-Driven**: Update docs as code evolves

### Risk Mitigation Strategy

- **Phase 1-2**: Build generic MCTS engine → Test with toy game (Tic-Tac-Toe)
- **Phase 3**: Adapt to Klondike → Test with known game positions
- **Phase 4**: Add heuristics → Benchmark win rate improvements
- **Phase 5**: Integrate UI → Feature-flag for safe rollout
- **Phase 6**: Comprehensive testing → Performance validation

---

## Phase Overview

| Phase | Name | Duration | Critical Path | Deliverable |
|-------|------|----------|---------------|-------------|
| **1** | Foundation & Types | 3-5 days | Types, Utils | Type system + utilities |
| **2** | Core MCTS Algorithm | 1-2 weeks | Solver, Node | Generic MCTS engine |
| **3** | Klondike Game Logic | 2-3 weeks | Policy, Moves | Klondike-specific MCTS |
| **4** | Heuristics & Optimization | 1-2 weeks | HEF, Greedy | Strong AI performance |
| **5** | UI Integration | 1 week | Store, Components | User-facing feature |
| **6** | Testing & Documentation | 1 week | Tests, Docs | Production-ready |

---

## PHASE 1: Foundation & Types

**Goal**: Establish robust type system and utilities  
**Duration**: 3-5 days  
**Status**: ⏳ Not Started  
**Dependencies**: None  
**Blocking**: All subsequent phases

### Objectives

1. Define all MCTS-specific TypeScript types
2. Implement core utilities (hashing, normalization)
3. Set up test infrastructure
4. Create module structure

### Deliverables

- [ ] `src/mcts/types/` - Complete type system
- [ ] `src/mcts/utils/` - Hash and normalization utilities
- [ ] Test setup and mock data generators
- [ ] Clean module exports

### Tasks (7 tasks)

See [Task Breakdown](./20251115_mcts_v0_task_breakdown.md#phase-1-foundation--types-7-tasks) for details:
- TASK-001: MCTS Core Types
- TASK-002: MCTS Move Types
- TASK-003: Solver Configuration Types
- TASK-004: State Hashing Utility
- TASK-005: Score Normalization Utility
- TASK-006: Module Index Files
- TASK-007: Test Infrastructure

### Success Criteria

✅ **All types compile without errors**  
✅ **Hash function <1ms, collision rate <0.01%**  
✅ **Normalization handles edge cases correctly**  
✅ **Test infrastructure functional**

### Validation Steps

```bash
# Run after phase complete
npm run lint
npm run type-check
npm run test:mcts -- --grep "types|utils"
```

### Potential Blockers

- ⚠️ Type system too complex → Simplify, add to backlog
- ⚠️ Hash performance issues → Profile and optimize

---

## PHASE 2: Core MCTS Algorithm

**Goal**: Build generic, domain-agnostic MCTS solver  
**Duration**: 1-2 weeks  
**Status**: ⏳ Not Started  
**Dependencies**: Phase 1 complete  
**Blocking**: Phases 3-6

### Objectives

1. Implement MCTSNode tree structure
2. Implement four-phase MCTS algorithm (Selection, Expansion, Simulation, Backpropagation)
3. Implement UCB1 selection policy
4. Create abstract GamePolicy interface
5. Validate with simple toy game (Tic-Tac-Toe or 1D Nim)

### Deliverables

- [ ] `src/mcts/core/MCTSNode.ts` - Tree node class
- [ ] `src/mcts/core/GamePolicy.ts` - Abstract interface
- [ ] `src/mcts/core/MCTSSolver.ts` - Complete solver algorithm
- [ ] Toy game implementation for testing (Tic-Tac-Toe)
- [ ] Integration tests proving MCTS works

### Tasks (8 tasks)

See [Task Breakdown](./20251115_mcts_v0_task_breakdown.md#phase-2-core-mcts-algorithm-8-tasks):
- TASK-008: MCTSNode Class
- TASK-009: GamePolicy Interface
- TASK-010: MCTSSolver Constructor
- TASK-011: Selection Phase (UCB1)
- TASK-012: Expansion Phase
- TASK-013: Simulation Phase
- TASK-014: Backpropagation Phase
- TASK-015: Main Loop & Best Move

### Success Criteria

✅ **MCTS finds optimal move in Tic-Tac-Toe (100% accuracy)**  
✅ **UCB1 formula implemented correctly (matches research)**  
✅ **Tree grows as expected (no memory leaks)**  
✅ **All four phases execute in correct order**  
✅ **Performance: >10,000 iterations/second**

### Validation Steps

```bash
# Test with Tic-Tac-Toe
npm run test:mcts -- --grep "core|integration"

# Profile performance
npm run test:mcts -- --grep "benchmark"
```

### Toy Game: Tic-Tac-Toe for Validation

Create a simple Tic-Tac-Toe `GamePolicy` implementation:

```typescript
// src/mcts/__tests__/fixtures/TicTacToePolicy.ts
export class TicTacToePolicy implements GamePolicy<TTTState, TTTMove> {
  // Minimal perfect-information game for testing
  // MCTS should find winning moves consistently
}
```

**Why Tic-Tac-Toe?**
- Small state space (3^9 = 19,683 states)
- Known optimal play
- Fast to simulate (validates MCTS correctness)
- If MCTS can solve TTT, core algorithm is correct

### Potential Blockers

- ⚠️ UCB1 formula incorrect → Review research document formula
- ⚠️ Performance <5,000 iter/s → Profile and optimize hot paths
- ⚠️ Memory leak in tree → Implement node pooling

---

## PHASE 3: Klondike Game Logic

**Goal**: Adapt MCTS to Klondike Solitaire rules  
**Duration**: 2-3 weeks  
**Status**: ⏳ Not Started  
**Dependencies**: Phase 2 complete  
**Blocking**: Phases 4-6

### Objectives

1. Implement state adapter (UI ↔ MCTS)
2. Implement complete move generation (all Klondike moves)
3. Implement immutable state transitions
4. Implement KlondikePolicy class
5. Validate move generation correctness with known positions

### Deliverables

- [ ] `src/mcts/klondike/stateAdapter.ts` - State conversion
- [ ] `src/mcts/klondike/moveGenerator.ts` - All legal moves
- [ ] `src/mcts/klondike/stateTransition.ts` - Immutable transitions
- [ ] `src/mcts/klondike/KlondikePolicy.ts` - Complete policy
- [ ] Integration tests with real game positions

### Tasks (12 tasks)

See [Task Breakdown](./20251115_mcts_v0_task_breakdown.md#phase-3-klondike-game-logic-12-tasks):
- TASK-016-017: State Adapter (UI ↔ MCTS)
- TASK-018-024: Move Generator (7 parts, all move types)
- TASK-025-027: State Transition (immutable, pure functions)
- TASK-028: KlondikePolicy Integration

### Success Criteria

✅ **Move generator produces all legal moves (verified against hand-calculation)**  
✅ **State transitions preserve game validity (no illegal states)**  
✅ **Round-trip state conversion is lossless**  
✅ **MCTS can complete a game (even with random playout)**  
✅ **No mutations detected (deep equality checks)**

### Validation Steps

```bash
# Test move generation
npm run test:mcts -- --grep "moveGenerator"

# Test state transitions
npm run test:mcts -- --grep "stateTransition"

# Integration test: play full game
npm run test:mcts -- --grep "klondikeIntegration"
```

### Known Game Positions for Testing

Create fixtures for:
1. **Initial Deal**: 28 cards in tableau, 24 in stock
2. **Mid-game**: Mixed piles, some foundations populated
3. **Near Win**: 48 cards in foundations, 4 cards remaining
4. **Dead End**: No legal moves except draw
5. **Won Game**: All 52 cards in foundations

### Potential Blockers

- ⚠️ Move generation incomplete → Cross-reference research Table 1
- ⚠️ State transitions mutate → Enforce `readonly`, use deep freeze in tests
- ⚠️ Adapter bugs → Write round-trip tests

---

## PHASE 4: Heuristics & Optimization

**Goal**: Implement strong heuristic evaluation and simulation  
**Duration**: 1-2 weeks  
**Status**: ⏳ Not Started  
**Dependencies**: Phase 3 complete  
**Blocking**: Phase 5-6 (but not critical path for UI)

### Objectives

1. Implement Heuristic Evaluation Function (HEF)
2. Implement 8-priority greedy simulation policy
3. Optimize state hashing (FNV-1a)
4. Benchmark and tune hyperparameters
5. Validate win rate improvement

### Deliverables

- [ ] `src/mcts/klondike/heuristics/evaluation.ts` - HEF (10 pts/foundation, 1 pt/face-up)
- [ ] `src/mcts/klondike/heuristics/priorities.ts` - Move classification
- [ ] `src/mcts/klondike/heuristics/simulation.ts` - Greedy policy
- [ ] Optimized FNV-1a state hash
- [ ] Performance benchmarks and tuning report

### Tasks (6 tasks)

See [Task Breakdown](./20251115_mcts_v0_task_breakdown.md#phase-4-heuristics--optimization-6-tasks):
- TASK-029: Heuristic Evaluation Function
- TASK-030: Move Priority Classification
- TASK-031: Greedy Simulation Policy
- TASK-032: Integrate Heuristics into Policy
- TASK-033: Optimize State Hashing
- TASK-034: Performance Profiling Utilities

### Success Criteria

✅ **HEF range is [0, 548], correlates with win probability**  
✅ **Greedy playout achieves >10% win rate (vs 7% random)**  
✅ **MCTS with heuristics achieves >20% win rate**  
✅ **State hash <0.5ms per call**  
✅ **Solver completes 10,000 iterations in <5 seconds**

### Validation Steps

```bash
# Test heuristics
npm run test:mcts -- --grep "heuristics"

# Benchmark win rates
npm run test:mcts -- --grep "winRate"

# Profile performance
npm run test:mcts -- --grep "performance"
```

### Hyperparameter Tuning

Test different values for:
- **Exploration Constant (C)**: [0.1, 0.6, 1.0, √2, 2.0]
- **Simulation Depth**: [50, 100, 200]
- **Search Time**: [1s, 2s, 5s, 10s]

**Expected Results (from research)**:
- Random playout: ~7% win rate
- Greedy playout: ~13% win rate
- MCTS + Greedy: ~25-35% win rate (research upper bound)

### Potential Blockers

- ⚠️ Heuristic win rate <10% → Review priority order
- ⚠️ MCTS win rate <20% → Tune C parameter, increase search time
- ⚠️ Performance <5,000 iter/s → Profile, optimize hot paths

---

## PHASE 5: UI Integration

**Goal**: Connect MCTS to React UI, make feature user-facing  
**Duration**: 1 week  
**Status**: ⏳ Not Started  
**Dependencies**: Phase 3 complete (Phase 4 optional but recommended)  
**Blocking**: Phase 6

### Objectives

1. Add MCTS actions to Zustand store
2. Create MCTSPanel UI component
3. Display solver statistics
4. Highlight suggested moves on board
5. Add auto-apply option
6. Feature-flag for safe rollout

### Deliverables

- [ ] `src/store/gameStore.ts` - MCTS actions (requestHint, applyMove, settings)
- [ ] `src/components/MCTSPanel.tsx` - UI controls and stats
- [ ] `src/components/GameBoard.tsx` - Move highlighting
- [ ] User documentation
- [ ] Feature flag integration

### Tasks (7 tasks)

See [Task Breakdown](./20251115_mcts_v0_task_breakdown.md#phase-5-ui-integration-7-tasks):
- TASK-035: Zustand Store Integration
- TASK-036: MCTSPanel Component (shell)
- TASK-037: Statistics Display
- TASK-038: Move Highlighting
- TASK-039: Auto-Apply Option
- TASK-040: User Documentation
- TASK-041: Update README

### Success Criteria

✅ **User can request MCTS hint with one click**  
✅ **Hint appears within 2 seconds**  
✅ **Move is highlighted clearly on board**  
✅ **Statistics update in real-time**  
✅ **No UI freezing during search**  
✅ **Existing game features still work (no regressions)**

### Validation Steps

```bash
# Unit tests for store
npm run test -- gameStore.mcts

# Component tests
npm run test -- MCTSPanel

# Integration test
npm run test -- mctsUI

# Manual testing
npm run dev
# → Navigate to game
# → Click "Get MCTS Hint"
# → Verify hint appears, stats display, move highlighted
```

### Feature Flag Strategy

Add to `src/constants/index.ts`:
```typescript
export const FEATURE_FLAGS = {
  MCTS_ENABLED: process.env.VITE_FEATURE_MCTS === 'true',
};
```

**Rollout Plan:**
1. **Week 1**: Internal testing only (feature flag off)
2. **Week 2**: Beta testing (opt-in flag)
3. **Week 3**: General availability (flag on by default)

### UI Mock-up

```
┌─────────────────────────────────────────────┐
│  🧠 MCTS Solver                             │
├─────────────────────────────────────────────┤
│  ⚙️ Settings                                 │
│    Search Time: [1s] [2s] [5s] [10s]       │
│    ☑️ Auto-apply suggestions                │
├─────────────────────────────────────────────┤
│  🎯 [Get Hint]                              │
├─────────────────────────────────────────────┤
│  📊 Statistics                               │
│    Iterations: 12,453                       │
│    Time: 2.1s (5,930 iter/s)               │
│    Confidence: 78%                          │
│    Tree Size: 3,421 nodes                  │
└─────────────────────────────────────────────┘
```

### Potential Blockers

- ⚠️ UI freezes during search → Use Web Workers or async batching
- ⚠️ Highlight not visible → Adjust z-index, add animation
- ⚠️ Stats update lag → Debounce updates, use React.memo

---

## PHASE 6: Testing & Documentation

**Goal**: Comprehensive testing, performance validation, docs  
**Duration**: 1 week  
**Status**: ⏳ Not Started  
**Dependencies**: Phase 5 complete  
**Blocking**: None (final phase)

### Objectives

1. Write integration tests (MCTS + Klondike + UI)
2. Write performance benchmark suite
3. Create technical documentation
4. Create user guide and demo
5. Final validation before release

### Deliverables

- [ ] Integration test suite (80%+ coverage)
- [ ] Performance benchmarks with thresholds
- [ ] Technical documentation (API, architecture, troubleshooting)
- [ ] User guide (how to use MCTS feature)
- [ ] Demo video/GIF
- [ ] Release notes

### Tasks (7 tasks)

See [Task Breakdown](./20251115_mcts_v0_task_breakdown.md#phase-6-testing--documentation-7-tasks):
- TASK-042: Core Integration Tests
- TASK-043: Klondike Integration Tests
- TASK-044: MCTS + UI Integration Tests
- TASK-045: Performance Benchmark Suite
- TASK-046: Technical Documentation
- TASK-047: Demo Video/GIF

### Success Criteria

✅ **Test coverage >80% for MCTS module**  
✅ **All benchmarks pass performance thresholds**  
✅ **Documentation complete and reviewed**  
✅ **No critical bugs in issue tracker**  
✅ **User guide tested with non-technical user**

### Validation Steps

```bash
# Full test suite
npm run test

# Coverage report
npm run test:coverage

# Lint and build
npm run lint && npm run build

# Performance benchmarks
npm run test:mcts -- --grep "benchmark"
```

### Performance Thresholds

| Metric | Target | Acceptable | Critical |
|--------|--------|------------|----------|
| Iterations/second | >10,000 | >5,000 | <5,000 ❌ |
| Time to first hint | <2s | <5s | >5s ❌ |
| Memory per node | <1KB | <2KB | >2KB ❌ |
| State hash time | <0.5ms | <1ms | >1ms ❌ |
| Win rate (heuristic) | >20% | >15% | <10% ❌ |

### Documentation Checklist

- [ ] **Technical Docs**: Architecture, API reference, algorithm explanation
- [ ] **User Guide**: How to use, what to expect, tips
- [ ] **Troubleshooting**: Common issues, performance tuning
- [ ] **Research Notes**: Link to original research doc, citations
- [ ] **Future Work**: Ideas for extensions (Draw 3, determinization)

### Potential Blockers

- ⚠️ Coverage <80% → Write more unit tests
- ⚠️ Benchmarks fail → Optimize or adjust thresholds
- ⚠️ Documentation incomplete → Allocate more time

---

## Release Checklist

Before marking MCTS feature as complete:

### Code Quality
- [ ] All tests passing (79 existing + ~30 new = 109 tests)
- [ ] Lint checks pass (0 errors, 0 warnings)
- [ ] Build succeeds with no errors
- [ ] TypeScript strict mode enabled, no `any` types
- [ ] Code coverage >80% for MCTS module

### Functionality
- [ ] MCTS solver produces legal moves 100% of the time
- [ ] Solver completes 10,000 iterations in <5 seconds
- [ ] Hint appears within 2 seconds of request
- [ ] Move highlighting works for all move types
- [ ] Statistics display correctly
- [ ] Auto-apply option functions
- [ ] No regressions in existing features

### Performance
- [ ] All benchmark thresholds met
- [ ] No memory leaks (profiled with Chrome DevTools)
- [ ] No UI freezing (tested on low-end device)
- [ ] Build size increase <200KB

### Documentation
- [ ] Technical documentation complete
- [ ] User guide complete
- [ ] API reference complete
- [ ] README updated
- [ ] Demo video/GIF created

### Testing
- [ ] Unit tests for all modules
- [ ] Integration tests for end-to-end flow
- [ ] Performance benchmarks automated
- [ ] Manual testing on multiple browsers (Chrome, Firefox, Safari)

### Deployment
- [ ] Feature flag tested (on/off states)
- [ ] Beta testing completed (feedback addressed)
- [ ] Release notes written
- [ ] Git tags created (v1.0.0-mcts)

---

## Post-Release: Future Enhancements

Once core MCTS is stable, consider these extensions:

### Near-Term (1-2 months)
1. **Difficulty Levels**: Adjust C parameter or search time for hints
2. **Move Explanation**: Show why MCTS recommends a move
3. **Solver Statistics History**: Track performance over time
4. **Web Workers**: Move MCTS to background thread

### Mid-Term (3-6 months)
5. **Draw 3 Variant**: Adapt solver for Draw 3 rules
6. **Determinization**: Handle hidden information (Draw 3 stock)
7. **Neural Network Evaluation**: Train NN to replace HEF
8. **Parallel MCTS**: Use multiple threads for faster search

### Long-Term (6-12 months)
9. **Online Learning**: Adapt strategy based on user play style
10. **Tournament Mode**: MCTS vs MCTS, find optimal parameters
11. **Solver as Service**: Expose MCTS API for other clients
12. **Research Publication**: Document findings, win rate improvements

---

## Risk Register

| Risk | Probability | Impact | Mitigation | Owner |
|------|-------------|--------|------------|-------|
| **Core MCTS algorithm incorrect** | LOW | CRITICAL | Validate with toy game (Tic-Tac-Toe) | Phase 2 |
| **Performance too slow** | MEDIUM | HIGH | Profile early, optimize hot paths, use Web Workers | Phase 4 |
| **Heuristic win rate <10%** | MEDIUM | HIGH | Tune priorities, review research doc | Phase 4 |
| **UI freezes during search** | MEDIUM | HIGH | Async/await, Web Workers, progress callbacks | Phase 5 |
| **Type system conflicts** | LOW | MEDIUM | Use separate MCTS types, adapters handle conversion | Phase 1 |
| **Breaking existing features** | LOW | CRITICAL | Comprehensive regression tests, feature flag | Phase 5 |
| **Memory leaks in tree** | MEDIUM | HIGH | Profile, implement tree pruning, node pooling | Phase 2 |
| **Scope creep** | HIGH | MEDIUM | Stick to task list, defer enhancements to post-release | All Phases |

---

## Success Metrics (KPIs)

### Development Metrics
- **Velocity**: Tasks completed per week (target: 7-8 tasks/week)
- **Quality**: Test pass rate (target: 100%)
- **Stability**: Regression count (target: 0)
- **Code Coverage**: MCTS module (target: >80%)

### Performance Metrics
- **Iterations/Second**: Solver throughput (target: >10,000)
- **Time to Hint**: User-facing latency (target: <2s)
- **Win Rate**: MCTS-assisted games (target: >25%)
- **Memory Usage**: Per-node overhead (target: <1KB)

### User Metrics
- **Feature Adoption**: % of users enabling MCTS (target: >50%)
- **Hint Usage**: Hints requested per game (track for analytics)
- **Win Rate Improvement**: Before/after MCTS availability (target: +10%)
- **User Satisfaction**: Feedback score (target: >4/5)

---

## Conclusion

This roadmap provides a structured, risk-aware approach to integrating MCTS into the Klondike Solitaire project. By following the phased strategy and validating at each step, we can deliver a high-quality AI feature that enhances the user experience without compromising existing functionality.

**Next Steps:**
1. Review and approve this roadmap
2. Begin Phase 1: Foundation & Types
3. Update progress in this document weekly
4. Adjust timeline based on actual velocity

---

## Related Documents

- **[20251115_mcts_v0_analysis_overview.md](./20251115_mcts_v0_analysis_overview.md)**: Strategic analysis
- **[20251115_mcts_v0_architecture_design.md](./20251115_mcts_v0_architecture_design.md)**: Detailed architecture
- **[20251115_mcts_v0_task_breakdown.md](./20251115_mcts_v0_task_breakdown.md)**: Atomic tasks
- **[20251115_mcts_v0_technical_specifications.md](./20251115_mcts_v0_technical_specifications.md)**: API contracts
- **[20251115_mcts_v0_testing_strategy.md](./20251115_mcts_v0_testing_strategy.md)**: Test plan

---

**Document Status:** DRAFT v0.1  
**Last Updated:** 2025-11-15  
**Next Review:** Weekly during development

**Phase Progress:**
- Phase 1: ⏳ Not Started (0/7 tasks)
- Phase 2: ⏳ Not Started (0/8 tasks)
- Phase 3: ⏳ Not Started (0/12 tasks)
- Phase 4: ⏳ Not Started (0/6 tasks)
- Phase 5: ⏳ Not Started (0/7 tasks)
- Phase 6: ⏳ Not Started (0/7 tasks)

**Overall Progress: 0/47 tasks complete (0%)**
