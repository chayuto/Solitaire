/**
 * The single board-mutation pathway (ADR-0005).
 *
 * Every move — human click, AI advisor, heuristic auto-play, test bridge —
 * flows through {@link applyCommandToState}: the core {@link GameEngine}
 * computes the next board, and this module constructs the app-side artifacts
 * the engine deliberately leaves to the caller:
 *
 * - history records, preserving the shipped shape exactly (one {@link Move}
 *   per card moved, a `flip_card` record when a face-down card is revealed,
 *   a marker-card `recycle_stock` record);
 * - `recycleCount` bookkeeping;
 * - derived `completionProgress`.
 *
 * Win detection, selection clearing and auto-complete triggering are store
 * concerns and stay in the calling actions.
 *
 * @module store/applyMove
 */

import { getCompletionProgress } from '@chayuto/solitaire-core';
import type { GameEngine, MoveCommand } from '@chayuto/solitaire-core';
import { uiToCore } from '../adapters/coreAdapter';
import type { Card, GameState, Move } from '../types';

/** Result of applying a command: the store patch and the records it produced. */
export interface AppliedMove {
  partial: Partial<GameState>;
  records: Move[];
}

/**
 * Build the history records for `command` against the pre-move `state`,
 * replicating the record shape the store has always written (timestamp
 * offsets included: the i-th card of a run lands at `base + i`, a reveal at
 * `base + n`).
 */
function buildRecords(state: GameState, command: MoveCommand): Move[] {
  const base = Date.now();

  switch (command.type) {
    case 'draw_card': {
      const drawnCard = { ...state.drawPile[0], faceUp: true };
      return [
        { type: 'draw_card', timestamp: base, card: drawnCard, from: { source: 'draw' } },
      ];
    }

    case 'recycle_stock': {
      // Recycle has no single card, so it carries a marker card (legacy shape
      // kept for replay/export compatibility; Move.card is required).
      return [
        {
          type: 'recycle_stock',
          timestamp: base,
          card: { suit: 'hearts', rank: 'A', faceUp: true, id: 'recycle-marker' },
        },
      ];
    }

    case 'tableau_to_tableau': {
      const fromCol = command.from!.column!;
      const toCol = command.to!.column!;
      const sourceColumn = state.tableau[fromCol];
      const cardIndex = command.from!.cardIndex ?? sourceColumn.length - 1;
      const cardsToMove = sourceColumn.slice(cardIndex);
      const remaining = sourceColumn.slice(0, cardIndex);

      const records: Move[] = cardsToMove.map((card, i) => ({
        type: 'tableau_to_tableau',
        timestamp: base + i,
        card,
        from: { source: 'tableau', columnIndex: fromCol, cardIndex: cardIndex + i },
        to: { target: 'tableau', columnIndex: toCol },
      }));

      const uncovered = remaining[remaining.length - 1];
      if (uncovered && !uncovered.faceUp) {
        records.push({
          type: 'flip_card',
          timestamp: base + cardsToMove.length,
          card: { ...uncovered, faceUp: true },
          from: { source: 'tableau', columnIndex: fromCol, cardIndex: remaining.length - 1 },
        });
      }
      return records;
    }

    case 'tableau_to_foundation': {
      const fromCol = command.from!.column!;
      const suit = command.to!.suit!;
      const sourceColumn = state.tableau[fromCol];
      const card = sourceColumn[sourceColumn.length - 1];
      const remaining = sourceColumn.slice(0, -1);

      const records: Move[] = [
        {
          type: 'tableau_to_foundation',
          timestamp: base,
          card,
          from: { source: 'tableau', columnIndex: fromCol, cardIndex: sourceColumn.length - 1 },
          to: { target: 'foundation', suit },
        },
      ];

      const uncovered = remaining[remaining.length - 1];
      if (uncovered && !uncovered.faceUp) {
        records.push({
          type: 'flip_card',
          timestamp: base + 1,
          card: { ...uncovered, faceUp: true },
          from: { source: 'tableau', columnIndex: fromCol, cardIndex: remaining.length - 1 },
        });
      }
      return records;
    }

    case 'discard_to_tableau': {
      const card = state.discardPile[state.discardPile.length - 1];
      return [
        {
          type: 'discard_to_tableau',
          timestamp: base,
          card,
          from: { source: 'discard' },
          to: { target: 'tableau', columnIndex: command.to!.column! },
        },
      ];
    }

    case 'discard_to_foundation': {
      const card = state.discardPile[state.discardPile.length - 1];
      return [
        {
          type: 'discard_to_foundation',
          timestamp: base,
          card,
          from: { source: 'discard' },
          to: { target: 'foundation', suit: command.to!.suit! },
        },
      ];
    }

    case 'flip_card':
      // Reveals are consequences of other moves, never standalone commands.
      return [];

    default:
      return [];
  }
}

/**
 * Validate and apply `command` to the app state via the core engine.
 *
 * @returns the store patch (board fields, history, derived state) and the
 *   records written, or `null` when the engine rejects the command.
 */
export function applyCommandToState(
  state: GameState,
  command: MoveCommand,
  engine: GameEngine,
): AppliedMove | null {
  const coreState = uiToCore(state);
  if (!engine.canApplyMove(coreState, command)) {
    return null;
  }

  const records = buildRecords(state, command);
  const next = engine.applyMove(coreState, command);
  const moveHistory = [...state.moveHistory, ...records];

  const partial: Partial<GameState> = {
    // Engine piles reuse untouched column references, so unchanged piles keep
    // their identity (no spurious re-renders). The casts below are the one
    // sanctioned readonly→mutable boundary: engine results are fresh arrays
    // the store now owns (app state keeps mutable array types for Zustand).
    drawPile: next.drawPile as Card[],
    discardPile: next.discardPile as Card[],
    foundations: next.foundations as GameState['foundations'],
    tableau: next.tableau as Card[][],
    moveHistory,
    completionProgress: getCompletionProgress(next),
  };

  if (command.type === 'recycle_stock') {
    partial.recycleCount = (state.recycleCount ?? 0) + 1;
  }

  return { partial, records };
}
