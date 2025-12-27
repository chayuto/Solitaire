# Performance & Scalability Recommendations

**Date:** December 27, 2025  
**Status:** 📋 Recommendations for AI Coding Agents  
**Priority:** 🟡 Medium

---

## Executive Summary

This document provides recommendations for improving application performance, scalability, and efficiency in the Solitaire monorepo.

---

## Current State Analysis

### Strengths ✅
1. **React 19** with latest performance optimizations
2. **Zustand** lightweight state management (~1KB)
3. **Vite** fast builds with tree shaking
4. **Pure functions** in core library (cacheable)
5. **Reduced motion** support implemented

### Areas for Improvement 🔧
1. **Large gameStore.ts** - full re-parse on any change
2. **Missing React.memo** on components
3. **No Zustand selector optimization**
4. **ActivityLog** renders all entries (no virtualization)
5. **Auto-play timers** not cleaned up properly
6. **No lazy loading** for non-critical components
7. **Bundle size** could be optimized

---

## Recommendations

### 1. Implement Component Memoization

**Priority:** 🔴 High  
**Effort:** 2-3 hours  
**Impact:** Significant render reduction

**Current Issue:**
Components re-render on any state change:
```typescript
// Card.tsx - renders on every state update
const Card: React.FC<CardProps> = ({ card, isSelected, isValidTarget }) => {
  // ...
};
```

**Recommendation:**
Add React.memo with custom comparison:

```typescript
// packages/app/src/components/Card.tsx
import React, { memo } from 'react';

interface CardProps {
  card: CardType;
  isSelected: boolean;
  isValidTarget: boolean;
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({ card, isSelected, isValidTarget, onClick }) => {
  // Component implementation...
};

// Memoize with custom equality check
export default memo(Card, (prevProps, nextProps) => {
  // Only re-render if these specific props change
  return (
    prevProps.card.id === nextProps.card.id &&
    prevProps.card.faceUp === nextProps.card.faceUp &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isValidTarget === nextProps.isValidTarget
  );
});
```

```typescript
// packages/app/src/components/TableauColumn.tsx
import React, { memo, useMemo } from 'react';

const TableauColumn: React.FC<TableauColumnProps> = ({ columnIndex }) => {
  const store = useGameStore();
  
  // Memoize derived values
  const column = useMemo(() => store.tableau[columnIndex], [store.tableau, columnIndex]);
  const isValidTarget = useMemo(() => {
    // Calculate if column is valid target
  }, [store.selectedCard, column]);

  return (
    // ...
  );
};

export default memo(TableauColumn);
```

---

### 2. Optimize Zustand Selectors

**Priority:** 🔴 High  
**Effort:** 1-2 hours  
**Impact:** Prevent unnecessary re-renders

**Current Issue:**
```typescript
// Many components use entire store
const { tableau, selectedCard, moveHistory } = useGameStore();
// Re-renders on ANY state change
```

**Recommendation:**
Use granular selectors:

```typescript
// packages/app/src/store/selectors.ts
import { useGameStore } from './gameStore';
import { shallow } from 'zustand/shallow';

// Atomic selectors - only re-render when specific value changes
export const useTableau = () => useGameStore(state => state.tableau);
export const useSelectedCard = () => useGameStore(state => state.selectedCard);
export const useGameWon = () => useGameStore(state => state.gameWon);
export const useMoveCount = () => useGameStore(state => state.moveHistory.length);
export const useCompletionProgress = () => useGameStore(state => state.completionProgress);
export const useAutoPlayEnabled = () => useGameStore(state => state.autoPlayEnabled);

// Grouped selectors with shallow comparison
export const useControlPanelState = () => useGameStore(
  state => ({
    showValidMoves: state.showValidMoves,
    godMode: state.godMode,
    autoPlayEnabled: state.autoPlayEnabled,
    difficulty: state.difficulty,
  }),
  shallow
);

export const useReplayState = () => useGameStore(
  state => ({
    replayMode: state.replayMode,
    replayIndex: state.replayIndex,
    replayPaused: state.replayPaused,
    replaySpeed: state.replaySpeed,
    moveHistoryLength: state.moveHistory.length,
  }),
  shallow
);

// Action selectors (stable references)
export const useGameActions = () => useGameStore(
  state => ({
    initializeGame: state.initializeGame,
    drawCard: state.drawCard,
    toggleAutoPlay: state.toggleAutoPlay,
    exportGameState: state.exportGameState,
    importGameState: state.importGameState,
  }),
  shallow
);
```

**Usage in components:**
```typescript
// Before
const ControlPanel = () => {
  const state = useGameStore(); // Re-renders on ANY change
  return <div>{state.showValidMoves && '...'}</div>;
};

// After
const ControlPanel = () => {
  const { showValidMoves, godMode, autoPlayEnabled } = useControlPanelState();
  const { toggleValidMoves, toggleGodMode, toggleAutoPlay } = useGameActions();
  // Only re-renders when these specific values change
  return <div>{showValidMoves && '...'}</div>;
};
```

