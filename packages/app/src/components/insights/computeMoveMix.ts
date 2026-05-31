/**
 * Move-mix derivations for the Insights "Move Mix" tab.
 *
 * Pure tallies over the game's {@link Move} history: how the moves break down by
 * type (draws, reveals, foundation banks, tableau shuffles, waste plays), plus a
 * "back-and-forth" count — redundant tableau moves where a card returns to the
 * column it was just moved away from. The latter is the AI's tell-tale churn
 * (shuffling a card to-and-fro without progress), so it's attributed to the AI
 * separately via each move's `aiMove` flag.
 *
 * Unlike the board itself, none of this is readable off the table.
 *
 * @module components/insights/computeMoveMix
 */

import type { Move, MoveType } from '../../types';

/** One move-type bucket in display order. */
export interface MoveMixRow {
  /** Stable slug for testids / colour lookup. */
  id: string;
  /** Human label. */
  label: string;
  /** Number of moves in this bucket. */
  count: number;
}

export interface MoveMixResult {
  /** Total categorised card moves (sum of the rows; excludes autoplay events). */
  total: number;
  /** Buckets, in display order. */
  rows: MoveMixRow[];
  /** Redundant tableau reversals (a card returns to the column it just left). */
  backAndForth: number;
  /** Of {@link backAndForth}, how many were AI-made moves. */
  backAndForthAI: number;
}

/** Bucket definitions: slug, label, and the move types that fall into it. */
const BUCKETS: { id: string; label: string; types: MoveType[] }[] = [
  { id: 'draws', label: 'Draws', types: ['draw_card'] },
  { id: 'reveals', label: 'Reveals', types: ['flip_card'] },
  {
    id: 'foundation',
    label: 'To foundation',
    types: ['tableau_to_foundation', 'discard_to_foundation'],
  },
  { id: 'tableau', label: 'Tableau shuffles', types: ['tableau_to_tableau'] },
  { id: 'waste', label: 'Waste → board', types: ['discard_to_tableau'] },
];

/**
 * Tally a move history into the Move Mix breakdown.
 *
 * Back-and-forth detection: for each `tableau_to_tableau` move of a given card,
 * remember the (from → to) columns. If that same card's next tableau move is the
 * exact reverse (to → from), it's a redundant round-trip.
 */
export function computeMoveMix(moves: readonly Move[]): MoveMixResult {
  const counts = new Map<MoveType, number>();
  for (const m of moves) counts.set(m.type, (counts.get(m.type) ?? 0) + 1);

  const rows = BUCKETS.map((b) => ({
    id: b.id,
    label: b.label,
    count: b.types.reduce((n, t) => n + (counts.get(t) ?? 0), 0),
  }));
  const total = rows.reduce((n, r) => n + r.count, 0);

  // Track each card's last tableau (from, to) to spot an immediate reversal.
  const lastFrom = new Map<string, number>();
  const lastTo = new Map<string, number>();
  let backAndForth = 0;
  let backAndForthAI = 0;

  for (const m of moves) {
    if (m.type !== 'tableau_to_tableau') continue;
    const id = m.card?.id;
    const from = m.from?.columnIndex;
    const to = m.to?.columnIndex;
    if (id == null || from == null || to == null) continue;

    if (lastTo.get(id) === from && lastFrom.get(id) === to) {
      backAndForth += 1;
      if (m.aiMove) backAndForthAI += 1;
    }
    lastFrom.set(id, from);
    lastTo.set(id, to);
  }

  return { total, rows, backAndForth, backAndForthAI };
}
