/**
 * Tests for human-readable move descriptions.
 */

import { describe, it, expect } from 'vitest';
import type { MoveCommand } from '@chayuto/solitaire-core';
import type { Card, GameState, Move, Rank, Suit } from '../../types';
import { describeMoveCommand, summarizeHistoryMove } from './describeMove';

const card = (suit: Suit, rank: Rank, faceUp = true): Card => ({
  suit,
  rank,
  faceUp,
  id: `${suit}-${rank}`,
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
    completionProgress: 0,
    replayMode: false,
    replayIndex: 0,
    replayPaused: false,
    replaySpeed: 1000,
    ...overrides,
  };
}

describe('describeMoveCommand', () => {
  it('describes draw_card', () => {
    expect(describeMoveCommand({ type: 'draw_card' }, makeState())).toMatch(/draw/i);
  });

  it('describes recycle_stock', () => {
    expect(describeMoveCommand({ type: 'recycle_stock' }, makeState())).toMatch(/recycle/i);
  });

  it('describes tableau_to_foundation with the card and suit', () => {
    const state = makeState({
      tableau: [[card('spades', 'A')], [], [], [], [], [], []],
    });
    const cmd: MoveCommand = {
      type: 'tableau_to_foundation',
      from: { column: 0, cardIndex: 0 },
      to: { suit: 'spades' },
    };
    const text = describeMoveCommand(cmd, state);
    expect(text).toContain('AS');
    expect(text).toContain('spades foundation');
    expect(text).toContain('column 1');
  });

  it('describes discard_to_foundation', () => {
    const state = makeState({ discardPile: [card('hearts', '2')] });
    const cmd: MoveCommand = {
      type: 'discard_to_foundation',
      to: { suit: 'hearts' },
    };
    expect(describeMoveCommand(cmd, state)).toBe(
      'Send 2H from the waste to the hearts foundation',
    );
  });

  it('flags a move onto an empty column', () => {
    const state = makeState({
      tableau: [[card('spades', 'K')], [], [], [], [], [], []],
    });
    const cmd: MoveCommand = {
      type: 'tableau_to_tableau',
      from: { column: 0, cardIndex: 0 },
      to: { column: 1 },
    };
    expect(describeMoveCommand(cmd, state)).toContain('(empty)');
  });

  it('flags a move that reveals a hidden card', () => {
    const state = makeState({
      tableau: [
        [card('clubs', '5', false), card('hearts', '8')],
        [card('spades', '9')],
        [],
        [],
        [],
        [],
        [],
      ],
    });
    const cmd: MoveCommand = {
      type: 'tableau_to_tableau',
      from: { column: 0, cardIndex: 1 },
      to: { column: 1 },
    };
    const text = describeMoveCommand(cmd, state);
    expect(text).toContain('8H');
    expect(text).toContain('reveals a hidden card');
  });

  it('counts extra cards in a multi-card sequence', () => {
    const state = makeState({
      tableau: [
        [card('hearts', '8'), card('spades', '7'), card('hearts', '6')],
        [],
        [],
        [],
        [],
        [],
        [],
      ],
    });
    const cmd: MoveCommand = {
      type: 'tableau_to_tableau',
      from: { column: 0, cardIndex: 0 },
      to: { column: 1 },
    };
    expect(describeMoveCommand(cmd, state)).toContain('plus 2 more');
  });
});

describe('summarizeHistoryMove', () => {
  it('summarizes a draw', () => {
    const move: Move = { type: 'draw_card', timestamp: 0, card: card('diamonds', '10') };
    expect(summarizeHistoryMove(move)).toBe('draw TD');
  });

  it('summarizes a recycle as a plain "recycle stock" entry', () => {
    const move: Move = {
      type: 'recycle_stock',
      timestamp: 0,
      card: card('hearts', 'A'),
    };
    expect(summarizeHistoryMove(move)).toBe('recycle stock');
  });

  it('summarizes a tableau-to-foundation move', () => {
    const move: Move = {
      type: 'tableau_to_foundation',
      timestamp: 0,
      card: card('clubs', 'A'),
      from: { source: 'tableau', columnIndex: 2 },
      to: { target: 'foundation', suit: 'clubs' },
    };
    expect(summarizeHistoryMove(move)).toBe('AC col 3 -> clubs foundation');
  });
});
