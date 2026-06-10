/**
 * UI slice — card selection, move-validation delegations the components use
 * for affordances, and the visual toggles.
 */
import {
  canMoveToTableau as canMoveToTableauCore,
  canMoveToFoundation as canMoveToFoundationCore,
  hasValidFoundationDestination as hasValidFoundationDestinationCore,
  getValidTableauDestinations,
} from '@chayuto/solitaire-core';
import { hasAnyValidDestination as hasAnyValidDestinationHelper } from '../uiHelpers';
import type { GameStore, StoreGet, StoreSet } from '../types';

type UiSlice = Pick<
  GameStore,
  | 'selectCard'
  | 'deselectCard'
  | 'canMoveToTableau'
  | 'canMoveToFoundation'
  | 'hasValidTableauDestination'
  | 'hasValidFoundationDestination'
  | 'hasAnyValidDestination'
  | 'toggleValidMoves'
  | 'toggleGodMode'
>;

export function createUiSlice(set: StoreSet, get: StoreGet): UiSlice {
  return {
  selectCard: (source, columnIndex, cardIndex) => {
    const state = get();
    
    if (source === 'tableau' && columnIndex !== undefined && cardIndex !== undefined) {
      const column = state.tableau[columnIndex];
      const card = column[cardIndex];
      
      // Only allow selecting face-up cards
      if (card.faceUp) {
        set({
          selectedCard: {
            source: 'tableau',
            columnIndex,
            cardIndex,
            card,
          },
        });
      }
    } else if (source === 'discard') {
      const topCard = state.discardPile[state.discardPile.length - 1];
      if (topCard) {
        set({
          selectedCard: {
            source: 'discard',
            card: topCard,
          },
        });
      }
    }
  },

  deselectCard: () => {
    set({ selectedCard: undefined });
  },

  canMoveToTableau: (card, targetColumn) => {
    const state = get();
    return canMoveToTableauCore(card, state.tableau[targetColumn]);
  },

  canMoveToFoundation: (card, suit) => {
    const state = get();
    return canMoveToFoundationCore(card, state.foundations[suit]);
  },

  hasValidTableauDestination: (card, sourceColumn) => {
    const state = get();
    const destinations = getValidTableauDestinations(card, state.tableau, sourceColumn);
    return destinations.length > 0;
  },

  hasValidFoundationDestination: (card) => {
    const state = get();
    return hasValidFoundationDestinationCore(card, state.foundations);
  },

  hasAnyValidDestination: (card, source, columnIndex, cardIndex) => {
    const state = get();
    return hasAnyValidDestinationHelper(card, source, state, columnIndex, cardIndex);
  },

  toggleValidMoves: () => {
    set((state) => ({ showValidMoves: !state.showValidMoves }));
  },

  toggleGodMode: () => {
    set((state) => ({ godMode: !state.godMode }));
  },
  };
}
