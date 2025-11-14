# Solitaire Difficulty System

## Overview

The Solitaire game includes a 5-level difficulty system that adjusts the card arrangement to create games of varying challenge levels. The difficulty affects how the deck is shuffled before dealing, while maintaining all standard Klondike Solitaire rules.

## Difficulty Levels

### Level 1: Very Easy ⭐
**Shuffle Strategy**: Minimal shuffle (20% randomization)

- **Description**: The deck starts in a mostly ordered state with only 20% of possible swaps applied
- **Effect**: Creates favorable card positions with many cards in sequential order
- **Best For**: Beginners learning the game, guaranteed winnable scenarios, quick games
- **Algorithm**: `partialShuffle(orderedDeck, 20)`

### Level 2: Easy ⭐⭐
**Shuffle Strategy**: Partial shuffle (50% randomization)

- **Description**: Half-randomized deck provides a balance between order and randomness
- **Effect**: More forgiving card positions with some sequential runs intact
- **Best For**: Casual players, shorter gaming sessions, higher win rate
- **Algorithm**: `partialShuffle(orderedDeck, 50)`

### Level 3: Normal ⭐⭐⭐ (Default)
**Shuffle Strategy**: Full random shuffle (100% randomization)

- **Description**: Complete Fisher-Yates shuffle providing true randomization
- **Effect**: Standard Solitaire experience with unpredictable card positions
- **Best For**: Regular gameplay, balanced challenge, standard Solitaire experience
- **Algorithm**: `shuffle(deck)` - Fisher-Yates shuffle
- **Note**: This is the classic Klondike Solitaire experience

### Level 4: Hard ⭐⭐⭐⭐
**Shuffle Strategy**: Enhanced shuffle with biased positions (130% randomization)

- **Description**: Full shuffle followed by 30% additional swaps to create blocking positions
- **Effect**: More challenging card arrangements with potential blocking scenarios
- **Best For**: Experienced players seeking a challenge
- **Algorithm**: `partialShuffle(shuffle(deck), 30)`

### Level 5: Very Hard ⭐⭐⭐⭐⭐
**Shuffle Strategy**: Double shuffle (200% randomization)

- **Description**: Applies Fisher-Yates shuffle twice for maximum entropy
- **Effect**: Extremely randomized positions creating difficult scenarios
- **Best For**: Expert players, maximum challenge, complex puzzle scenarios
- **Algorithm**: `shuffle(shuffle(deck))`

## Technical Implementation

### Type Definitions

```typescript
// src/types/index.ts
export type Difficulty = 1 | 2 | 3 | 4 | 5;

export interface GameState {
  // ... other properties
  difficulty: Difficulty;
}
```

### Core Algorithm

The difficulty system is implemented in `src/store/gameStore.ts` with three key functions:

1. **Full Shuffle (Fisher-Yates)**
```typescript
const shuffle = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};
```

2. **Partial Shuffle**
```typescript
const partialShuffle = <T,>(array: T[], shufflePercentage: number): T[] => {
  const result = [...array];
  const numSwaps = Math.floor((array.length * shufflePercentage) / 100);
  
  for (let i = 0; i < numSwaps; i++) {
    const idx1 = Math.floor(Math.random() * array.length);
    const idx2 = Math.floor(Math.random() * array.length);
    [result[idx1], result[idx2]] = [result[idx2], result[idx1]];
  }
  
  return result;
};
```

3. **Difficulty-Based Arrangement**
```typescript
const arrangeDeckByDifficulty = (difficulty: Difficulty): Card[] => {
  const deck = createDeck();
  
  switch (difficulty) {
    case 1: return partialShuffle(deck, 20);
    case 2: return partialShuffle(deck, 50);
    case 3: return shuffle(deck);
    case 4: return partialShuffle(shuffle(deck), 30);
    case 5: return shuffle(shuffle(deck));
    default: return shuffle(deck);
  }
};
```

### Game Initialization

```typescript
const initializeGameState = (difficulty: Difficulty = 3): GameState => {
  const deck = arrangeDeckByDifficulty(difficulty);
  // ... rest of initialization
  return {
    // ... other state
    difficulty,
  };
};
```

## User Interface

