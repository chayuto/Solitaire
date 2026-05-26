/**
 * Hybrid ASCII renderer for {@link AIMoveContext}.
 *
 * Replaces the per-turn `CURRENT GAME (JSON)` dump with a plain-text layout
 * that puts `RECENT MOVES` visually adjacent to `LEGAL MOVES`, costs roughly
 * 4–5× fewer tokens per turn for the same information, and preserves every
 * field the JSON form carried.
 *
 * Contract: `solitaire-analytics/docs/reports/20260524_harvester_team_layout_ask.md`.
 * The Python reference (`scripts/compare_prompt_formats.py:render_hybrid`) is
 * the source of truth for the layout — this is its TS port, kept faithful so a
 * sample produced offline matches the wire format byte-for-byte (modulo
 * trailing-whitespace conventions).
 *
 * `reasoningTrail` is carried forward under a soft-de-emphasis header, as the
 * layout-ask doc recommends — the change is about the board / moves layout,
 * not the trail. The decision to keep, relocate, or drop it is a separate ask.
 *
 * @module ai/context/renderContext
 */

import type { AIMoveContext } from '../types';

/**
 * Stamp identifying the prompt variant that produced a given interaction.
 *
 * Bumped in lockstep with `PROMPT_TEMPLATE_VERSION` (in
 * `context/systemInstruction`) so the two version fields never disagree on
 * which variant produced a row. The semver follows the same scheme:
 * - major (`hybrid-v2.0`) on a layout-shape change;
 * - minor (`hybrid-v1.x`) on any visible text edit within the same layout.
 *
 * Anyone reading a harvested ai-log can read this one field instead of
 * computing `promptTemplateHash` to identify the variant. The hash stays
 * authoritative for byte-level identity.
 */
export const PROMPT_LAYOUT_VERSION = 'hybrid-v1.1';

/** Pad a column name's value column to keep `[index]` + type aligned. */
const TYPE_COL_WIDTH = 24;

/**
 * Render an {@link AIMoveContext} as a hybrid plain-text block.
 *
 * The output is everything between the system instruction and the closing
 * "Now choose..." prompt suffix; the caller wraps it with its own framing.
 *
 * The NOTATION legend lives in the static rules block (in `rulesPrimer.ts`),
 * not here, so it is not re-rendered every turn for no information change.
 */
export function renderHybridContext(context: AIMoveContext): string {
  const lines: string[] = [];

  // FOUNDATIONS + STOCK header.
  const f = context.foundations;
  lines.push(
    `FOUNDATIONS:   H: ${f.hearts ?? '--'}   ` +
      `D: ${f.diamonds ?? '--'}   ` +
      `C: ${f.clubs ?? '--'}   ` +
      `S: ${f.spades ?? '--'}`,
  );
  lines.push(
    `STOCK: ${context.drawPileCount} cards   ` +
      `WASTE top: ${context.discardTop ?? '--'}   ` +
      `recycle stock: ${context.canRecycleStock ? 'yes' : 'no'}`,
  );
  lines.push('');

  // TABLEAU — one line per column, face-down (`??`) first then face-up.
  // Top of stack = rightmost token. Empty columns render as `<empty>`.
  lines.push('TABLEAU:');
  for (const col of context.tableau) {
    const fd =
      col.faceDown && col.faceDown.length === col.faceDownCount
        ? col.faceDown // oracle mode: real card identities
        : Array<string>(col.faceDownCount).fill('??');
    const tokens = [...fd, ...col.faceUp];
    const content = tokens.length > 0 ? tokens.join(' ') : '<empty>';
    lines.push(`  col${col.column}: ${content}`);
  }
  lines.push('');

  // RECENT MOVES — numbered, oldest first, right-aligned. Deliberately
  // adjacent to LEGAL MOVES so an oscillation trap (recent move whose
  // reversal is on offer) shows up as a one-glance comparison.
  const recent = context.recentMoves ?? [];
  if (recent.length > 0) {
    lines.push(
      'RECENT MOVES (oldest -> newest; review before picking, ' +
        'do not undo your own work):',
    );
    const width = String(recent.length).length;
    recent.forEach((m, i) => {
      lines.push(`  ${String(i + 1).padStart(width, ' ')}. ${m}`);
    });
    lines.push('');
  }

  // SEEN IN WASTE — kept on one line; needed for stock-cycle decisions.
  const seen = context.seenDrawPileCards ?? [];
  if (seen.length > 0) {
    lines.push(`SEEN IN WASTE THIS CYCLE: ${seen.join(' ')}`);
    lines.push('');
  }

  // HIDDEN INFO — only present under the `seeHiddenCards` (oracle) toggle.
  // Surfacing it inline keeps the renderer information-preserving in that
  // mode without affecting fair (default) play.
  if (context.hiddenInfo) {
    lines.push(
      `HIDDEN INFO (oracle): draw pile order: ${context.hiddenInfo.drawPileOrder.join(' ')}`,
    );
    lines.push('');
  }

  // LEGAL MOVES — `[index]` is the canonical identifier; the response shape
  // is unchanged (`{"final_decision":{"move_index": N, ...}}`).
  lines.push('LEGAL MOVES (respond with the index of your chosen move):');
  for (const m of context.legalMoves) {
    const typeCol = m.type.padEnd(TYPE_COL_WIDTH, ' ');
    const score =
      m.heuristicScore !== undefined ? `   (heuristic score: ${m.heuristicScore})` : '';
    lines.push(`  [${m.index}] ${typeCol} ${m.describe}${score}`);
  }
  lines.push('');

  // PROGRESS — game metrics in a single line.
  const metrics = context.metrics;
  if (metrics) {
    lines.push(
      `PROGRESS: foundation=${metrics.foundationCards}/52, ` +
        `face-down remaining=${metrics.faceDownTotal}, ` +
        `completion=${metrics.completionProgress}%`,
    );
    lines.push('');
  }

  // PRIOR REASONING — carried forward with the layout-ask doc's
  // soft-de-emphasis label. Not dropped: that decision is a separate ask.
  const trail = context.reasoningTrail ?? [];
  if (trail.length > 0) {
    lines.push('PRIOR REASONING (may be obsolete; verify against current state):');
    trail.forEach((t, i) => {
      lines.push(`  ${i + 1}. move: ${t.move}`);
      lines.push(`     why: ${t.reasoning}`);
    });
    lines.push('');
  }

  // Trim trailing blank line for cleanliness.
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  return lines.join('\n');
}
