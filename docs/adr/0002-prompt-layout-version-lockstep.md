# ADR-0002: Prompt layout versioning in lockstep with prompt edits

**Date:** 2026-05 · **Status:** accepted

## Context

AI advisor interactions are harvested as datasets (ai-log export). Comparing model
behavior across games is meaningless unless each interaction records exactly which
prompt produced it.

## Decision

`PROMPT_LAYOUT_VERSION` (`packages/app/src/ai/context/renderContext.ts`) is bumped in
the same change as any prompt text/layout edit — **minor** (`hybrid-v1.x`) for text
edits within the same layout, **major** (`hybrid-v2.0`) for a layout restructure.
Every logged interaction carries it (`promptLayoutVersion`,
`packages/app/src/ai/interactionLog.ts`).

## Consequences

- A prompt edit without a version bump is a review-blocking defect.
- Harvested datasets are partitionable by prompt version; regressions are
  attributable (see the v1.2 → v1.3 fix history in git).
