import { describe, it, expect } from 'vitest';
import { splitLegacyMoveHistory } from './migrations';
import type { GameEvent, Move } from '../types';

/** A minimal real move entry. */
const mv = (type: Move['type'], timestamp = 1000): Move => ({
  type,
  timestamp,
  card: { suit: 'hearts', rank: 'A', faceUp: true, id: 'hearts-A' },
});

/** A legacy autoplay pseudo-move as it appears in pre-split saves. */
const legacyEvent = (type: string, timestamp = 1000): Move =>
  ({
    type,
    timestamp,
    card: { suit: 'hearts', rank: 'A', faceUp: true, id: 'autoplay-marker' },
  }) as unknown as Move;

describe('splitLegacyMoveHistory', () => {
  it('passes a clean history through unchanged (idempotent)', () => {
    const moves = [mv('draw_card', 1), mv('tableau_to_foundation', 2)];
    const { moveHistory, eventLog } = splitLegacyMoveHistory(moves);
    expect(moveHistory).toEqual(moves);
    expect(eventLog).toEqual([]);
  });

  it('partitions interleaved legacy autoplay entries into anchored events', () => {
    const { moveHistory, eventLog } = splitLegacyMoveHistory([
      mv('draw_card', 1),
      legacyEvent('autoplay_start', 2),
      mv('tableau_to_tableau', 3),
      mv('flip_card', 4),
      legacyEvent('autoplay_deadend', 5),
    ]);
    expect(moveHistory.map((m) => m.type)).toEqual([
      'draw_card',
      'tableau_to_tableau',
      'flip_card',
    ]);
    expect(eventLog).toEqual([
      { type: 'autoplay_start', timestamp: 2, atMoveIndex: 1 },
      { type: 'autoplay_deadend', timestamp: 5, atMoveIndex: 3 },
    ]);
  });

  it('keeps already-split events and orders the merged log by timeline', () => {
    const existing: GameEvent[] = [
      { type: 'autoplay_start', timestamp: 10, atMoveIndex: 0 },
    ];
    const { moveHistory, eventLog } = splitLegacyMoveHistory(
      [mv('draw_card', 20), legacyEvent('autoplay_stop', 30)],
      existing,
    );
    expect(moveHistory).toHaveLength(1);
    expect(eventLog).toEqual([
      { type: 'autoplay_start', timestamp: 10, atMoveIndex: 0 },
      { type: 'autoplay_stop', timestamp: 30, atMoveIndex: 1 },
    ]);
  });

  it('handles a history that is all legacy events', () => {
    const { moveHistory, eventLog } = splitLegacyMoveHistory([
      legacyEvent('autoplay_start', 1),
      legacyEvent('autoplay_loop_detected', 2),
    ]);
    expect(moveHistory).toEqual([]);
    expect(eventLog.map((e) => e.type)).toEqual([
      'autoplay_start',
      'autoplay_loop_detected',
    ]);
    expect(eventLog.every((e) => e.atMoveIndex === 0)).toBe(true);
  });
});
