# MCTS Performance Considerations & Optimization Guide

**Date:** 2025-11-15  
**Version:** v0.1  
**Status:** Planning Phase  
**Author:** GitHub Copilot Agent

---

## Executive Summary

This document provides comprehensive guidance on performance optimization for the MCTS implementation. It covers profiling strategies, optimization techniques, and performance targets across all phases of development.

**Key Performance Targets:**
- **Throughput**: >10,000 MCTS iterations/second
- **Latency**: <2 seconds for user-facing hint
- **Memory**: <1KB per tree node
- **Hash Performance**: <0.5ms per state hash

---

## 1. Performance Budget

### 1.1 Time Budget Breakdown (2-second hint)

| Phase | Target Time | % of Budget |
|-------|-------------|-------------|
| **State Conversion** (UI → MCTS) | 5ms | 0.25% |
| **Solver Initialization** | 10ms | 0.5% |
| **MCTS Search** (main loop) | 1,900ms | 95% |
| **Result Extraction** | 5ms | 0.25% |
| **Move Conversion** (MCTS → UI) | 5ms | 0.25% |
| **UI Update** | 75ms | 3.75% |
| **Total** | 2,000ms | 100% |

**Key Insight**: 95% of time should be spent in MCTS search loop.  
Any overhead >100ms is unacceptable.

### 1.2 Memory Budget

| Component | Target | Maximum | Notes |
|-----------|--------|---------|-------|
| **MCTSNode** | 200 bytes | 500 bytes | State reference + stats |
| **GameState** | 4KB | 8KB | 52 cards + metadata |
| **Tree (10K nodes)** | 2MB | 5MB | With structural sharing |
| **Solver Overhead** | 100KB | 500KB | Policy, options, etc. |
| **Total** | ~2.5MB | ~6MB | Per solver instance |

---

## 2. Hot Path Analysis

### 2.1 Critical Paths (Profiling Priority)

#### 🔥 CRITICAL (Profile First)
1. **MCTSSolver.runSearch()** - Main loop (95% of time)
2. **MCTSSolver.selectNode()** - Tree traversal
3. **MCTSSolver.getUCB1()** - Called per child per selection
4. **GamePolicy.getLegalMoves()** - Called every simulation step
5. **GamePolicy.applyMove()** - State transitions
6. **GamePolicy.selectSimulationMove()** - Heuristic evaluation

#### 🟡 IMPORTANT (Profile Second)
7. **generateLegalMoves()** - Move generation logic
8. **applyMoveCards()** - Complex state transitions
9. **hashState()** - Cycle detection
10. **evaluateState()** - HEF calculation

#### 🟢 NORMAL (Profile If Time)
11. State adapter conversions
12. Move priority classification
13. Tree node creation
14. Statistics calculation

### 2.2 Expected Call Frequencies (10,000 iterations)

| Function | Calls | Notes |
|----------|-------|-------|
| `runSearch()` | 1 | Entry point |
| `selectNode()` | 10,000 | Once per iteration |
| `getUCB1()` | ~50,000 | ~5 children per node avg |
| `expandNode()` | 10,000 | Once per iteration |
| `simulate()` | 10,000 | Once per iteration |
| `getLegalMoves()` | ~500,000 | ~50 moves avg per simulation |
| `applyMove()` | ~500,000 | Every simulation move |
| `backpropagate()` | 10,000 | Once per iteration |

**Optimization Priority**: Functions called >50,000 times

---

## 3. Optimization Techniques

### 3.1 Immutability via Structural Sharing

**Problem**: Deep cloning game state is expensive (52 cards × 4 bytes = 208+ bytes).

**Solution**: Use structural sharing with spread operators.

```typescript
// ❌ BAD: Deep clone (expensive)
function applyMoveNaive(state: GameState, move: GameMove): GameState {
  const newState = JSON.parse(JSON.stringify(state)); // SLOW!
  // ... modify newState
  return newState;
}

// ✅ GOOD: Structural sharing (fast)
function applyMoveFast(state: GameState, move: GameMove): GameState {
  // Only clone affected piles
  const newTableau = state.tableau.map((pile, i) =>
    i === sourceIndex ? pile.slice(0, -1) : pile // Only clone changed pile
  );
  
  return {
    ...state,  // Re-use stock, waste if unchanged
    tableau: newTableau
  };
}
```

**Benchmark**: 10x-50x faster than deep clone.

### 3.2 Object Pooling for Tree Nodes

