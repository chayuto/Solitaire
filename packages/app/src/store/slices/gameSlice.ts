/**
 * Game slice — deal/new-game, the engine-backed move wrappers (ADR-0005),
 * import/export, and the win-modal dismissal.
 */
import { getCompletionProgress, getPerceivedDifficulty } from '@chayuto/solitaire-core';
import type { MoveCommand } from '@chayuto/solitaire-core';
import type { Difficulty, GameState } from '../../types';
import { uiToCore } from '../../adapters/coreAdapter';
import { applyCommandToState } from '../applyMove';
import { engine } from '../engine';
import { initializeGameState } from '../initialState';
import { splitLegacyMoveHistory } from '../migrations';
import { isGameWon } from '../uiHelpers';
import { DEFAULT_AI_CONFIG, uuidv7 } from '../../ai';
import type { AdvisorController } from '../../ai/advisorController';
import { APP_BUILD_TIME, APP_COMMIT } from '../../buildInfo';
import type { GameStore, StoreGet, StoreSet } from '../types';

type GameSlice = Pick<
  GameStore,
  | 'initializeGame'
  | 'setDifficulty'
  | 'moveCardToTableau'
  | 'moveCardToFoundation'
  | 'drawCard'
  | 'exportGameState'
  | 'importGameState'
  | 'applyMoveCommand'
  | 'dismissWinModal'
>;

