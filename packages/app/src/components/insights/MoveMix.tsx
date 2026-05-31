/**
 * MoveMix — the "Move Mix" tab.
 *
 * A breakdown of how the game's moves were spent — draws, reveals, foundation
 * banks, tableau shuffles, waste plays — plus a "back-and-forth" callout for
 * redundant tableau round-trips (a card shuffled to a column and straight back).
 * That churn is the AI's tell-tale wheel-spinning, so it's also broken out by
 * how many were AI-made. None of this is readable off the board itself.
 *
 * Reads `moveHistory` straight from the store, so it repaints as moves land. The
 * tally is a cheap pass over the history (a few hundred entries at most), and
 * this only mounts when the Move Mix tab is open.
 */

import { useMemo } from 'react';
import { useGameStore } from '../../store/gameStore';
import { computeMoveMix } from './computeMoveMix';

/** Bar colour per bucket — echoes the Card Flow zone palette. */
const COLORS: Record<string, string> = {
  draws: '#94a3b8', // slate (stock)
  reveals: '#38bdf8', // sky (face-up)
  foundation: '#34d399', // emerald (foundations)
  tableau: '#6366f1', // indigo (face-down)
  waste: '#fbbf24', // amber (waste)
};

const MoveMix: React.FC = () => {
  const moveHistory = useGameStore((s) => s.moveHistory);
  const mix = useMemo(() => computeMoveMix(moveHistory), [moveHistory]);

  if (mix.total === 0) {
    return (
      <div
        data-testid="insights-moves-empty"
        className="flex h-full items-center justify-center px-4 text-center text-xs text-gray-400"
      >
        No moves yet — play or start AI auto-play to see where your moves go.
      </div>
    );
  }

  const max = Math.max(1, ...mix.rows.map((r) => r.count));
  const { backAndForth, backAndForthAI } = mix;

  return (
    <div
      data-testid="insights-move-mix"
      className="flex h-full flex-col gap-2 px-1 py-1"
    >
      <div className="flex items-baseline justify-between text-[11px] text-gray-500">
        <span className="font-semibold uppercase tracking-wide">Move mix</span>
        <span className="tabular-nums">{mix.total} card moves</span>
      </div>

      <div className="flex flex-1 flex-col justify-center gap-1.5">
        {mix.rows.map((r) => (
          <div
            key={r.id}
            data-testid={`insights-move-${r.id}`}
            className="flex items-center gap-2 text-[11px]"
          >
            <span className="w-24 shrink-0 text-gray-600">{r.label}</span>
            <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${(r.count / max) * 100}%`,
                  backgroundColor: COLORS[r.id],
                }}
              />
            </div>
            <span className="w-8 shrink-0 text-right font-semibold tabular-nums text-gray-700">
              {r.count}
            </span>
          </div>
        ))}
      </div>

      {/* Back-and-forth churn callout */}
      <div
        data-testid="insights-move-churn"
        className={`flex items-center justify-between rounded-md px-2 py-1 text-[11px] ${
          backAndForth === 0
            ? 'bg-emerald-50 text-emerald-700'
            : 'bg-rose-50 text-rose-700'
        }`}
        title="Redundant tableau round-trips: a card moved to a column and straight back"
      >
        <span>
          {backAndForth === 0
            ? '✓ no back-and-forth shuffles'
            : `↻ ${backAndForth} back-and-forth ${
                backAndForth === 1 ? 'move' : 'moves'
              }`}
        </span>
        {backAndForthAI > 0 && (
          <span className="tabular-nums opacity-80">{backAndForthAI} by AI</span>
        )}
      </div>
    </div>
  );
};

export default MoveMix;
