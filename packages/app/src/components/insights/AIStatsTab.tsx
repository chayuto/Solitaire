/**
 * AIStatsTab — the "AI" tab: live telemetry for the model driving the game.
 *
 * Reads the interaction log (the same ring buffer the harvester exports),
 * filtered to the current game session, and surfaces think-time, token burn,
 * self-rated confidence, and the success/error/resigned tally. Updates while
 * the AI auto-plays.
 *
 * The interaction log is a plain module buffer with no subscribe hook, so we
 * poll it once a second while this tab is mounted — cheap, and only while the
 * user is actually looking at this tab.
 */

import { useEffect, useMemo, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { getAIInteractions } from '../../ai';
import type { AIInteraction } from '../../ai';
import { Sparkline } from './Sparkline';

/** Compact large counts: 18234 → "18.2k". */
function fmtNum(n: number): string {
  if (n < 1000) return String(n);
  return `${(n / 1000).toFixed(1)}k`;
}

/** One labelled telemetry cell. */
const Cell: React.FC<{
  testid: string;
  label: string;
  children: React.ReactNode;
}> = ({ testid, label, children }) => (
  <div
    data-testid={testid}
    className="flex flex-col gap-1 rounded-lg bg-gray-50 px-3 py-2"
  >
    <span className="text-[10px] uppercase tracking-wide text-gray-400">{label}</span>
    {children}
  </div>
);

const AIStatsTab: React.FC = () => {
  const gameSessionId = useGameStore((s) => s.gameSessionId);
  const aiThinking = useGameStore((s) => s.aiThinking);

  // The log has no subscribe; poll while this tab is open so it stays live.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const calls = useMemo<AIInteraction[]>(() => {
    // `tick`/`aiThinking` are read only to re-run this memo as new rows land.
    void tick;
    void aiThinking;
    return getAIInteractions().filter(
      (i) =>
        i.event === undefined && (!gameSessionId || i.sessionId === gameSessionId),
    );
  }, [gameSessionId, tick, aiThinking]);

  if (calls.length === 0) {
    return (
      <div
        data-testid="insights-ai-empty"
        className="flex h-full items-center justify-center px-4 text-center text-xs text-gray-400"
      >
        No AI moves in this game yet — turn on AI auto-play to watch the model think.
      </div>
    );
  }

  const latencies = calls
    .map((i) => i.durationMs)
    .filter((d): d is number => Number.isFinite(d) && d > 0);
  const avgLatencyMs =
    latencies.length > 0
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length
      : null;

  const sum = (pick: (i: AIInteraction) => number | undefined) =>
    calls.reduce((acc, i) => acc + (pick(i) ?? 0), 0);
  const promptTokens = sum((i) => i.promptTokens);
  const thoughtTokens = sum((i) => i.thoughtTokens);
  const outputTokens = sum((i) => i.outputTokens);
  const totalTokens =
    sum((i) => i.totalTokens) || promptTokens + thoughtTokens + outputTokens;

  const confidences = calls
    .map((i) => i.decision?.confidence)
    .filter((c): c is number => typeof c === 'number');
  const lastConfidence =
    confidences.length > 0 ? confidences[confidences.length - 1] : null;

  const ok = calls.filter((i) => i.outcome === 'success').length;
  const err = calls.filter((i) => i.outcome === 'error').length;
  const resigned = calls.filter((i) => i.outcome === 'resigned').length;

  return (
    <div
      data-testid="insights-ai-stats"
      className="grid grid-cols-2 gap-2 text-gray-700"
    >
      <Cell testid="insights-ai-latency" label="Think time">
        <div className="flex items-center justify-between gap-2">
          <span className="text-base font-bold tabular-nums">
            {avgLatencyMs === null ? '—' : `${(avgLatencyMs / 1000).toFixed(1)}s`}
          </span>
          <Sparkline values={latencies} color="#f59e0b" />
        </div>
        <span className="text-[10px] text-gray-400">avg over {latencies.length} calls</span>
      </Cell>

      <Cell testid="insights-ai-tokens" label="Tokens">
        <span className="text-base font-bold tabular-nums">{fmtNum(totalTokens)}</span>
        <span className="text-[10px] text-gray-400 tabular-nums">
          in {fmtNum(promptTokens)} · think {fmtNum(thoughtTokens)} · out{' '}
          {fmtNum(outputTokens)}
        </span>
      </Cell>

      <Cell testid="insights-ai-confidence" label="Confidence">
        <div className="flex items-center justify-between gap-2">
          <span className="text-base font-bold tabular-nums">
            {lastConfidence === null ? '—' : `${Math.round(lastConfidence * 100)}%`}
          </span>
          <Sparkline values={confidences} color="#10b981" min={0} max={1} />
        </div>
        <span className="text-[10px] text-gray-400">latest self-rating</span>
      </Cell>

      <Cell testid="insights-ai-outcomes" label="Outcomes">
        <span className="text-base font-bold tabular-nums">{calls.length} moves</span>
        <span className="text-[10px] text-gray-400 tabular-nums">
          <span className="text-emerald-600">{ok} ok</span> ·{' '}
          <span className="text-rose-600">{err} err</span> ·{' '}
          <span className="text-amber-600">{resigned} resign</span>
        </span>
      </Cell>
    </div>
  );
};

export default AIStatsTab;
