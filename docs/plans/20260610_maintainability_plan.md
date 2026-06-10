# Maintainability Findings & Refactoring Plan

**Date:** 2026-06-10
**Scope:** Whole-repo analysis for long-term maintainability and agent-friendly development.
**Status:** Findings final; plan approved for execution. Each checklist item below is intended to be one PR-sized change.

---

## 1. Executive summary

The repo's foundations are good: a clean pure `core` rules library, a well-factored `ai/`
subsystem, seeded determinism, a purpose-built test bridge, and a broad e2e suite. Nearly all
maintainability debt is concentrated in **one file** — `packages/app/src/store/gameStore.ts`
(~1,970 lines, also the most-churned file over the past 6 months) — which duplicates the core
engine's move rules, mixes ~10 concerns, and hides AI auto-play state in 7 module-scope
variables. Secondary debt: CI gaps (library tests never run, no typecheck job, a broken
artifact path), a fresh-clone `pnpm dev` failure, and key project knowledge living only in
gitignored `docs/internal/` where future sessions cannot see it.

Two prior internal analyses (2025-12-27, 2026-01-17) recommended overlapping fixes that were
never executed — partly because those documents are not committed. This plan is committed, and
each item is small enough to land independently.

---

## 2. What is already strong (do not churn)

- **`packages/core`** — pure, immutable, well-tested; clean export surface
  (`packages/core/src/index.ts`). The right canonical engine.
- **`packages/app/src/ai/`** — small tested modules; one-way dependency (nothing in `ai/`
  imports the store); provider registry with test override + stub provider
  (`ai/providers/index.ts`). Adding a second LLM provider is already cheap.
- **Agentic testing surface** — `window.__solitaire` bridge (`packages/app/src/testBridge.ts`),
  URL seeds (`/?seed=42&difficulty=N`), `data-testid` discipline, the
  `high-fidelity-frontend-testing` skill, Playwright-container CI, 12 e2e spec files.
- **Process** — conventional commits, everything lands via PRs, Dependabot, pinned Playwright
  image with a lockstep convention.

---

## 3. Findings

### 3.1 The god-store (hotspot #1)

`packages/app/src/store/gameStore.ts` mixes, in one Zustand store:

| Concern | Approx. lines |
|---|---|
| Deal/init + hydration | 209–388 |
| Selection + move validation delegation | 409–469 |
| Hand-rolled move application | 470–770 |
| Import/export | 771–882 |
| UI toggles (valid moves, god mode) | 883–890 |
| Heuristic auto-play engine | 891–1112 |
| Replay system (8 actions) | 1113–1332 |
| AI advisor orchestration | 1333–1844 (`askAIForMove` alone is ~330 lines) |
| AI config + modals | 1848–1905 |
| Session persistence + module-side-effect autosave subscriber | 1906–1966 |

Additional hazards:

- **7 module-scope mutable variables** for AI auto-play bookkeeping (lines ~81–120:
  `aiAbortController`, `aiAutoStateHistory`, `aiAutoLastProgress`, `aiAutoStallCount`,
  `aiAutoRecentMoveTypes`, `aiAutoStalled`, `aiAutoTurnCap`) — invisible to Zustand,
  survive store resets, complicate tests.
- **13+ scattered `setTimeout` sites** driving auto-play/replay/autosave loops from inside
  the store.
- `ControlPanel.tsx:17` subscribes to the whole store (bare `useGameStore()`), re-rendering
  on every state change; every other component correctly uses narrow selectors.

### 3.2 Move rules implemented twice

Core has the canonical, tested engine — `GameEngine.applyMove` / `canApplyMove` /
`getLegalMoves` (`packages/core/src/engine/index.ts:88,269,351`). The store re-implements move
application by hand (`moveCardToTableau` ~110 lines, `moveCardToFoundation` ~130 lines,
`drawCard` ~60 lines), and `applyMoveCommand` (gameStore.ts:1333) makes AI moves work by
*simulating UI selection* (`selectCard` → `moveCardToTableau`). Every rule change must be made
twice; the AI path validates against core but mutates via store logic. This is the single
largest divergence risk in the repo.

### 3.3 Dual type systems

`packages/app/src/types/index.ts` redefines `Card/Suit/Rank/Difficulty` (mutable) in parallel
with core's readonly versions. `adapters/coreAdapter.ts` copy-and-casts entire state in both
directions on every move and every AI call. The app `GameState` also mixes pure game data with
UI selection, toggles, replay, AI advisor, and modal state — so every fixture carries all of it.

### 3.4 Telemetry pseudo-moves inside moveHistory

`autoplay_start/stop/deadend/loop_detected` are stored in `moveHistory` alongside real moves
(app `types/index.ts:24–27`), forcing the adapter to filter them (`coreAdapter.ts:33`) and
every consumer (replay, activity log, metrics) to special-case them.

### 3.5 `packages/mcts` is a half-built scaffold

Real `MCTSNode` + `GamePolicy` with tests, but `engine/rules/scoring/types/utils` dirs are
`export {}` stubs, and **the app never imports the package** — yet every CI job builds it via
`build:libs`.

### 3.6 CI gaps

- No `typecheck` job (`pnpm -r typecheck` exists as a script but never runs in CI).
- **`test:libs` (core + mcts unit tests) never runs in CI** — only the app's tests do.
- Lint covers the app only; core/mcts have no ESLint config at all.
- `ci.yml` build job uploads artifact `path: dist/` (repo root) but the app builds to
  `packages/app/dist` — the uploaded artifact is empty/garbage. (`deploy.yml` uses the right
  path.)