**Problem**: Creating 10,000 MCTSNode objects triggers GC pauses.

**Solution**: Reuse node objects via object pool (optional optimization).

```typescript
class NodePool {
  private pool: MCTSNode<any, any>[] = [];
  
  allocate<TState, TMove>(
    state: TState,
    move: TMove | null,
    parent: MCTSNode<TState, TMove> | null,
    moves: TMove[]
  ): MCTSNode<TState, TMove> {
    if (this.pool.length > 0) {
      const node = this.pool.pop()!;
      // Reinitialize node
      node.reset(state, move, parent, moves);
      return node;
    }
    return new MCTSNode(state, move, parent, moves);
  }
  
  release(node: MCTSNode<any, any>): void {
    node.clear(); // Clear references
    this.pool.push(node);
  }
}
```

**Expected Gain**: Reduces GC pressure, 5-10% throughput improvement.  
**Trade-off**: Added complexity.  
**Recommendation**: Implement only if profiling shows GC issues.

### 3.3 Fast State Hashing (FNV-1a)

**Problem**: `JSON.stringify()` for state hashing is slow (~5-10ms).

**Solution**: Implement FNV-1a hash (non-cryptographic, fast).

```typescript
/**
 * FNV-1a hash - fast, good distribution
 * ~0.1-0.5ms per state (20-100x faster than JSON)
 */
function hashStateFNV1a(state: MCTSGameState): string {
  let hash = 2166136261; // FNV offset basis
  
  // Hash tableau
  for (const pile of state.tableau) {
    for (const card of pile) {
      hash ^= card.suit.charCodeAt(0);
      hash *= 16777619; // FNV prime
      hash ^= card.rank;
      hash *= 16777619;
      hash ^= card.isFaceUp ? 1 : 0;
      hash *= 16777619;
    }
    hash ^= 0xFF; // Pile separator
    hash *= 16777619;
  }
  
  // Hash foundations, stock, waste similarly...
  
  return hash.toString(36); // Convert to string
}
```

**Expected Gain**: 20-100x faster than `JSON.stringify()`.

### 3.4 Lazy Evaluation of Legal Moves

**Problem**: Generating all legal moves every simulation step is wasteful.

**Solution**: Generate moves on-demand, cache if needed.

```typescript
class LazyMoveGenerator {
  private cache: Map<string, GameMove[]> = new Map();
  
  getLegalMoves(state: MCTSGameState, useCache: boolean = false): GameMove[] {
    if (!useCache) {
      return generateLegalMoves(state);
    }
    
    const stateHash = hashState(state);
    if (!this.cache.has(stateHash)) {
      this.cache.set(stateHash, generateLegalMoves(state));
    }
    return this.cache.get(stateHash)!;
  }
}
```

**Expected Gain**: 10-30% if cache hit rate >50%.  
**Trade-off**: Memory overhead.  
**Recommendation**: Implement only if profiling shows `getLegalMoves()` is bottleneck.

### 3.5 Inline Hot Functions

**Problem**: Function call overhead for tiny functions.

**Solution**: Inline critical helpers.

```typescript
// ❌ BAD: Function call overhead
function isRankSequential(upper: MCTSRank, lower: MCTSRank): boolean {
  return upper === lower + 1;
}

// ✅ GOOD: Inline in hot path
function canMoveToTableau(card: MCTSCard, pile: readonly MCTSCard[]): boolean {
  if (pile.length === 0) return card.rank === MCTSRank.King;
  const topCard = pile[pile.length - 1];
  return (
    getCardColor(card) !== getCardColor(topCard) &&
    card.rank === topCard.rank - 1  // Inlined
  );
}
```

**Expected Gain**: 1-5% for frequently called functions.

### 3.6 Early Exit Optimizations

**Problem**: Checking all conditions even when result is obvious.

**Solution**: Short-circuit evaluation, early returns.

```typescript
// ✅ GOOD: Early exit
function canMoveToFoundation(card: MCTSCard, foundation: readonly MCTSCard[]): boolean {
  // Check cheapest condition first
  if (foundation.length === 0) {
    return card.rank === MCTSRank.Ace; // Early return
  }
  
  const topCard = foundation[foundation.length - 1];
  
  // Suit check is cheaper than rank check
  if (card.suit !== topCard.suit) return false;
  
  return card.rank === topCard.rank + 1;
}
```

**Expected Gain**: 5-15% for validation functions.

---

## 4. JavaScript Engine Optimizations

