# ADR-0003: The AI prompt carries data + notation only (no strategy injection)

**Date:** 2026-05 · **Status:** accepted

## Context

The AI Move Advisor measures what a model can do with an honest description of the
board. Embedding strategy ("prefer reveals", "draw only if…"), decision procedures,
or action prescriptions into the prompt contaminates that measurement — the v1.2
ONLY-IF drawing heuristic regressed play and was reverted (PR #188).

## Decision

Prompt content is limited to: game state data, notation/format definitions, legal-move
enumeration, and factual history (timelines, counters, stall counts). Strategy
guidance, when explicitly enabled as a config toggle, is the only sanctioned exception
and is itself data-derived. Asks that would add procedures or decision rules to the
prompt get pushed back on, not implemented.

## Consequences

- Prompt edits are reviewable against a bright line: does this tell the model *what
  is*, or *what to do*? Only the former lands.
- Model-behavior fixes are pursued via better data surfacing (e.g. DRAW TIMELINE,
  CYCLE counters), not injected heuristics.
