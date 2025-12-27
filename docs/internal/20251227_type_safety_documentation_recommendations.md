# Type Safety & Documentation Recommendations

**Date:** December 27, 2025  
**Status:** 📋 Recommendations for AI Coding Agents  
**Priority:** 🔴 High

---

## Executive Summary

This document provides recommendations for improving type safety, documentation, and code clarity in the Solitaire monorepo, making it easier for AI coding agents to understand and modify the codebase safely.

---

## Current State Analysis

### Strengths ✅
1. **TypeScript strict mode** enabled
2. **Readonly types** used in core library for immutability
3. **Good type definitions** in `types/` directories
4. **JSDoc comments** on public APIs (API.md)
5. **Type exports** properly configured in package.json

### Areas for Improvement 🔧
1. **Inconsistent JSDoc coverage** - many functions lack documentation
2. **Type assertions** (`as any`, `as const`) scattered in code
3. **Missing return type annotations** on some functions
4. **Duplicate type definitions** between core and app packages
5. **No runtime type validation** at package boundaries
6. **Missing error types** - strings used instead of typed errors

---

## Recommendations

### 1. Add Comprehensive JSDoc Comments

**Priority:** 🔴 High  
**Effort:** 4-6 hours  
**Impact:** Better AI understanding, IDE hints

**Current Issue:**
Many functions lack documentation:
```typescript
// Missing JSDoc
const scoreMove = (move: PossibleMove): number => {
  let score = 0;
  // 500 lines of complex scoring logic...
}
```

**Recommendation:**
Add JSDoc with examples and edge cases:

```typescript
/**
 * Calculate a score for an auto-play move based on strategic priorities.
 * 
 * Higher scores indicate better moves. The scoring follows these priorities:
 * 1. UNLOCK TABLEAU (1000000+) - Moves that reveal face-down cards
 * 2. KING MANAGEMENT (100000+) - Proper King placement
 * 3. FOUNDATION HANDLING (10000+) - Moving cards to foundations
 * 4. DRAW PILE MANAGEMENT (1000+) - Using draw pile strategically
 * 5. FLEXIBILITY (100+) - Maintaining options
 * 
 * @param move - The move to score
 * @param state - Current game state
 * @param config - Scoring configuration (optional)
 * @returns Numeric score (can be negative for bad moves)
 * 
 * @example
 * const score = scoreMove(
 *   { card: aceOfHearts, targetType: 'foundation' },
 *   gameState
 * );
 * // Returns ~50000 for ace to foundation (high priority)
 * 
 * @example
 * const score = scoreMove(
 *   { card: queenOfSpades, targetType: 'tableau', targetColumn: 3 },
 *   gameState
 * );
 * // Returns negative if moving to empty column without King
 * 
 * @see AUTOPLAY_CONFIG for configurable scoring values
 * @see {@link selectBestMove} for using scores in move selection
 */
function scoreMove(
  move: PossibleMove,
  state: GameState,
  config?: ScoringConfig
): number {
  // Implementation...
}
```

**Template for AI Agents:**
```typescript
/**
 * [Brief description of what the function does]
 * 
 * [Detailed explanation if complex]
 * 
 * @param paramName - Description of parameter
 * @returns Description of return value
 * @throws {ErrorType} When this error occurs
 * 
 * @example
 * // Show typical usage
 * const result = functionName(args);
 * 
 * @see RelatedFunction for context
 * @internal Use @internal for non-public APIs
 */
```

---

### 2. Add Explicit Return Types

**Priority:** 🔴 High  
**Effort:** 2-3 hours  
**Impact:** Catch type errors earlier

**Current Issue:**
Some functions rely on type inference:
```typescript
// Return type inferred - can cause issues
const initializeGameState = (difficulty = DEFAULT_DIFFICULTY) => {
  // Complex logic...
  return {
    drawPile,
    discardPile,
    // Many properties...
  };
};
```

**Recommendation:**
Always add explicit return types:

```typescript
function initializeGameState(
  difficulty: Difficulty = DEFAULT_DIFFICULTY
): GameState {
  // Implementation...
}

// Arrow functions too
const calculateScore = (state: GameState): number => {
  // Implementation...
};
```

**ESLint Rule:**
```javascript
// packages/app/eslint.config.js
{
  rules: {
    '@typescript-eslint/explicit-function-return-type': ['warn', {
      allowExpressions: true,
      allowTypedFunctionExpressions: true,
    }],
  },
}
```

---

### 3. Create Typed Error Classes

**Priority:** 🔴 High  
**Effort:** 2-3 hours  
**Impact:** Better error handling

**Current Issue:**
Errors are thrown as strings:
```typescript
throw new Error('Invalid tableau to tableau move: missing column information');
throw new Error('Cannot move from empty discard pile');
```

**Recommendation:**
Create typed error classes:

