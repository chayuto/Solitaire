/**
 * Golden parity harness for the stage-1b engine-unification refactor.
 *
 * Plays a deterministic, seeded script through the store's public actions and
 * snapshots the resulting move records and board. The snapshots were captured
 * against the pre-refactor hand-rolled move logic; the engine-backed pathway
 * must reproduce them exactly (timestamps excluded — they are wall-clock).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from './gameStore';
import { uiToCore } from '../adapters/coreAdapter';
import { GameEngine } from '@chayuto/solitaire-core';
import type { Move } from '../types';

const engine = new GameEngine();

/** Timestamp-free, diff-friendly projection of a move record. */
const project = (m: Move) =>
  [
    m.type,
    m.card.id,
    m.from ? `${m.from.source}:${m.from.columnIndex ?? ''}:${m.from.cardIndex ?? ''}` : '',
    m.to ? `${m.to.target}:${m.to.columnIndex ?? ''}${m.to.suit ?? ''}` : '',
  ].join('|');

const boardSignature = () => {
  const s = useGameStore.getState();
  return {
    draw: s.drawPile.map((c) => c.id).join(','),
    discard: s.discardPile.map((c) => c.id).join(','),
    foundations: (['hearts', 'diamonds', 'clubs', 'spades'] as const)
      .map((k) => s.foundations[k].map((c) => c.id).join(','))
      .join(' | '),
    tableau: s.tableau
      .map((col) => col.map((c) => `${c.id}${c.faceUp ? '^' : 'v'}`).join(','))
      .join(' | '),
    recycleCount: s.recycleCount,
    progress: Math.round(s.completionProgress * 100) / 100,
  };
};

describe('move application parity (seed 42)', () => {
  beforeEach(() => {
    useGameStore.getState().initializeGame(3, 42);
  });

  it('reproduces the recorded history for an 80-step legal-move script', () => {
    // Deterministic driver: at each step apply the (step % n)-th legal move.
    // Exercises draws, recycles, tableau runs (with flips) and foundation moves
    // through applyMoveCommand — the same pathway AI moves use.
    for (let step = 0; step < 80; step++) {
      const state = useGameStore.getState();
      if (state.gameWon) break;
      const legal = engine.getLegalMoves(uiToCore(state));
      if (legal.length === 0) break;
      state.applyMoveCommand(legal[step % legal.length]);
    }

    const s = useGameStore.getState();
    expect(s.moveHistory.map(project)).toMatchSnapshot('history-80-step');
    expect(boardSignature()).toMatchSnapshot('board-80-step');
  });

  it('reproduces records for selection-driven moves (human pathway)', () => {
    const store = () => useGameStore.getState();

    // Draw three times, then walk every tableau column looking for the first
    // legal selection-driven tableau→tableau and →foundation moves.
    store().drawCard();
    store().drawCard();
    store().drawCard();

    for (let from = 0; from < 7; from++) {
      const col = store().tableau[from];
      for (let ci = 0; ci < col.length; ci++) {
        if (!col[ci].faceUp) continue;
        for (let to = 0; to < 7; to++) {
          if (to === from) continue;
          if (store().canMoveToTableau(col[ci], to)) {
            store().selectCard('tableau', from, ci);
            store().moveCardToTableau(to);
          }
        }
      }
    }

    // Discard → tableau, if the waste top fits anywhere.
    const top = store().discardPile[store().discardPile.length - 1];
    if (top) {
      for (let to = 0; to < 7; to++) {
        if (store().canMoveToTableau(top, to)) {
          store().selectCard('discard');
          store().moveCardToTableau(to);
          break;
        }
      }
    }

    expect(store().moveHistory.map(project)).toMatchSnapshot('history-selection-driven');
    expect(boardSignature()).toMatchSnapshot('board-selection-driven');
  });
});