### 4.1 V8 Engine Specifics

#### Hidden Classes
V8 optimizes objects with consistent shape. Avoid adding properties dynamically.

```typescript
// ❌ BAD: Dynamic properties break hidden class
const node: any = { state, move, parent };
node.children = []; // Added later - deoptimizes!

// ✅ GOOD: All properties defined upfront
const node = { 
  state, 
  move, 
  parent, 
  children: [],
  visits: 0,
  value: 0
};
```

#### Monomorphic Functions
V8 optimizes functions called with same types.

```typescript
// ❌ BAD: Polymorphic (different types)
function process(x: number | string) { /* ... */ }
process(5);
process("hello"); // V8 can't optimize

// ✅ GOOD: Monomorphic (same type)
function processNumber(x: number) { /* ... */ }
function processString(x: string) { /* ... */ }
```

#### Array Performance
- Prefer typed arrays for numeric data
- Avoid sparse arrays (holes)
- Use fixed-size arrays when possible

```typescript
// ✅ Fast array operations
const visits = new Uint32Array(nodeCount);  // Typed array
const values = new Float64Array(nodeCount);

// ✅ Dense arrays (no holes)
const cards = Array.from({ length: 52 }, (_, i) => createCard(i));

// ❌ Sparse array (slow)
const sparse = [];
sparse[100] = card; // Creates holes
```

### 4.2 JIT Warm-up

**Problem**: First run is slower due to JIT compilation.

**Solution**: Warm-up phase before timed search.

```typescript
function warmUpSolver(state: MCTSGameState): void {
  const policy = new KlondikePolicy();
  const solver = new MCTSSolver(state, policy, defaultOptions);
  
  // Run 100 iterations to trigger JIT
  solver.runSearch(100);
  
  // Discard this solver, JIT now optimized
}

// Usage
warmUpSolver(initialState);
const solver = new MCTSSolver(initialState, policy, options);
solver.runSearch(10000); // Now fast
```

**Expected Gain**: 10-20% improvement after warm-up.

---

## 5. Web Workers for Background Search

### 5.1 When to Use Web Workers

**Use Web Workers if:**
- MCTS search takes >1 second
- UI freezes during search (event loop blocked)
- User needs to interact with UI during search

**Don't use Web Workers if:**
- Search is <1 second (overhead not worth it)
- UI doesn't need to update during search
- Serialization cost is high

### 5.2 Web Worker Architecture

```typescript
// worker.ts - Runs in background thread
import { MCTSSolver, KlondikePolicy, type MCTSGameState, type SolverResult } from '@/mcts';

self.onmessage = (e: MessageEvent) => {
  const { state, options, iterations } = e.data;
  
  const policy = new KlondikePolicy();
  const solver = new MCTSSolver(state, policy, options);
  
  // Search with progress updates
  const batchSize = 100;
  for (let i = 0; i < iterations; i += batchSize) {
    solver.runSearch(batchSize);
    
    // Report progress
    self.postMessage({
      type: 'progress',
      iterations: i + batchSize,
    });
  }
  
  // Send final result
  const result = solver.getResult(performance.now());
  self.postMessage({
    type: 'result',
    result,
  });
};
```

```typescript
// Main thread
const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });

function requestHintAsync(state: MCTSGameState): Promise<SolverResult> {
  return new Promise((resolve) => {
    worker.onmessage = (e: MessageEvent) => {
      if (e.data.type === 'progress') {
        updateProgressUI(e.data.iterations);
      } else if (e.data.type === 'result') {
        resolve(e.data.result);
      }
    };
    
    worker.postMessage({
      state,
      options: defaultOptions,
      iterations: 10000,
    });
  });
}
```

**Expected Gain**: No UI freezing, user can continue playing.  
**Cost**: ~10-50ms serialization overhead (state transfer).

---

## 6. Profiling Strategy

### 6.1 Chrome DevTools Profiling

#### Performance Tab
1. Open DevTools → Performance
2. Record while running `solver.runSearch(10000)`
3. Look for:
   - Long-running functions (>10ms)
   - Frequent GC pauses (yellow bars)
   - Hot functions (red flame graph)

#### Memory Tab
1. Take heap snapshot before search
2. Run `solver.runSearch(10000)`
3. Take heap snapshot after
4. Compare: look for retained objects

### 6.2 Custom Performance Marks