---

### 3. Implement Virtual Scrolling for ActivityLog

**Priority:** 🟡 Medium  
**Effort:** 2-3 hours  
**Impact:** Handles large move histories

**Current Issue:**
ActivityLog renders ALL moves, causing performance issues with 500+ moves:
```typescript
{moveHistory.map((move, index) => (
  <div key={index}>{/* Move entry */}</div>
))}
```

**Recommendation:**
Use react-window for virtualization:

```bash
npm install react-window @types/react-window -w app
```

```typescript
// packages/app/src/components/ActivityLog.tsx
import { FixedSizeList as List } from 'react-window';
import { memo, useCallback } from 'react';

const ActivityLog: React.FC = () => {
  const moveHistory = useGameStore(state => state.moveHistory);
  
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const move = moveHistory[moveHistory.length - 1 - index]; // Reverse order
    
    return (
      <div style={style} className="px-2 py-1 border-b border-green-600/20">
        <MoveEntry move={move} />
      </div>
    );
  }, [moveHistory]);

  return (
    <div className="bg-green-900/50 rounded-lg overflow-hidden">
      <div className="p-2 bg-green-800/50 font-semibold text-white">
        Activity Log ({moveHistory.length} moves)
      </div>
      <List
        height={300}
        itemCount={moveHistory.length}
        itemSize={40}
        width="100%"
      >
        {Row}
      </List>
    </div>
  );
};

// Memoized move entry
const MoveEntry = memo(({ move }: { move: Move }) => {
  // Render move details...
});
```

---

### 4. Lazy Load Non-Critical Components

**Priority:** 🟡 Medium  
**Effort:** 1-2 hours  
**Impact:** Faster initial load

**Recommendation:**
```typescript
// packages/app/src/components/index.ts
import { lazy, Suspense } from 'react';

// Eagerly loaded (critical for initial render)
export { default as GameBoard } from './GameBoard';
export { default as Card } from './Card';
export { default as TableauColumn } from './TableauColumn';

// Lazy loaded (not needed immediately)
export const ActivityLog = lazy(() => import('./ActivityLog'));
export const WinModal = lazy(() => import('./WinModal'));
export const ReplayControls = lazy(() => import('./ReplayControls'));
```

```typescript
// packages/app/src/components/GameBoard.tsx
import { Suspense, lazy } from 'react';

const ActivityLog = lazy(() => import('./ActivityLog'));
const WinModal = lazy(() => import('./WinModal'));
const ReplayControls = lazy(() => import('./ReplayControls'));

const GameBoard: React.FC = () => {
  return (
    <div>
      {/* Critical components load immediately */}
      <DrawPile />
      <TableauColumn />
      
      {/* Non-critical components lazy loaded */}
      <Suspense fallback={<div className="animate-pulse">Loading...</div>}>
        <ActivityLog />
      </Suspense>
      
      <Suspense fallback={null}>
        <WinModal />
      </Suspense>
    </div>
  );
};
```

---

### 5. Implement Computation Caching

**Priority:** 🟡 Medium  
**Effort:** 2-3 hours  
**Impact:** Reduce redundant calculations

**Recommendation:**
Cache expensive computations:

```typescript
// packages/app/src/store/helpers/memoizedHelpers.ts

// Simple memoization for pure functions
function memoize<T extends (...args: any[]) => any>(fn: T): T {
  const cache = new Map();
  
  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = fn(...args);
    cache.set(key, result);
    
    // Limit cache size
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    
    return result;
  }) as T;
}

// Memoized hash calculation
export const memoizedHashGameState = memoize(hashGameState);

// Memoized valid move calculation
export const memoizedGetValidDestinations = memoize(
  (cardId: string, tableauHash: string, foundationsHash: string) => {
    // Calculate valid destinations
  }
);
```

**For scoring in auto-play:**
```typescript
// Cache scoring results for same state
const scoringCache = new Map<string, Map<string, number>>();

function getCachedScore(stateHash: string, moveKey: string): number | undefined {
  return scoringCache.get(stateHash)?.get(moveKey);
}

function setCachedScore(stateHash: string, moveKey: string, score: number): void {
  if (!scoringCache.has(stateHash)) {
    scoringCache.set(stateHash, new Map());
  }
  scoringCache.get(stateHash)!.set(moveKey, score);
  
  // Clear old state caches
  if (scoringCache.size > 10) {
    const firstKey = scoringCache.keys().next().value;
    scoringCache.delete(firstKey);
  }
}
```

---

### 6. Optimize Bundle Size

**Priority:** 🟡 Medium  
**Effort:** 2-3 hours  
**Impact:** Faster load times

**Recommendation:**
Analyze and reduce bundle:

