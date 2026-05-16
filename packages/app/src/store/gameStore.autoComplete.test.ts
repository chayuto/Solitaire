import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useGameStore } from './gameStore';
import type { GameState, Rank, Suit } from '../types';
import { AUTOPLAY_TIMING } from '../constants';

/**
 * Regression tests for the end-game auto-complete bug.
 *
 * Bug: in the end-game (draw pile empty, every tableau card face up, columns
 * are sorted runs) the auto-player kept running the mid-game scoring heuristics.
 * Those heuristics penalise foundation moves for "high cards still needed for
 * tableau building" and reward multi-card tableau-to-tableau moves, so the
 * auto-player shuffled sorted stacks between columns instead of sending cards
 * to the foundations.
 *
 * Fix: when in auto-complete mode, restrict move selection to foundation moves
 * whenever any exist (tableau-to-tableau moves are never productive once every
 * card is face up and the stock is empty).
 */

const importState = (overrides: Partial<GameState>) => {
  const store = useGameStore.getState();
  const importString = JSON.stringify({
    ...JSON.parse(store.exportGameState()),
    ...overrides,
  });
  store.importGameState(importString);
};

describe('GameStore - Auto-Complete Move Selection', () => {
  beforeEach(() => {
    useGameStore.getState().initializeGame();
  });

  afterEach(() => {
    useGameStore.setState({ autoPlayEnabled: false, autoPlayInProgress: false });
    vi.useRealTimers();
  });

  it('plays a card to the foundation even when a tableau shuffle scores higher', () => {
    vi.useFakeTimers();

    // diamonds foundation is at 4, so 5 of diamonds is the only legal
    // foundation move. 5 of diamonds is also "needed for tableau" because a
    // black 6 is exposed in another column, so the mid-game heuristics score
    // its foundation move negative while scoring the [6c,5d] -> 7h tableau
    // shuffle positive.
    importState({
      drawPile: [],
      discardPile: [],
      tableau: [
        [
          { suit: 'clubs', rank: '6', faceUp: true, id: 'clubs-6' },
          { suit: 'diamonds', rank: '5', faceUp: true, id: 'diamonds-5' },
        ],
        [{ suit: 'hearts', rank: '7', faceUp: true, id: 'hearts-7' }],
        [{ suit: 'spades', rank: 'K', faceUp: true, id: 'spades-K' }],
        [{ suit: 'spades', rank: '6', faceUp: true, id: 'spades-6' }],
        [],
        [],
        [],
      ],
      foundations: {
        hearts: [],
        diamonds: (['A', '2', '3', '4'] as Rank[]).map(rank => ({
          suit: 'diamonds' as Suit,
          rank,
          faceUp: true,
          id: `diamonds-${rank}`,
        })),
        clubs: [],
        spades: [],
      },
      autoPlayEnabled: true,
      gameWon: false,
    });

    useGameStore.getState().performAutoPlayMove();
    // Advance just past the move-execution delay (fast mode) so exactly one
    // move runs before the next iteration is scheduled.
    vi.advanceTimersByTime(AUTOPLAY_TIMING.SELECT_DELAY_FAST + 1);

    const state = useGameStore.getState();

    // The 5 of diamonds went to the foundation...
    expect(state.foundations.diamonds.map(c => c.rank)).toEqual(['A', '2', '3', '4', '5']);
    // ...and column 0 was NOT shuffled onto the 7 of hearts.
    expect(state.tableau[0].map(c => c.id)).toEqual(['clubs-6']);
    expect(state.tableau[1].map(c => c.id)).toEqual(['hearts-7']);
  });

  it('auto-completes a fully sorted end-game to a win without shuffling', () => {
    vi.useFakeTimers();

    const ranksHighToLow: Rank[] = ['K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2', 'A'];
    const suitColumn = (suit: Suit) =>
      ranksHighToLow.map(rank => ({ suit, rank, faceUp: true, id: `${suit}-${rank}` }));

    // Four columns, each a full suit sorted high-to-low (Ace exposed on top).
    // Foundation-only moves can always win this; the auto-player must not get
    // stuck shuffling cards between columns.
    importState({
      drawPile: [],
      discardPile: [],
      tableau: [
        suitColumn('hearts'),
        suitColumn('diamonds'),
        suitColumn('clubs'),
        suitColumn('spades'),
        [],
        [],
        [],
      ],
      foundations: { hearts: [], diamonds: [], clubs: [], spades: [] },
      autoPlayEnabled: true,
      gameWon: false,
    });

    useGameStore.getState().performAutoPlayMove();
    // Runs every scheduled iteration to completion. If the auto-player looped
    // by shuffling stacks this would never settle.
    vi.runAllTimers();

    const state = useGameStore.getState();
    const foundationTotal =
      state.foundations.hearts.length +
      state.foundations.diamonds.length +
      state.foundations.clubs.length +
      state.foundations.spades.length;

    expect(foundationTotal).toBe(52);
    expect(state.gameWon).toBe(true);
    expect(state.tableau.every(col => col.length === 0)).toBe(true);
  });
});
