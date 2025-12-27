# Error Handling & Observability Recommendations

**Date:** December 27, 2025  
**Status:** 📋 Recommendations for AI Coding Agents  
**Priority:** 🟡 Medium

---

## Executive Summary

This document provides recommendations for improving error handling, logging, and observability in the Solitaire monorepo.

---

## Current State Analysis

### Strengths ✅
1. **TypeScript** catches many errors at compile time
2. **Try-catch** blocks around critical operations
3. **Console logging** for debugging
4. **Error returns** from import function (returns false on failure)
5. **Auto-play** has deadend/loop detection with logging

### Areas for Improvement 🔧
1. **Generic error messages** - not actionable
2. **No error boundaries** for React components
3. **Silent failures** in some operations
4. **Console.log** scattered without structure
5. **No error tracking** service integration
6. **Missing stack traces** in production
7. **No user-facing error messages**

---

## Recommendations

### 1. Add React Error Boundaries

**Priority:** 🔴 High  
**Effort:** 2-3 hours  
**Impact:** Graceful failure handling

**Current Issue:**
Uncaught errors crash the entire app.

**Recommendation:**
```typescript
// packages/app/src/components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('React Error Boundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
    
    // Send to error tracking service if configured
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, { extra: errorInfo });
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div className="min-h-screen bg-red-900 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md">
            <h2 className="text-xl font-bold text-red-600 mb-4">
              Something went wrong
            </h2>
            <p className="text-gray-600 mb-4">
              The game encountered an error. Your progress may have been lost.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Restart Game
            </button>
            {import.meta.env.DEV && this.state.error && (
              <details className="mt-4 text-sm text-gray-500">
                <summary>Error details</summary>
                <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
                  {this.state.error.message}
                  {'\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**Usage in App.tsx:**
```typescript
// packages/app/src/App.tsx
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <DndContext>
        <GameBoard />
      </DndContext>
    </ErrorBoundary>
  );
}
```

**Granular error boundaries:**
```typescript
// Wrap specific sections
<ErrorBoundary fallback={<div>Activity log unavailable</div>}>
  <ActivityLog />
</ErrorBoundary>
```

---

### 2. Create Structured Logging System

**Priority:** 🔴 High  
**Effort:** 2-3 hours  
**Impact:** Better debugging, future analytics

**Recommendation:**
```typescript
// packages/app/src/utils/logger.ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: Error;
}

type LogHandler = (entry: LogEntry) => void;

class Logger {
  private handlers: LogHandler[] = [];
  private isDev = import.meta.env.DEV;
  
  constructor() {
    // Default console handler
    this.handlers.push((entry) => {
      if (!this.isDev && entry.level === 'debug') return;
      
      const args = [
        `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}`,
        entry.context || '',
      ];
      
      switch (entry.level) {
        case 'debug':
          console.debug(...args);
          break;
        case 'info':
          console.info(...args);
          break;
        case 'warn':
          console.warn(...args);
          break;
        case 'error':
          console.error(...args, entry.error);
          break;
      }
    });
  }
  
  addHandler(handler: LogHandler): void {
    this.handlers.push(handler);
  }
  
  private log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      error,
    };
    
    this.handlers.forEach(handler => {
      try {
        handler(entry);
      } catch (e) {
        console.error('Logger handler failed:', e);
      }
    });
  }
  
  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context);
  }
  
  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context);
  }
  
  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context);
  }
  
  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.log('error', message, context, error);
  }
}

export const logger = new Logger();

// Game-specific logging utilities
export const gameLogger = {
  move: (moveType: string, details: Record<string, unknown>) => {
    logger.debug(`Move: ${moveType}`, details);
  },
  
  stateChange: (change: string, details?: Record<string, unknown>) => {
    logger.debug(`State change: ${change}`, details);
  },
  
  autoPlay: (event: string, details?: Record<string, unknown>) => {
    logger.info(`AutoPlay: ${event}`, details);
  },
  
  performance: (operation: string, durationMs: number) => {
    if (durationMs > 16) { // Longer than one frame
      logger.warn(`Slow operation: ${operation}`, { durationMs });
    }
  },
};
```

**Usage:**
```typescript
// Instead of scattered console.log
import { logger, gameLogger } from '../utils/logger';

// In gameStore.ts
moveCardToTableau: (targetColumn) => {
  gameLogger.move('tableau_to_tableau', { 
    from: selected.columnIndex, 
    to: targetColumn,
    cardId: selected.card.id,
  });
  // ...
};

