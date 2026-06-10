# Stage 1a — Move telemetry events out of `moveHistory`

**Parent plan:** §4 Phase 1, item 1a
**Behavior change:** none user-visible (Activity Log renders identically); data shape changes
**Lands as:** one commit

## Goal

`moveHistory` contains only real game moves (core's `MoveType`). Auto-play lifecycle
telemetry moves to a parallel `eventLog`. This unblocks Stage 1c (app `MoveType` ==
core `MoveType`) and removes the filter hacks.

## Current state

- App `MoveType` (`packages/app/src/types/index.ts:16–27`) = core's 7 move types **plus**
  `autoplay_start | autoplay_stop | autoplay_deadend | autoplay_loop_detected`.
- Pseudo-moves are pushed with a fake marker card (`{suit:'hearts', rank:'A',
  id:'autoplay-marker'}`) at `gameStore.ts:904–913, 925–935, 955–965, 999–1010, 1070–1081`.
- Consumers that special-case them:
  - `adapters/coreAdapter.ts:33` — filters them out before handing state to core.
  - `ai/context/buildContext.ts:28–31` — excludes them from the prompt's RECENT MOVES.
  - `components/ActivityLog.tsx:128–137, 223–224` — renders them as event rows.
  - `store/gameStore.ts` replay (`goToReplayIndex`, 1217–1309) — no `case` for them;
    silently skipped (replay indices still count them).
- Persisted everywhere `moveHistory` is persisted: localStorage sessions
  (`sessionPersistence.ts:37`), `exportGameState` JSON, win/ai-log exports.
- Note: `recycle_stock` entries also use a marker card (`gameStore.ts:736`,
  `id:'recycle-marker'`) but recycle **is** a real core move — it stays in `moveHistory`.
  The marker-card hack for it is untouched here (Move.card is required; revisit in 1c).

## Changes

### 1. Types (`packages/app/src/types/index.ts`)

```ts
export type GameEventType =
  | 'autoplay_start' | 'autoplay_stop'
  | 'autoplay_deadend' | 'autoplay_loop_detected';

export interface GameEvent {
  type: GameEventType;
  timestamp: number;
  /** moveHistory.length at the moment the event fired (anchors it in the timeline). */
  atMoveIndex: number;
}
```

- Remove the four values from `MoveType`; remove the optional autoplay marker semantics.
- `GameState` gains `eventLog: GameEvent[]` (non-optional, default `[]`).

### 2. Store (`gameStore.ts`)

- The five push sites append `{type, timestamp: Date.now(), atMoveIndex:
  state.moveHistory.length}` to `eventLog` instead of `moveHistory`.
- `buildInitialState` / `initializeGameState`: `eventLog: []`.
- Autosave signature (`gameStore.ts:1952`): add `|${state.eventLog.length}` so events
  still trigger a save.

### 3. Hydration & import migration (one shared helper)

`store/migrations.ts` → `splitLegacyMoveHistory(moves): {moveHistory, eventLog}`:
partition any `autoplay_*` entries from old data into events (using their position as
`atMoveIndex`). Apply in:
- `hydratePersisted` (`gameStore.ts:323`) — old localStorage sessions.
- `importGameState` (`gameStore.ts:813`) — old exported JSON files.
- `PersistedGameState` (`sessionPersistence.ts`) gains `eventLog` (optional on read for
  backward compat, always written).

### 4. Consumers

- `coreAdapter.ts`: delete the filter (`:33`) — moveHistory is now clean.
- `buildContext.ts`: delete the exclusion list (`:28–31`).
- `ActivityLog.tsx`: render a merged timeline — interleave `eventLog` entries into the
  move list by `atMoveIndex` (keeps today's visual output: event rows between moves).
  The `lead.type.startsWith('autoplay_')` checks switch to `GameEvent` discrimination.
- Replay: no change needed — `moveHistory` no longer contains no-op entries, so
  `replayIndex` semantics *improve* (every index is a real move). `startReplay`'s
  length check unaffected.
- Metrics/insights (`MoveMix`, `useProgressHistory`, `gameStore.metrics.test.ts`): they
  consume `moveHistory` raw; pseudo-move removal changes counts for autoplay games —
  update test expectations accordingly (this is a fidelity *fix*: churn metrics no longer
  count telemetry rows).

### 5. Exports

- `exportGameState` / win export / ai-log export: include `eventLog`. Bump any export
  schema marker if one exists (check `exportGameState`, `gameStore.ts:771–812`).

## Tests

- Update store tests asserting `moveHistory` contents around autoplay
  (`gameStore.test.ts` autoplay sections; `uiHelpers.test.ts` if it builds fixtures with
  pseudo-moves).
- New: `migrations.test.ts` — legacy history with interleaved `autoplay_*` splits
  correctly; idempotent on clean histories.
- New: hydrating a pre-change persisted session (fixture JSON pasted from current format)
  produces clean `moveHistory` + populated `eventLog`.
- e2e: `scenarios.spec.ts`/`game-interactions.spec.ts` autoplay flows must stay green;
  Activity Log shows event rows (existing assertions cover this).

## Acceptance

- `grep -rn "autoplay_" packages/app/src/types/index.ts` → only `GameEventType`.
- `coreAdapter` and `buildContext` contain no move-type filtering.
- Loading a session saved before this change (manual: keep one in localStorage across the
  upgrade) shows the same Activity Log timeline.

## Risks

- Old persisted sessions/exports are the main hazard → the shared migration helper +
  fixture-based tests cover both entry points.
- ActivityLog interleaving must preserve ordering for same-timestamp entries — sort by
  (`atMoveIndex`, then timestamp), stable.
