# @chayuto/solitaire-core

[![npm version](https://img.shields.io/npm/v/@chayuto/solitaire-core)](https://www.npmjs.com/package/@chayuto/solitaire-core)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/npm/l/@chayuto/solitaire-core)](LICENSE)

Core game logic library for Klondike Solitaire. Provides pure, immutable functions for game state management, move validation, and scoring.

## Features

- 🎯 **Pure Functions** - All functions are pure and immutable
- 🎮 **Complete Game Logic** - Full Klondike Solitaire rules implementation
- 🔄 **State Management** - Import/export game states
- 📊 **Scoring System** - Completion progress and difficulty metrics
- ✅ **Move Validation** - Comprehensive move validation and generation
- 📦 **Zero Dependencies** - Lightweight with no external dependencies
- 🔒 **Type Safe** - Full TypeScript support with strict types

## Installation

```bash
npm install @chayuto/solitaire-core
```

## Quick Start

```typescript
import { GameEngine } from '@chayuto/solitaire-core';

// Create a new game engine
const engine = new GameEngine();

// Initialize a new game
const state = engine.initialize({
  difficulty: 3,
  seed: 12345, // Optional: for reproducible games
});

// Get all legal moves
const legalMoves = engine.getLegalMoves(state);
console.log(`${legalMoves.length} legal moves available`);

// Apply a move
const newState = engine.applyMove(state, legalMoves[0]);

// Check game status
console.log('Progress:', engine.getCompletionProgress(newState), '%');
console.log('Won:', engine.isWon(newState));
console.log('Lost:', engine.isLost(newState));
```

## Core Concepts

### GameState

The game state is an immutable object containing all game information:

```typescript
interface GameState {
  drawPile: readonly Card[];           // Stock pile
  discardPile: readonly Card[];        // Waste pile
  foundations: Foundations;             // Four foundation piles (by suit)
  tableau: readonly Card[][];          // Seven tableau columns
  moveHistory: readonly Move[];        // Move history
  difficulty: Difficulty;              // Game difficulty (1-5)
  gameWon: boolean;                    // Win flag
  completionProgress: number;          // Progress (0-100)
}
```

### Cards

Cards are immutable objects with suit, rank, and face-up state:

```typescript
interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  rank: 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
  faceUp: boolean;
  id: string;  // Unique identifier
}
```

### Move Commands

Moves are represented as command objects:

```typescript
type MoveCommand = 
  | { type: 'draw_card' }
  | { type: 'recycle_stock' }
  | { type: 'tableau_to_tableau'; from: Location; to: Location }
  | { type: 'tableau_to_foundation'; from: Location; to: { suit: Suit } }
  | { type: 'discard_to_tableau'; to: { column: number } }
  | { type: 'discard_to_foundation'; to: { suit: Suit } };
```

## API Reference

### GameEngine

The main game engine class for managing game state.

#### `initialize(options?: InitializeOptions): GameState`

Creates a new game state with the specified options.

```typescript
const state = engine.initialize({
  difficulty: 3,     // 1-5, affects card distribution
  seed: 12345,       // Optional: for reproducible games
  customDeck: cards, // Optional: use custom card order
});
```

#### `applyMove(state: GameState, command: MoveCommand): GameState`

Applies a move to the game state and returns a new state.

```typescript
const newState = engine.applyMove(state, {
  type: 'tableau_to_tableau',
  from: { column: 0, cardIndex: 2 },
  to: { column: 1 },
});
```

#### `canApplyMove(state: GameState, command: MoveCommand): boolean`

Checks if a move is valid without applying it.

```typescript
const isValid = engine.canApplyMove(state, {
  type: 'draw_card',
});
```

#### `getLegalMoves(state: GameState): MoveCommand[]`

Returns all legal moves in the current state.

```typescript
const moves = engine.getLegalMoves(state);
moves.forEach(move => {
  console.log(`Can make move: ${move.type}`);
});
```

#### `isWon(state: GameState): boolean`

Checks if the game is won (all 52 cards in foundations).

```typescript
if (engine.isWon(state)) {
  console.log('Congratulations! You won!');
}
```

#### `isLost(state: GameState): boolean`

Checks if the game is lost (no legal moves and not won).

```typescript
if (engine.isLost(state)) {
  console.log('Game over - no more moves');
}
```

#### `getCompletionProgress(state: GameState): number`

Returns completion progress as a percentage (0-100).

```typescript
const progress = engine.getCompletionProgress(state);
console.log(`${progress.toFixed(1)}% complete`);
```

#### `getPerceivedDifficulty(state: GameState): number`

Returns perceived difficulty score (0-100) based on board analysis.

```typescript
const difficulty = engine.getPerceivedDifficulty(state);
console.log(`Difficulty: ${difficulty.toFixed(0)}/100`);
```

#### `exportState(state: GameState): string`

Exports game state to JSON string.

```typescript
const json = engine.exportState(state);
localStorage.setItem('savedGame', json);
```

#### `importState(json: string): GameState`

Imports game state from JSON string with validation.

```typescript
const json = localStorage.getItem('savedGame');
const state = engine.importState(json);
```

### Utility Functions

#### Card Utilities

```typescript
import { 
  createCard, 
  flipCard, 
  isRed, 
  isBlack, 
  getColor,
  getRankValue,
  areOppositeColors 
} from '@chayuto/solitaire-core';

const card = createCard('hearts', 'K', true);
const flipped = flipCard(card);  // Returns new card, face down
const color = getColor(card);    // 'red'
const value = getRankValue('K'); // 13
```

#### Deck Utilities

```typescript
import { 
  createDeck, 
  shuffleDeck, 
  arrangeDeckByDifficulty 
} from '@chayuto/solitaire-core';

const deck = createDeck();                         // All 52 cards
const shuffled = shuffleDeck(deck, 12345);         // Seeded shuffle
const arranged = arrangeDeckByDifficulty(3, 123);  // Difficulty-based
```

#### Validation Utilities

```typescript
import { 
  countCards, 
  validateGameState, 
  isValidGameState 
} from '@chayuto/solitaire-core';

const cardCount = countCards(state);      // Should be 52
const isValid = isValidGameState(state);  // Boolean check

try {
  validateGameState(state);  // Throws on invalid
} catch (error) {
  console.error('Invalid state:', error.message);
}
```

#### Hash Utilities

```typescript
import { 
  hashGameState, 
  areStatesEqual 
} from '@chayuto/solitaire-core';

const hash1 = hashGameState(state1);
const hash2 = hashGameState(state2);
const same = areStatesEqual(state1, state2);
```

### Rule Modules

#### Tableau Rules

```typescript
import { 
  canMoveToTableau, 
  canMoveSequence,
  getValidTableauDestinations 
} from '@chayuto/solitaire-core';

// Check if card can move to column
const canMove = canMoveToTableau(card, targetColumn);

// Check if sequence can move
const cards = [card1, card2, card3];
const canMoveAll = canMoveSequence(cards, targetColumn);

// Get all valid destinations
const destinations = getValidTableauDestinations(card, tableau, sourceColumn);
```

#### Foundation Rules

```typescript
import { 
  canMoveToFoundation,
  getNextFoundationRank,
  hasValidFoundationDestination 
} from '@chayuto/solitaire-core';

// Check if card can move to foundation
const canMove = canMoveToFoundation(card, foundationPile);

// Get next expected rank
const nextRank = getNextFoundationRank(foundationPile); // 'A', '2', '3', etc.

// Check if card has any valid foundation
const hasDestination = hasValidFoundationDestination(card, foundations);
```

#### Stock Rules

```typescript
import { 
  canDraw, 
  draw,
  canRecycle,
  recycle 
} from '@chayuto/solitaire-core';

// Check if can draw
if (canDraw(state)) {
  state = draw(state);  // Draw one card
}

// Check if can recycle
if (canRecycle(state)) {
  state = recycle(state);  // Move all waste to stock
}
```

### Scoring Functions

```typescript
import { 
  getCompletionProgress,
  getPerceivedDifficulty 
} from '@chayuto/solitaire-core';

// Get completion percentage
const progress = getCompletionProgress(state); // 0-100

// Get perceived difficulty
const difficulty = getPerceivedDifficulty(state); // 0-100
```

## Examples

### Basic Game Loop

```typescript
import { GameEngine } from '@chayuto/solitaire-core';

const engine = new GameEngine();
let state = engine.initialize({ difficulty: 3 });

while (!engine.isWon(state) && !engine.isLost(state)) {
  const moves = engine.getLegalMoves(state);
  
  if (moves.length === 0) break;
  
  // Apply first available move (in real game, let user choose)
  state = engine.applyMove(state, moves[0]);
  
  console.log(`Progress: ${engine.getCompletionProgress(state)}%`);
}

if (engine.isWon(state)) {
  console.log('You won!');
} else {
  console.log('Game over');
}
```

### Save/Load Game

```typescript
import { GameEngine } from '@chayuto/solitaire-core';

const engine = new GameEngine();

// Save game
const state = engine.initialize();
const savedJson = engine.exportState(state);
localStorage.setItem('game', savedJson);

// Load game
const loadedJson = localStorage.getItem('game');
if (loadedJson) {
  try {
    const loadedState = engine.importState(loadedJson);
    console.log('Game loaded successfully');
  } catch (error) {
    console.error('Failed to load game:', error);
  }
}
```

### Move Validation

```typescript
import { GameEngine } from '@chayuto/solitaire-core';

const engine = new GameEngine();
const state = engine.initialize();

// Get all legal moves
const legalMoves = engine.getLegalMoves(state);

// Check specific move
const moveToCheck = {
  type: 'tableau_to_tableau',
  from: { column: 0, cardIndex: 2 },
  to: { column: 1 },
};

if (engine.canApplyMove(state, moveToCheck)) {
  const newState = engine.applyMove(state, moveToCheck);
  console.log('Move applied successfully');
}
```

### Difficulty Analysis

```typescript
import { GameEngine, getPerceivedDifficulty } from '@chayuto/solitaire-core';

const engine = new GameEngine();

// Test different difficulty levels
for (let difficulty = 1; difficulty <= 5; difficulty++) {
  const state = engine.initialize({ difficulty, seed: 12345 });
  const perceived = getPerceivedDifficulty(state);
  console.log(`Difficulty ${difficulty}: Perceived ${perceived.toFixed(0)}/100`);
}
```

## Architecture

The library is organized into focused modules:

```
@chayuto/solitaire-core/
├── types/              # TypeScript type definitions
│   ├── Card.ts         # Card and Suit types
│   ├── GameState.ts    # Game state and options
│   ├── Move.ts         # Move command types
│   └── Difficulty.ts   # Difficulty levels
├── engine/             # Game engine implementation
│   └── index.ts        # GameEngine class
├── rules/              # Game rules modules
│   ├── tableau.ts      # Tableau move validation
│   ├── foundation.ts   # Foundation move validation
│   └── stock.ts        # Stock/waste operations
├── utils/              # Utility functions
│   ├── card.ts         # Card manipulation
│   ├── deck.ts         # Deck creation and shuffling
│   ├── validation.ts   # State validation
│   └── hash.ts         # State hashing
├── scoring/            # Scoring system
│   └── index.ts        # Progress and difficulty
└── index.ts            # Main entry point
```

## Design Principles

1. **Immutability** - All functions return new objects, never mutate inputs
2. **Pure Functions** - No side effects, same input always produces same output
3. **Type Safety** - Full TypeScript support with strict types
4. **Zero Dependencies** - Lightweight and self-contained
5. **Testability** - Comprehensive test coverage (>95%)
6. **Performance** - Efficient algorithms with minimal allocations

## Browser and Node.js Support

- **Node.js**: 20.x or higher
- **Browsers**: Modern browsers with ES2020 support
- **Module Formats**: ESM and CommonJS

```javascript
// ESM
import { GameEngine } from '@chayuto/solitaire-core';

// CommonJS
const { GameEngine } = require('@chayuto/solitaire-core');
```

## Development

```bash
# Install dependencies
npm install

# Build the library
npm run build

# Run tests
npm run test

# Watch mode for tests
npm run test:watch

# Type check
npm run typecheck
```

## Testing

The library has comprehensive test coverage:

```bash
npm run test           # Run all tests
npm run test:watch     # Watch mode
```

Test structure:
- **Unit tests**: Test individual functions
- **Integration tests**: Test GameEngine workflows
- **Edge cases**: Test boundary conditions and error handling

## Contributing

This is part of a monorepo. See the main repository README for contribution guidelines.

## Related Packages

- `@chayuto/solitaire-mcts` - Monte Carlo Tree Search solver for Klondike Solitaire

## License

MIT © 2024

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release history.

## Support

For issues and questions, please use the GitHub issue tracker.
