# ADR-0001: Canvas charts (ECharts) over SVG (Nivo) for live Game Insights

**Date:** 2026-05 (PR #197) · **Status:** accepted

## Context

The Game Insights dashboard re-renders its charts on every move. The original Nivo
(SVG) implementation rebuilt thousands of DOM nodes per update and froze the UI on
long games (several hundred moves). The user explicitly prefers real chart libraries
and high-detail rendering over hand-rolled canvases or aggressive downsampling.

## Decision

Use Apache ECharts (canvas) via `echarts-for-react`, importing from
`echarts-for-react/esm/core` with explicit module registration. Pin ECharts (+zrender)
into a dedicated lazy-loaded `echarts` vendor chunk (`packages/app/vite.config.ts`)
so it never enters the eager bundle.

## Consequences

- Live per-move chart updates stay smooth on long games.
- New charts must register their ECharts modules and import via the esm/core path.
- Do not reintroduce SVG-rendered chart libs for anything that updates per move;
  do not downsample series data to dodge render cost.
