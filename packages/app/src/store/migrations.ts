/**
 * Migrations for persisted/imported game data created before a schema change.
 *
 * Before 2026-06 the auto-play lifecycle telemetry (`autoplay_start`,
 * `autoplay_stop`, `autoplay_deadend`, `autoplay_loop_detected`) was stored as
 * pseudo-entries *inside* `moveHistory`, carrying a fake marker card. Those
 * entries now live in the parallel `eventLog` (see {@link GameEvent}). Old
 * localStorage sessions and exported JSON files still contain the embedded
 * form, so every load path funnels through {@link splitLegacyMoveHistory}.
 *
 * @module store/migrations
 */

import type { GameEvent, GameEventType, Move } from '../types';

const LEGACY_EVENT_TYPES: ReadonlySet<string> = new Set([
  'autoplay_start',
  'autoplay_stop',
  'autoplay_deadend',
  'autoplay_loop_detected',
] satisfies GameEventType[]);

/**
 * Partition a possibly-legacy move history into real moves and telemetry
 * events. Legacy `autoplay_*` pseudo-moves become {@link GameEvent}s anchored
 * at the move index they occupied; clean histories pass through unchanged
 * (idempotent).
 *
 * @param moves - History entries as persisted (may predate the eventLog split)
 * @param existingEvents - Already-split events from the same save, if any
 */
export function splitLegacyMoveHistory(
  moves: readonly Move[],
  existingEvents: readonly GameEvent[] = [],
): { moveHistory: Move[]; eventLog: GameEvent[] } {
  const moveHistory: Move[] = [];
  const migrated: GameEvent[] = [];

  for (const entry of moves) {
    if (LEGACY_EVENT_TYPES.has(entry.type as string)) {
      migrated.push({
        type: entry.type as unknown as GameEventType,
        timestamp: entry.timestamp,
        atMoveIndex: moveHistory.length,
      });
    } else {
      moveHistory.push(entry);
    }
  }

  // Merge with any already-split events, ordered along the move timeline.
  const eventLog = [...existingEvents, ...migrated].sort(
    (a, b) => a.atMoveIndex - b.atMoveIndex || a.timestamp - b.timestamp,
  );

  return { moveHistory, eventLog };
}
