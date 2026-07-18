# Repo maintenance sweep — 2026-07-18

Routine maintenance pass over open PRs, CI health, security posture, and stale
branches. Recorded here as a durable log for the long-term project; future
sweeps get their own dated entry in `docs/maintenance/`.

## Pull requests merged (6)

| # | Change | Source | Note |
|---|--------|--------|------|
| #215 | `actions/checkout` 6 → 6.0.2 | Dependabot | already green |
| #222 | dev-dependency group (6 updates) | Dependabot | already green |
| #223 | CI: auto-derive Playwright container image tag | maintainability | see below |
| #224 | `vite` 8.0.14 → 8.0.16 | Dependabot (security) | — |
| #221 | prod-dependency group (11 updates, incl. `@playwright/test` 1.59.1 → 1.60.0) | Dependabot | was **red**; unblocked by #223 |
| #225 | `@babel/core` transitive 7.29.0 → 7.29.7 | security | last real alert |

End state: **0 open PRs**.

## Headline fix — Playwright image tag now auto-derives (#223)

PR #221 was permanently stuck. Its `@playwright/test` 1.59.1 → 1.60.0 bump
failed the E2E job **by design**: ADR-0004's guard script required a human to
hand-edit the hardcoded container image tag (`mcr.microsoft.com/playwright:vX.Y.Z-noble`)
in both `ci.yml` and `deploy.yml` in the same PR. Every Dependabot Playwright
bump hit this wall.

Fix: made the lockstep **structural** instead of manual. Each workflow now has a
small `playwright-version` job that reads the `@playwright/test` version from
`packages/app/package.json` and feeds it into the container image via
`mcr.microsoft.com/playwright:v${{ needs.playwright-version.outputs.version }}-noble`.
The tag can no longer drift, so the guard script
(`scripts/check-playwright-lockstep.mjs`) was retired.

- ADR-0004 amended (Amendment 2026-07-17).
- `CLAUDE.md` and `.github/copilot-instructions.md` updated.
- Change note: `docs/change_notes/20260717_playwright_image_tag_autoderive.md`.
- **Proof it works:** after #223 merged, #221 was rebased by Dependabot and went
  green with no manual edit.

## Security posture

Found that **Dependabot vulnerability alerts were disabled entirely** on the
repo — a real long-term gap. Enabled:

- `gh api -X PUT repos/chayuto/Solitaire/vulnerability-alerts`
- `gh api -X PUT repos/chayuto/Solitaire/automated-security-fixes`

Triaged the 15 open alerts against the **actual installed versions in
`pnpm-lock.yaml`**, not just the alert list (the alert graph was a stale
snapshot from before the merges):

- **14 stale** — already at/above the patched floor on `main` (vite 8.0.16,
  vitest 4.1.7, minimatch 10.2.5, picomatch 4.0.5, postcss 8.5.15, flatted
  3.4.2) or the package isn't used at all (`ws`, `rollup`, `js-yaml` — this is a
  rolldown-vite project). These auto-close on GitHub's next dependency-graph
  scan.
- **1 genuine** — `@babel/core` 7.29.0 (< patched 7.29.6), low severity,
  build-time transitive via `@vitejs/plugin-react`. Fixed in #225 (→ 7.29.7).

Note: every flagged dependency is `development` scope. This is a static GitHub
Pages site with no server runtime, so dev-dependency advisories carry low
real-world risk — but they were bumped anyway where already resolved on `main`.

## Branch cleanup

- Deleted **62 merged remote branches** (mostly old `copilot/*` work).
- Deleted 4 stale local branches tracking now-removed remotes.
- Kept the 2 closed-but-unmerged remotes intentionally
  (`copilot/create-solitaire-game-frontend-again`,
  `jules-recommendations-and-agents-md-...`).

## Verification

- `main` local health: lint, typecheck (libs via `-r`, app via `tsc -b`),
  409 app tests + core + 33 mcts tests, and production `build` all pass.
- **Production is auto-deployed** (`deploy.yml` on every push to `main`): the
  latest deploy for `main` HEAD `67f756a` (#225) is green on all jobs,
  including the post-deploy Playwright smoke test against the live URL.
- Live site returns HTTP 200 on both `https://solitaire.chayuto.com/` and the
  `chayuto.github.io/Solitaire/` Pages URL, serving the current build.

## Follow-ups / notes for next sweep

- `dependabot.yml` keeps a deliberate 30-day cooldown, so routine bumps arrive
  in monthly batches — expect a few week-old PRs each sweep; that's the intended
  cadence, not staleness.
- With alerts + automated security fixes now enabled and the Playwright tag
  auto-deriving, future Dependabot bumps (including Playwright) should flow
  through without manual intervention.