export function createGameSlice(set: StoreSet, get: StoreGet, advisor: AdvisorController): GameSlice {
  return {
  initializeGame: (difficulty?: Difficulty, seed?: number) => {
    const currentDifficulty = difficulty ?? get().difficulty ?? 3;
    // A new game invalidates the in-flight AI request and all per-run
    // advisor tracking (plateau, window, outcome, position history, cap).
    advisor.resetRunState();
    // The AI config is a session-level preference — preserve it across games.
    const preservedConfig = get().aiConfig ?? DEFAULT_AI_CONFIG;
    set({ ...initializeGameState(currentDifficulty, seed), aiConfig: preservedConfig });
  },

  setDifficulty: (difficulty: Difficulty) => set({ difficulty }),

  moveCardToTableau: (targetColumn) => {
    const state = get();
    const selected = state.selectedCard;

    if (!selected) return;

    // Check if move is valid
    if (!get().canMoveToTableau(selected.card, targetColumn)) {
      return;
    }

    // Build the command and let the core engine apply it (ADR-0005); the
    // store keeps selection UX. Records/derived state come from applyMove.
    const command: MoveCommand =
      selected.source === 'tableau' &&
      selected.columnIndex !== undefined &&
      selected.cardIndex !== undefined
        ? {
            type: 'tableau_to_tableau',
            from: { column: selected.columnIndex, cardIndex: selected.cardIndex },
            to: { column: targetColumn },
          }
        : { type: 'discard_to_tableau', to: { column: targetColumn } };

    const applied = applyCommandToState(state, command, engine);
    if (!applied) return;
    set({ ...applied.partial, selectedCard: undefined });
  },

  moveCardToFoundation: (suit) => {
    const state = get();
    const selected = state.selectedCard;

    if (!selected) return;

    // Check if move is valid
    if (!get().canMoveToFoundation(selected.card, suit)) {
      return;
    }

    let command: MoveCommand;
    if (selected.source === 'tableau' && selected.columnIndex !== undefined && selected.cardIndex !== undefined) {
      // Only the top card of a column can move to a foundation.
      const sourceColumn = state.tableau[selected.columnIndex];
      if (selected.cardIndex !== sourceColumn.length - 1) {
        return;
      }
      command = {
        type: 'tableau_to_foundation',
        from: { column: selected.columnIndex, cardIndex: selected.cardIndex },
        to: { suit },
      };
    } else if (selected.source === 'discard') {
      command = { type: 'discard_to_foundation', to: { suit } };
    } else {
      return;
    }

    const applied = applyCommandToState(state, command, engine);
    if (!applied) return;
    set({ ...applied.partial, selectedCard: undefined });

    // Check for win condition
    const newState = get();
    if (isGameWon(newState)) {
      set({ gameWon: true, autoPlayEnabled: false, autoPlayInProgress: false });
    } else {
      // Check if auto-complete should be triggered
      get().checkAndTriggerAutoComplete();
    }
  },

  drawCard: () => {
    const state = get();

    // Empty stock recycles the waste (one fused user action); an empty stock
    // AND empty waste is a no-op — there is nothing to draw or recycle.
    if (state.drawPile.length === 0 && state.discardPile.length === 0) {
      return;
    }
    const command: MoveCommand =
      state.drawPile.length === 0 ? { type: 'recycle_stock' } : { type: 'draw_card' };

    const applied = applyCommandToState(state, command, engine);
    if (!applied) return;
    set(applied.partial);
  },

  exportGameState: () => {
    const state = get();
    const exportState: GameState = {
      drawPile: state.drawPile,
      discardPile: state.discardPile,
      foundations: state.foundations,
      tableau: state.tableau,
      moveHistory: state.moveHistory,
      eventLog: state.eventLog,
      showValidMoves: state.showValidMoves,
      godMode: state.godMode,
      autoPlayEnabled: state.autoPlayEnabled,
      autoPlayInProgress: state.autoPlayInProgress,
      difficulty: state.difficulty,
      // Session id, deal seed and AI config travel with the save so an
      // exported game is identifiable, repeatable (re-deal the same board) and
      // self-describing (which model and settings played it).
      gameSessionId: state.gameSessionId,
      gameStartedAt: state.gameStartedAt,
      seed: state.seed,
      aiConfig: state.aiConfig,
      gameWon: state.gameWon,
      initialBoardSetup: state.initialBoardSetup,
      perceivedDifficulty: state.perceivedDifficulty,
      completionProgress: state.completionProgress,
      recycleCount: state.recycleCount,
      replayMode: state.replayMode,
      replayIndex: state.replayIndex,
      replayPaused: state.replayPaused,
      replaySpeed: state.replaySpeed,
      // The AI decision log travels with the save so an exported game is a
      // complete record of how the AI played, for replay and benchmarking.
      aiDecisionLog: state.aiDecisionLog,
    };
    // Stamp the build commit so an exported game traces back to its code
    // revision (the GameState fields are unchanged for import compatibility).
    return JSON.stringify(
      { ...exportState, appCommit: APP_COMMIT, appBuildTime: APP_BUILD_TIME },
      null,
      2,
    );
  },

  importGameState: (jsonString: string) => {
    try {
      const importedState = JSON.parse(jsonString) as GameState;
      
      // Validate the imported state
      if (!importedState.drawPile || !importedState.discardPile || 
          !importedState.foundations || !importedState.tableau) {
        return false;
      }
      
      // Validate foundations
      if (!importedState.foundations.hearts || !importedState.foundations.diamonds ||
          !importedState.foundations.clubs || !importedState.foundations.spades) {
        return false;
      }
      
      // Validate tableau has 7 columns
      if (!Array.isArray(importedState.tableau) || importedState.tableau.length !== 7) {
        return false;
      }
      
      // Calculate metrics for imported state
      const importedStateForCalc: GameState = {
        ...importedState,
        selectedCard: undefined,
        autoPlayInProgress: false,
      };
      const completionProgress = getCompletionProgress(uiToCore(importedStateForCalc));
      const perceivedDifficulty = importedState.perceivedDifficulty ?? getPerceivedDifficulty(uiToCore(importedStateForCalc));

      // Exports written before the eventLog split embed autoplay telemetry in
      // moveHistory — partition it out (no-op for current-format exports).
      const { moveHistory, eventLog } = splitLegacyMoveHistory(
        importedState.moveHistory,
        importedState.eventLog ?? [],
      );

      // Set the imported state
      // Note: gameWon is set to false to allow replay functionality for won games
      set({
        drawPile: importedState.drawPile,
        discardPile: importedState.discardPile,
        foundations: importedState.foundations,
        tableau: importedState.tableau,
        selectedCard: undefined,
        moveHistory,
        eventLog,
        showValidMoves: importedState.showValidMoves,
        godMode: importedState.godMode,
        autoPlayEnabled: importedState.autoPlayEnabled,
        autoPlayInProgress: false,
        difficulty: importedState.difficulty,
        seed: importedState.seed,
        // Keep the imported session identity; older saves get a fresh one.
        gameSessionId: importedState.gameSessionId ?? uuidv7(),
        gameStartedAt: importedState.gameStartedAt,
        aiConfig: importedState.aiConfig ?? get().aiConfig ?? DEFAULT_AI_CONFIG,
        gameWon: false, // Always set to false to allow replay even for won games
        initialBoardSetup: importedState.initialBoardSetup,
        perceivedDifficulty,
        completionProgress,
        recycleCount: importedState.recycleCount ?? 0,
        replayMode: false,
        replayIndex: 0,
        replayPaused: false,
        replaySpeed: importedState.replaySpeed ?? 1000,
        // Restore the AI decision log if the save carries one (older saves
        // and non-AI games simply have none).
        aiDecisionLog: importedState.aiDecisionLog ?? [],
      });

      return true;
    } catch (error) {
      console.error('Error importing game state:', error);
      return false;
    }
  },

  applyMoveCommand: (command: MoveCommand) => {
    // Apply a core MoveCommand through the same engine pathway as a human
    // move, so an AI/auto-play move is recorded, flips cards, updates
    // progress and triggers auto-complete exactly like manual play.
    switch (command.type) {
      case 'draw_card':
      case 'recycle_stock':
        // The store's drawCard recycles the waste when the stock is empty.
        get().drawCard();
        return;
      case 'flip_card':
        // Flips are produced automatically by other moves; nothing to do.
        return;
      default: {
        const applied = applyCommandToState(get(), command, engine);
        if (!applied) return;
        set({ ...applied.partial, selectedCard: undefined });

        if (command.type === 'tableau_to_foundation' || command.type === 'discard_to_foundation') {
          const newState = get();
          if (isGameWon(newState)) {
            set({ gameWon: true, autoPlayEnabled: false, autoPlayInProgress: false });
          } else {
            get().checkAndTriggerAutoComplete();
          }
        }
      }
    }
  },

  dismissWinModal: () => {
    set({ winModalDismissed: true });
  },
  };
}
