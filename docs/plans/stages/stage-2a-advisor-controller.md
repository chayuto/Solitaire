# Stage 2a — Extract the AI advisor controller from the store

**Parent plan:** §4 Phase 2, item 2a
**Behavior change:** none (same actions, same state fields, same UI)
**Lands as:** one commit
**Depends on:** 1b (`applyMoveCommand` is a direct engine call, not selection simulation)

## Goal

The ~480 lines of AI orchestration leave `gameStore.ts`; the 7 module-scope mutable
variables become owned controller state with an explicit `reset()`. The store keeps only
delegating actions and the `ai*` state fields (UI contract unchanged).

## Current state

- Module-scope run state (`gameStore.ts:75–120`): `aiAbortController`,
  `aiAutoStateHistory`, `aiAutoLastProgress`, `aiAutoStallCount`,
  `aiAutoRecentMoveTypes`, `aiAutoStalled`, `aiAutoTurnCap` — reset by hand at
  `toggleAIAutoPlay` (`:1718–1730`) and on new game; invisible to Zustand and to tests.
- `askAIForMove` (`:1369–1699`): guards → provider/key resolution → legal-move
  generation (shuffled) → forced-move shortcut (`:1428–1464`) → context build → retry
  loop → resignation handling (`:1521–1557`) → apply + annotate history (`:1576–1596`)
  → decision record (`:1601–1633`) → auto-play chaining → transient-error cooldown with
  `setTimeout` re-entry (`:1680–1685`).
- `continueAIAutoPlay` (`:1735–1839`): turn-cap, loop detection (state hashing), 
  two-gate stall detection (delegating to `ai/stallDetection.ts`), `setTimeout` next-turn.
- `toggleAIAutoPlay` (`:1701–1733`), `cancelAIRequest` (`:1841–1846`),
  `exportAIInteractions` (`:1871`), plus `aiAutoStalled` read at export time.
- One-way dependency holds: nothing under `ai/` imports the store — the controller goes
  in `ai/` and *receives* store access, keeping that invariant.

## Changes

### 1. New `packages/app/src/ai/advisorController.ts`

```ts
export interface AdvisorDeps {
  get: () => GameState & StoreActions;   // narrowed view: fields + applyMoveCommand etc.
  set: (partial: Partial<GameState>) => void;
  engine: GameEngine;
}

export function createAdvisorController(deps: AdvisorDeps) {
  // former module-scope vars, now instance state:
  let abortController: AbortController | null = null;
  let stateHistory: string[] = [];
  /* lastProgress, stallCount, recentMoveTypes, stalled, turnCap */
  return {
    askForMove,            // body of askAIForMove, verbatim apart from var renames
    continueAutoPlay,      // body of continueAIAutoPlay
    startAutoPlay, stopAutoPlay,   // split of toggleAIAutoPlay (start arms turnCap etc.)
    cancel,                // cancelAIRequest body
    resetRunState,         // explicit reset, called on new game / load session
    wasStalled: () => stalled,     // export-time outcome read (gameStore.ts:108 note)
  };
}
```

- Timers: keep `setTimeout`, but hold the handle; `stopAutoPlay`/`resetRunState`
  clears it (today an orphaned timeout can fire after stop — it re-checks state so it's
  benign, but owned timers make it provably dead).
- The forced-move/annotation/decision-record logic moves verbatim — it already only
  touches state through `get`/`set`/`applyMoveCommand`.

### 2. Store (`gameStore.ts`)

- Construct once at module scope: `const advisor = createAdvisorController({get, set:
  storeSet, engine})` — inside the `create()` callback where `get`/`set` exist.
- Actions become delegations: `askAIForMove: () => advisor.askForMove()`, etc.
  `toggleAIAutoPlay` keeps its guard messages (replay/auto-play conflicts) since those
  read store-wide state, then calls `advisor.startAutoPlay()`/`stopAutoPlay()`.
- `initializeGame` / `loadSavedSession` call `advisor.resetRunState()` (replaces today's
  scattered manual resets — verify each current reset site is covered:
  `:1718–1730` and the new-game path).
- The ai-log export outcome (`stalled_auto_terminated`) reads `advisor.wasStalled()`.

### 3. Test bridge

`testBridge.ts` AI hooks (`setProviderOverride`, stub flows) are unaffected — they
operate on the provider registry, not the orchestration. `aiAdvisor.test.ts` (662 lines)
exercises store actions; delegation keeps its surface identical. Add a controller-level
test for `resetRunState` (turn cap re-arms; stall counters clear) — previously untestable.

## Order of work

1. Move `continueAIAutoPlay` + run-state vars (smallest coupling) → suite green.
2. Move `askAIForMove` → green (this drags the abort controller along).
3. Split `toggleAIAutoPlay`; wire `resetRunState`; delete the module-scope vars.

## Acceptance

- `gameStore.ts` has no module-scope `let` (grep `^let ` → 0) and shrinks ~450 lines.
- `grep -rn "from '../store" packages/app/src/ai/` → still empty (one-way dependency
  preserved; controller gets store access via injection only).
- `aiAdvisor.test.ts` passes unmodified (or with import-path-only edits).

## Risks

- Subtle behavior in the transient-error `setTimeout` re-entry (`:1680`) interacting
  with cancel — preserve the `get().aiAutoPlay && !get().aiThinking` re-check verbatim.
- Double-construction in tests (store re-created per test) → controller must be created
  inside `create()` so each store instance owns exactly one controller.
