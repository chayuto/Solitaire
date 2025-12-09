# Recommendation: Performance Monitoring

**Date:** 2025-02-18
**Status:** Proposed

## Context
Performance regressions are easy to introduce but hard to notice until they become a problem.

## Proposal
Integrate performance budgets and monitoring into the CI pipeline.

## Detailed Recommendations

### 1. Bundle Size Analysis
Use `vite-plugin-bundle-visualizer` or similar to generate reports.
- **CI Check**: Fail the build if the bundle size exceeds a threshold (e.g., 200KB for main chunk).
- **Why**: Prevents accidental import of heavy libraries (e.g., full Lodash instead of individual functions).

### 2. Lighthouse CI
Run Lighthouse in CI against the `preview` build.
- **Metrics**: Track LCP (Largest Contentful Paint), TBT (Total Blocking Time), and CLS (Cumulative Layout Shift).
- **Budget**: Set minimum scores (e.g., 90/100).

### 3. Solver Benchmarks
For `packages/mcts`, create a benchmark script that runs the solver on a set of standard seeds.
- **Metric**: Time to solve, win rate.
- **Track**: Store these metrics over time to spot regressions in the algorithm.

## Benefits
- **User Experience**: Ensures the game remains fast and lightweight.
- **Code Health**: Encourages efficient coding practices.
