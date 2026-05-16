/**
 * Test bridge — a typed `window.__solitaire` API for high-fidelity automated
 * and agentic (Playwright / MCP / LLM) testing.
 *
 * The game is click-to-move only and pointer simulation is awkward to drive
 * from automation tools. This bridge gives an agent a deterministic,
 * introspectable control surface: it reads game state and invokes the same
 * Zustand store actions the UI uses, so behaviour stays identical to real play.
 *
 * Design notes:
 * - `getSummary()` returns a *compact* snapshot (counts, not full card arrays)
 *   to keep agent token cost low — full state is available via `getState()`.
 * - All mutating methods delegate to real store actions; no logic is duplicated.
 * - The bridge is intentionally always installed: this is a client-only
 *   single-player game with no security surface, and maximum testability is the
 *   goal. To restrict it, guard `installTestBridge()` behind `import.meta.env.DEV`.
 *
 * @module testBridge
 */

import { useGameStore } from './store/gameStore';
import { scenarios, scenarioNames, isScenarioName } from './testScenarios';
import type { Card, Difficulty, GameState, Suit } from './types';

/** Compact, token-efficient game snapshot for agents. */
export interface GameSummary {
  moveCount: number;
  drawPile: number;
  discardPile: number;
  /** Top (playable) discard card id, or null when the discard pile is empty. */
  discardTop: string | null;
  /** Count of cards in each foundation, keyed by suit. */
  foundations: Record<Suit, number>;
  /** Total cards moved to foundations (0..52). */
  foundationTotal: number;
  /** Number of cards in each of the 7 tableau columns. */
  tableauSizes: number[];
  /** Number of face-down cards remaining in the tableau. */
  tableauFaceDown: number;
  /** Id of the currently selected card, or null when nothing is selected. */
  selectedCard: string | null;
  completionProgress: number;
  perceivedDifficulty: number | undefined;
  difficulty: Difficulty;
  gameWon: boolean;
  autoPlayEnabled: boolean;
}

/** Options for starting a new game via the bridge. */
export interface NewGameOptions {
  seed?: number;
  difficulty?: Difficulty;
}

/** The `window.__solitaire` control surface. */
export interface SolitaireTestBridge {
  /** Bridge schema version — bump on breaking changes. */
  readonly version: number;
  /** Full raw store state (large; prefer `getSummary()` for agents). */
  getState: () => GameState;
  /** Compact, token-efficient snapshot — preferred entry point for agents. */
  getSummary: () => GameSummary;
  /** Start a new game, optionally with a reproducible seed and difficulty. */
  newGame: (options?: NewGameOptions) => void;
  /** Serialize the current game to a JSON string. */
  exportState: () => string;
  /** Restore a game from a JSON string; returns `false` on invalid input. */
  loadState: (json: string) => boolean;
  /** Select a card to move (tableau needs columnIndex + cardIndex). */
  select: (
    source: 'tableau' | 'discard',
    columnIndex?: number,
    cardIndex?: number,
  ) => void;
  /** Clear the current selection. */
  deselect: () => void;
  /** Move the selected card onto a tableau column (0..6). */
  moveToTableau: (columnIndex: number) => void;
  /** Move the selected card onto a foundation pile. */
  moveToFoundation: (suit: Suit) => void;
  /** Draw a card from the stock (or recycle the discard pile when empty). */
  draw: () => void;
  /** Toggle the built-in auto-play solver. */
  toggleAutoPlay: () => void;
  /** Whether the game is currently won. */
  isWon: () => boolean;
  /**
   * Find a card's location by id, e.g. `"hearts-A"`.
   * Returns `null` when the card is not present in a playable position.
   */
  findCard: (
    cardId: string,
  ) =>
    | { source: 'tableau'; columnIndex: number; cardIndex: number; faceUp: boolean }
    | { source: 'discard' }
    | { source: 'foundation'; suit: Suit }
    | null;
  /** Names of the built-in board-state fixtures available to `loadScenario`. */
  listScenarios: () => string[];
  /**
   * Load a named board-state fixture for a fast, deterministic re-run — see
   * the `testScenarios` module. Returns `false` for an unknown name.
   */
  loadScenario: (name: string) => boolean;
}

