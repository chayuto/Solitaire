/**
 * Tests for the AI advisor's game-progress metric.
 */

import { describe, it, expect } from 'vitest';
import { computeProgressComponents } from './progressMetric';
import type { Card, GameState, Rank, Suit } from '../types';

const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function card(suit: Suit, rank: Rank, faceUp = true): Card {
  return { suit, rank, faceUp, id: `${suit}-${rank}` };
}

function fullSuit(suit: Suit): Card[] {
  return RANKS.map((rank) => card(suit, rank));
}

/** A minimal game state — `computeProgressComponents` only reads foundations + tableau. */
function makeState(overrides: Partial<GameState>): GameState {
  return {
    drawPile: [],
    discardPile: [],
    foundations: { hearts: [], diamonds: [], clubs: [], spades: [] },
    tableau: [[], [], [], [], [], [], []],
    moveHistory: [],
    showValidMoves: true,
    godMode: false,
    autoPlayEnabled: false,
    autoPlayInProgress: false,
    difficulty: 3,
    gameWon: false,
    completionProgress: 0,
    replayMode: false,
    replayIndex: 0,
    replayPaused: false,
    replaySpeed: 1000,
    ...overrides,
  };
}

describe('computeProgressComponents', () => {
  it('scores a fresh deal at 0 (no foundation cards, 21 face-down)', () => {
    // The seven Klondike columns hold 0..6 face-down cards each (21 total),
    // plus a face-up card on top.
    const tableau = Array.from({ length: 7 }, (_, col) => {
      const column: Card[] = [];
      for (let i = 0; i < col; i++) column.push(card('clubs', 'K', false));
      column.push(card('hearts', 'A', true));
      return column;
    });
    const { foundationCards, faceDownTotal, progressScore } = computeProgressComponents(
      makeState({ tableau }),
    );
    expect(foundationCards).toBe(0);
    expect(faceDownTotal).toBe(21);
    expect(progressScore).toBe(0);
  });

  it('scores a won board at 100 (all 52 home, nothing face-down)', () => {
    const { foundationCards, faceDownTotal, progressScore } = computeProgressComponents(
      makeState({
        foundations: {
          hearts: fullSuit('hearts'),
          diamonds: fullSuit('diamonds'),
          clubs: fullSuit('clubs'),
          spades: fullSuit('spades'),
        },
      }),
    );
    expect(foundationCards).toBe(52);
    expect(faceDownTotal).toBe(0);
    expect(progressScore).toBe(100);
  });

  it('blends foundations (0.65) and revealed cards (0.35)', () => {
    // 26 cards home, all face-down cards revealed: 0.65*0.5 + 0.35*1 = 0.675.
    const { progressScore } = computeProgressComponents(
      makeState({
        foundations: {
          hearts: fullSuit('hearts'),
          diamonds: fullSuit('diamonds'),
          clubs: [],
          spades: [],
        },
      }),
    );
    expect(progressScore).toBe(68); // round(67.5)
  });

  it('counts face-down cards as un-revealed work still to do', () => {
    // No foundation cards; 10 of 21 still face-down => 11 revealed.
    const tableau: Card[][] = [
      Array.from({ length: 10 }, () => card('spades', 'K', false)),
      [],
      [],
      [],
      [],
      [],
      [],
    ];
    const { foundationCards, faceDownTotal, progressScore } = computeProgressComponents(
      makeState({ tableau }),
    );
    expect(foundationCards).toBe(0);
    expect(faceDownTotal).toBe(10);
    // 0.35 * (11/21) * 100 = 18.33 -> 18
    expect(progressScore).toBe(18);
  });
});
