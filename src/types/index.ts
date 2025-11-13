export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';

export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
  id: string;
}

export type MoveType = 
  | 'draw_card'
  | 'tableau_to_tableau'
  | 'tableau_to_foundation'
  | 'discard_to_tableau'
  | 'discard_to_foundation'
  | 'flip_card';

export interface Move {
  type: MoveType;
  timestamp: number;
  card: Card;
  from?: {
    source: 'tableau' | 'discard' | 'draw';
    columnIndex?: number;
    cardIndex?: number;
  };
  to?: {
    target: 'tableau' | 'foundation';
    columnIndex?: number;
    suit?: Suit;
  };
}

export interface GameState {
  drawPile: Card[];
  discardPile: Card[];
  foundations: {
    hearts: Card[];
    diamonds: Card[];
    clubs: Card[];
    spades: Card[];
  };
  tableau: Card[][];
  selectedCard?: {
    source: 'tableau' | 'discard';
    columnIndex?: number; // for tableau
    cardIndex?: number; // for tableau (index in column)
    card: Card;
  };
  moveHistory: Move[];
  showValidMoves: boolean;
  godMode: boolean;
}