// For errors
importGameState: (jsonString) => {
  try {
    // ...
  } catch (error) {
    logger.error('Failed to import game state', error as Error, { 
      jsonLength: jsonString.length 
    });
    return false;
  }
};
```

---

### 3. Implement Typed Errors

**Priority:** 🟡 Medium  
**Effort:** 2-3 hours  
**Impact:** Better error handling

**Recommendation:**
```typescript
// packages/app/src/errors/index.ts
export enum GameErrorCode {
  INVALID_MOVE = 'INVALID_MOVE',
  INVALID_STATE = 'INVALID_STATE',
  IMPORT_FAILED = 'IMPORT_FAILED',
  EXPORT_FAILED = 'EXPORT_FAILED',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  AUTO_PLAY_ERROR = 'AUTO_PLAY_ERROR',
}

export class GameError extends Error {
  constructor(
    message: string,
    public readonly code: GameErrorCode,
    public readonly context?: Record<string, unknown>,
    public readonly recoverable: boolean = true
  ) {
    super(message);
    this.name = 'GameError';
  }
  
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      recoverable: this.recoverable,
    };
  }
}

export class InvalidMoveError extends GameError {
  constructor(reason: string, moveDetails: Record<string, unknown>) {
    super(`Invalid move: ${reason}`, GameErrorCode.INVALID_MOVE, moveDetails, true);
    this.name = 'InvalidMoveError';
  }
}

export class ImportError extends GameError {
  constructor(reason: string, details?: Record<string, unknown>) {
    super(`Import failed: ${reason}`, GameErrorCode.IMPORT_FAILED, details, true);
    this.name = 'ImportError';
  }
}

export class ValidationError extends GameError {
  constructor(field: string, issue: string) {
    super(`Validation failed: ${field} - ${issue}`, GameErrorCode.VALIDATION_FAILED, { field, issue }, true);
    this.name = 'ValidationError';
  }
}

// Error utility functions
export function isGameError(error: unknown): error is GameError {
  return error instanceof GameError;
}

export function getErrorMessage(error: unknown): string {
  if (isGameError(error)) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unknown error occurred';
}
```

---

### 4. Add User-Facing Error Messages

**Priority:** 🟡 Medium  
**Effort:** 2-3 hours  
**Impact:** Better UX

**Recommendation:**
```typescript
// packages/app/src/utils/userMessages.ts
import { GameErrorCode } from '../errors';

export const USER_MESSAGES: Record<GameErrorCode, string> = {
  [GameErrorCode.INVALID_MOVE]: 'That move is not allowed.',
  [GameErrorCode.INVALID_STATE]: 'The game is in an invalid state. Please restart.',
  [GameErrorCode.IMPORT_FAILED]: 'Failed to load the saved game. The file may be corrupted.',
  [GameErrorCode.EXPORT_FAILED]: 'Failed to save the game. Please try again.',
  [GameErrorCode.VALIDATION_FAILED]: 'The game data is invalid.',
  [GameErrorCode.AUTO_PLAY_ERROR]: 'Auto-play encountered an error.',
};

export function getUserMessage(code: GameErrorCode): string {
  return USER_MESSAGES[code] || 'Something went wrong.';
}
```

```typescript
// packages/app/src/components/Toast.tsx
import { useState, useEffect } from 'react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

// Simple toast store
let toasts: Toast[] = [];
let listeners: ((toasts: Toast[]) => void)[] = [];

export const toast = {
  success: (message: string) => addToast(message, 'success'),
  error: (message: string) => addToast(message, 'error'),
  info: (message: string) => addToast(message, 'info'),
};

function addToast(message: string, type: Toast['type']): void {
  const id = Math.random().toString(36).slice(2);
  toasts = [...toasts, { id, message, type }];
  listeners.forEach(l => l(toasts));
  
  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== id);
    listeners.forEach(l => l(toasts));
  }, 3000);
}

