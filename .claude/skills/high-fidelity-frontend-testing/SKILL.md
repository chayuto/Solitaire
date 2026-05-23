---
name: high-fidelity-frontend-testing
description: >-
  High-fidelity frontend testing and visual debugging for the Solitaire app —
  always headless. Use whenever working on end-to-end tests, browser testing,
  the Playwright suite, the window.__solitaire test bridge, deterministic
  seeded games, data-testid selectors, visual verification, screenshots,
  driving the UI with an agent (Playwright MCP), or smoke-testing the AI
  advisor against the live Gemini API. Trigger on: "e2e test", "Playwright",
  "browser test", "smoke test", "visually verify", "screenshot the page",
  "test bridge", "seed the game", "is the app functional", "MCP", "agentic
  testing", "ask the advisor live", or any change to packages/app that needs
  UI-level verification.
---

# High-Fidelity Frontend Testing & Visual Debugging

This project is instrumented so an AI agent can test the UI **deterministically
and with high fidelity** — no guessing pixel coordinates, no flaky reruns. Use
this skill when verifying UI behaviour, writing e2e tests, or debugging visually.

> **Always headless.** Every browser-driving path in this project — `pnpm run
> test:e2e`, the Playwright MCP server in `.mcp.json` (pinned to `--headless
> --isolated`), and any one-off `browser_*` MCP call — runs without a visible
> window. Do not enable a headed mode without asking; the user works on a Mac
> and a real browser window is disruptive.

## Toolchain

- **Node 24 LTS + pnpm 11** (`packageManager` field pins the pnpm version;
  corepack activates it automatically).
- Unit tests: **Vitest** (`packages/app/src/**/*.test.{ts,tsx}`).
- End-to-end tests: **Playwright** (`packages/app/e2e/*.spec.ts`).

Run from the repo root:

```bash
pnpm install
pnpm run build:libs   # required once — the app depends on the built core lib
pnpm run test:run     # Vitest unit tests
pnpm run test:e2e     # Playwright e2e (starts the dev server automatically)
```

## The three pillars of high fidelity

### 1. Deterministic seeding

Solitaire is random; randomness makes tests unrepeatable. The deal is seedable:

- URL: `/?seed=42` — same seed ⇒ identical board, every time.
- URL: `/?seed=42&difficulty=2` — also pin difficulty (1–5).
- Bridge: `window.__solitaire.newGame({ seed: 42, difficulty: 2 })`.

Always pin a seed in e2e tests. An unseeded test is testing noise.
Plumbed through `packages/app/src/store/urlConfig.ts`.

### 2. The `window.__solitaire` test bridge

A typed control surface (`packages/app/src/testBridge.ts`) for introspecting and
driving the game without simulating clicks. In a Playwright test use
`page.evaluate`; with Playwright MCP use `browser_evaluate`.

| Method | Purpose |
|---|---|
| `getSummary()` | Compact, token-cheap snapshot (counts, won, selected card). **Prefer this.** |
| `getState()` | Full raw store state (large — use only when you need card arrays). |
| `newGame({seed,difficulty})` | Start a reproducible game. |
| `loadState(json)` / `exportState()` | Restore / serialise a game — craft exact scenarios. |
| `select(source,col?,idx?)` | Select a card (`'tableau'`/`'discard'`). |
| `moveToTableau(col)` / `moveToFoundation(suit)` | Execute the selected move. |
| `draw()` | Draw from stock (recycles when empty). |
| `findCard(id)` | Locate a card by id, e.g. `"hearts-A"`. |
| `toggleAutoPlay()` / `isWon()` | Drive the solver / check victory. |
| `listScenarios()` | Names of the built-in board-state fixtures. |
| `loadScenario(name)` | Jump straight to a named fixture (see below). |

To set up an exact board state, prefer a **named scenario** (next section); for
a one-off, build a `GameState` object and call `loadState(JSON.stringify(state))`.

### 3. Board-state scenarios (fast re-runs)

Some positions — winnable end-games, one-move-from-win — are impractical to
reach by playing from a seed. `packages/app/src/testScenarios.ts` defines named
fixtures that craft them directly:

| Scenario | Position |
|---|---|
| `oneMoveFromWinning` | One click from victory — exercises the win modal. |
| `autoCompleteReady` | Fully-sorted end-game; auto-play solves it to a win. |
| `fourKingsToWin` | Foundations A→Q, four Kings in the tableau. |

Load one via the bridge: `window.__solitaire.loadScenario('autoCompleteReady')`,
or in a spec with the `loadScenario(page, name)` helper. See `e2e/scenarios.spec.ts`.

### 4. Stable selectors (`data-testid`)

Locate elements by `data-testid`, never by coordinates. The conventions:

- Cards: `card-<suit>-<rank>` (e.g. `card-hearts-A`), with `data-card-suit`,
  `data-card-rank`, `data-card-faceup` attributes.
- Piles: `tableau-column-0`..`tableau-column-6`, `foundation-<suit>`,
  `draw-pile`, `discard-pile`.
- Controls: `new-game-btn`, `import-btn`, `export-btn`, `replay-btn`,
  `valid-moves-btn`, `god-mode-btn`, `auto-play-btn`,
  `difficulty-btn-1`..`difficulty-btn-5`, `control-panel`, `move-counter`,
  `move-count`.
