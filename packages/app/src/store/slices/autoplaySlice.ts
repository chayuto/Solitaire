/**
 * Heuristic auto-play slice — the scored-move auto-player, its loop
 * detection, and the end-game auto-complete trigger. Telemetry goes to the
 * eventLog, never moveHistory (stage-1a).
 */
import { hashGameState } from '@chayuto/solitaire-core';
import type { GameEvent, GameEventType, GameState } from '../../types';
import { uiToCore } from '../../adapters/coreAdapter';
import { collectPossibleMoves, scoreMoves, filterLoopingMoves } from '../../autoplay';
import { AUTOPLAY_TIMING, AUTOPLAY_LOOP_DETECTION } from '../../constants';
import { hasAnyValidMoves, canAutoComplete } from '../uiHelpers';
import type { GameStore, StoreGet, StoreSet } from '../types';

/** Build a telemetry {@link GameEvent} anchored at the current move index. */
const gameEvent = (state: GameState, type: GameEventType): GameEvent => ({
  type,
  timestamp: Date.now(),
  atMoveIndex: state.moveHistory.length,
});

type AutoplaySlice = Pick<
  GameStore,
  'toggleAutoPlay' | 'performAutoPlayMove' | 'checkAndTriggerAutoComplete'
>;

export function createAutoplaySlice(set: StoreSet, get: StoreGet): AutoplaySlice {
  return {
  toggleAutoPlay: () => {
    const state = get();
    const newAutoPlayEnabled = !state.autoPlayEnabled;

    if (newAutoPlayEnabled) {
      // Heuristic auto-play must never run while the AI is driving the game.
      // An AI session has to stay pure AI — no human or heuristic intervention —
      // or harvested games are contaminated with non-AI moves.
      if (state.aiThinking || state.aiAutoPlay) {
        set({ aiError: 'Stop AI play before starting auto-play.' });
        return;
      }
      // Log auto-play start event
      set({
        autoPlayEnabled: newAutoPlayEnabled,
        autoPlayStateHistory: [],
        eventLog: [...(state.eventLog ?? []), gameEvent(state, 'autoplay_start')],
      });
      
      // Start the first move after a short delay
      if (!state.autoPlayInProgress) {
        setTimeout(() => {
          if (get().autoPlayEnabled) {
            get().performAutoPlayMove();
          }
        }, AUTOPLAY_TIMING.START_DELAY);
      }
    } else {
      // Log auto-play stop event
      set({
        autoPlayEnabled: newAutoPlayEnabled,
        autoPlayStateHistory: [],
        eventLog: [...(state.eventLog ?? []), gameEvent(state, 'autoplay_stop')],
      });
    }
  },

  performAutoPlayMove: () => {
    const state = get();
    
    // Don't proceed if auto-play is disabled or already in progress
    if (!state.autoPlayEnabled || state.autoPlayInProgress) {
      return;
    }

    set({ autoPlayInProgress: true });
    
    // Check for loop detection - track the current game state
    const currentStateHash = hashGameState(uiToCore(state));
    const stateHistory = state.autoPlayStateHistory || [];
    
    // Check if we've seen this state before (loop detection)
    if (stateHistory.includes(currentStateHash)) {
      // Loop detected
      set({
        autoPlayEnabled: false,
        autoPlayInProgress: false,
        autoPlayStateHistory: [],
        eventLog: [...(state.eventLog ?? []), gameEvent(state, 'autoplay_loop_detected')],
      });
      return;
    }
    
    // Add current state to history BEFORE executing move
    const updatedStateHistory = [...stateHistory, currentStateHash].slice(-AUTOPLAY_LOOP_DETECTION.MAX_STATE_HISTORY);
    set({ autoPlayStateHistory: updatedStateHistory });

    // Collect and score all possible moves using the autoplay module
    const possibleMoves = collectPossibleMoves(
      state,
      (card, targetColumn) => get().canMoveToTableau(card, targetColumn),
      (card, suit) => get().canMoveToFoundation(card, suit)
    );
    
    // Score all moves
    const allScoredMoves = scoreMoves(possibleMoves, state);

    // Detect fast auto-complete mode (draw pile empty, every tableau card face up).
    // In this endgame state the columns are sorted runs and the only productive
    // move is sending cards to the foundations. Tableau-to-tableau moves merely
    // shuffle sorted stacks around (and can loop forever), so when any foundation
    // move exists we restrict selection to foundation moves only.
    const isAutoCompleteMode = state.drawPile.length === 0 &&
      state.tableau.every(col => col.every(card => card.faceUp));
    const foundationMoves = allScoredMoves.filter(m => m.targetType === 'foundation');
    const restrictToFoundations = isAutoCompleteMode && foundationMoves.length > 0;
    const scoredMoves = restrictToFoundations ? foundationMoves : allScoredMoves;

    // Filter out moves that would result in loop states
    const nonLoopingMoves = filterLoopingMoves(scoredMoves, state, updatedStateHistory);

    // If all possible moves would lead to loops, detect it as a loop condition
    if (possibleMoves.length > 0 && nonLoopingMoves.length === 0) {
      set({
        autoPlayEnabled: false,
        autoPlayInProgress: false,
        autoPlayStateHistory: [],
        eventLog: [...(state.eventLog ?? []), gameEvent(state, 'autoplay_loop_detected')],
      });
      return;
    }

    // Sort by score (highest first)
    nonLoopingMoves.sort((a, b) => b.score - a.score);
    
    // Filter out moves with negative scores (useless moves). When restricted to
    // foundation moves every move is necessary endgame progress, so keep them
    // all even if a tableau-building heuristic scored one negative.
    const worthwhileMoves = restrictToFoundations
      ? nonLoopingMoves
      : nonLoopingMoves.filter(move => move.score > 0);

    const moveDelay = isAutoCompleteMode ? AUTOPLAY_TIMING.FAST_MOVE_DELAY : AUTOPLAY_TIMING.NORMAL_MOVE_DELAY;
    const selectDelay = isAutoCompleteMode ? AUTOPLAY_TIMING.SELECT_DELAY_FAST : AUTOPLAY_TIMING.SELECT_DELAY_NORMAL;

    // Execute the best move if we have worthwhile moves
    if (worthwhileMoves.length > 0) {
      const bestMove = worthwhileMoves[0];
      
      // Select the card
      get().selectCard(bestMove.source, bestMove.sourceColumn, bestMove.sourceCardIndex);
      
      // Wait before executing the move
      setTimeout(() => {
        if (bestMove.targetType === 'foundation' && bestMove.targetSuit) {
          get().moveCardToFoundation(bestMove.targetSuit);
        } else if (bestMove.targetType === 'tableau' && bestMove.targetColumn !== undefined) {
          get().moveCardToTableau(bestMove.targetColumn);
        }
        
        // Wait before next move
        setTimeout(() => {
          set({ autoPlayInProgress: false });
          if (get().autoPlayEnabled) {
            get().performAutoPlayMove();
          }
        }, moveDelay);
      }, selectDelay);
      
      return;
    }

    // If no moves available, draw a card
    if (state.drawPile.length > 0 || state.discardPile.length > 0) {
      get().drawCard();
      
      // Wait before next move
      setTimeout(() => {
        set({ autoPlayInProgress: false });
        if (get().autoPlayEnabled) {
          get().performAutoPlayMove();
        }
      }, moveDelay);
      return;
    }

    // Check for deadend - no valid moves available
    const currentState = get();
    if (!hasAnyValidMoves(currentState)) {
      set({
        autoPlayEnabled: false,
        autoPlayInProgress: false,
        autoPlayStateHistory: [],
        eventLog: [...(currentState.eventLog ?? []), gameEvent(currentState, 'autoplay_deadend')],
      });
      return;
    }

    // No moves available - stop auto-play (shouldn't reach here, but safety net)
    set({ autoPlayEnabled: false, autoPlayInProgress: false, autoPlayStateHistory: [] });
  },

  checkAndTriggerAutoComplete: () => {
    const state = get();

    // Don't trigger if already won, if auto-play is already active, or if the
    // AI is driving the game. During AI play (a single Ask AI request or AI
    // auto-play) the AI owns every move — the heuristic auto-complete must not
    // hijack it, or AI auto-play stalls and end-game moves go unlogged.
    if (state.gameWon || state.autoPlayEnabled || state.aiThinking || state.aiAutoPlay) {
      return;
    }
    
    // Check if auto-complete conditions are met
    if (canAutoComplete(state)) {
      // Enable auto-play with fast mode
      set({ autoPlayEnabled: true, autoPlayStateHistory: [] });
      
      // Start the first move after a short delay
      setTimeout(() => {
        if (get().autoPlayEnabled) {
          get().performAutoPlayMove();
        }
      }, AUTOPLAY_TIMING.AUTO_COMPLETE_START_DELAY);
    }
  },
  };
}