```typescript
function runSearchWithProfiling(iterations: number): void {
  performance.mark('mcts-start');
  
  for (let i = 0; i < iterations; i++) {
    performance.mark('iteration-start');
    
    const node = this.selectNode(this.root);
    performance.measure('select', 'iteration-start');
    
    if (!this.policy.isTerminal(node.state) && !node.isFullyExpanded()) {
      const expandedNode = this.expandNode(node);
      performance.measure('expand', 'iteration-start');
      
      const score = this.simulate(expandedNode);
      performance.measure('simulate', 'iteration-start');
      
      this.backpropagate(expandedNode, this.normalize(score));
      performance.measure('backpropagate', 'iteration-start');
    }
    
    performance.measure('iteration', 'iteration-start');
  }
  
  performance.measure('mcts-total', 'mcts-start');
  
  // Print results
  const measures = performance.getEntriesByType('measure');
  console.table(
    measures.map(m => ({ name: m.name, duration: m.duration.toFixed(2) }))
  );
  
  performance.clearMarks();
  performance.clearMeasures();
}
```

### 6.3 Benchmark Harness

```typescript
// src/mcts/__tests__/performance/benchmark.ts
import { performance } from 'perf_hooks';

interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTime: number;
  avgTime: number;
  opsPerSec: number;
}

function benchmark(
  name: string,
  fn: () => void,
  iterations: number = 1000
): BenchmarkResult {
  // Warm-up
  for (let i = 0; i < 10; i++) fn();
  
  // Actual benchmark
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const totalTime = performance.now() - start;
  
  return {
    name,
    iterations,
    totalTime,
    avgTime: totalTime / iterations,
    opsPerSec: (iterations / totalTime) * 1000,
  };
}

// Usage
const result = benchmark(
  'hashState',
  () => hashState(testState),
  1000
);

console.log(`${result.name}: ${result.opsPerSec.toFixed(0)} ops/sec`);
expect(result.avgTime).toBeLessThan(0.5); // <0.5ms
```

---

## 7. Performance Regression Tests

### 7.1 Automated Performance Tests

```typescript
// src/mcts/__tests__/performance/regression.test.ts
describe('Performance Regression Tests', () => {
  const THRESHOLDS = {
    ITERATIONS_PER_SECOND: 10000,
    HASH_TIME_MS: 0.5,
    STATE_TRANSITION_MS: 0.1,
    MOVE_GENERATION_MS: 1,
  };
  
  it('maintains iteration throughput', () => {
    const state = createMidGameState();
    const policy = new KlondikePolicy();
    const solver = new MCTSSolver(state, policy, defaultOptions);
    
    const start = performance.now();
    solver.runSearch(10000);
    const duration = performance.now() - start;
    
    const iterPerSec = 10000 / (duration / 1000);
    expect(iterPerSec).toBeGreaterThanOrEqual(THRESHOLDS.ITERATIONS_PER_SECOND);
  });
  
  it('hash performance not regressed', () => {
    const state = createMidGameState();
    const times = Array.from({ length: 100 }, () => {
      const start = performance.now();
      hashState(state);
      return performance.now() - start;
    });
    
    const avgTime = times.reduce((a, b) => a + b) / times.length;
    expect(avgTime).toBeLessThanOrEqual(THRESHOLDS.HASH_TIME_MS);
  });
});
```

### 7.2 CI Performance Checks

Add to `.github/workflows/ci.yml`:

```yaml
- name: Run Performance Benchmarks
  run: npm run test:mcts -- --grep "Performance|benchmark"
  
- name: Check Performance Thresholds
  run: |
    npm run test:mcts -- --grep "regression" --reporter=json > perf-results.json
    node scripts/check-performance.js perf-results.json
```

---

## 8. Performance Monitoring in Production

### 8.1 Metrics to Track

```typescript
interface MCTSMetrics {
  // Throughput
  iterationsPerSecond: number;
  
  // Latency (percentiles)
  hintTimeP50: number;
  hintTimeP95: number;
  hintTimeP99: number;
  
  // Quality
  averageConfidence: number;
  winRateWithHints: number;
  
  // Resource usage
  averageTreeSize: number;
  peakMemoryUsage: number;
}
```

### 8.2 Instrumentation

