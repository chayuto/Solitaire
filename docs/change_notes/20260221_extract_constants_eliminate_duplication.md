# Extract Game Constants & Eliminate Duplication

**Date:** 2026-02-21  
**Type:** Refactor (Safe, Self-contained)  
**Risk:** Low  
**Impact:** High — establishes single source of truth for game constants

---

## Summary

Extracted magic numbers from core game logic into a dedicated constants module and eliminated duplicated constant definitions between the `@chayuto/solitaire-core` library and the app package.

## Problem

1. **Magic numbers scattered across core source files**: The values `52` (deck size), `7` (tableau columns), and `13` (cards per suit) were used as raw literals in `engine/index.ts`, `scoring/index.ts`, and `utils/validation.ts`.
2. **Duplicated constants**: `SUITS`, `RANKS`, `RANK_VALUES`, `RED_SUITS`, `BLACK_SUITS`, `DECK_SIZE`, `TABLEAU_COLUMNS`, and `TABLEAU_INITIAL_CARDS` were independently defined in both `packages/core/src/utils/card.ts` and `packages/app/src/constants/game.ts`.
3. **Internal-only color arrays**: `RED_SUITS` and `BLACK_SUITS` were marked `@internal` in core, forcing the app to redefine them.

## Changes Made

### New Files
| File | Description |
|------|-------------|
| `packages/core/src/constants.ts` | Defines `DECK_SIZE`, `TABLEAU_COLUMNS`, `CARDS_PER_SUIT`, `NUM_SUITS`, `TABLEAU_INITIAL_CARDS` |
| `packages/core/src/constants.test.ts` | 7 tests validating constants and their relationships |

### Modified Files
| File | Change |
|------|--------|
| `packages/core/src/index.ts` | Export new constants + `RED_SUITS`/`BLACK_SUITS` from public API |
| `packages/core/src/utils/card.ts` | Made `RED_SUITS`/`BLACK_SUITS` public exports (were `@internal`) |
| `packages/core/src/utils/validation.ts` | Replaced local `DECK_SIZE = 52` and magic `7` with imported constants |
| `packages/core/src/scoring/index.ts` | Replaced `/ 52` with `/ DECK_SIZE` |
| `packages/core/src/engine/index.ts` | Replaced `Array(7)`, `< 7`, `=== 13` with `TABLEAU_COLUMNS`/`CARDS_PER_SUIT` |
| `packages/app/src/constants/game.ts` | Re-exports from `@chayuto/solitaire-core` instead of duplicating definitions |

## Test Coverage

- **7 new tests** in `packages/core/src/constants.test.ts` covering all constants and their mathematical relationships
- **All 405 existing tests pass** (256 core + 33 mcts + 116 app) — zero regressions
- Lint: clean
- Build: succeeds (core ESM+CJS + app production)

## Before/After

### Before (magic numbers)
```typescript
// scoring/index.ts
return (cardsInFoundations / 52) * 100;

// validation.ts  
const DECK_SIZE = 52; // local, not shared
if (state.tableau.length !== 7) { ... }

// engine/index.ts
const tableau = Array(7).fill(null).map(() => []);
state.foundations.hearts.length === 13
```

### After (named constants)
```typescript
// scoring/index.ts
import { DECK_SIZE } from '../constants';
return (cardsInFoundations / DECK_SIZE) * 100;

// validation.ts
import { DECK_SIZE, TABLEAU_COLUMNS } from '../constants';
if (state.tableau.length !== TABLEAU_COLUMNS) { ... }

// engine/index.ts
import { TABLEAU_COLUMNS, CARDS_PER_SUIT } from '../constants';
const tableau = Array(TABLEAU_COLUMNS).fill(null).map(() => []);
state.foundations.hearts.length === CARDS_PER_SUIT
```

### Before (duplicated constants in app)
```typescript
// app/constants/game.ts - 61 lines of redefined constants
export const SUITS: readonly Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
export const RANKS: readonly Rank[] = ['A', '2', ...] as const;
export const RANK_VALUES: Record<Rank, number> = { 'A': 1, ... };
export const DECK_SIZE = 52;
// ...etc
```

### After (re-export from core)
```typescript
// app/constants/game.ts - clean re-exports
export { SUITS, RANKS, RANK_VALUES, RED_SUITS, BLACK_SUITS, DECK_SIZE, TABLEAU_COLUMNS, TABLEAU_INITIAL_CARDS } from '@chayuto/solitaire-core';
// Only UI-specific constants defined locally (SUIT_SYMBOLS)
```

## Decisions

- **Constants live in core, not app**: Game rules are core library concerns; the app re-exports for convenience.
- **Kept `SUIT_SYMBOLS` in app**: Display symbols are UI-specific and don't belong in the pure game logic library.
- **No changes to types**: Type duplication between core (`readonly`) and app (mutable) is intentional for Zustand compatibility — left as-is for a future, more involved refactor.
