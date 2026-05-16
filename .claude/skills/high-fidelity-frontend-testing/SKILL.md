---
name: high-fidelity-frontend-testing
description: >-
  High-fidelity frontend testing and visual debugging for the Solitaire app.
  Use whenever working on end-to-end tests, browser testing, the Playwright
  suite, the window.__solitaire test bridge, deterministic seeded games,
  data-testid selectors, visual verification, screenshots, or driving the UI
  with an agent (Playwright MCP). Trigger on: "e2e test", "Playwright", "browser
  test", "smoke test", "visually verify", "screenshot the page", "test bridge",
  "seed the game", "is the app functional", "MCP", "agentic testing", or any
  change to packages/app that needs UI-level verification.
---

# High-Fidelity Frontend Testing & Visual Debugging

This project is instrumented so an AI agent can test the UI **deterministically
and with high fidelity** — no guessing pixel coordinates, no flaky reruns. Use
this skill when verifying UI behaviour, writing e2e tests, or debugging visually.

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

To set up an exact board state, build a `GameState` object and call
`loadState(JSON.stringify(state))` — see `oneMoveFromWinning()` in
`e2e/user-journey.spec.ts` for a worked example.

### 3. Stable selectors (`data-testid`)

Locate elements by `data-testid`, never by coordinates. The conventions:

- Cards: `card-<suit>-<rank>` (e.g. `card-hearts-A`), with `data-card-suit`,
  `data-card-rank`, `data-card-faceup` attributes.
- Piles: `tableau-column-0`..`tableau-column-6`, `foundation-<suit>`,
  `draw-pile`, `discard-pile`.
- Controls: `new-game-btn`, `import-btn`, `export-btn`, `replay-btn`,
  `valid-moves-btn`, `god-mode-btn`, `auto-play-btn`,
  `difficulty-btn-1`..`difficulty-btn-5`, `control-panel`, `move-counter`,
  `move-count`.
- Containers: `game-board`, `win-modal`.

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

`.mcp.json` registers the Playwright MCP server. Its **default accessibility-
tree mode** is deterministic and token-cheap — prefer it. Use it to:

- Snapshot the page structure (`browser_snapshot`) and act on element refs.
- Capture a screenshot (`browser_take_screenshot`) and visually inspect layout,
  highlights, the win modal, etc.
- Run `browser_evaluate` against `window.__solitaire` to set up or read state.

Visual debugging loop: seed the game → act → screenshot → inspect the image →
compare against expectation → adjust. For pixel-level regression use Playwright's
`toHaveScreenshot()` in a spec.

Start the dev server first when driving MCP live: `pnpm run dev` (serves on
`:5173`). MCP is **not a security boundary** — fine here (a local, client-only
game).

## Known pitfalls (validated)

- **No drag-and-drop exists.** Despite older README wording, `@dnd-kit` is
  unused; the game is click-to-move only. A native drag does not move a card —
  use click-to-move or the bridge.
- **The bridge waits for nothing.** Always `waitForGame(page)` after `goto`.
- **Vitest vs Playwright.** Vitest runs `src/**/*.test.{ts,tsx}`; Playwright owns
  `e2e/*.spec.ts` (excluded from Vitest in `vite.config.ts`). Keep the split.

## Recommended enhancements (not yet done)

- Add ARIA `role="button"` + `aria-label` to cards/piles so Playwright MCP's
  accessibility-tree mode and `getByRole` work as first-class locators.
- Add `toHaveScreenshot()` visual-regression baselines once the UI is stable.

## Pre-flight checklist

Before claiming UI work is done:

- [ ] `pnpm run lint` — clean
- [ ] `pnpm run test:run` — unit tests pass
- [ ] `pnpm run test:e2e` — e2e pass
- [ ] `pnpm run build` — production build succeeds
- [ ] New interactive UI elements have a `data-testid`
- [ ] New behaviour has an e2e test that uses a fixed seed
