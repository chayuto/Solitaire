# Stage 1b — Engine-backed move application in the store

**Parent plan:** §4 Phase 1, item 1b · **ADR-0005**
**Behavior change:** none (same board transitions, same history records)
**Lands as:** one commit (internally: one store action at a time, tests green between)

## Goal

`core`'s `GameEngine.applyMove` becomes the only implementation of board transitions.
The store keeps what the engine deliberately does not do: history records, derived state
(`completionProgress`, `gameWon`), selection UX, auto-complete triggering, win handling.

## Current state — three implementations of move semantics

1. **Core engine** (`packages/core/src/engine/index.ts:88–260`) — canonical, tested.
   `applyMove(state, command)` returns a new state; flips the uncovered card itself
   (`:134–137, :169–172`). Does **not** touch `moveHistory` / `completionProgress` /
   `gameWon`.
2. **Store hand-rolled actions** — `moveCardToTableau` (`gameStore.ts:470–579`),
   `moveCardToFoundation` (`:580–711`), `drawCard` (`:712–769`). Same board logic
   re-implemented, plus: one `Move` record **per card moved** (`:491–506`,
   timestamps `Date.now()+index`), a `flip_card` record when a card is revealed,
   progress recompute, win check, auto-complete trigger.
3. **Replay reducer** (`goToReplayIndex`, `:1195–1327`) — re-derives board states from
   `Move` *records* (per-card semantics, `:1258`). Untouched in this stage; extracted in 2b.

`applyMoveCommand` (`:1333–1368`) adapts AI `MoveCommand`s by **simulating UI selection**
(`selectCard` → `moveCardToTableau`). The AI path validates via the engine
(`canApplyMove`, `:1568`) but mutates via the store's duplicate logic.

Known divergences that this stage must resolve (verified against source):

- **Draw end mismatch.** Core's `draw()` takes the **last** element of `drawPile`
  (`core/src/rules/stock.ts:33–39`); the store draws the **first**
  (`gameStore.ts:748–750`). Recycle is identical in both (reverse + face-down), so the
  effective draw order after a recycle differs. This has been invisible because the app
  never *executes* engine draws — it only uses `canDraw`/`getLegalMoves` (length checks).
  Shipped behavior (persisted games, replay, the AI DRAW TIMELINE feature) assumes
  front-draw → **align core to the app**: change `draw()` to take index 0, update
  `core/src/rules/stock.test.ts` and any engine tests asserting end-draw. Core is
  pre-1.0 with no external consumers; mcts does not import core.
- **Draw/recycle fusion.** The store's `drawCard` on an empty stock performs a recycle
  (with a `recycle_stock` history record carrying the marker card, `:719–745`, and a
  `recycleCount` bump); the engine models draw and recycle as two separate commands.
  The wrapper picks the command by state (empty stock → `recycle_stock`), preserving
  the fused UX.

## Changes

### 1. New module `store/applyMove.ts` — the single mutation pathway

```ts
interface ApplyResult { state: GameState /* app state */; records: Move[]; }
applyCommandToState(ui: GameState, command: MoveCommand, engine: GameEngine): ApplyResult
```

- Convert (`uiToCore`), assert `engine.canApplyMove`, run `engine.applyMove`, merge the
  returned board fields back over the app state (`coreToUI` merge already exists).
- Build the history records by diffing intent, preserving today's exact record shape:
  - `tableau_to_tableau`: one record per moved card (`from.cardIndex + i`,
    `timestamp: Date.now() + i`) — byte-compatible with `:491–506`.
  - reveal: append a `flip_card` record when the engine flipped the uncovered card
    (detect: source column's new top card faceUp & was faceDown).
  - `draw_card` / `recycle_stock`: replicate `:712–769` records (incl. marker card and
    `recycleCount`).
- Recompute `completionProgress` (`getCompletionProgress`), set `gameWon` via
  `isGameWon`/engine `isWon`.

### 2. Store actions become wrappers

- `moveCardToTableau(targetColumn)`: build the `MoveCommand` from `selectedCard`
  (tableau source → `{type:'tableau_to_tableau', from:{column, cardIndex}, to:{column}}`;
  discard source → `discard_to_tableau`), call `applyCommandToState`, `set` result +
  `selectedCard: undefined`, then `checkAndTriggerAutoComplete()` — exactly the side
  effects the current bodies have.
- `moveCardToFoundation(suit)`: same pattern (`tableau_to_foundation` /
  `discard_to_foundation`), keep the win-handling block currently at the end of `:580–711`.
- `drawCard()`: empty stock → `recycle_stock` command, else `draw_card`; keep the
  no-op-recycle-records-nothing rule (`:727–739`).
- `applyMoveCommand(command)`: replace selection simulation with a direct
  `applyCommandToState` call + the same post-move hooks. AI move annotation
  (`askAIForMove`, `:1576–1596`) keeps working — it reads `moveHistory` deltas, which are
  unchanged in shape.

### 3. Validation helpers

`canMoveToTableau`/`canMoveToFoundation` (`:444–452`) already delegate to core rule
functions — unchanged. (`uiHelpers.ts` stays as-is.)

## Order of work (tests green after each)

1. `applyMove.ts` + unit tests asserting record-shape parity against the current
   implementation (golden tests: same seed, same action sequence, compare
   `moveHistory`/board JSON before/after refactor).
2. Switch `drawCard` → wrappers; run store suite.
3. Switch `moveCardToFoundation`; run.
4. Switch `moveCardToTableau`; run.
5. Rewrite `applyMoveCommand`; run AI advisor tests (`aiAdvisor.test.ts`) + e2e
   `ai-advisor.spec.ts` (stub provider path).

## Tests

- Golden parity harness (step 1) is the heart of this stage — capture
  `JSON.stringify({tableau, foundations, drawPile, discardPile, moveHistory (sans
  timestamps)})` across a scripted 30-move seeded game on `main`, assert identical output
  after the refactor. Timestamps excluded (non-deterministic offsets preserved in shape only).
- Full existing suites: store (`gameStore.test.ts`, `winCondition`, `metrics`), autoplay
  (drives real store actions), e2e `determinism.spec.ts` (seeded replays catch any
  board-transition drift).

## Acceptance

- `gameStore.ts` contains no direct `tableau`/`foundations` splicing in move actions —
  only `applyCommandToState` calls (grep: `slice(` count in move actions drops to ~0).
- `applyMoveCommand` no longer calls `selectCard`.
- Store file shrinks by ~250–350 lines.

## Risks

- **Record-shape drift** breaks replay of old games, the AI prompt's RECENT MOVES, and
  metrics — the golden parity tests are the mitigation; replay e2e double-covers.
- **Core draw-end change** (see above) alters core's own test expectations — contained to
  `core/src/rules/stock.test.ts` + engine tests; nothing else consumes engine draws today.
- `godMode` is purely visual (`Card.tsx:84` reveals face-down faces); it does **not**
  bypass validation, so wrappers need no special case (verified — `canMoveToTableau`
  in the store is a pure core delegation, `gameStore.ts:444–447`).
