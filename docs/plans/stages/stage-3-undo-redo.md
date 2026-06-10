# Stage 3 — Undo/redo

**Parent plan:** §4 Phase 3 · supersedes the command-pattern design in
`docs/internal/20260117_upcoming_tasks.md` §1
**Behavior change:** new user-facing feature
**Lands as:** one commit
**Depends on:** 1b (single mutation pathway), 2b (gameSlice owns it cleanly)

## Design: bounded snapshot stack (not inverse commands)

A Klondike state is ~52 card objects + piles — a few KB. Snapshotting beats inverse
commands because the store's history records are *per-card* (a 5-card move is 5 records
+ a flip record), so "pop one command and invert it" needs grouping logic that snapshots
make unnecessary. With 1b in place there is exactly one mutation chokepoint to hook.

## State & types

```ts
// gameSlice additions (NOT persisted, NOT exported):
undoStack: GameSnapshot[];   // capped at UNDO_STACK_LIMIT = 50
redoStack: GameSnapshot[];

interface GameSnapshot {     // the replayable board + history subset
  drawPile; discardPile; foundations; tableau;          // board
  moveHistory; eventLog; recycleCount; completionProgress; gameWon;  // record state
}
```

Captured via structured clone of those fields only (`snapshotOf(state)` helper —
**not** the whole store: AI fields, config, modals, replay state are excluded).

## Semantics

- **Capture:** in the 1b wrapper (`applyCommandToState` call sites) push
  `snapshotOf(prev)` onto `undoStack` (cap 50, drop oldest), clear `redoStack` — one
  snapshot per *user-visible action* (a multi-card move + flip = one snapshot, because
  it is one wrapper call; a draw = one).
- **undo():** guards — `replayMode`, `aiThinking`, `aiAutoPlay`, `autoPlayEnabled`,
  empty stack → no-op. Push `snapshotOf(current)` to `redoStack`, pop + apply undo top.
  `selectedCard: undefined`. Does **not** fire `checkAndTriggerAutoComplete` (undoing
  into a completable position must not instantly re-complete).
- **redo():** mirror image.
- **Stack resets:** `initializeGame`, `loadSavedSession`, `importGameState` clear both
  stacks. Win clears nothing (undoing a win is allowed and sets `gameWon` back — the
  snapshot's `gameWon:false` restores it; `winModalDismissed` untouched).
- **AI/auto-play policy:** moves made *by* AI or heuristic autoplay still capture
  snapshots (they go through the same wrapper), so a user can undo what the AI did
  after stopping it — but undo is disabled *while* either is running (guards above).
  AI session purity: an undo during a harvested AI game would contaminate the dataset —
  acceptable because undo only works once AI play stops, and the interaction log
  already records `movesApplied` per turn; note the caveat in the ai-log export docs.
- **Telemetry:** an undo/redo appends a `GameEvent` (`'undo' | 'redo'` added to
  `GameEventType`) so exports/Activity Log can show it without polluting `moveHistory`.

## UI

- `UndoButton`/`RedoButton` in `ControlPanel` (disabled states from
  `undoStack.length`/`redoStack.length` selectors), `data-testid="undo-button"` /
  `"redo-button"` per testid convention.
- Keyboard: `Ctrl/Cmd+Z` undo, `Ctrl/Cmd+Shift+Z` redo — a `useEffect` keydown listener
  in `App` (skip when focus is in an input/textarea — the import dialog and key modal
  have text fields).

## Persistence

Stacks are session-local (not in `PersistedGameState`): a reload drops undo history.
Rationale: keeps the persisted schema stable and avoids 50×-state localStorage bloat;
matches typical solitaire behavior.

## Tests

- Unit (gameSlice): move→undo restores exact prior board JSON; multi-card move +
  auto-flip is one undo step; draw-with-recycle round-trips `recycleCount`; cap drops
  oldest; redo cleared on new move; guards (replay/AI/autoplay) no-op; win undo flips
  `gameWon` back.
- e2e (`undo-redo.spec.ts`): seeded game — make 3 moves via test bridge, click undo
  twice, assert board via `getSummary()`; Cmd+Z path; buttons disabled at stack ends.
- Test bridge: expose `undo()`/`redo()` + stack depths in `getSummary()` for agents.

## Acceptance

- Undo after any human move sequence restores prior board exactly (JSON-equal).
- No undo possible during replay/AI/auto-play (buttons disabled + action guards).
- `moveHistory` after undo equals the snapshot's history (records from the undone move
  are gone — RECENT MOVES in the AI prompt stays truthful).

## Risks

- **moveHistory truncation interplay with the AI decision log:** `aiDecisionLog` entries
  reference `turnIndex`/history length; undoing past an AI move leaves a decision record
  pointing at a now-shorter history. Decision: keep records (they're an interaction log,
  not game state); the ai-log export already tolerates non-1:1 sequences via
  `movesApplied`. Document in the export README section.
- Keyboard shortcut collisions (browser undo in text fields) — the focus guard covers it.
