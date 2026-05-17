/**
 * State adapter to convert between UI GameState and Core GameState
 * 
 * The UI GameState includes additional fields for UI interactions:
 * - selectedCard
 * - showValidMoves, godMode
 * - autoPlay state
 * - replay state
 * 
 * The Core GameState is pure game state without UI concerns.
 */

import type { GameState as CoreGameState, Move as CoreMove } from '@chayuto/solitaire-core';
import type { GameState as UIGameState, Card, Move } from '../types';
import { DEFAULT_AI_CONFIG } from '../ai/context/presets';

/**
 * Convert UI GameState to Core GameState
 * Strips out UI-specific fields
 */
export function uiToCore(uiState: UIGameState): CoreGameState {
  return {
    drawPile: uiState.drawPile,
    discardPile: uiState.discardPile,
    foundations: {
      hearts: uiState.foundations.hearts,
      diamonds: uiState.foundations.diamonds,
      clubs: uiState.foundations.clubs,
      spades: uiState.foundations.spades,
    },
    tableau: uiState.tableau,
    // Filter out UI-specific move types that core doesn't understand
    moveHistory: uiState.moveHistory.filter(m => 
      !['autoplay_start', 'autoplay_stop', 'autoplay_deadend', 'autoplay_loop_detected'].includes(m.type)
    ) as readonly CoreMove[],
    difficulty: uiState.difficulty,
    gameWon: uiState.gameWon,
    completionProgress: uiState.completionProgress,
    initialBoardSetup: uiState.initialBoardSetup ? {
      drawPile: uiState.initialBoardSetup.drawPile,
      discardPile: uiState.initialBoardSetup.discardPile,
      foundations: {
        hearts: uiState.initialBoardSetup.foundations.hearts,
        diamonds: uiState.initialBoardSetup.foundations.diamonds,
        clubs: uiState.initialBoardSetup.foundations.clubs,
        spades: uiState.initialBoardSetup.foundations.spades,
      },
      tableau: uiState.initialBoardSetup.tableau,
    } : undefined,
    perceivedDifficulty: uiState.perceivedDifficulty,
  };
}

/**
 * Convert Core GameState to UI GameState
 * Merges core state with UI-specific fields from existing UI state
 */
export function coreToUI(coreState: CoreGameState, existingUIState: UIGameState): UIGameState {
  return {
    // Core game state (mutable for Zustand)
    drawPile: [...coreState.drawPile] as Card[],
    discardPile: [...coreState.discardPile] as Card[],
    foundations: {
      hearts: [...coreState.foundations.hearts] as Card[],
      diamonds: [...coreState.foundations.diamonds] as Card[],
      clubs: [...coreState.foundations.clubs] as Card[],
      spades: [...coreState.foundations.spades] as Card[],
    },
    tableau: coreState.tableau.map(col => [...col] as Card[]) as Card[][],
    moveHistory: [...coreState.moveHistory] as Move[],
    difficulty: coreState.difficulty,
    gameWon: coreState.gameWon,
    completionProgress: coreState.completionProgress,
    initialBoardSetup: coreState.initialBoardSetup ? {
      drawPile: [...coreState.initialBoardSetup.drawPile] as Card[],
      discardPile: [...coreState.initialBoardSetup.discardPile] as Card[],
      foundations: {
        hearts: [...coreState.initialBoardSetup.foundations.hearts] as Card[],
        diamonds: [...coreState.initialBoardSetup.foundations.diamonds] as Card[],
        clubs: [...coreState.initialBoardSetup.foundations.clubs] as Card[],
        spades: [...coreState.initialBoardSetup.foundations.spades] as Card[],
      },
      tableau: coreState.initialBoardSetup.tableau.map(col => [...col] as Card[]) as Card[][],
    } : undefined,
    perceivedDifficulty: coreState.perceivedDifficulty,
    
    // Preserve UI-specific fields from existing state
    selectedCard: existingUIState.selectedCard,
    seed: existingUIState.seed,
    showValidMoves: existingUIState.showValidMoves,
    godMode: existingUIState.godMode,
    autoPlayEnabled: existingUIState.autoPlayEnabled,
    autoPlayInProgress: existingUIState.autoPlayInProgress,
    autoPlayStateHistory: existingUIState.autoPlayStateHistory,
    replayMode: existingUIState.replayMode,
    replayIndex: existingUIState.replayIndex,
    replayPaused: existingUIState.replayPaused,
    replaySpeed: existingUIState.replaySpeed,

    // Preserve AI advisor fields from existing state
    aiConfig: existingUIState.aiConfig,
    aiThinking: existingUIState.aiThinking,
    aiAutoPlay: existingUIState.aiAutoPlay,
    aiThinkingSince: existingUIState.aiThinkingSince,
    aiStatus: existingUIState.aiStatus,
    aiRetryCount: existingUIState.aiRetryCount,
    aiError: existingUIState.aiError,
    aiDecisionLog: existingUIState.aiDecisionLog,
    aiKeyModalOpen: existingUIState.aiKeyModalOpen,
  };
}

/**
 * Get initial UI-specific state values
 * Used when creating a fresh game state
 */
export function getDefaultUIFields(): Pick<
  UIGameState,
  | 'selectedCard'
  | 'seed'
  | 'showValidMoves'
  | 'godMode'
  | 'autoPlayEnabled'
  | 'autoPlayInProgress'
  | 'autoPlayStateHistory'
  | 'replayMode'
  | 'replayIndex'
  | 'replayPaused'
  | 'replaySpeed'
  | 'aiConfig'
  | 'aiThinking'
  | 'aiAutoPlay'
  | 'aiThinkingSince'
  | 'aiStatus'
  | 'aiRetryCount'
  | 'aiError'
  | 'aiDecisionLog'
  | 'aiKeyModalOpen'
> {
  return {
    selectedCard: undefined,
    seed: undefined,
    showValidMoves: false,
    godMode: false,
    autoPlayEnabled: false,
    autoPlayInProgress: false,
    autoPlayStateHistory: undefined,
    replayMode: false,
    replayIndex: -1,
    replayPaused: false,
    replaySpeed: 1000,
    aiConfig: DEFAULT_AI_CONFIG,
    aiThinking: false,
    aiAutoPlay: false,
    aiThinkingSince: undefined,
    aiStatus: undefined,
    aiRetryCount: 0,
    aiError: undefined,
    aiDecisionLog: [],
    aiKeyModalOpen: false,
  };
}
