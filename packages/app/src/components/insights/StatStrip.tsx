/**
 * StatStrip — the "box score" row under the progress bar.
 *
 * A compact strip of live, derived stats for the number-watcher: elapsed time,
 * move pace, stock recycles, move efficiency, and a "stuck-o-meter" (moves
 * since the last bit of progress). Everything is reconstructed from the
 * progress series plus two store fields — no new state.
 *
 * The 1-second clock lives here, local to this subtree, so the ticking elapsed
 * time never re-renders the (expensive) Nivo charts above it.
 */

import { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import type { ProgressSnapshot } from '../../hooks/useProgressHistory';
import { computeGameStats, computePace, formatElapsed } from './computeStats';

interface StatStripProps {
  history: ProgressSnapshot[];
}

/** One stat pill. */
const Chip: React.FC<{
  testid: string;
  className?: string;
  title?: string;
  children: React.ReactNode;
}> = ({ testid, className = 'bg-gray-100 text-gray-600', title, children }) => (
  <span
    data-testid={testid}
    title={title}
    className={`px-2 py-0.5 rounded-full tabular-nums ${className}`}
  >
    {children}
  </span>
);

const StatStrip: React.FC<StatStripProps> = ({ history }) => {
  const gameStartedAt = useGameStore((s) => s.gameStartedAt);
  const recycleCount = useGameStore((s) => s.recycleCount) ?? 0;
  const gameWon = useGameStore((s) => s.gameWon);

  // Local ticking clock; freezes when the game is won so the final time sticks.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (gameWon) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [gameWon]);

  const stats = computeGameStats(history);
  const elapsedMs = gameStartedAt ? Math.max(0, now - gameStartedAt) : 0;
  const pace = computePace(stats.moves, elapsedMs);

  const stuck = stats.movesSinceProgress;
  const stuckClass =
    stuck === 0
      ? 'bg-emerald-100 text-emerald-700'
      : stuck >= 10
        ? 'bg-rose-100 text-rose-700'
        : stuck >= 5
          ? 'bg-amber-100 text-amber-700'
          : 'bg-gray-100 text-gray-600';

  return (
    <div
      data-testid="insights-stat-strip"
      className="mt-2 flex flex-wrap gap-2 text-[11px] font-medium"
    >
      <Chip testid="insights-stat-time" title="Elapsed time">
        ⏱ {formatElapsed(elapsedMs)}
      </Chip>
      <Chip testid="insights-stat-pace" title="Moves per minute">
        {pace ?? '—'} <span className="text-gray-400">moves/min</span>
      </Chip>
      <Chip
        testid="insights-stat-recycles"
        className="bg-violet-100 text-violet-700"
        title="Times the waste pile has been recycled into the stock"
      >
        ↻ {recycleCount} {recycleCount === 1 ? 'recycle' : 'recycles'}
      </Chip>
      <Chip
        testid="insights-stat-efficiency"
        className="bg-sky-100 text-sky-700"
        title="Share of moves that revealed a card or sent one home"
      >
        ⚡ {stats.efficiencyPct === null ? '—' : `${stats.efficiencyPct}%`} efficient
      </Chip>
      <Chip
        testid="insights-stat-stuck"
        className={stuckClass}
        title="Consecutive moves with no progress"
      >
        {stuck === 0 ? '✓ flowing' : `⚠ ${stuck} since gain`}
      </Chip>
    </div>
  );
};

export default StatStrip;