- Replay controls: `replay-controls`, `replay-exit-btn`, `replay-back-btn`,
  `replay-play-btn`, `replay-forward-btn`, `replay-progress`,
  `replay-progress-bar`, `replay-speed-select`.
- Activity log: `activity-log`, `activity-log-toggle-btn`,
  `activity-log-copy-btn`, `activity-log-clear-btn`, `activity-log-entries`,
  `activity-log-entry`, `activity-log-count`.
- Containers: `game-board`, `win-modal`.

Every card and pile also carries an ARIA `role` + `aria-label`, so
`getByRole('button', { name: 'A of hearts' })` and Playwright MCP's
accessibility-tree mode work as first-class locators.

In Playwright: `page.getByTestId('draw-pile')`. Always wait for readiness with
the `waitForGame` helper (`e2e/helpers.ts`) before asserting. Add a
`data-testid` to every new interactive element.

## Writing a new e2e test

1. Put it in `packages/app/e2e/<name>.spec.ts`.
2. Import helpers: `import { waitForGame, summary } from './helpers';`
3. `await page.goto('/?seed=<n>')` then `await waitForGame(page)`.
4. Drive the UI by **clicks on testids** for user-facing behaviour, or by the
   **bridge** to set up state and assert.
5. Assert on `summary(page)` and visible UI — not on timing.
6. Run: `pnpm run test:e2e`.

## Visual debugging with Playwright MCP

`.mcp.json` registers the Playwright MCP server and pins it to `--headless
--isolated` — **all browser driving via MCP must run headless**. Opening a
visible browser window on the user's Mac is disruptive and the project already
has full headless infrastructure (e2e suite + `window.__solitaire` bridge) that
covers verification. Do not pass flags that re-enable a visible window. If you
need a headed run for one-off human inspection, ask first.

Its **default accessibility-tree mode** is deterministic and token-cheap —
prefer it over screenshots. Use it to:

- Snapshot the page structure (`browser_snapshot`) and act on element refs.
- Capture a screenshot (`browser_take_screenshot`) and visually inspect layout,
  highlights, the win modal, etc. — fine even in headless mode.
- Run `browser_evaluate` against `window.__solitaire` to set up or read state.

Visual debugging loop: seed the game → act → screenshot → inspect the image →
compare against expectation → adjust. For pixel-level regression use Playwright's
`toHaveScreenshot()` in a spec.

Start the dev server first when driving MCP live: `pnpm -F app dev` (serves on
`:5173`). Stop it explicitly when done — a SIGTERM via `lsof -ti:5173 | xargs
kill` (exit code 143) is expected, not a failure. MCP is **not a security
boundary** — fine here (a local, client-only game).

### Smoke-testing AI advisor calls against the live Gemini API

For end-to-end verification of an AI-advisor change against the real provider
(not a mocked fetch), the same headless MCP loop applies. The repo-root `.env`
holds a dev `GEMINI_API_KEY` that Vite injects as `__DEV_GEMINI_KEY__` and
`keyStore.getEffectiveKey` picks up automatically — so `pnpm -F app dev` plus a
fresh navigation is enough to fire a real call. Then:

1. `window.__solitaire.askAI()` — fires one move through the real provider.
2. `window.__solitaire.getAIInteractions()` — the harvested row(s) for that
   call, with the full prompt, the parsed decision, and all the stamping fields
   (`promptLayoutVersion`, `promptTemplateHash`, `promptTemplateFinalisedAt`,
   `inferenceParams`, `appCommit`).

To verify the **on-the-wire** request body Gemini actually sees (not just the
prompt string the log captured), monkey-patch `window.fetch` before calling
`askAI()`:

```js
window.__captured = [];
const orig = window.fetch.bind(window);
window.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input?.url ?? '';
  if (url.includes('generativelanguage.googleapis.com') && init?.body) {
    window.__captured.push({
      urlMasked: url.replace(/key=[^&]+/, 'key=<redacted>'),
      body: JSON.parse(String(init.body)),
    });
  }
  return orig(input, init);
};
```

Always mask the `key=` query parameter before logging — the dev key must never
land in transcripts or files. Expect the retry wrapper to record multiple rows
when Gemini returns 500s; the always-stamped discipline (every row, both
branches) means every retry row should still carry the layout/template stamps.

## Known pitfalls (validated)

- **No drag-and-drop exists.** Despite older README wording, `@dnd-kit` is
  unused; the game is click-to-move only. A native drag does not move a card —
  use click-to-move or the bridge.
- **The bridge waits for nothing.** Always `waitForGame(page)` after `goto`.
- **Vitest vs Playwright.** Vitest runs `src/**/*.test.{ts,tsx}`; Playwright owns
  `e2e/*.spec.ts` (excluded from Vitest in `vite.config.ts`). Keep the split.

## Recommended enhancements (not yet done)

- Add `toHaveScreenshot()` visual-regression baselines once the UI is stable.

## Pre-flight checklist

Before claiming UI work is done:

- [ ] `pnpm run lint` — clean
- [ ] `pnpm run test:run` — unit tests pass
- [ ] `pnpm run test:e2e` — e2e pass
- [ ] `pnpm run build` — production build succeeds
- [ ] New interactive UI elements have a `data-testid`
- [ ] New behaviour has an e2e test that uses a fixed seed
- [ ] Any live MCP browsing this session was headless (no visible window)
