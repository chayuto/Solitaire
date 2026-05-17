/**
 * Builds the structured game context sent to the LLM.
 *
 * The context always includes the visible board and a numbered list of legal
 * moves; optional fields (history, metrics, heuristic scores, seen stock cards,
 * the AI's own reasoning trail, full hidden information) are gated by the
 * active {@link AIConfig}.
 *
 * @module ai/context/buildContext
 */

import type { MoveCommand } from '@chayuto/solitaire-core';
import type { GameState, Suit } from '../../types';
import type { AIConfig, AIDecisionRecord, AILegalMove, AIMoveContext } from '../types';
import { cardShort } from '../cardNotation';
import { describeMoveCommand, summarizeHistoryMove } from './describeMove';
import { collectPossibleMoves, scoreMoves } from '../../autoplay';
import type { PossibleMove } from '../../autoplay';

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

/** Move history entry types that are bookkeeping, not real player moves. */
const NON_PLAYER_MOVE_TYPES = new Set([
  'flip_card',
  'autoplay_start',
  'autoplay_stop',
  'autoplay_deadend',
  'autoplay_loop_detected',
]);

/**
 * Match a {@link MoveCommand} to a scored {@link PossibleMove} from the
 * autoplay heuristic, returning its score (or `undefined` for stock moves,
 * which the heuristic does not score).
 */
function heuristicScoreFor(
  command: MoveCommand,
  scored: PossibleMove[],
): number | undefined {
  const match = scored.find((m) => {
    switch (command.type) {
      case 'tableau_to_tableau':
        return (
          m.source === 'tableau' &&
          m.targetType === 'tableau' &&
          m.sourceColumn === command.from?.column &&
          m.sourceCardIndex === command.from?.cardIndex &&
          m.targetColumn === command.to?.column
        );
      case 'tableau_to_foundation':
        return (
          m.source === 'tableau' &&
          m.targetType === 'foundation' &&
          m.sourceColumn === command.from?.column &&
          m.sourceCardIndex === command.from?.cardIndex &&
          m.targetSuit === command.to?.suit
        );
      case 'discard_to_tableau':
        return (
          m.source === 'discard' &&
          m.targetType === 'tableau' &&
          m.targetColumn === command.to?.column
        );
      case 'discard_to_foundation':
        return (
          m.source === 'discard' &&
          m.targetType === 'foundation' &&
          m.targetSuit === command.to?.suit
        );
      default:
        return false;
    }
  });
  return match ? Math.round(match.score) : undefined;
}

/** Stock cards the player has already cycled past, in upcoming-draw order. */
function computeSeenDrawPileCards(state: GameState): string[] {
  const drawnIds = new Set(
    state.moveHistory.filter((m) => m.type === 'draw_card').map((m) => m.card.id),
  );
  return state.drawPile.filter((c) => drawnIds.has(c.id)).map(cardShort);
}

/**
 * Build the AI context payload for the current game state.
 *
 * @param state - The current UI game state.
 * @param legalMoves - Legal move commands (from the core engine), in the order
 *   the LLM will see them; `legalMoves[i]` corresponds to `index: i`.
 * @param config - The active AI configuration.
 * @param decisionLog - Past AI decisions, used for the reasoning trail.
 */
export function buildContext(
  state: GameState,
  legalMoves: MoveCommand[],
  config: AIConfig,
  decisionLog: readonly AIDecisionRecord[] = [],
): AIMoveContext {
  // --- Heuristic scores (optional, computed once) ---
  let scored: PossibleMove[] = [];
  if (config.includeHeuristicScores) {
    scored = scoreMoves(collectPossibleMoves(state), state);
  }

  // --- Legal moves ---
  const aiLegalMoves: AILegalMove[] = legalMoves.map((command, index) => {
    const entry: AILegalMove = {
      index,
      type: command.type,
      describe: describeMoveCommand(command, state),
    };
    if (config.includeHeuristicScores) {
      const score = heuristicScoreFor(command, scored);
      if (score !== undefined) entry.heuristicScore = score;
    }
    return entry;
  });

  // --- Foundations ---
  const foundations = {} as Record<Suit, string | null>;
  for (const suit of SUITS) {
    const pile = state.foundations[suit];
    foundations[suit] = pile.length > 0 ? cardShort(pile[pile.length - 1]) : null;
  }

  // --- Tableau ---
  // Each column carries an explicit 1-based `column` number so the model
  // refers to columns the same way the move descriptions and UI do.
  const tableau = state.tableau.map((column, index) => {
    const faceDown = column.filter((c) => !c.faceUp);
    const faceUp = column.filter((c) => c.faceUp);
    const col: AIMoveContext['tableau'][number] = {
      column: index + 1,
      faceDownCount: faceDown.length,
      faceUp: faceUp.map(cardShort),
    };
    if (config.seeHiddenCards && faceDown.length > 0) {
      col.faceDown = faceDown.map(cardShort);
    }
    return col;
  });

  const discardTop =
    state.discardPile.length > 0
      ? cardShort(state.discardPile[state.discardPile.length - 1])
      : null;

  const context: AIMoveContext = {
    notation:
      'Cards: rank then suit (A 2-9 T J Q K; H D C S). Tableau columns are ' +
      'numbered 1 to 7 by their "column" field; faceUp arrays are bottom-to-top. ' +
      'Always refer to columns by that 1-based number in your reasoning.',
    foundations,
    tableau,
    discardTop,
    drawPileCount: state.drawPile.length,
    canRecycleStock: state.drawPile.length === 0 && state.discardPile.length > 0,
    legalMoves: aiLegalMoves,
  };

  // --- Optional: game metrics ---
  if (config.includeGameMetrics) {
    context.metrics = {
      completionProgress: Math.round(state.completionProgress),
      perceivedDifficulty: state.perceivedDifficulty,
      moveCount: state.moveHistory.length,
      difficulty: state.difficulty,
    };
  }

  // --- Optional: recent move history ---
  if (config.includeMoveHistory && config.moveHistoryLimit > 0) {
    const playerMoves = state.moveHistory.filter(
      (m) => !NON_PLAYER_MOVE_TYPES.has(m.type),
    );
    context.recentMoves = playerMoves
      .slice(-config.moveHistoryLimit)
      .map(summarizeHistoryMove);
  }

  // --- Optional: seen stock cards ---
  if (config.includeSeenDrawPileCards) {
    const seen = computeSeenDrawPileCards(state);
    if (seen.length > 0) context.seenDrawPileCards = seen;
  }

  // --- Optional: full hidden information ---
  if (config.seeHiddenCards) {
    context.hiddenInfo = {
      drawPileOrder: state.drawPile.map(cardShort),
    };
  }

  // --- Optional: the AI's own reasoning trail ---
  if (config.includeReasoningTrail && config.reasoningTrailLimit > 0) {
    const trail = decisionLog
      .slice(-config.reasoningTrailLimit)
      .map((d) => ({ move: d.describe, reasoning: d.reasoning }));
    if (trail.length > 0) context.reasoningTrail = trail;
  }

  return context;
}
