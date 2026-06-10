# Stage 5 — Module-boundary enforcement

**Parent plan:** §4 Phase 5
**Behavior change:** none (lint rules)
**Lands as:** one commit
**Depends on:** 2a/2b (boundaries must be true before they're enforced)

## Goal

The architectural invariants documented in `CLAUDE.md`/ADR-0005 are enforced by ESLint
in CI, not by convention. Agents and humans get an immediate, local failure instead of
a drifted architecture.

## Invariants → rules

All via `no-restricted-imports` in scoped flat-config blocks in
`packages/app/eslint.config.js` (no new dependencies):

```js
// 1. ai/ must not import the store (it receives access via injection — Stage 2a)
{ files: ['src/ai/**'], rules: { 'no-restricted-imports': ['error', { patterns: [
  { group: ['**/store/**'], message: 'ai/ receives store access via AdvisorDeps injection (stage-2a).' },
]}]}},

// 2. Components/hooks must not import providers directly (registry only) nor deep-import ai internals
{ files: ['src/components/**', 'src/hooks/**'], rules: { 'no-restricted-imports': ['error', { patterns: [
  { group: ['**/ai/providers/*', '!**/ai/providers'], message: 'Resolve providers through the registry (ai/providers/index).' },
  { group: ['**/ai/context/**', '**/ai/decision/**'], message: 'Import from the ai/ public surface (src/ai/index.ts).' },
]}]}},

// 3. Components must not mutate board state except through store actions —
//    forbid importing the engine or core rules directly in UI code
{ files: ['src/components/**', 'src/hooks/**'], rules: { 'no-restricted-imports': ['error', { paths: [
  { name: '@chayuto/solitaire-core', importNames: ['GameEngine'], message: 'Board mutations go through store actions (ADR-0005).' },
]}]}},

// 4. Nothing imports gameStore internals except the store's own modules
//    (slices/persistence) — everything else imports the public `useGameStore`.
```

Plus in the root config (Stage 0a created it):

```js
// 5. core must not import from app/mcts (belt-and-braces; package boundaries
//    already prevent it, but a stray relative path would compile)
{ files: ['packages/core/src/**'], rules: { 'no-restricted-imports': ['error', { patterns: [
  { group: ['**/packages/app/**', '**/packages/mcts/**', '@chayuto/solitaire-mcts'] },
]}]}},
```

## Verification of current truth before enabling

Run each rule and triage hits:

- Rule 1: should be zero after 2a (`grep -rn "from '../store" packages/app/src/ai/` is
  empty today).
- Rule 2: `AISettingsSection`/`AIKeyModal` import model lists — confirm they go through
  `src/ai/index.ts` (today `ai/index.ts` exports 20 symbols; if a component
  deep-imports, re-export the symbol from the index and fix the import).
- Rule 3: components today import core *types* and rule helpers for display logic —
  restrict only `GameEngine` (type imports stay allowed; `import type` is not blocked
  by `no-restricted-imports` paths with `importNames` on the value).

## Escape hatch policy

A deliberate exception gets an inline
`// eslint-disable-next-line no-restricted-imports -- <reason + ADR ref>`; the
disable-comment requires a reason (`reportUnusedDisableDirectives` already on by
default in flat config; add `enforce-disable-reason` style via comment convention in
CLAUDE.md rather than another plugin).

## Acceptance

- Adding `import { useGameStore } from '../store/gameStore'` to any file in
  `src/ai/` fails `pnpm lint`.
- Deep-importing `ai/providers/GeminiProvider` from a component fails lint.
- `pnpm lint` green on the repo as it stands after Stage 2b.

## Risks

- Over-broad patterns block legitimate type imports → prefer `importNames` and
  narrow `group` globs; verify against the live import graph before merging
  (`grep -rn "from .*ai/providers/" packages/app/src/components/` etc.).
- Test files legitimately reach into internals → exempt `**/*.test.*` and
  `src/testBridge.ts` from rules 2/4 (the bridge intentionally wires deep).
