# Copilot Agent Instructions — Solitaire

**Canonical agent doc: [`/CLAUDE.md`](../CLAUDE.md)** (commands, boundaries, testing,
conventions). **Architecture: [`/docs/architecture.md`](../docs/architecture.md)**.
**Decisions: [`/docs/adr/`](../docs/adr/)**. This file is a thin pointer kept for
Copilot's default path — keep the three in sync via CLAUDE.md, not here.

## Essentials

Klondike Solitaire. pnpm monorepo (**pnpm 11, Node ≥24 — never npm/yarn**):
`packages/core` (pure rules library) ← `packages/app` (React 19 + Zustand + Tailwind);
`packages/mcts` is a parked scaffold (tested, not consumed).

```bash
pnpm install
pnpm run build:libs   # REQUIRED before app typecheck/test/build (app resolves core via dist/)
pnpm run lint         # app + libs
pnpm run typecheck    # all packages
pnpm run test:run     # app unit tests
pnpm run test:libs    # core + mcts unit tests
pnpm run build        # app build → packages/app/dist
pnpm run test:e2e     # Playwright (run for UI changes)
pnpm dev              # dev server :5173 (builds libs first)
```

## Validation before committing

`pnpm install && pnpm run build:libs && pnpm run lint && pnpm run typecheck &&
pnpm run test:run && pnpm run test:libs && pnpm run build` — all must pass
(CI runs exactly these as separate jobs, plus e2e in the Playwright container).

## Hard rules

- Board mutations go through core's `GameEngine` — never re-implement move rules
  in the app (ADR-0005).
- `app/src/ai/**` must not import the store; components use the AI provider
  registry, never a concrete provider.
- Prompt edits: data + notation only, and bump `PROMPT_LAYOUT_VERSION` in the same
  change (ADR-0002, ADR-0003).
- The CI Playwright container image tag is derived automatically from the
  `@playwright/test` version by the `playwright-version` job — never hardcode
  it back (ADR-0004, amended 2026-07).
- Deterministic testing: seed via `/?seed=N&difficulty=1..5`; drive the UI through
  the `window.__solitaire` test bridge; browsers always headless.
- Durable docs go in `docs/` (committed); `docs/internal/` is gitignored scratch.
