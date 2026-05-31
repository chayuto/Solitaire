/**
 * GameInsightsPanel — a live, modern dashboard for watching a game (or the AI
 * auto-player) progress.
 *
 * Always-visible header carries a live progress bar and a few stat chips that
 * update on every move. Below, a tabbed chart area:
 *   • Progress  — move number vs progress % (gradient area line).
 *   • Card Flow — a streamgraph of all 52 cards flowing toward the foundations.
 *
 * The panel stays mounted so its per-move history keeps accumulating even while
 * collapsed; collapsing only hides the tabs + chart, never the live bar.
 */

import { lazy, Suspense, useDeferredValue, useMemo, useState } from 'react';
import { useProgressHistory } from '../hooks/useProgressHistory';
import { shouldReduceMotion as checkReducedMotion } from '../utils/motion';
import { ChartEmptyHint } from './charts/ChartEmptyHint';
import StatStrip from './insights/StatStrip';
import MoveMix from './insights/MoveMix';
import AIStatsTab from './insights/AIStatsTab';

// Nivo (and its d3 deps) is heavy; load the charts as a separate chunk so the
// always-visible bar + stat chips paint without waiting on it.
const ProgressChart = lazy(() => import('./charts/ProgressChart'));
const CardFlowChart = lazy(() => import('./charts/CardFlowChart'));

type InsightsTab = 'progress' | 'flow' | 'moves' | 'ai';

/** Total face-down cards in a fresh Klondike deal. */
const INITIAL_FACE_DOWN = 21;

const GameInsightsPanel: React.FC = () => {
  const history = useProgressHistory();
  const animate = useMemo(() => !checkReducedMotion(), []);

  // The live bar + stat chips read `history` directly (cheap, instant). The
  // heavy charts read a DEFERRED copy so a move's urgent work — the card moving
  // and its flip animation — commits first and the chart re-renders after, at
  // low priority. During a fast auto-play this also coalesces rapid moves into
  // far fewer chart renders (React drops superseded deferred values).
  const chartHistory = useDeferredValue(history);

  const [collapsed, setCollapsed] = useState(false);
  const [tab, setTab] = useState<InsightsTab>('progress');

  const latest = history[history.length - 1];
  const progress = latest?.progress ?? 0;
  const foundations = latest?.foundations ?? 0;
  const revealed = INITIAL_FACE_DOWN - (latest?.faceDown ?? INITIAL_FACE_DOWN);
  const moves = latest?.move ?? 0;

  return (
    <div
      data-testid="game-insights-panel"
      className="mt-6 lg:mt-8 bg-white/90 backdrop-blur-sm rounded-lg shadow-xl p-4"
    >
      {/* Header: title + collapse toggle */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
          <span aria-hidden>📈</span> Game Insights
        </h2>
        <button
          type="button"
          data-testid="insights-collapse-btn"
          onClick={() => setCollapsed((c) => !c)}
          aria-expanded={!collapsed}
          className="text-gray-400 hover:text-gray-700 transition-colors text-xs font-medium"
        >
          {collapsed ? 'Show ▾' : 'Hide ▴'}
        </button>
      </div>

      {/* Always-visible live progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            data-testid="insights-progress-bar"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Game progress"
            className="h-full rounded-full bg-gradient-to-r from-green-400 via-emerald-500 to-green-600 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span
          data-testid="insights-progress-value"
          className="text-sm font-bold text-emerald-700 tabular-nums w-10 text-right"
        >
          {progress}%
        </span>
      </div>

      {/* Stat chips */}
      <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-medium">
        <span
          data-testid="insights-stat-moves"
          className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600"
        >
          {moves} moves
        </span>
        <span
          data-testid="insights-stat-foundations"
          className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700"
        >
          ♦ {foundations}/52 home
        </span>
        <span
          data-testid="insights-stat-revealed"
          className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-700"
        >
          {revealed}/{INITIAL_FACE_DOWN} revealed
        </span>
      </div>

      {/* Box-score stat strip (elapsed, pace, recycles, efficiency, stuck) */}
      <StatStrip history={history} />

      {!collapsed && (
        <>
          {/* Tab switcher (segmented control) */}
          <div
            role="tablist"
            aria-label="Game Insights charts"
            className="mt-4 inline-flex rounded-lg bg-gray-100 p-0.5 text-xs font-semibold"
          >
            {([
              { id: 'progress', label: 'Progress' },
              { id: 'flow', label: 'Card Flow' },
              { id: 'moves', label: 'Move Mix' },
              { id: 'ai', label: 'AI' },
            ] as const).map(({ id, label }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                data-testid={`insights-tab-${id}`}
                onClick={() => setTab(id)}
                className={`px-3 py-1 rounded-md transition-colors ${
                  tab === id
                    ? 'bg-white text-green-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Active chart / panel */}
          <div className="mt-2 h-52 w-full">
            {tab === 'progress' && (
              <Suspense fallback={<ChartEmptyHint />}>
                <div
                  data-testid="insights-chart-progress"
                  className="h-full w-full"
                >
                  <ProgressChart history={chartHistory} animate={animate} />
                </div>
              </Suspense>
            )}
            {tab === 'flow' && (
              <Suspense fallback={<ChartEmptyHint />}>
                <div data-testid="insights-chart-flow" className="h-full w-full">
                  <CardFlowChart history={chartHistory} animate={animate} />
                </div>
              </Suspense>
            )}
            {tab === 'moves' && (
              <div data-testid="insights-chart-moves" className="h-full w-full">
                <MoveMix />
              </div>
            )}
            {tab === 'ai' && (
              <div data-testid="insights-chart-ai" className="h-full w-full">
                <AIStatsTab />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default GameInsightsPanel;
