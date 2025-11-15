/**
 * Card property helpers
 * Utilities for checking card properties and relationships
 */

import type { Card, Suit, Rank } from '../../types';
import { RANK_VALUES, RED_SUITS } from '../../constants';

/**
 * Gets the numeric value of a card rank
 * Ace=1, 2-10=face value, Jack=11, Queen=12, King=13
 * @param rank - The rank to get the value for
 * @returns The numeric value of the rank
 */
export const getRankValue = (rank: Rank): number => {
  return RANK_VALUES[rank];
};

/**
 * Checks if a suit is red (hearts or diamonds)
 * @param suit - The suit to check
 * @returns true if the suit is red, false otherwise
 */
export const isRed = (suit: Suit): boolean => {
  return RED_SUITS.includes(suit);
};

/**
 * Checks if two suits are the same color
 * @param suit1 - First suit
 * @param suit2 - Second suit
 * @returns true if both suits are the same color
 */
export const isSameColor = (suit1: Suit, suit2: Suit): boolean => {
  return isRed(suit1) === isRed(suit2);
};

/**
 * Checks if two suits are opposite colors
 * @param suit1 - First suit
 * @param suit2 - Second suit
 * @returns true if suits are opposite colors (one red, one black)
 */
export const isOppositeColor = (suit1: Suit, suit2: Suit): boolean => {
  return isRed(suit1) !== isRed(suit2);
};

/**
 * Checks if a card can be placed on another card in the tableau
 * Rules: Must be one rank lower and opposite color
 * @param movingCard - The card being moved
 * @param targetCard - The card to place on
 * @returns true if the move is valid
 */
export const canPlaceOnTableauCard = (movingCard: Card, targetCard: Card): boolean => {
  return (
    targetCard.faceUp &&
    isOppositeColor(movingCard.suit, targetCard.suit) &&
    getRankValue(movingCard.rank) === getRankValue(targetCard.rank) - 1
  );
};

/**
 * Checks if a card can be placed in a foundation pile
 * Rules: Must be same suit and one rank higher than top card (or Ace for empty)
 * @param card - The card to place
 * @param foundationCards - Current cards in the foundation
 * @returns true if the card can be placed
 */
export const canPlaceOnFoundation = (card: Card, foundationCards: Card[]): boolean => {
  // Card must match the foundation suit (checked by caller)
  if (foundationCards.length === 0) {
    return card.rank === 'A';
  }
  
  const topCard = foundationCards[foundationCards.length - 1];
  return getRankValue(card.rank) === getRankValue(topCard.rank) + 1;
};

/**
 * Checks if a card can start a new tableau column
 * Only Kings can be placed in empty tableau columns
 * @param card - The card to check
 * @returns true if the card is a King
 */
export const canStartTableauColumn = (card: Card): boolean => {
  return card.rank === 'K';
};
