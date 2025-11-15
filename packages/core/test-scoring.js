import { getPerceivedDifficulty } from './src/scoring/index.ts';
import { createCard } from './src/utils/card.ts';

const createTestState = (overrides) => ({
  drawPile: [],
  discardPile: [],
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
  ...overrides,
});

const stateNoHidden = createTestState({
  tableau: [
    [createCard('hearts', 'A', true)],
    [],
    [],
    [],
    [],
    [],
    [],
  ],
});

console.log('No hidden:', getPerceivedDifficulty(stateNoHidden));

const stateWithHidden = createTestState({
  tableau: [
    [createCard('hearts', 'A', false), createCard('hearts', '2', true)],
    [createCard('diamonds', 'A', false), createCard('diamonds', '2', true)],
    [],
    [],
    [],
    [],
    [],
  ],
});

console.log('With hidden:', getPerceivedDifficulty(stateWithHidden));
