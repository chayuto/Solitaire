/**
 * Stock and waste pile rules module
 * Functions for drawing cards and recycling the waste pile
 * All functions are pure and do not mutate input data
 */

import type { GameState } from '../types';

/**
 * Checks if a card can be drawn from the stock (draw pile)
 * 
 * @param state - The current game state
 * @returns true if there are cards in the draw pile
 */
export function canDraw(state: GameState): boolean {
  return state.drawPile.length > 0;
}

/**
 * Draws a card from the stock to the waste pile
 * The card is flipped face up
 * 
 * @param state - The current game state
 * @returns A new game state with the card moved from stock to waste
 * @throws Error if the draw pile is empty
 */
export function draw(state: GameState): GameState {
  if (!canDraw(state)) {
    throw new Error('Cannot draw: draw pile is empty');
  }
  
  // Draw from the end of the draw pile (top card)
  const drawnCard = { ...state.drawPile[state.drawPile.length - 1], faceUp: true };
  
  return {
    ...state,
    drawPile: state.drawPile.slice(0, -1),
    discardPile: [...state.discardPile, drawnCard],
  };
}

/**
 * Checks if the waste pile can be recycled back to the stock
 * 
 * @param state - The current game state
 * @returns true if the draw pile is empty and waste pile has cards
 */
export function canRecycle(state: GameState): boolean {
  return state.drawPile.length === 0 && state.discardPile.length > 0;
}

/**
 * Recycles the waste pile back to the stock
 * All cards are flipped face down and the order is reversed
 * 
 * @param state - The current game state
 * @returns A new game state with waste recycled to stock
 * @throws Error if recycling is not possible
 */
export function recycle(state: GameState): GameState {
  if (!canRecycle(state)) {
    throw new Error('Cannot recycle: draw pile must be empty and discard pile must have cards');
  }
  
  // Reverse the discard pile and flip all cards face down
  const recycledCards = [...state.discardPile].reverse().map(card => ({
    ...card,
    faceUp: false,
  }));
  
  return {
    ...state,
    drawPile: recycledCards,
    discardPile: [],
  };
}
