# Stage 1c — Unify app types with core

**Parent plan:** §4 Phase 1, item 1c
**Behavior change:** none (types + adapter only)
**Lands as:** one commit
**Depends on:** 1a (clean `MoveType`), 1b (single mutation pathway)

## Goal

One definition of `Card/Suit/Rank/Difficulty/Move/MoveType`: core's. The app's state type
becomes "core game state + app extras", and `coreAdapter` shrinks to a trivial projection.

## Current state

- `packages/app/src/types/index.ts:3–49` redefines `Suit`, `Rank`, `Difficulty`, `Card`,
  `MoveType`, `Move` — structurally identical to core's except:
  - core fields are `readonly`, app's are mutable;
  - app `Move.from.source` uses `'draw'`; core uses `'stock'`
    (`core/src/types/Move.ts:33`) — currently silenced by `as` casts in the adapter;
  - app `Move` adds `aiMove?/aiReasoning?/aiConfidence?` annotations (used by
    `askAIForMove` `gameStore.ts:1580–1588` and ActivityLog).
- `adapters/coreAdapter.ts` deep-copies the entire board both directions
  (`uiToCore`/`coreToUI`) with `as` casts, on every move, AI call, hash, and replay tick.
- After 1a, app `MoveType` == core `MoveType` (the autoplay values are gone).

## Changes

### 1. Core alignment (`packages/core/src/types/Move.ts`)

- `Move.from.source`: `'stock'` → `'draw'` (match shipped data: persisted sessions and
  exports contain `'draw'`; core is pre-1.0, no other consumers — verified mcts does not
  import core). Update core tests/fixtures referencing `'stock'`.

### 2. App types (`packages/app/src/types/index.ts`)

```ts
export type { Suit, Rank, Difficulty, Card, MoveType, MoveCommand } from '@chayuto/solitaire-core';
import type { Move as CoreMove } from '@chayuto/solitaire-core';

/** Core move record + AI annotations the app attaches. */
export interface Move extends CoreMove {
  aiMove?: boolean;
  aiReasoning?: string;
  aiConfidence?: number;
}
```

- `InitialBoardSetup`: re-export core's (`core/src/types/GameState.ts` defines it).
- App `GameState`: keep the flat shape (slicing happens in Stage 2b), but its board
  fields now use core types. Mutability: app code spreads-and-replaces rather than
  mutating in place (Zustand idiom, already true in the store), so adopting core's
  `readonly` fields is mostly compatible. Where the compiler flags genuine in-place
  mutation (expected: replay reducer's `newState.tableau[i] = ...`,
  `gameStore.ts:1261–1304`, and `.pop()` calls `:1270–1291`), rewrite those few sites
  immutably rather than weakening types.
- `ReadonlyArray` friction in component props (e.g. `Card[]` props) → type props as
  `readonly Card[]` (display-only components never mutate).

### 3. Adapter (`adapters/coreAdapter.ts`)

- `uiToCore`: field projection only — **no copying, no casts** (types now match):
  pick the 10 core fields off the app state. O(1) instead of O(deck).
- `coreToUI`: merge of core fields over existing app state — plain spread, no
  per-pile array cloning (engine results are already fresh objects).
- Delete the defensive deep copies; keep the function names/signatures so call sites
  don't churn.

### 4. Sweep

- Remove now-redundant `as Card`/`as Move[]` casts (grep `as Card`, `as readonly`,
  `as Move` under `packages/app/src`).
- `DEFAULT_AI_CONFIG` import in the adapter (`coreAdapter.ts:15`) becomes unnecessary
  if `coreToUI` no longer fabricates config defaults — verify and drop.

## Tests

- Typecheck is the main gate (`pnpm -r typecheck`).
- `coreAdapter.test.ts` (253 lines): update — copy-semantics assertions (e.g. "mutating
  the result does not affect input") change to projection semantics; keep
  field-completeness assertions.
- Full app + core suites; e2e determinism spec (hashing flows through `uiToCore`).

## Acceptance

- `packages/app/src/types/index.ts` defines no structural duplicates of core types
  (only re-exports + the `Move` extension + app-only types).
- `coreAdapter.ts` < 60 lines, zero `as` casts.
- No `'stock'` literal remains in either package (grep).

## Risks

- `readonly` adoption can fan out through component props — bounded by the fact that
  components already treat state as immutable; fix-forward with `readonly` prop types.
- Hidden reliance on adapter deep-copies (e.g. a caller mutating `uiToCore` output).
  Audit call sites: `gameStore.ts` (hash, legal moves, progress), `applyMove.ts` (1b),
  replay progress calc `:1321`. Engine never mutates inputs (pure), so projection is safe.
