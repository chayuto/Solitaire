# Stage 2b — Split the store into slices

**Parent plan:** §4 Phase 2, item 2b
**Behavior change:** none (public store API and state shape unchanged — flat state, same
action names; only file organization and internals move)
**Lands as:** one commit (internally slice-by-slice, suite green between)
**Depends on:** 1b, 2a (the two big extractions that make slicing mechanical)

## Goal

`gameStore.ts` becomes an assembly file; each concern lives in its own
`store/slices/*.ts` under ~400 lines, individually testable. Module side effects
(autosave subscriber) become explicit initialization.

## Current state (post-2a projection)

After Stages 1a–2a, `gameStore.ts` still holds (~1,100 lines): init/deal/hydration
(`:209–388`), selection + validation delegations, wrapper move actions (1b), UI toggles,
the heuristic autoplay engine (`:891–1111`), replay (`:1113–1327` incl. the 140-line
record-reducer), import/export, session actions, modal state, the autosave subscriber
(`:1931–1966`, module side effect), AI delegations.

## Changes

### 1. Zustand slice pattern (flat result state — no consumer churn)

```ts
// store/slices/types.ts: GameStore = GameSlice & UiSlice & ReplaySlice & ...
// each slice: (set, get) => ({ ...fields, ...actions })
export const useGameStore = create<GameStore>()((...a) => ({
  ...createGameSlice(...a),     // board state, move wrappers, init, import/export
  ...createUiSlice(...a),       // selectedCard, toggles, modals, dismissWinModal
  ...createAutoplaySlice(...a), // heuristic autoplay engine + its timers
  ...createReplaySlice(...a),   // replay state + record-reducer (own module)
  ...createAiSlice(...a),       // ai* fields + advisor delegations (2a controller)
  ...createSessionSlice(...a),  // load/delete/list saved sessions
}));
```

File targets:

| File | Content moved | Est. lines |
|---|---|---|
| `slices/gameSlice.ts` | init/deal/hydration, move wrappers, import/export | ~350 |
| `slices/uiSlice.ts` | selection, validation delegations, toggles, modals | ~120 |
| `slices/autoplaySlice.ts` | toggle/perform/checkAndTrigger + timer handle | ~230 |
| `slices/replaySlice.ts` | 8 replay actions (reducer imported) | ~120 |
| `store/replayReducer.ts` | the `goToReplayIndex` switch (`:1217–1309`) as a pure `applyRecordedMove(board, move)` | ~120 |
| `slices/aiSlice.ts` | ai\* fields + controller delegations | ~80 |
| `slices/sessionSlice.ts` | saved-session actions | ~60 |
| `store/persistence.ts` | autosave subscriber + tab anchoring as `initSessionPersistence(store)` | ~60 |
| `gameStore.ts` | assembly + `GameStore` type + engine instance | ~80 |

### 2. Replay reducer extraction (the third rules implementation, made explicit)

`applyRecordedMove` is a *record*-level reducer (one history entry at a time, including
per-card `tableau_to_tableau` records and the legacy draw-recycles-implicitly branch,
`:1218–1236`). It stays record-level deliberately — old persisted histories replay
byte-identically. Unit-test it directly with recorded fixtures (new capability).

### 3. Explicit persistence init

- `store/persistence.ts` exports `initSessionPersistence(useGameStore)`; the
  `typeof window !== 'undefined'` guard and the debounced-save signature move with it.
- Called from `main.tsx` right after store import. Tests construct stores without
  side effects (today the subscriber attaches on import of `gameStore`).
- The autosave signature string (`:1952–1956`) is centralized here; 1a already added
  `eventLog.length` to it.

### 4. Timer ownership

`autoplaySlice` keeps its `setTimeout` chain but stores the handle in slice state;
`toggleAutoPlay(false)`/`initializeGame` clear it. Replay's step timer likewise in
`replaySlice` (today: `:1130, 1148, 1174`).

### 5. `ControlPanel.tsx:17`

Replace the bare `useGameStore()` destructure with narrow selectors (actions are stable
references; select them individually).

## Tests

- Existing store suites must pass with only import-path edits — the store's public
  shape is unchanged by design.
- New: `replayReducer.test.ts` (fixtures from a recorded seeded game, including a
  multi-card move and a recycle); `persistence` init test (no autosave before init;
  debounced save after).
- e2e untouched and green (the bridge talks to the same store API).

## Acceptance

- `wc -l packages/app/src/store/*.ts packages/app/src/store/slices/*.ts` — no file
  over ~400 lines.
- Importing `gameStore` in a test runs zero timers/subscriptions (verified by the new
  persistence test).
- No component diff except `ControlPanel` selectors.

## Risks

- Cross-slice action calls (`get().checkAndTriggerAutoComplete()` from gameSlice;
  autoplay calling move wrappers) — fine under the slice pattern (all slices share one
  `get`), but the `GameStore` type must be the *combined* type in every slice signature.
- Import cycles between slices → slices import only types + helpers, never each other;
  cross-slice calls go through `get()`.
