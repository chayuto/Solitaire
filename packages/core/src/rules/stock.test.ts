/**
 * Tests for stock and waste pile rules
 */

import { describe, it, expect } from 'vitest';
import { canDraw, draw, canRecycle, recycle } from './stock';
import { createCard } from '../utils/card';
import type { GameState } from '../types';

// Helper to create minimal game state for testing
function createMinimalState(drawPile: any[], discardPile: any[]): GameState {
  return {
    drawPile,
    discardPile,
    foundations: {
      hearts: [],
      diamonds: [],
      clubs: [],
      spades: [],
    },
    tableau: [[], [], [], [], [], [], []],
    moveHistory: [],
    difficulty: 3,
    gameWon: false,
    completionProgress: 0,
  };
}

describe('canDraw', () => {
  it('returns true when draw pile has cards', () => {
    const card = createCard('hearts', 'A', false);
    const state = createMinimalState([card], []);
    
    expect(canDraw(state)).toBe(true);
  });

  it('returns false when draw pile is empty', () => {
    const state = createMinimalState([], []);
    
    expect(canDraw(state)).toBe(false);
  });
});

describe('draw', () => {
  it('moves card from draw pile to discard pile', () => {
    const card = createCard('hearts', 'A', false);
    const state = createMinimalState([card], []);
    
    const newState = draw(state);
    
    expect(newState.drawPile).toHaveLength(0);
    expect(newState.discardPile).toHaveLength(1);
    expect(newState.discardPile[0].suit).toBe('hearts');
    expect(newState.discardPile[0].rank).toBe('A');
  });

  it('flips card face up', () => {
    const card = createCard('hearts', 'A', false);
    const state = createMinimalState([card], []);
    
    const newState = draw(state);
    
    expect(newState.discardPile[0].faceUp).toBe(true);
  });

  it('preserves existing discard pile', () => {
    const card1 = createCard('hearts', 'A', true);
    const card2 = createCard('diamonds', '2', false);
    const state = createMinimalState([card2], [card1]);
    
    const newState = draw(state);
    
    expect(newState.discardPile).toHaveLength(2);
    expect(newState.discardPile[0].suit).toBe('hearts');
    expect(newState.discardPile[1].suit).toBe('diamonds');
  });

  it('does not mutate original state', () => {
    const card = createCard('hearts', 'A', false);
    const state = createMinimalState([card], []);
    const originalDrawPile = state.drawPile;
    const originalDiscardPile = state.discardPile;
    
    draw(state);
    
    expect(state.drawPile).toBe(originalDrawPile);
    expect(state.discardPile).toBe(originalDiscardPile);
    expect(state.drawPile).toHaveLength(1);
    expect(state.discardPile).toHaveLength(0);
  });

  it('throws error when draw pile is empty', () => {
    const state = createMinimalState([], []);
    
    expect(() => draw(state)).toThrow('Cannot draw: draw pile is empty');
  });
});

describe('canRecycle', () => {
  it('returns true when draw pile is empty and discard pile has cards', () => {
    const card = createCard('hearts', 'A', true);
    const state = createMinimalState([], [card]);
    
    expect(canRecycle(state)).toBe(true);
  });

  it('returns false when draw pile has cards', () => {
    const card1 = createCard('hearts', 'A', false);
    const card2 = createCard('diamonds', '2', true);
    const state = createMinimalState([card1], [card2]);
    
    expect(canRecycle(state)).toBe(false);
  });

  it('returns false when discard pile is empty', () => {
    const state = createMinimalState([], []);
    
    expect(canRecycle(state)).toBe(false);
  });
});

describe('recycle', () => {
  it('moves all cards from discard to draw pile', () => {
    const card1 = createCard('hearts', 'A', true);
    const card2 = createCard('diamonds', '2', true);
    const card3 = createCard('clubs', '3', true);
    const state = createMinimalState([], [card1, card2, card3]);
    
    const newState = recycle(state);
    
    expect(newState.drawPile).toHaveLength(3);
    expect(newState.discardPile).toHaveLength(0);
  });

  it('reverses order of cards', () => {
    const card1 = createCard('hearts', 'A', true);
    const card2 = createCard('diamonds', '2', true);
    const card3 = createCard('clubs', '3', true);
    const state = createMinimalState([], [card1, card2, card3]);
    
    const newState = recycle(state);
    
    // Cards should be reversed: [3C, 2D, AH]
    expect(newState.drawPile[0].suit).toBe('clubs');
    expect(newState.drawPile[1].suit).toBe('diamonds');
    expect(newState.drawPile[2].suit).toBe('hearts');
  });

  it('flips all cards face down', () => {
    const card1 = createCard('hearts', 'A', true);
    const card2 = createCard('diamonds', '2', true);
    const state = createMinimalState([], [card1, card2]);
    
    const newState = recycle(state);
    
    expect(newState.drawPile.every(card => !card.faceUp)).toBe(true);
  });

  it('does not mutate original state', () => {
    const card = createCard('hearts', 'A', true);
    const state = createMinimalState([], [card]);
    const originalDrawPile = state.drawPile;
    const originalDiscardPile = state.discardPile;
    
    recycle(state);
    
    expect(state.drawPile).toBe(originalDrawPile);
    expect(state.discardPile).toBe(originalDiscardPile);
    expect(state.drawPile).toHaveLength(0);
    expect(state.discardPile).toHaveLength(1);
  });

  it('throws error when draw pile is not empty', () => {
    const card1 = createCard('hearts', 'A', false);
    const card2 = createCard('diamonds', '2', true);
    const state = createMinimalState([card1], [card2]);
    
    expect(() => recycle(state)).toThrow();
  });

  it('throws error when discard pile is empty', () => {
    const state = createMinimalState([], []);
    
    expect(() => recycle(state)).toThrow();
  });
});
