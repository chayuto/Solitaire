/**
 * Named board-state fixtures for fast, deterministic re-runs.
 *
 * Some game states — winnable end-games, fully-sorted boards, one-move-from-win
 * — are impractical to reach by playing from a seed. These factories craft them
 * directly so tests (and agents driving the `window.__solitaire` bridge) can
 * jump straight to an interesting position.
 *
 * Each factory returns a fresh, complete 52-card `GameState`. Load one with
 * `window.__solitaire.loadScenario('<name>')` or `importGameState(...)`.
 *
 * @module testScenarios
 */

import type { Card, GameState, Rank, Suit } from './types';

const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

/** Builds a single card. Ids follow the `card-<suit>-<rank>` test-id convention. */
function card(suit: Suit, rank: Rank, faceUp = true): Card {
  return { suit, rank, faceUp, id: `${suit}-${rank}` };
}

/** A full A→K run for one suit, all face up. */
function fullSuit(suit: Suit): Card[] {
  return RANKS.map((rank) => card(suit, rank));
}

/** Fills in sensible defaults so a factory only specifies what matters. */
function baseState(partial: Partial<GameState>): GameState {
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
    ...partial,
  };
}

/**
 * One move from victory: hearts/diamonds/clubs complete, spades filled A→Q, and
 * the spades King sitting face-up on tableau column 0. Clicking the King then
 * its foundation wins. Use to exercise the win modal and end-of-game UI.
 */
function oneMoveFromWinning(): GameState {
  return baseState({
    foundations: {
      hearts: fullSuit('hearts'),
      diamonds: fullSuit('diamonds'),
      clubs: fullSuit('clubs'),
      spades: RANKS.slice(0, 12).map((rank) => card('spades', rank)),
    },
    tableau: [[card('spades', 'K')], [], [], [], [], [], []],
    completionProgress: 98,
  });
}

/**
 * A fully-sorted end-game: every card face up, stock and discard empty, each of
 * four columns a complete suit stacked K→A (Ace exposed). Foundations empty.
 * Toggling auto-play must drive this to a win using foundation moves only.
 */
function autoCompleteReady(): GameState {
  return baseState({
    tableau: [
      [...fullSuit('hearts')].reverse(),
      [...fullSuit('diamonds')].reverse(),
      [...fullSuit('clubs')].reverse(),
      [...fullSuit('spades')].reverse(),
      [],
      [],
      [],
    ],
  });
}

/**
 * Foundations filled A→Q for all four suits, the four Kings spread across
 * tableau columns 0–3. Exactly four foundation moves win — a quick, fully
 * deterministic interaction scenario.
 */
function fourKingsToWin(): GameState {
  const upToQueen = RANKS.slice(0, 12);
  return baseState({
    foundations: {
      hearts: upToQueen.map((rank) => card('hearts', rank)),
      diamonds: upToQueen.map((rank) => card('diamonds', rank)),
      clubs: upToQueen.map((rank) => card('clubs', rank)),
      spades: upToQueen.map((rank) => card('spades', rank)),
    },
    tableau: [
      [card('hearts', 'K')],
      [card('diamonds', 'K')],
      [card('clubs', 'K')],
      [card('spades', 'K')],
      [],
      [],
      [],
    ],
    completionProgress: 92,
  });
}

/** All available scenario factories, keyed by name. */
export const scenarios = {
  oneMoveFromWinning,
  autoCompleteReady,
  fourKingsToWin,
} satisfies Record<string, () => GameState>;

/** Union of valid scenario names. */
export type ScenarioName = keyof typeof scenarios;

/** Ordered list of scenario names. */
export const scenarioNames = Object.keys(scenarios) as ScenarioName[];

/** Type guard for an arbitrary string being a known scenario name. */
export function isScenarioName(name: string): name is ScenarioName {
  return name in scenarios;
}
