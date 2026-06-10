/**
 * Projection from the app's UI {@link UIGameState} (board + UI/AI extras) to
 * core's pure {@link CoreGameState}.
 *
 * Since the stage-1c type unification the app's card/move types ARE core's
 * (`Move` only adds optional AI annotations), so this is a plain field pick —
 * no copying, no casts, O(1). Core never mutates its inputs (all engine
 * functions are pure), so sharing the arrays is safe.
 */

import type { GameState as CoreGameState } from '@chayuto/solitaire-core';
import type { GameState as UIGameState } from '../types';

/** Project the pure game-state subset out of the app state. */
export function uiToCore(uiState: UIGameState): CoreGameState {
  return {
    drawPile: uiState.drawPile,
    discardPile: uiState.discardPile,
    foundations: uiState.foundations,
    tableau: uiState.tableau,
    moveHistory: uiState.moveHistory,
    difficulty: uiState.difficulty,
    gameWon: uiState.gameWon,
    completionProgress: uiState.completionProgress,
    initialBoardSetup: uiState.initialBoardSetup,
    perceivedDifficulty: uiState.perceivedDifficulty,
  };
}