```bash
# Analyze bundle
npx vite-bundle-visualizer
```

**Optimizations:**
```typescript
// packages/app/vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        // Split vendor chunks
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'animation': ['framer-motion'],
          'dnd': ['@dnd-kit/core'],
          'state': ['zustand'],
        },
      },
    },
    // Minify in production
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
      },
    },
  },
});
```

**Tree shaking for framer-motion:**
```typescript
// Instead of
import { motion } from 'framer-motion';

// Use specific imports
import { motion } from 'framer-motion/dom';
// Or for minimal bundle
import { m, domAnimation, LazyMotion } from 'framer-motion';
```

---

### 7. Implement Web Worker for Heavy Computations

**Priority:** 🟢 Low (for future MCTS)  
**Effort:** 4-6 hours  
**Impact:** Non-blocking UI

**Recommendation:**
```typescript
// packages/app/src/workers/solver.worker.ts
import { GameEngine } from '@chayuto/solitaire-core';

const engine = new GameEngine();

self.onmessage = (event: MessageEvent) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'GET_LEGAL_MOVES': {
      const moves = engine.getLegalMoves(payload.state);
      self.postMessage({ type: 'LEGAL_MOVES', payload: moves });
      break;
    }
    
    case 'FIND_BEST_MOVE': {
      // Heavy computation - MCTS
      const bestMove = findBestMoveWithMCTS(payload.state, payload.iterations);
      self.postMessage({ type: 'BEST_MOVE', payload: bestMove });
      break;
    }
  }
};

// Export type for worker
export type SolverWorkerMessage = 
  | { type: 'GET_LEGAL_MOVES'; payload: { state: GameState } }
  | { type: 'FIND_BEST_MOVE'; payload: { state: GameState; iterations: number } };
```

```typescript
// packages/app/src/hooks/useSolverWorker.ts
import { useRef, useCallback, useEffect } from 'react';

export function useSolverWorker() {
  const workerRef = useRef<Worker | null>(null);
  
  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../workers/solver.worker.ts', import.meta.url),
      { type: 'module' }
    );
    
    return () => {
      workerRef.current?.terminate();
    };
  }, []);
  
  const findBestMove = useCallback((state: GameState) => {
    return new Promise((resolve) => {
      const worker = workerRef.current;
      if (!worker) return resolve(null);
      
      worker.onmessage = (event) => {
        if (event.data.type === 'BEST_MOVE') {
          resolve(event.data.payload);
        }
      };
      
      worker.postMessage({ type: 'FIND_BEST_MOVE', payload: { state, iterations: 1000 } });
    });
  }, []);
  
  return { findBestMove };
}
```

---

### 8. Add Performance Monitoring

**Priority:** 🟢 Low  
**Effort:** 1-2 hours  
**Impact:** Identify bottlenecks

**Recommendation:**
```typescript
// packages/app/src/utils/performance.ts
export function measurePerformance<T>(name: string, fn: () => T): T {
  if (import.meta.env.DEV) {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    
    if (duration > 16) { // More than one frame
      console.warn(`⚠️ ${name} took ${duration.toFixed(2)}ms`);
    }
    
    return result;
  }
  return fn();
}

// Usage
const moves = measurePerformance('getLegalMoves', () => 
  engine.getLegalMoves(state)
);
```

**React Profiler integration:**
```typescript
// packages/app/src/components/GameBoard.tsx
import { Profiler, ProfilerOnRenderCallback } from 'react';

const onRenderCallback: ProfilerOnRenderCallback = (
  id,
  phase,
  actualDuration,
  baseDuration,
  startTime,
  commitTime
) => {
  if (import.meta.env.DEV && actualDuration > 16) {
    console.warn(`Slow render: ${id} took ${actualDuration.toFixed(2)}ms`);
  }
};

const GameBoard = () => (
  <Profiler id="GameBoard" onRender={onRenderCallback}>
    {/* Game content */}
  </Profiler>
);
```

---

## Performance Checklist for AI Agents

When making changes:

- [ ] Use `React.memo` for new components with props
- [ ] Use granular Zustand selectors, not entire store
- [ ] Add `useMemo`/`useCallback` for expensive operations
- [ ] Check render count with React DevTools
- [ ] Test with large move histories (500+ moves)
- [ ] Verify no memory leaks (cleanup in useEffect)
- [ ] Check bundle size impact (`npm run build`)

---

## Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| Initial load (LCP) | < 2.5s | ~2s |
| Interaction delay (FID) | < 100ms | ~50ms |
| Layout shift (CLS) | < 0.1 | < 0.1 |
| Bundle size (gzipped) | < 150KB | ~110KB |
| 60fps during gameplay | Yes | Mostly |
| Handle 1000+ moves | Yes | Needs virtualization |

---

**Author:** AI Analysis  
**Last Updated:** December 27, 2025
