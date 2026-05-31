/**
 * BoardShapeBars — the "Board" tab.
 *
 * A live, at-a-glance topology of the board: four foundation bars (each 0→13)
 * and seven tableau column bars whose height tracks the pile size, split into a
 * buried (face-down) base and a revealed (face-up) cap. Reads current state
 * straight from the store, so it repaints on every move.
 */

import { useGameStore } from '../../store/gameStore';
import type { Suit } from '../../types';

const SUIT_META: { suit: Suit; glyph: string; color: string; track: string }[] = [
  { suit: 'spades', glyph: '♠', color: 'bg-slate-700', track: 'bg-slate-100' },
  { suit: 'hearts', glyph: '♥', color: 'bg-rose-500', track: 'bg-rose-100' },
  { suit: 'diamonds', glyph: '♦', color: 'bg-rose-500', track: 'bg-rose-100' },
  { suit: 'clubs', glyph: '♣', color: 'bg-slate-700', track: 'bg-slate-100' },
];

/** A foundation suit's progress, 0–13. */
const FoundationBar: React.FC<{
  suit: Suit;
  glyph: string;
  color: string;
  track: string;
  count: number;
}> = ({ suit, glyph, color, track, count }) => (
  <div className="flex flex-col items-center gap-1">
    <div
      data-testid={`insights-foundation-${suit}`}
      role="img"
      aria-label={`${suit} foundation: ${count} of 13`}
      className={`relative w-5 h-28 rounded-md ${track} overflow-hidden flex flex-col justify-end`}
    >
      <div
        className={`w-full ${color} transition-all duration-500 ease-out`}
        style={{ height: `${(count / 13) * 100}%` }}
      />
    </div>
    <span className="text-[11px] leading-none text-gray-500">{glyph}</span>
    <span className="text-[11px] leading-none font-semibold tabular-nums text-gray-700">
      {count}
    </span>
  </div>
);

/** One tableau column: buried (face-down) base + revealed (face-up) cap. */
const ColumnBar: React.FC<{
  index: number;
  total: number;
  buried: number;
  maxTotal: number;
}> = ({ index, total, buried, maxTotal }) => {
  const faceUp = total - buried;
  const fillPct = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
  const faceUpPct = total > 0 ? (faceUp / total) * 100 : 0;
  const buriedPct = total > 0 ? (buried / total) * 100 : 0;

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        data-testid={`insights-column-${index}`}
        role="img"
        aria-label={`Column ${index + 1}: ${total} cards, ${buried} face-down`}
        className="relative w-5 h-28 rounded-md bg-gray-100 overflow-hidden flex flex-col justify-end"
      >
        <div
          className="w-full flex flex-col transition-all duration-500 ease-out"
          style={{ height: `${fillPct}%` }}
        >
          {/* Revealed cap on top, buried base below. */}
          <div className="w-full bg-sky-400" style={{ height: `${faceUpPct}%` }} />
          <div className="w-full bg-indigo-400" style={{ height: `${buriedPct}%` }} />
        </div>
      </div>
      <span className="text-[11px] leading-none text-gray-400">{index + 1}</span>
      <span className="text-[11px] leading-none font-semibold tabular-nums text-gray-700">
        {total}
      </span>
    </div>
  );
};

const BoardShapeBars: React.FC = () => {
  const foundations = useGameStore((s) => s.foundations);
  const tableau = useGameStore((s) => s.tableau);

  const columns = tableau.map((column) => ({
    total: column.length,
    buried: column.reduce((n, card) => (card.faceUp ? n : n + 1), 0),
  }));
  const maxTotal = Math.max(1, ...columns.map((c) => c.total));

  return (
    <div
      data-testid="insights-board-bars"
      className="flex h-full items-start justify-center gap-5 pt-2"
    >
      {/* Foundations group */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-end gap-2">
          {SUIT_META.map(({ suit, glyph, color, track }) => (
            <FoundationBar
              key={suit}
              suit={suit}
              glyph={glyph}
              color={color}
              track={track}
              count={foundations[suit].length}
            />
          ))}
        </div>
        <span className="text-[10px] uppercase tracking-wide text-gray-400">
          Foundations
        </span>
      </div>

      <div className="self-stretch w-px bg-gray-200" aria-hidden />

      {/* Tableau group */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-end gap-1.5">
          {columns.map((c, i) => (
            <ColumnBar
              key={i}
              index={i}
              total={c.total}
              buried={c.buried}
              maxTotal={maxTotal}
            />
          ))}
        </div>
        <div className="flex items-center gap-3 text-[10px] text-gray-400">
          <span className="uppercase tracking-wide">Tableau</span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-sm bg-indigo-400" /> buried
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-sm bg-sky-400" /> up
          </span>
        </div>
      </div>
    </div>
  );
};

export default BoardShapeBars;
