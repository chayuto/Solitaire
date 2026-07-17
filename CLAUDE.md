# Solitaire — agent guide

Klondike Solitaire: pnpm monorepo (pnpm 11, Node ≥24) with a React app and a pure
rules library. **This file is the canonical agent doc**; `.github/copilot-instructions.md`
points here.

## Commands (pnpm only — never npm/yarn)

```bash
pnpm install                 # workspace install
pnpm dev                     # builds core lib, then app dev server :5173
pnpm dev:watch               # rebuild core on change (run beside `pnpm dev` when editing core)
pnpm run build:libs          # build @chayuto/solitaire-core (the app resolves it via dist/)
pnpm run lint                # app + libs (root eslint.config.js covers core/mcts)
pnpm run typecheck           # all packages (needs build:libs first — app types resolve core's dist)
pnpm run test:run            # app unit tests (Vitest, jsdom)
pnpm run test:libs           # core + mcts unit tests
pnpm run test:e2e            # Playwright (packages/app/e2e)
pnpm run build               # app production build → packages/app/dist
```

**Build-order rule:** anything that compiles or typechecks the app needs
`build:libs` first; editing `packages/core` requires a lib rebuild (or `dev:watch`)
before the app sees it.

## Map

- `packages/core` — pure, immutable Klondike rules library. Types, deck/card utils,
  rules, scoring, `GameEngine` (`initialize` / `applyMove` / `canApplyMove` /
  `getLegalMoves`). Zero dependencies. The app consumes it as `@chayuto/solitaire-core`.
- `packages/app` — React 19 + Zustand + Tailwind + dnd-kit. Game UI, heuristic
  auto-play, replay, session persistence (localStorage), Game Insights (ECharts),
  AI Move Advisor (`src/ai/` — provider registry, prompt/context builders,
  interaction log).
- `packages/mcts` — parked MCTS scaffold (`MCTSNode`, `GamePolicy`). **Not consumed
  by the app**; tested in CI but excluded from `build:libs`.

## Boundaries (enforced by lint where possible — see docs/adr/)

- Board mutations go through `core`'s `GameEngine` — never re-implement move rules
  in the app (ADR-0005).
- `app/src/ai/**` must not import from `app/src/store/**` (store access is injected).
- Components resolve AI providers through the registry (`src/ai/providers`), never
  a concrete provider import.
- `core` imports nothing from `app` or `mcts`.

## Testing & verification

- **Determinism:** `/?seed=42&difficulty=3` reproduces the exact deal
  (`src/store/urlConfig.ts`). Same seed ⇒ same board, always.
- **Test bridge:** `window.__solitaire` (`src/testBridge.ts`) — typed API to read
  state (`getSummary()` is the token-cheap snapshot) and drive real store actions;
  can stub the AI provider for deterministic advisor flows.
- **Selectors:** interactive elements carry `data-testid` — add them to new ones.
- **Browser work is always headless** (Playwright / Playwright MCP via `.mcp.json`);
  see the `high-fidelity-frontend-testing` skill in `.claude/skills/`.
- e2e specs: `packages/app/e2e/*.spec.ts`.
- AI advisor dev key: `.env` at repo root (`GEMINI_API_KEY`) is injected into dev
  builds only (`packages/app/vite.config.ts`) — never commit keys.

## CI (`.github/workflows/`)

`ci.yml`: Lint / Typecheck / Test (app + libs) / Build / E2E. `deploy.yml`: GitHub
Pages + post-deploy smoke test. E2E and smoke run inside the official Playwright
container — **the image tag is derived automatically from the `@playwright/test`
version** by each workflow's `playwright-version` job; never hardcode it
(ADR-0004, amended 2026-07). Both workflows ignore `docs/**` and `**/*.md`.

## AI prompt rules

- Prompt content is **game data + notation only** — no strategy procedures, decision
  rules, or action prescriptions baked into prompt text (ADR-0003).
- Any prompt-layout/text change bumps `PROMPT_LAYOUT_VERSION`
  (`src/ai/context/renderContext.ts`) — minor for text edits, major for layout
  restructures (ADR-0002).

## Conventions

- Conventional commits (`feat(scope): …`, `fix: …`, `ci: …`); work lands via PRs.
- Docs: `docs/architecture.md` (module map), `docs/adr/` (decisions),
  `docs/plans/` (committed plans), `docs/change_notes/` (shipped-change notes),
  `docs/internal/` (gitignored local scratch — do not put durable knowledge there).
- Components `PascalCase.tsx`; utils `camelCase.ts`; tests `*.test.ts(x)` beside
  source; strict TypeScript (no `any` outside tests).