```typescript
class MCTSMonitor {
  private metrics: MCTSMetrics;
  
  recordHintRequest(result: SolverResult, timeMs: number): void {
    this.metrics.hintTimeP50 = this.updatePercentile(50, timeMs);
    this.metrics.hintTimeP95 = this.updatePercentile(95, timeMs);
    this.metrics.hintTimeP99 = this.updatePercentile(99, timeMs);
    
    this.metrics.iterationsPerSecond = 
      result.statistics.iterationsPerSecond;
    this.metrics.averageConfidence = 
      (this.metrics.averageConfidence * 0.9) + (result.confidence * 0.1);
  }
  
  getReport(): MCTSMetrics {
    return { ...this.metrics };
  }
}
```

---

## 9. Platform-Specific Considerations

### 9.1 Browser Differences

| Browser | V8 Version | Performance Notes |
|---------|------------|-------------------|
| **Chrome 120+** | V8 12.0+ | Fastest, best optimization |
| **Edge 120+** | V8 12.0+ | Same as Chrome |
| **Firefox 120+** | SpiderMonkey | ~10-20% slower than V8 |
| **Safari 17+** | JavaScriptCore | ~20-30% slower than V8 |

**Recommendation**: Target Chrome/V8 for optimization, verify on others.

### 9.2 Mobile Performance

Mobile devices are **3-5x slower** than desktop:
- Adjust iteration count: 2,000-5,000 instead of 10,000
- Increase search time: 3-5 seconds instead of 2
- Consider progressive hints: show partial results early

```typescript
function getIterationBudget(): number {
  // Detect mobile
  const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
  
  if (isMobile) {
    return 2000; // Lower budget for mobile
  }
  return 10000; // Full budget for desktop
}
```

---

## 10. Optimization Checklist

### Phase 1-2 (Core Implementation)
- [ ] Use TypeScript strict mode (no `any`)
- [ ] Enforce immutability (`readonly` everywhere)
- [ ] Structural sharing for state transitions
- [ ] Avoid deep cloning (no `JSON.parse(JSON.stringify())`)
- [ ] Profile early (Chrome DevTools)

### Phase 3 (Klondike Logic)
- [ ] Optimize move generation (most frequent operation)
- [ ] Inline small helper functions
- [ ] Early exit in validation functions
- [ ] Test array operations (avoid sparse arrays)

### Phase 4 (Heuristics)
- [ ] Implement FNV-1a hash (replace JSON)
- [ ] Profile heuristic policy (should be fast)
- [ ] Benchmark win rate vs performance trade-off
- [ ] Consider lazy move generation if needed

### Phase 5 (UI Integration)
- [ ] Add loading indicators (UX)
- [ ] Consider Web Workers if search >1s
- [ ] Batch state updates (avoid rerender spam)
- [ ] Add performance monitoring

### Phase 6 (Testing)
- [ ] Automated performance regression tests
- [ ] Benchmark suite (iterations/sec, hash time, etc.)
- [ ] Memory leak detection
- [ ] Cross-browser testing (Chrome, Firefox, Safari)
- [ ] Mobile device testing

---

## 11. Performance Troubleshooting

### Symptom: Iterations/sec < 5,000

**Likely Causes:**
1. Expensive state cloning → Use structural sharing
2. Slow hash function → Implement FNV-1a
3. Too many GC pauses → Object pooling or reduce allocations

**Debug Steps:**
1. Profile with Chrome DevTools
2. Check for deep cloning (`JSON.parse`)
3. Look for GC pauses (yellow bars in timeline)

### Symptom: UI Freezing

**Likely Causes:**
1. Blocking main thread → Use Web Workers
2. Too many iterations at once → Batch with `setTimeout`
3. Expensive state conversion → Profile adapter

**Debug Steps:**
1. Check event loop (should yield every 100ms)
2. Profile state adapter (should be <10ms)
3. Consider async/await with batching

### Symptom: Memory Growth

**Likely Causes:**
1. Tree not garbage collected → Clear references
2. Retained states → Check structural sharing
3. Closure leaks → Profile heap snapshots

**Debug Steps:**
1. Take heap snapshot before/after search
2. Look for retained objects
3. Check for circular references

---

## Related Documents

- **[Architecture Design](./20251115_mcts_v0_architecture_design.md)**: Data structures
- **[Technical Specifications](./20251115_mcts_v0_technical_specifications.md)**: API contracts
- **[Testing Strategy](./20251115_mcts_v0_testing_strategy.md)**: Performance benchmarks
- **[Implementation Roadmap](./20251115_mcts_v0_implementation_roadmap.md)**: Phase timeline

---

**Document Status:** DRAFT v0.1  
**Last Updated:** 2025-11-15  
**Next Review:** During Phase 4 (Optimization)