export function ToastContainer(): JSX.Element {
  const [current, setCurrent] = useState<Toast[]>([]);
  
  useEffect(() => {
    listeners.push(setCurrent);
    return () => {
      listeners = listeners.filter(l => l !== setCurrent);
    };
  }, []);
  
  return (
    <div className="fixed bottom-4 right-4 space-y-2 z-50">
      {current.map(t => (
        <div
          key={t.id}
          className={`px-4 py-2 rounded shadow-lg text-white ${
            t.type === 'error' ? 'bg-red-600' :
            t.type === 'success' ? 'bg-green-600' : 'bg-blue-600'
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
```

---

### 5. Add Debug Mode for Development

**Priority:** 🟡 Medium  
**Effort:** 2-3 hours  
**Impact:** Faster debugging

**Recommendation:**
```typescript
// packages/app/src/utils/debug.ts
interface DebugApi {
  getState: () => import('../types').GameState;
  setState: (partial: Partial<import('../types').GameState>) => void;
  autoWin: () => void;
  resetGame: () => void;
  showAllCards: () => void;
  logMoveHistory: () => void;
  performanceProfile: (fn: () => void) => void;
}

export function initDebugMode(): void {
  if (!import.meta.env.DEV) return;
  
  // Lazy import to avoid circular dependencies
  import('../store/gameStore').then(({ useGameStore }) => {
    const debugApi: DebugApi = {
      getState: () => useGameStore.getState(),
      
      setState: (partial) => useGameStore.setState(partial),
      
      autoWin: () => {
        console.log('🎉 Auto-win triggered');
        // Set up winning state
        useGameStore.setState({ gameWon: true });
      },
      
      resetGame: () => {
        useGameStore.getState().initializeGame();
        console.log('🔄 Game reset');
      },
      
      showAllCards: () => {
        useGameStore.setState({ godMode: true });
        console.log('👁️ God mode enabled');
      },
      
      logMoveHistory: () => {
        const history = useGameStore.getState().moveHistory;
        console.table(history.map((m, i) => ({
          index: i,
          type: m.type,
          card: `${m.card.rank} of ${m.card.suit}`,
        })));
      },
      
      performanceProfile: (fn) => {
        console.profile('Solitaire Performance');
        fn();
        console.profileEnd('Solitaire Performance');
      },
    };
    
    (window as any).solitaire = debugApi;
    console.log('🎮 Debug mode enabled. Access via window.solitaire');
    console.log('Available commands:', Object.keys(debugApi));
  });
}
```

```typescript
// packages/app/src/main.tsx
import { initDebugMode } from './utils/debug';

// Initialize debug mode in development
initDebugMode();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

---

### 6. Add Performance Monitoring Hooks

**Priority:** 🟢 Low  
**Effort:** 1-2 hours  
**Impact:** Identify bottlenecks

**Recommendation:**
```typescript
// packages/app/src/utils/performance.ts
import { logger } from './logger';

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
}

const metrics: PerformanceMetric[] = [];
const METRICS_LIMIT = 100;

export function measure<T>(name: string, fn: () => T): T {
  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;
  
  metrics.push({
    name,
    duration,
    timestamp: Date.now(),
  });
  
  // Keep only recent metrics
  if (metrics.length > METRICS_LIMIT) {
    metrics.shift();
  }
  
  // Warn on slow operations
  if (duration > 16) {
    logger.warn(`Slow operation: ${name}`, { duration: `${duration.toFixed(2)}ms` });
  }
  
  return result;
}

export async function measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  
  metrics.push({
    name,
    duration,
    timestamp: Date.now(),
  });
  
  if (metrics.length > METRICS_LIMIT) {
    metrics.shift();
  }
  
  if (duration > 100) {
    logger.warn(`Slow async operation: ${name}`, { duration: `${duration.toFixed(2)}ms` });
  }
  
  return result;
}

export function getMetrics(): PerformanceMetric[] {
  return [...metrics];
}

export function getAverageMetric(name: string): number {
  const matching = metrics.filter(m => m.name === name);
  if (matching.length === 0) return 0;
  return matching.reduce((sum, m) => sum + m.duration, 0) / matching.length;
}
```

---

### 7. Add Error Reporting Setup Guide

**Priority:** 🟢 Low (for production)  
**Effort:** 1-2 hours  
**Impact:** Production debugging

**Recommendation:**
```markdown
## Setting up Sentry (Optional)

For production error tracking, you can integrate Sentry:

### 1. Install
```bash
npm install @sentry/react -w app
```

### 2. Configure
```typescript
// packages/app/src/main.tsx
import * as Sentry from '@sentry/react';

if (import.meta.env.PROD) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}
```

### 3. Add environment variable
```env
# .env.production
VITE_SENTRY_DSN=your-sentry-dsn-here
```
```

---

## Error Handling Checklist for AI Agents

When adding error handling:

- [ ] Use typed errors (GameError subclasses)
- [ ] Log errors with context using logger utility
- [ ] Add user-facing messages for expected errors
- [ ] Wrap risky operations in try-catch
- [ ] Use ErrorBoundary for component trees
- [ ] Include recovery actions where possible
- [ ] Don't expose stack traces in production

---

**Author:** AI Analysis  
**Last Updated:** December 27, 2025