```typescript
// packages/core/src/errors/index.ts
export class GameError extends Error {
  constructor(
    message: string,
    public readonly code: GameErrorCode,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'GameError';
  }
}

export type GameErrorCode =
  | 'INVALID_MOVE'
  | 'EMPTY_SOURCE'
  | 'INVALID_TARGET'
  | 'INVALID_STATE'
  | 'VALIDATION_FAILED';

export class InvalidMoveError extends GameError {
  constructor(
    message: string,
    public readonly moveType: string,
    public readonly reason: string
  ) {
    super(message, 'INVALID_MOVE', { moveType, reason });
    this.name = 'InvalidMoveError';
  }
}

export class ValidationError extends GameError {
  constructor(
    message: string,
    public readonly field: string
  ) {
    super(message, 'VALIDATION_FAILED', { field });
    this.name = 'ValidationError';
  }
}
```

**Usage:**
```typescript
// Before
throw new Error('Invalid move');

// After
throw new InvalidMoveError(
  'Cannot move card to this column',
  'tableau_to_tableau',
  'Target column requires opposite color card'
);
```

**Error handling:**
```typescript
try {
  engine.applyMove(state, move);
} catch (error) {
  if (error instanceof InvalidMoveError) {
    console.log(`Move failed: ${error.reason}`);
  } else if (error instanceof ValidationError) {
    console.log(`Validation failed: ${error.field}`);
  }
}
```

---

### 4. Add Runtime Type Validation at Boundaries

**Priority:** 🟡 Medium  
**Effort:** 3-4 hours  
**Impact:** Catch invalid data early

**Recommendation:**
Use Zod for runtime validation:

```bash
npm install zod -w @chayuto/solitaire-core
```

```typescript
// packages/core/src/validation/schemas.ts
import { z } from 'zod';

export const CardSchema = z.object({
  suit: z.enum(['hearts', 'diamonds', 'clubs', 'spades']),
  rank: z.enum(['A','2','3','4','5','6','7','8','9','10','J','Q','K']),
  faceUp: z.boolean(),
  id: z.string(),
});

export const FoundationsSchema = z.object({
  hearts: z.array(CardSchema),
  diamonds: z.array(CardSchema),
  clubs: z.array(CardSchema),
  spades: z.array(CardSchema),
});

export const GameStateSchema = z.object({
  drawPile: z.array(CardSchema),
  discardPile: z.array(CardSchema),
  foundations: FoundationsSchema,
  tableau: z.array(z.array(CardSchema)).length(7),
  moveHistory: z.array(z.any()), // Simplified
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  gameWon: z.boolean(),
  completionProgress: z.number().min(0).max(100),
});

// Type inference from schema
export type ValidatedGameState = z.infer<typeof GameStateSchema>;

// Validation function
export function validateImportedState(data: unknown): GameState {
  return GameStateSchema.parse(data);
}
```

**Usage in import:**
```typescript
public importState(json: string): GameState {
  try {
    const data = JSON.parse(json);
    return validateImportedState(data); // Runtime validation
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(
        `Invalid game state: ${error.errors[0].message}`,
        error.errors[0].path.join('.')
      );
    }
    throw error;
  }
}
```

---

### 5. Eliminate Type Assertions

**Priority:** 🟡 Medium  
**Effort:** 2-3 hours  
**Impact:** Safer code

**Current Issue:**
Type assertions bypass TypeScript checks:
```typescript
// Dangerous - bypasses type checking
const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
for (const suit of suits) {
  if (get().canMoveToFoundation(card, suit)) {
    // ...
  }
}

// Also common
(command as any).type
```

**Recommendation:**
Use type guards instead:

```typescript
// Type guard function
function isSuit(value: string): value is Suit {
  return ['hearts', 'diamonds', 'clubs', 'spades'].includes(value);
}

// Usage
function processCard(card: Card): void {
  if (isSuit(card.suit)) {
    // TypeScript knows card.suit is Suit
  }
}
```

```typescript
// For move commands - use exhaustive switch
function handleCommand(command: MoveCommand): void {
  switch (command.type) {
    case 'draw_card':
      // TypeScript knows command structure
      break;
    case 'tableau_to_tableau':
      // command.from and command.to available
      break;
    // ... all cases
    default:
      // TypeScript catches unhandled cases
      const _exhaustive: never = command;
      throw new Error(`Unhandled command: ${_exhaustive}`);
  }
}
```

---

### 6. Unify Type Definitions

**Priority:** 🟡 Medium  
**Effort:** 2-3 hours  
**Impact:** Eliminate duplication

**Current Issue:**
Types defined separately in core and app:
```typescript
// packages/core/src/types/Card.ts
export interface Card {
  readonly suit: Suit;
  readonly rank: Rank;
  readonly faceUp: boolean;
  readonly id: string;
}

// packages/app/src/types/index.ts
export interface Card {
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
  id: string;
}
```

**Recommendation:**
App should re-export from core with UI extensions:

