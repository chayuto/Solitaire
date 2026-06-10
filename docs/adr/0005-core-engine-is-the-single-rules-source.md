# ADR-0005: core's GameEngine is the single source of move rules

**Date:** 2026-06-10 · **Status:** accepted (implemented by plan stages 1a–1c)

## Context

Move semantics existed in three places: `core`'s `GameEngine.applyMove` (canonical,
tested), hand-rolled move actions in the Zustand store (~300 lines of duplicate board
splicing), and the replay reducer. AI moves were applied by *simulating UI selection*.
Every rules change had to be made multiple times; divergence was already real (core
drew from the opposite end of the stock than the app).

## Decision

- All board mutations go through `GameEngine.applyMove` via a single store pathway
  (`store/applyMove.ts`): build a `MoveCommand` → engine applies → store records.
- The store owns what the engine deliberately does not: history records (one per card
  moved + flips), `eventLog` telemetry, derived state (`completionProgress`,
  `gameWon`), selection UX, auto-complete triggering.
- The replay reducer stays **record-level** (replays `Move` records, not commands) so
  historical persisted games replay byte-identically; it is the one sanctioned
  non-engine board walker and lives in its own tested module.
- Core aligns to shipped app semantics where they conflict (draw from the front of
  the pile; `Move.from.source: 'draw'`).

## Consequences

- Rules changes happen once, in core, with library tests.
- The app cannot drift from the engine; lint forbids components importing
  `GameEngine` directly (stage 5).
- Undo/redo becomes a snapshot stack over the single mutation chokepoint (stage 3).