declare global {
  interface Window {
    __solitaire?: SolitaireTestBridge;
  }
}

function locateCard(state: GameState, cardId: string): ReturnType<SolitaireTestBridge['findCard']> {
  for (let columnIndex = 0; columnIndex < state.tableau.length; columnIndex++) {
    const column = state.tableau[columnIndex];
    for (let cardIndex = 0; cardIndex < column.length; cardIndex++) {
      if (column[cardIndex].id === cardId) {
        return {
          source: 'tableau',
          columnIndex,
          cardIndex,
          faceUp: column[cardIndex].faceUp,
        };
      }
    }
  }
  const discardTop = state.discardPile[state.discardPile.length - 1];
  if (discardTop?.id === cardId) {
    return { source: 'discard' };
  }
  for (const suit of ['hearts', 'diamonds', 'clubs', 'spades'] as const) {
    if (state.foundations[suit].some((card: Card) => card.id === cardId)) {
      return { source: 'foundation', suit };
    }
  }
  return null;
}

function buildSummary(state: GameState): GameSummary {
  const foundations: Record<Suit, number> = {
    hearts: state.foundations.hearts.length,
    diamonds: state.foundations.diamonds.length,
    clubs: state.foundations.clubs.length,
    spades: state.foundations.spades.length,
  };
  const foundationTotal =
    foundations.hearts + foundations.diamonds + foundations.clubs + foundations.spades;
  const tableauFaceDown = state.tableau.reduce(
    (count, column) => count + column.filter((card) => !card.faceUp).length,
    0,
  );
  const discardTop = state.discardPile[state.discardPile.length - 1];

  return {
    moveCount: state.moveHistory.length,
    drawPile: state.drawPile.length,
    discardPile: state.discardPile.length,
    discardTop: discardTop ? discardTop.id : null,
    foundations,
    foundationTotal,
    tableauSizes: state.tableau.map((column) => column.length),
    tableauFaceDown,
    selectedCard: state.selectedCard ? state.selectedCard.card.id : null,
    completionProgress: state.completionProgress,
    perceivedDifficulty: state.perceivedDifficulty,
    difficulty: state.difficulty,
    gameWon: state.gameWon,
    autoPlayEnabled: state.autoPlayEnabled,
  };
}

/**
 * Installs the `window.__solitaire` test bridge. Safe to call once at startup;
 * a no-op outside a browser environment.
 */
export function installTestBridge(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const bridge: SolitaireTestBridge = {
    version: 2,
    getState: () => useGameStore.getState(),
    getSummary: () => buildSummary(useGameStore.getState()),
    newGame: (options) =>
      useGameStore.getState().initializeGame(options?.difficulty, options?.seed),
    exportState: () => useGameStore.getState().exportGameState(),
    loadState: (json) => useGameStore.getState().importGameState(json),
    select: (source, columnIndex, cardIndex) =>
      useGameStore.getState().selectCard(source, columnIndex, cardIndex),
    deselect: () => useGameStore.getState().deselectCard(),
    moveToTableau: (columnIndex) => useGameStore.getState().moveCardToTableau(columnIndex),
    moveToFoundation: (suit) => useGameStore.getState().moveCardToFoundation(suit),
    draw: () => useGameStore.getState().drawCard(),
    toggleAutoPlay: () => useGameStore.getState().toggleAutoPlay(),
    isWon: () => useGameStore.getState().gameWon,
    findCard: (cardId) => locateCard(useGameStore.getState(), cardId),
    listScenarios: () => [...scenarioNames],
    loadScenario: (name) =>
      isScenarioName(name) &&
      useGameStore.getState().importGameState(JSON.stringify(scenarios[name]())),
  };

  window.__solitaire = bridge;
}
