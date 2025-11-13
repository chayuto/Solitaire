import { create } from 'zustand';
import type { GameState, Card, Suit, Rank } from '../types';

interface GameStore extends GameState {
  initializeGame: () => void;
}

// Helper function to create a card
const createCard = (suit: Suit, rank: Rank, faceUp: boolean = false): Card => ({
  suit,
  rank,
  faceUp,
  id: `${suit}-${rank}`,
});

// Helper function to create a full deck
const createDeck = (): Card[] => {
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const deck: Card[] = [];

  suits.forEach(suit => {
    ranks.forEach(rank => {
      deck.push(createCard(suit, rank));
    });
  });

  return deck;
};

// Helper function to shuffle array
const shuffle = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Initialize the game state
const initializeGameState = (): GameState => {
  const deck = shuffle(createDeck());
  const tableau: Card[][] = [[], [], [], [], [], [], []];
  
  // Deal cards to tableau
  let deckIndex = 0;
  for (let col = 0; col < 7; col++) {
    for (let row = 0; row <= col; row++) {
      const card = deck[deckIndex];
      card.faceUp = row === col; // Last card in each column is face up
      tableau[col].push(card);
      deckIndex++;
    }
  }

  // Remaining cards go to draw pile
  const drawPile = deck.slice(deckIndex);

  return {
    drawPile,
    discardPile: [],
    foundations: {
      hearts: [],
      diamonds: [],
      clubs: [],
      spades: [],
    },
    tableau,
  };
};

export const useGameStore = create<GameStore>((set) => ({
  ...initializeGameState(),
  initializeGame: () => set(initializeGameState()),
}));
