export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';

export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
  id: string;
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
}
