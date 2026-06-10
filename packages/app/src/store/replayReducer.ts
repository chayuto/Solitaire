/**
 * Replay reducer — re-derives the board at a given point in a recorded game.
 *
 * Deliberately *record-level* (it replays {@link Move} history entries, one
 * per card moved, not engine commands) so historical persisted games replay
 * byte-identically — including legacy histories whose recycles are implicit
 * in a draw on an empty stock. This is the one sanctioned non-engine board
 * walker (ADR-0005).
 */
import type { GameState, InitialBoardSetup, Move } from '../types';

export interface ReplayBoard {
  drawPile: GameState['drawPile'];
  discardPile: GameState['discardPile'];
  foundations: GameState['foundations'];
  tableau: GameState['tableau'];
  recycleCount: number;
}

/** Board state after replaying `moveHistory[0..targetIndex)` from the deal. */
export function replayBoardAt(
  initialBoardSetup: InitialBoardSetup,
  moveHistory: readonly Move[],
  targetIndex: number,
): ReplayBoard {
  const newState: ReplayBoard = {
    drawPile: JSON.parse(JSON.stringify(initialBoardSetup.drawPile)),
    discardPile: JSON.parse(JSON.stringify(initialBoardSetup.discardPile)),
    foundations: JSON.parse(JSON.stringify(initialBoardSetup.foundations)),
    tableau: JSON.parse(JSON.stringify(initialBoardSetup.tableau)),
    recycleCount: 0,
  };
  const state = { moveHistory };

    // Apply moves up to targetIndex
    for (let i = 0; i < targetIndex; i++) {
      const move = state.moveHistory[i];

      switch (move.type) {
        case 'draw_card': {
          // Draw a card
          if (newState.drawPile && newState.drawPile.length > 0) {
            const card = newState.drawPile[0];
            const drawnCard = { ...card, faceUp: true };
            newState.drawPile = newState.drawPile.slice(1);
            newState.discardPile = [...(newState.discardPile || []), drawnCard];
          } else if (newState.discardPile && newState.discardPile.length > 0) {
            // Reset draw pile from discard pile; track cycle the same way
            // live play does.
            newState.drawPile = [...newState.discardPile].reverse().map(card => ({
              ...card,
              faceUp: false,
            }));
            newState.discardPile = [];
            newState.recycleCount = (newState.recycleCount ?? 0) + 1;
          }
          break;
        }

        case 'recycle_stock': {
          // Explicit recycle: reset the stock from the waste, matching live
          // play. Older histories (no recycle_stock entry) still recycle via
          // the draw_card branch above; new histories recycle here, then the
          // following draw_card sees a full stock and just draws.
          if (newState.discardPile && newState.discardPile.length > 0) {
            newState.drawPile = [...newState.discardPile].reverse().map(card => ({
              ...card,
              faceUp: false,
            }));
            newState.discardPile = [];
            newState.recycleCount = (newState.recycleCount ?? 0) + 1;
          }
          break;
        }

        case 'tableau_to_tableau': {
          if (move.from?.columnIndex !== undefined && move.to?.columnIndex !== undefined && newState.tableau) {
            const sourceColumn = [...newState.tableau[move.from.columnIndex]];
            const cardIndex = move.from.cardIndex !== undefined ? move.from.cardIndex : sourceColumn.length - 1;
            const cardsToMove = sourceColumn.slice(cardIndex, cardIndex + 1);
            const remainingCards = sourceColumn.slice(0, cardIndex);
            
            newState.tableau[move.from.columnIndex] = remainingCards;
            newState.tableau[move.to.columnIndex] = [...newState.tableau[move.to.columnIndex], ...cardsToMove];
          }
          break;
        }
        
        case 'tableau_to_foundation': {
          if (move.from?.columnIndex !== undefined && move.to?.suit && newState.tableau && newState.foundations) {
            const sourceColumn = [...newState.tableau[move.from.columnIndex]];
            const card = sourceColumn.pop();
            if (card) {
              newState.tableau[move.from.columnIndex] = sourceColumn;
              newState.foundations[move.to.suit] = [...newState.foundations[move.to.suit], card];
            }
          }
          break;
        }
        
        case 'discard_to_tableau': {
          if (move.to?.columnIndex !== undefined && newState.discardPile && newState.tableau) {
            const card = newState.discardPile.pop();
            if (card) {
              newState.tableau[move.to.columnIndex] = [...newState.tableau[move.to.columnIndex], card];
            }
          }
          break;
        }
        
        case 'discard_to_foundation': {
          if (move.to?.suit && newState.discardPile && newState.foundations) {
            const card = newState.discardPile.pop();
            if (card) {
              newState.foundations[move.to.suit] = [...newState.foundations[move.to.suit], card];
            }
          }
          break;
        }
        
        case 'flip_card': {
          if (move.from?.columnIndex !== undefined && move.from.cardIndex !== undefined && newState.tableau) {
            const column = [...newState.tableau[move.from.columnIndex]];
            if (column[move.from.cardIndex]) {
              column[move.from.cardIndex] = { ...column[move.from.cardIndex], faceUp: true };
              newState.tableau[move.from.columnIndex] = column;
            }
          }
          break;
        }
      }
    }
    
    return newState;
}
