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
import { getPerceivedDifficulty } from '@chayuto/solitaire-core';
import type { GameState, Move, Suit } from '../../types';
import type { AIConfig, AIDecisionRecord, AILegalMove, AIMoveContext } from '../types';
import { uiToCore } from '../../adapters/coreAdapter';
import { cardShort } from '../cardNotation';
import { describeMoveCommand, summarizeHistoryMove } from './describeMove';
import { computeProgressComponents } from '../progressMetric';
import { collectPossibleMoves, scoreMoves } from '../../autoplay';
import type { PossibleMove } from '../../autoplay';

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

/**
 * Move history entry types that are bookkeeping, not real player moves.
 * (Auto-play telemetry no longer appears in moveHistory — it lives in the
 * store's eventLog — so flips are the only non-player entries left.)
 */
const NON_PLAYER_MOVE_TYPES = new Set(['flip_card']);

/** Player-move types that advance a foundation. */
const FOUNDATION_MOVE_TYPES = new Set(['tableau_to_foundation', 'discard_to_foundation']);

/**
 * Count, in player-move units (the same unit RECENT MOVES uses), how long the
 * game has gone without a foundation advancing and without a face-down card
 * being revealed.
 *
 * These are facts — counts of true past events — not directives: the RECENT
 * MOVES window shows only the last N moves, so a long dry spell (e.g. 40
 * consecutive draws) is invisible to the model; these counts restore exactly
 * what the window hides. They carry no threshold and no recommended action
 * (hybrid-v1.5; see the v1.5 harvester ask). A reveal is a `flip_card`
 * bookkeeping entry, so we stop at it but count only the player moves since.
 */
function computeStallCounts(moveHistory: readonly Move[]): {
  turnsSinceFoundationGrew: number;
  turnsSinceCardRevealed: number;
} {
  let turnsSinceFoundationGrew = 0;
  for (let i = moveHistory.length - 1; i >= 0; i--) {
    const type = moveHistory[i].type;
    if (NON_PLAYER_MOVE_TYPES.has(type)) continue;
    if (FOUNDATION_MOVE_TYPES.has(type)) break;
    turnsSinceFoundationGrew += 1;
  }

  let turnsSinceCardRevealed = 0;
  for (let i = moveHistory.length - 1; i >= 0; i--) {
    const type = moveHistory[i].type;
    if (type === 'flip_card') break;
    if (NON_PLAYER_MOVE_TYPES.has(type)) continue;
    turnsSinceCardRevealed += 1;
  }

  return { turnsSinceFoundationGrew, turnsSinceCardRevealed };
}

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
 * Build the DRAW TIMELINE token sequence for the AI prompt (hybrid-v1.2).
 *
 * The output is a single linear sequence rendered left-to-right with the
 * leftmost token = the furthest-future draw, then the upcoming stock cards
 * in draw order, then the current waste top wrapped in `{}` (the `{NOW}`
 * marker), then the cards drawn earlier in this cycle that still sit beneath
 * the top of the waste, in most-recent-first order.
 *
 * Stock identity rule:
 * - cycle 1 (no recycles yet): every stock position renders as `???` because
 *   the model has not observed those cards;
 * - cycle 2+: every stock card was observed in a previous cycle, so identities
 *   surface (the "perfect-recall human" assumption from the 2026-05-27 ask).
 *
 * Returns `undefined` when no draws have happened yet (`discardPile` empty);
 * the renderer then skips the block entirely.
 */
function computeDrawTimeline(state: GameState, cycle: number): string[] | undefined {
  if (state.discardPile.length === 0) return undefined;

  // Stock side: UI orientation has `drawPile[0]` as the next draw and
  // `drawPile[last]` as the furthest-future card. The timeline reads
  // furthest-future first, so we reverse.
  const stockTokens =
    cycle === 1
      ? Array<string>(state.drawPile.length).fill('???')
      : [...state.drawPile].reverse().map(cardShort);

  // Waste side: `discardPile[last]` is the current top = `{NOW}`. Below the
  // top, oldest-this-cycle is `discardPile[0]`. Right of `{NOW}` reads
  // most-recent-first, so we drop the top and reverse what remains.
  const nowToken = `{${cardShort(state.discardPile[state.discardPile.length - 1])}}`;
  const wasteBelow = state.discardPile.slice(0, -1).reverse().map(cardShort);

  return [...stockTokens, nowToken, ...wasteBelow];
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

  // Cycle is always defined: 1 + number of times the waste has been recycled.
  // Older saved sessions imported before recycleCount was tracked default to
  // 0, so a mid-cycle-2 import will read as cycle 1 until the next recycle
  // fires; acceptable since the AI is not queried during pure replay.
  const cycle = (state.recycleCount ?? 0) + 1;
  const drawTimeline = computeDrawTimeline(state, cycle);

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
    cycle,
    legalMoves: aiLegalMoves,
  };
  if (drawTimeline !== undefined) {
    context.drawTimeline = drawTimeline;
  }

  // --- Optional: game metrics ---
  if (config.includeGameMetrics) {
    // `perceivedDifficulty` is recomputed from the *current* board, not the
    // game-start value carried in `state.perceivedDifficulty` — a static figure
    // repeated every turn carries no per-turn signal. `moveCount` is omitted
    // here: it duplicates the interaction log's `turnIndex` exactly.
    const progress = computeProgressComponents(state);
    const stall = computeStallCounts(state.moveHistory);
    context.metrics = {
      completionProgress: Math.round(state.completionProgress),
      perceivedDifficulty: getPerceivedDifficulty(uiToCore(state)),
      difficulty: state.difficulty,
      foundationCards: progress.foundationCards,
      faceDownTotal: progress.faceDownTotal,
      progressScore: progress.progressScore,
      turnsSinceFoundationGrew: stall.turnsSinceFoundationGrew,
      turnsSinceCardRevealed: stall.turnsSinceCardRevealed,
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
