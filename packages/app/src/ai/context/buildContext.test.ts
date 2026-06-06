/**
 * Tests for the AI context payload builder.
 */

import { describe, it, expect } from 'vitest';
import type { MoveCommand } from '@chayuto/solitaire-core';
import type { Card, GameState, Move, Rank, Suit } from '../../types';
import { buildContext } from './buildContext';
import { applyPreset, DEFAULT_AI_CONFIG } from './presets';

const card = (suit: Suit, rank: Rank, faceUp = true): Card => ({
  suit,
  rank,
  faceUp,
  id: `${suit}-${rank}`,
});

const drawMove = (c: Card): Move => ({ type: 'draw_card', timestamp: 0, card: c });

const recycleMove = (): Move => ({
  type: 'recycle_stock',
  timestamp: 0,
  card: card('hearts', 'A'),
});

function makeState(overrides: Partial<GameState> = {}): GameState {
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
    completionProgress: 25,
    perceivedDifficulty: 50,
    replayMode: false,
    replayIndex: 0,
    replayPaused: false,
    replaySpeed: 1000,
    ...overrides,
  };
}

const LEGAL_MOVES: MoveCommand[] = [
  { type: 'draw_card' },
  { type: 'discard_to_foundation', to: { suit: 'hearts' } },
];

describe('buildContext', () => {
  it('always includes the board and legal moves', () => {
    const state = makeState({
      foundations: { hearts: [], diamonds: [], clubs: [], spades: [card('spades', 'A')] },
      discardPile: [card('hearts', '2')],
      drawPile: [card('diamonds', '3')],
      tableau: [[card('clubs', '5', false), card('hearts', '8')], [], [], [], [], [], []],
    });
    const ctx = buildContext(state, LEGAL_MOVES, applyPreset(DEFAULT_AI_CONFIG, 'minimal'));

    expect(ctx.foundations.spades).toBe('AS');
    expect(ctx.foundations.hearts).toBeNull();
    expect(ctx.discardTop).toBe('2H');
    expect(ctx.drawPileCount).toBe(1);
    expect(ctx.tableau[0].faceDownCount).toBe(1);
    expect(ctx.tableau[0].faceUp).toEqual(['8H']);
    // Columns carry an explicit 1-based number.
    expect(ctx.tableau[0].column).toBe(1);
    expect(ctx.tableau[6].column).toBe(7);
    expect(ctx.legalMoves).toHaveLength(2);
    expect(ctx.legalMoves[0].index).toBe(0);
    expect(ctx.legalMoves[1].index).toBe(1);
    expect(ctx.legalMoves[1].describe).toContain('hearts foundation');
  });

  it('omits optional fields under the minimal preset', () => {
    const state = makeState({ moveHistory: [drawMove(card('clubs', '4'))] });
    const ctx = buildContext(state, LEGAL_MOVES, applyPreset(DEFAULT_AI_CONFIG, 'minimal'));

    expect(ctx.metrics).toBeUndefined();
    expect(ctx.recentMoves).toBeUndefined();
    expect(ctx.seenDrawPileCards).toBeUndefined();
    expect(ctx.reasoningTrail).toBeUndefined();
    expect(ctx.hiddenInfo).toBeUndefined();
  });

  it('includes metrics and history under the standard preset', () => {
    const state = makeState({
      moveHistory: [drawMove(card('clubs', '4')), drawMove(card('spades', '7'))],
    });
    const ctx = buildContext(state, LEGAL_MOVES, applyPreset(DEFAULT_AI_CONFIG, 'standard'));

    // perceivedDifficulty is recomputed from the current board (all seven
    // tableau columns empty here => -3 each, clamped to 0), not the static
    // game-start value carried in state.perceivedDifficulty.
    // foundationCards/faceDownTotal/progressScore are raw progress components
    // (this fixture has empty tableau columns => no face-down cards, so all 21
    // deal cards read as "revealed" and progressScore is 0.35 * 100 = 35).
    // Two draw moves, no foundation move and no reveal yet, so both stall
    // counts equal the number of player moves so far (2).
    expect(ctx.metrics).toEqual({
      completionProgress: 25,
      perceivedDifficulty: 0,
      difficulty: 3,
      foundationCards: 0,
      faceDownTotal: 0,
      progressScore: 35,
      turnsSinceFoundationGrew: 2,
      turnsSinceCardRevealed: 2,
    });
    expect(ctx.recentMoves).toEqual(['draw 4C', 'draw 7S']);
  });

  it('records a recycle between the surrounding draws in RECENT MOVES', () => {
    // Without the recycle entry this would read as two identical draws with the
    // recycle invisible between them; the marker makes the history honest.
    const sevenD = card('diamonds', '7');
    const state = makeState({
      moveHistory: [drawMove(sevenD), recycleMove(), drawMove(sevenD)],
    });
    const ctx = buildContext(state, LEGAL_MOVES, applyPreset(DEFAULT_AI_CONFIG, 'standard'));
    expect(ctx.recentMoves).toEqual(['draw 7D', 'recycle stock', 'draw 7D']);
  });

  it('reports only seen stock cards (player-fair) when seeHiddenCards is off', () => {
    const seen = card('diamonds', '3');
    const unseen = card('spades', '9');
    const state = makeState({
      drawPile: [seen, unseen],
      // Only the diamond 3 was previously drawn, so only it has been "seen".
      moveHistory: [drawMove(seen)],
    });
    const config = { ...applyPreset(DEFAULT_AI_CONFIG, 'standard'), seeHiddenCards: false };
    const ctx = buildContext(state, LEGAL_MOVES, config);

    expect(ctx.seenDrawPileCards).toEqual(['3D']);
    expect(ctx.hiddenInfo).toBeUndefined();
    expect(ctx.tableau[0].faceDown).toBeUndefined();
  });

  it('reveals all hidden information when seeHiddenCards is on', () => {
    const state = makeState({
      drawPile: [card('diamonds', '3'), card('spades', '9')],
      tableau: [[card('clubs', '5', false), card('hearts', '8')], [], [], [], [], [], []],
    });
    const config = { ...applyPreset(DEFAULT_AI_CONFIG, 'detailed'), seeHiddenCards: true };
    const ctx = buildContext(state, LEGAL_MOVES, config);

    expect(ctx.hiddenInfo?.drawPileOrder).toEqual(['3D', '9S']);
    expect(ctx.tableau[0].faceDown).toEqual(['5C']);
  });

  it('attaches heuristic scores when enabled', () => {
    const state = makeState({
      tableau: [[card('spades', 'A')], [], [], [], [], [], []],
    });
    const legal: MoveCommand[] = [
      { type: 'tableau_to_foundation', from: { column: 0, cardIndex: 0 }, to: { suit: 'spades' } },
    ];
    const config = { ...applyPreset(DEFAULT_AI_CONFIG, 'detailed'), includeHeuristicScores: true };
    const ctx = buildContext(state, legal, config);

    expect(typeof ctx.legalMoves[0].heuristicScore).toBe('number');
  });

  it('includes the AI reasoning trail when a decision log is supplied', () => {
    const state = makeState();
    const config = applyPreset(DEFAULT_AI_CONFIG, 'standard');
    const ctx = buildContext(state, LEGAL_MOVES, config, [
      {
        timestamp: 0,
        moveType: 'draw_card',
        describe: 'Draw a card',
        reasoning: 'No better move.',
        confidence: 0.6,
        model: 'gemma-4-31b-it',
      },
    ]);

    expect(ctx.reasoningTrail).toEqual([
      { move: 'Draw a card', reasoning: 'No better move.' },
    ]);
  });
});
