# Stage 0b — CLAUDE.md, architecture doc, ADRs

**Parent plan:** §4 Phase 0 (items 0.1, 0.5)
**Behavior change:** none (docs only; CI/deploy ignore `docs/**` and `**/*.md`)
**Lands as:** one commit

## Goal

A fresh agent session (or contributor) gets accurate, in-repo ground truth: how to build,
the architectural boundaries, and the decisions that must not be silently reversed.

## Current state

- No `CLAUDE.md` anywhere in the repo.
- `.github/copilot-instructions.md` (181 lines) is the only agent doc and is wrong in
  places: instructs `npm ci` in a pnpm\@11 workspace, claims "~90 tests" (stale), claims
  the E2E job installs browsers (it now runs in the Playwright container).
- Decisions (ECharts-over-Nivo #197, prompt-version lockstep, Playwright image lockstep
  #193/#195, prompt no-injection principle) live in commit messages, code comments, and
  gitignored `docs/internal/` only.

## Changes

### 1. Root `CLAUDE.md` (canonical agent doc, target ≤120 lines)

Facts that don't rot; no counts, no version numbers that Dependabot bumps:

- **Commands:** pnpm only; the `build:libs`-before-anything rule and why (app resolves
  core via `dist/`); `dev`, `test:run`, `test:libs`, `test:e2e`, `lint`, `typecheck`.
- **Map:** three packages, one line each; `app` consumes `core`; `mcts` parked (no app
  consumer).
- **Boundaries (the invariants Stage 5 will enforce):**
  - `app/src/ai/**` must never import from `app/src/store/**`.
  - Components must not import `ai/providers` directly (registry only).
  - `core` imports nothing from `app`/`mcts`.
  - All board mutations go through `core`'s `GameEngine` (true after Stage 1b).
- **Testing:** seeds (`/?seed=42&difficulty=N`), `window.__solitaire` bridge, `data-testid`
  convention, pointer to `.claude/skills/high-fidelity-frontend-testing`, headless-only rule.
- **CI:** job list, the Playwright image/version lockstep rule.
- **Conventions:** conventional commits; PR-based flow; docs layout (`docs/plans`,
  `docs/adr`, `docs/change_notes`; `docs/internal` is local-only scratch).
- **AI prompt rule:** prompt edits are data + notation only — no embedded strategy
  procedures or decision rules (see ADR-0003); bump `PROMPT_LAYOUT_VERSION` in lockstep
  with layout edits.

### 2. `docs/architecture.md`

Module map with dependency direction (mermaid graph), state-management overview (store →
engine flow after Stage 1), AI advisor request lifecycle (store action → context build →
provider → decision record → interaction log), session persistence model, replay model.
Written to stay correct after Stages 1–3 by describing the *target* architecture and
flagging the parts Stages 1–2 change ("currently in `gameStore.ts`, moving to X in Stage 2b").

### 3. `docs/adr/` (ADR-lite: Context / Decision / Consequences, ~20 lines each)

- `0001-canvas-charts-echarts-over-nivo.md` — SVG re-render froze the UI on long games
  (#197); charts import `echarts-for-react/esm/core`.
- `0002-prompt-layout-version-lockstep.md` — `PROMPT_LAYOUT_VERSION`
  (`ai/context/renderContext.ts`) bumps with prompt-text changes; minor = text edit,
  major = layout restructure; recorded per-interaction (`interactionLog.ts:79`).
- `0003-ai-prompt-no-injection-principle.md` — the prompt carries game data + notation
  only; strategy/procedures/decision rules are never embedded.
- `0004-playwright-container-version-lockstep.md` — e2e/smoke jobs run in
  `mcr.microsoft.com/playwright:vX.Y.Z-noble`; the tag must equal the `@playwright/test`
  version (#193, #195). (Stage 4 adds the CI guard.)
- `0005-core-engine-is-the-single-rules-source.md` — board mutations flow through
  `GameEngine.applyMove`; the store records history/derived state but never re-implements
  rules (the Stage 1 contract).

### 4. Slim `.github/copilot-instructions.md`

Fix to pnpm commands, remove stale counts/claims, keep the repo map + validation
checklist, add "canonical agent doc: `/CLAUDE.md`" at the top. Target ≤60 lines.

## Acceptance

- `CLAUDE.md` commands all run verbatim on a fresh clone.
- Every ADR decision is discoverable by grep (`PROMPT_LAYOUT_VERSION`, image tag, etc.).
- copilot-instructions contains no `npm` commands and no counts.

## Risks

None (docs only). Keep CLAUDE.md fact-dense; it is loaded into every agent context.