```typescript
// packages/app/src/types/index.ts
// Re-export core types
export type {
  Card,
  Suit,
  Rank,
  Difficulty,
} from '@chayuto/solitaire-core';

// UI-specific types only
export type MoveType = 
  | import('@chayuto/solitaire-core').MoveType
  | 'autoplay_start'
  | 'autoplay_stop'
  | 'autoplay_deadend'
  | 'autoplay_loop_detected';

// Mutable version for Zustand store (if needed)
export interface MutableCard extends Omit<import('@chayuto/solitaire-core').Card, never> {
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
  id: string;
}

// UI-specific game state extending core
export interface UIGameState extends import('@chayuto/solitaire-core').GameState {
  selectedCard?: SelectedCard;
  showValidMoves: boolean;
  godMode: boolean;
  autoPlayEnabled: boolean;
  autoPlayInProgress: boolean;
  autoPlayStateHistory?: string[];
  replayMode: boolean;
  replayIndex: number;
  replayPaused: boolean;
  replaySpeed: number;
}
```

---

### 7. Add Type Documentation Comments

**Priority:** 🟡 Medium  
**Effort:** 1-2 hours  
**Impact:** Better IDE experience

**Recommendation:**
Document all types with JSDoc:

```typescript
/**
 * Represents a playing card in Klondike Solitaire.
 * 
 * Cards are immutable - create new cards instead of modifying.
 * Use `createCard()` to create new cards with proper ID generation.
 * 
 * @example
 * const aceOfSpades: Card = {
 *   suit: 'spades',
 *   rank: 'A',
 *   faceUp: true,
 *   id: 'spades-A'
 * };
 */
export interface Card {
  /** 
   * The card's suit (hearts, diamonds, clubs, spades).
   * Hearts and diamonds are red; clubs and spades are black.
   */
  readonly suit: Suit;
  
  /** 
   * The card's rank (A, 2-10, J, Q, K).
   * Ace has rank value 1, King has rank value 13.
   */
  readonly rank: Rank;
  
  /** 
   * Whether the card is face-up (visible) or face-down (hidden).
   * In tableau, cards flip when exposed by moving cards above them.
   */
  readonly faceUp: boolean;
  
  /** 
   * Unique identifier for this card.
   * Format: "{suit}-{rank}" (e.g., "hearts-A", "spades-K").
   * Used for React keys and state tracking.
   */
  readonly id: string;
}

/**
 * Difficulty level for game generation.
 * Higher values = more random = harder games.
 * 
 * - 1: Very Easy - Cards pre-arranged for easy wins
 * - 2: Easy - Partially arranged
 * - 3: Normal - Balanced randomization (default)
 * - 4: Hard - More random
 * - 5: Very Hard - Fully randomized
 */
export type Difficulty = 1 | 2 | 3 | 4 | 5;
```

---

### 8. Create Type Utilities

**Priority:** 🟢 Low  
**Effort:** 1-2 hours  
**Impact:** Cleaner type definitions

**Recommendation:**
Add utility types:

```typescript
// packages/core/src/types/utils.ts

/** Make all properties mutable (remove readonly) */
export type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

/** Make specific properties optional */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/** Make specific properties required */
export type RequiredBy<T, K extends keyof T> = T & Required<Pick<T, K>>;

/** Extract array element type */
export type ArrayElement<T> = T extends readonly (infer E)[] ? E : never;

/** Deep readonly type */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/** Non-nullable version of a type */
export type NonNullableFields<T> = {
  [P in keyof T]: NonNullable<T[P]>;
};
```

**Usage:**
```typescript
// For Zustand store (needs mutable state)
type MutableGameState = Mutable<GameState>;

// For initial state (some fields optional)
type InitialState = PartialBy<GameState, 'moveHistory' | 'completionProgress'>;

// Get card type from tableau
type TableauCard = ArrayElement<GameState['tableau'][number]>;
```

---

## Documentation Structure Recommendations

```
packages/
├── core/
│   ├── API.md              # API reference (exists)
│   ├── CHANGELOG.md        # Version history (exists)
│   ├── README.md           # Quick start (exists)
│   ├── TYPES.md            # NEW: Type documentation
│   └── src/
│       └── *.ts            # Inline JSDoc
│
└── app/
    ├── README.md           # App-specific docs
    ├── TESTING.md          # NEW: Testing guide
    └── src/
        └── *.ts            # Inline JSDoc
```

---

## AI Agent Documentation Checklist

When adding or modifying code:

- [ ] Add JSDoc to all public functions
- [ ] Include `@param`, `@returns`, `@throws`
- [ ] Add `@example` for complex functions
- [ ] Use `@internal` for non-public APIs
- [ ] Add explicit return types
- [ ] Document edge cases in comments
- [ ] Use typed errors instead of strings
- [ ] Validate data at package boundaries

---

**Author:** AI Analysis  
**Last Updated:** December 27, 2025