- 5 jobs (4 CI + deploy) repeat the same checkout/pnpm/node/install/build:libs block.

### 3.7 Fresh-clone & dev-loop DX

- `pnpm dev` fails on a fresh clone: the app resolves `@chayuto/solitaire-core` through its
  built `dist/`, and nothing builds the libs first. Known since 2026-01-17, still open.
- Editing `packages/core` requires a manual `pnpm build:libs` before the app sees the change.

### 3.8 Knowledge management

- `docs/internal/` (40+ analyses, decision docs, task plans) is **gitignored** — invisible to
  fresh clones, CI, and future sessions. Prior recommendation docs stalled there.
- No `CLAUDE.md` anywhere. `.github/copilot-instructions.md` exists but instructs
  `npm ci` in a **pnpm** repo and claims "~90 tests" (stale by ~3×).
- No committed architecture doc or ADRs; prompt-version history (`hybrid-v1.x`) lives in
  commit messages and comments.

### 3.9 Missing undo/redo

The top item in the 2026-01-17 internal backlog. Relevant here because the Phase 1 refactor
makes it nearly free (see §4, Phase 3).

---

## 4. Plan

Phases are ordered; items within a phase are independent PRs unless noted.

### Phase 0 — Truth & guardrails (no behavior change)

- [ ] **0.1** Root `CLAUDE.md` as the canonical agent doc (pnpm commands, build-order
      requirement, monorepo map, boundaries, test bridge/seeds/testids, CI overview).
      Slim `.github/copilot-instructions.md` to accurate facts + a pointer.
- [ ] **0.2** CI: add typecheck job; run core/mcts unit tests in the test job; share one flat
      ESLint config so core/mcts are linted.
- [ ] **0.3** Fix `ci.yml` build-artifact path (`packages/app/dist`) or drop the upload.
- [ ] **0.4** Fix fresh-clone dev: root `dev` script builds libs first; add a watch mode for
      core so app dev picks up core edits.
- [ ] **0.5** Commit `docs/architecture.md` + `docs/adr/` (ECharts-over-Nivo;
      prompt-version lockstep; prompt no-injection principle; Playwright image lockstep;
      core-as-single-rules-engine).
- [ ] **0.6** Park `packages/mcts`: remove from `build:libs` (the app does not consume it);
      keep its tests running in CI so the code does not rot. Revisit when a consumer exists.

### Phase 1 — One rules engine

- [ ] **1a** Move telemetry pseudo-moves out of `moveHistory` into a separate `eventLog`
      field; update activity log, replay, metrics, adapter, tests.
- [ ] **1b** Store move actions become thin wrappers over `engine.applyMove`
      (`moveCardToTableau`, `moveCardToFoundation`, `drawCard`); `applyMoveCommand` stops
      simulating UI selection. One code path for human, AI, autoplay, and test-bridge moves.
      Land action-by-action with green CI between steps; characterization tests first.
- [ ] **1c** Unify types: app re-exports core `Card/Suit/Rank/Difficulty`; app state =
      core `GameState` + UI extras; shrink `coreAdapter` to a trivial pick (or delete).

### Phase 2 — Split the store into slices (Zustand-native, no new deps)

- [ ] **2a** Extract `askAIForMove`/`continueAIAutoPlay` into an AI advisor controller
      (`ai/advisorController.ts`) receiving `{get, set, engine, provider}`; the 7 module-scope
      variables become controller state with an explicit `reset()`.
- [ ] **2b** Slices: `gameSlice`, `uiSlice`, `replaySlice`, `autoplaySlice`, `aiSlice`,
      `sessionSlice`; autosave subscriber moves to `store/persistence.ts` with explicit
      `init()` from `main.tsx`; replay/autoplay timers get owned drivers with cancel handles.
      Target: no file in `store/` over ~400 lines. Also: narrow selectors in `ControlPanel`.

### Phase 3 — Undo/redo

- [ ] Snapshot-stack undo/redo (bounded; 52-card states are tiny) instead of the
      inverse-command design in the older backlog doc. Disable during replay and AI auto-play;
      clear on new game. `UndoButton` + Ctrl+Z/Cmd+Z. Unit + e2e tests.

### Phase 4 — Test & CI hardening

- [ ] Coverage via `@vitest/coverage-v8` with pragmatic thresholds (core high; app moderate).
- [ ] Composite GitHub action for the repeated setup block.
- [ ] CI guard asserting the Playwright container tag matches `@playwright/test` version.

### Phase 5 — Agentic durability

- [ ] ESLint boundary rules enforced in CI: `ai/` must not import `store/`; components must
      not import `ai/providers` directly; app imports core, never the reverse.
- [ ] Keep `CLAUDE.md` to facts that do not rot (commands, invariants — not counts).
- [ ] Extract `ai/` into `packages/advisor` only if a second consumer appears.

---

## 5. Sequencing & risk

- Phase 0 is independent and safe — land first.
- Phases 1→2→3 are strictly ordered; the safety net is the existing store test suite
  (~1,160 lines), the seeded e2e specs, and the test bridge — built for exactly this.
- Each item is one PR with green CI; any session can pick up a single unchecked box cold.
- Deliberately **not** recommended: replacing Zustand, finishing MCTS now, repo restructuring,
  test rewrites, or a repo-wide reformat. Existing choices are sound; the debt is localized.
