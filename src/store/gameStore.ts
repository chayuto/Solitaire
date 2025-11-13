import { create } from 'zustand';
import type { GameState, Card } from '../types';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface GameStore extends GameState {
  // Actions will be added later when implementing game logic
}

// Initial static state for UI demonstration
const createInitialState = (): GameState => {
  // Create empty tableau (7 columns)
  const tableau: Card[][] = Array.from({ length: 7 }, () => []);
  
  // Create empty foundation (4 piles)
  const foundation: Card[][] = Array.from({ length: 4 }, () => []);
  
  // Empty stock and waste piles
  const stock: Card[] = [];
  const waste: Card[] = [];

  return {
    tableau,
    foundation,
    stock,
    waste,
  };
};

export const useGameStore = create<GameStore>()(() => ({
  ...createInitialState(),
}));