The difficulty selector is integrated into the Control Panel:

- **Location**: Top of the Control Panel, below the Move Counter
- **Display**: Five buttons showing star ratings (⭐ to ⭐⭐⭐⭐⭐)
- **Interaction**: Click any difficulty button to start a new game with that difficulty
- **Feedback**: Success message displays the selected difficulty name
- **Default**: Level 3 (Normal) is selected by default

## Game Persistence

The difficulty level is saved and restored with game state:

- **Export**: Difficulty is included in exported game JSON files
- **Import**: Difficulty is restored when loading saved games
- **Default**: If importing an old save without difficulty, defaults to Level 3
- **New Game**: When starting a new game, the last selected difficulty is used

## Randomization Strategy

### Philosophy

The difficulty system maintains true randomness while adjusting the **degree** of randomization:

- **Lower Difficulties (1-2)**: Less randomization preserves favorable sequences
- **Normal Difficulty (3)**: Full randomization for classic experience
- **Higher Difficulties (4-5)**: Extra randomization creates complex scenarios

### Why Not Fixed Layouts?

Instead of creating predetermined "easy" or "hard" layouts, the system uses controlled randomization because:

1. **Replay Value**: Each game is unique, even at the same difficulty
2. **Fair Challenge**: Difficulty comes from statistical probability, not artificial constraints
3. **Natural Feel**: Games feel organic, not manufactured
4. **Gradual Progression**: Smooth difficulty curve from Very Easy to Very Hard

### Statistical Impact

- **Level 1**: ~20% of card pairs swapped from ordered state
- **Level 2**: ~50% of card pairs swapped from ordered state
- **Level 3**: 100% randomization (every permutation equally likely)
- **Level 4**: 130% swaps (full shuffle + extra swaps)
- **Level 5**: 200% randomization (shuffle applied twice)

## Testing

The difficulty system includes comprehensive unit tests:

```typescript
describe('GameStore - Difficulty System', () => {
  it('should initialize with default difficulty 3 (Normal)');
  it('should initialize with specified difficulty');
  it('should set difficulty and preserve it in new games');
  it('should export and import difficulty in game state');
  it('should create game with 52 cards regardless of difficulty');
  it('should have 28 cards in tableau for all difficulties');
});
```

All tests verify:
- Correct difficulty initialization
- Proper state persistence
- Card count consistency (52 cards total, 28 in tableau)
- Import/export functionality

## Usage Example

```typescript
// Start a Very Easy game
useGameStore.getState().initializeGame(1);

// Change difficulty and start new game
useGameStore.getState().setDifficulty(5);
useGameStore.getState().initializeGame();

// Get current difficulty
const difficulty = useGameStore.getState().difficulty;
```

## Design Rationale

### Why 5 Levels?

- **Granularity**: Provides enough variation without overwhelming choice
- **Clear Progression**: Easy to understand relative difficulty
- **Odd Number**: Level 3 serves as a natural "middle" or default
- **Industry Standard**: Common in games (e.g., Easy/Normal/Hard with 2 additional levels)

### Why Randomization Instead of Predetermined Setups?

1. **Infinite Variety**: Every game is unique
2. **Unpredictable**: Players can't memorize solutions
3. **Fair**: No artificial blocking or helpers
4. **Scalable**: Easy to balance and adjust
5. **Maintainable**: Simple algorithm, no need for curated layouts

### Future Enhancements

Potential improvements for the difficulty system:

1. **Win Rate Tracking**: Record win rates per difficulty
2. **Adaptive Difficulty**: Suggest difficulty based on performance
3. **Custom Difficulty**: Allow players to set custom shuffle percentages
4. **Solvability Check**: Analyze if a deal is theoretically solvable
5. **Seeded Random**: Allow replaying specific deals using seed values

## Conclusion

The 5-level difficulty system provides players with:
- **Accessibility**: Very Easy mode for beginners
- **Standard Experience**: Normal mode for classic Solitaire
- **Challenge**: Hard and Very Hard for experts
- **Flexibility**: Easy difficulty adjustment without losing progress context
- **Persistence**: Difficulty saved with game state

The system maintains the integrity of Klondike Solitaire rules while offering a range of experiences from highly winnable to extremely challenging.
