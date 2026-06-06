/**
 * Human-readable descriptions of moves, for the AI prompt and the UI.
 *
 * @module ai/context/describeMove
 */

import type { MoveCommand } from '@chayuto/solitaire-core';
import type { GameState, Move } from '../../types';
import { cardShort, SUIT_NAME } from '../cardNotation';

/** 1-based column label for prompts ("column 1" .. "column 7"). */
function col(index: number): string {
  return `column ${index + 1}`;
}

/**
 * Describe a legal {@link MoveCommand} in plain language, resolving the cards
 * it involves from the current game state.
 */
export function describeMoveCommand(command: MoveCommand, state: GameState): string {
  switch (command.type) {
    case 'draw_card':
      return 'Draw the next card from the stock onto the waste';

    case 'recycle_stock':
      return 'Recycle the waste pile back into the stock';

    case 'tableau_to_foundation': {
      const column = state.tableau[command.from?.column ?? -1] ?? [];
      const card = column[column.length - 1];
      return card
        ? `Send ${cardShort(card)} from ${col(command.from!.column!)} to the ${SUIT_NAME[card.suit]} foundation`
        : `Send the top card of ${col(command.from?.column ?? 0)} to its foundation`;
    }

    case 'discard_to_foundation': {
      const card = state.discardPile[state.discardPile.length - 1];
      return card
        ? `Send ${cardShort(card)} from the waste to the ${SUIT_NAME[card.suit]} foundation`
        : 'Send the waste card to its foundation';
    }

    case 'discard_to_tableau': {
      const card = state.discardPile[state.discardPile.length - 1];
      const target = state.tableau[command.to?.column ?? -1] ?? [];
      const empty = target.length === 0 ? ' (empty)' : '';
      return card
        ? `Move ${cardShort(card)} from the waste to ${col(command.to!.column!)}${empty}`
        : `Move the waste card to ${col(command.to?.column ?? 0)}`;
    }

    case 'tableau_to_tableau': {
      const fromCol = command.from?.column ?? -1;
      const cardIndex = command.from?.cardIndex ?? -1;
      const column = state.tableau[fromCol] ?? [];
      const card = column[cardIndex];
      const moved = column.length - cardIndex;
      const extra = moved > 1 ? ` plus ${moved - 1} more` : '';
      const reveals =
        cardIndex > 0 && column[cardIndex - 1] && !column[cardIndex - 1].faceUp
          ? ' (reveals a hidden card)'
          : '';
      const target = state.tableau[command.to?.column ?? -1] ?? [];
      const empty = target.length === 0 ? ' (empty)' : '';
      return card
        ? `Move ${cardShort(card)}${extra} from ${col(fromCol)} to ${col(command.to!.column!)}${empty}${reveals}`
        : `Move cards from ${col(fromCol)} to ${col(command.to?.column ?? 0)}`;
    }

    case 'flip_card':
      return `Flip a card face-up in ${col(command.from?.column ?? 0)}`;

    default:
      return 'Unknown move';
  }
}

/**
 * Compactly summarize a recorded {@link Move} from the move history, e.g.
 * `"draw TD"`, `"move 7S col 3 -> col 5"`, `"AS -> spades"`.
 */
export function summarizeHistoryMove(move: Move): string {
  const card = cardShort(move.card);
  switch (move.type) {
    case 'draw_card':
      return `draw ${card}`;
    case 'recycle_stock':
      return 'recycle stock';
    case 'tableau_to_tableau':
      return `move ${card} col ${(move.from?.columnIndex ?? 0) + 1} -> col ${(move.to?.columnIndex ?? 0) + 1}`;
    case 'tableau_to_foundation':
      return `${card} col ${(move.from?.columnIndex ?? 0) + 1} -> ${move.to?.suit ?? '?'} foundation`;
    case 'discard_to_tableau':
      return `${card} waste -> col ${(move.to?.columnIndex ?? 0) + 1}`;
    case 'discard_to_foundation':
      return `${card} waste -> ${move.to?.suit ?? '?'} foundation`;
    case 'flip_card':
      return `flip ${card} col ${(move.from?.columnIndex ?? 0) + 1}`;
    default:
      return move.type;
  }
}
