# API Documentation

Complete API reference for `@chayuto/solitaire-core`.

## Table of Contents

- [GameEngine](#gameengine)
- [Type Definitions](#type-definitions)
- [Utility Functions](#utility-functions)
- [Rule Modules](#rule-modules)
- [Scoring Functions](#scoring-functions)

---

## GameEngine

The main class for game state management.

### Constructor

```typescript
new GameEngine()
```

Creates a new game engine instance. No parameters required.

**Example:**
```typescript
const engine = new GameEngine();
```

---

### initialize

```typescript
initialize(options?: InitializeOptions): GameState
```

Creates a new game state with the specified options.

**Parameters:**
- `options` (optional): Initialization options
  - `difficulty?: number` - Difficulty level (1-5, default: 3)
  - `seed?: number` - Random seed for reproducible games
  - `customDeck?: readonly Card[]` - Custom deck instead of generated

**Returns:** `GameState` - Initial game state

**Example:**
```typescript
// Default difficulty (3)
const state1 = engine.initialize();

// Custom difficulty
const state2 = engine.initialize({ difficulty: 5 });

// Reproducible game
const state3 = engine.initialize({ difficulty: 3, seed: 12345 });

// Custom deck
const customDeck = createDeck();
const state4 = engine.initialize({ customDeck });
```

**Behavior:**
- Deals 28 cards to tableau (1, 2, 3, ..., 7 cards per column)
- Top card of each tableau column is face-up
- Remaining 24 cards go to draw pile
- All foundation piles start empty
- Saves initial board setup for replay (unless custom deck used)

---

### applyMove

```typescript
applyMove(state: GameState, command: MoveCommand): GameState
```

Applies a move to the game state and returns a new state.

**Parameters:**
- `state: GameState` - Current game state
- `command: MoveCommand` - Move to apply

**Returns:** `GameState` - New game state after move

**Throws:** `Error` if move is invalid

**Example:**
```typescript
// Draw a card
const state2 = engine.applyMove(state1, { type: 'draw_card' });

// Move tableau to tableau
const state3 = engine.applyMove(state2, {
  type: 'tableau_to_tableau',
  from: { column: 0, cardIndex: 2 },
  to: { column: 1 }
});

// Move to foundation
const state4 = engine.applyMove(state3, {
  type: 'tableau_to_foundation',
  from: { column: 0, cardIndex: 0 },
  to: { suit: 'hearts' }
});
```

**Supported Move Types:**
1. `draw_card` - Draw one card from stock to waste
2. `recycle_stock` - Move all waste cards back to stock
3. `tableau_to_tableau` - Move card(s) between tableau columns
4. `tableau_to_foundation` - Move card from tableau to foundation
5. `discard_to_tableau` - Move top waste card to tableau
6. `discard_to_foundation` - Move top waste card to foundation

**Side Effects:**
- Automatically flips newly exposed tableau cards
- Maintains immutability (original state unchanged)

---

### canApplyMove

```typescript
canApplyMove(state: GameState, command: MoveCommand): boolean
```

Checks if a move is valid without applying it.

**Parameters:**
- `state: GameState` - Current game state
- `command: MoveCommand` - Move to validate

**Returns:** `boolean` - `true` if move is valid, `false` otherwise

**Example:**
```typescript
const move = { type: 'draw_card' };

if (engine.canApplyMove(state, move)) {
  const newState = engine.applyMove(state, move);
}
```

**Validation Rules:**
- Checks move structure is complete
- Validates card availability
- Checks game rules for the move type
- Returns `false` instead of throwing on invalid moves

---

### getLegalMoves

```typescript
getLegalMoves(state: GameState): MoveCommand[]
```

Returns all legal moves in the current state.

**Parameters:**
- `state: GameState` - Current game state

**Returns:** `MoveCommand[]` - Array of all legal moves

**Example:**
```typescript
const moves = engine.getLegalMoves(state);

console.log(`${moves.length} legal moves:`);
moves.forEach((move, i) => {
  console.log(`${i + 1}. ${move.type}`);
});

// Apply first move
if (moves.length > 0) {
  const newState = engine.applyMove(state, moves[0]);
}
```

**Performance:**
- Typical execution: <10ms for average game state
- Returns empty array for lost game

**Move Order:**
1. Stock moves (draw/recycle)
2. Discard pile moves (to foundation, to tableau)
3. Tableau moves (to foundation, to other tableaus)

---

### isWon

```typescript
isWon(state: GameState): boolean
```

Checks if the game is won (all 52 cards in foundations).

**Parameters:**
- `state: GameState` - Game state to check

**Returns:** `boolean` - `true` if game is won

**Example:**
```typescript
if (engine.isWon(state)) {
  console.log('🎉 Congratulations! You won!');
  const progress = engine.getCompletionProgress(state);
  console.log(`Final progress: ${progress}%`); // 100
}
```

**Win Conditions:**
- All four foundations have 13 cards each (52 total), OR
- `gameWon` flag is set to `true`

---

### isLost

```typescript
isLost(state: GameState): boolean
```

Checks if the game is lost (no legal moves and not won).

**Parameters:**
- `state: GameState` - Game state to check

**Returns:** `boolean` - `true` if game is lost

**Example:**
```typescript
if (engine.isLost(state)) {
  console.log('😔 Game over - no more moves available');
} else if (!engine.isWon(state)) {
  const moves = engine.getLegalMoves(state);
  console.log(`${moves.length} moves still available`);
}
```

**Loss Detection:**
- Returns `false` if game is won
- Returns `true` if no legal moves exist and game not won
- Uses `getLegalMoves()` internally

---

### getCompletionProgress

```typescript
getCompletionProgress(state: GameState): number
```

Returns completion progress as a percentage.

**Parameters:**
- `state: GameState` - Game state to analyze

**Returns:** `number` - Progress percentage (0-100)

**Example:**
```typescript
const progress = engine.getCompletionProgress(state);
console.log(`Progress: ${progress.toFixed(1)}%`);

// Display progress bar
const filled = Math.floor(progress / 5); // 20 segments
const bar = '█'.repeat(filled) + '░'.repeat(20 - filled);
console.log(`[${bar}] ${progress.toFixed(0)}%`);
```

**Calculation:**
- Based solely on cards in foundation piles
- Formula: `(cards_in_foundations / 52) * 100`
- Examples:
  - 0 cards in foundations = 0%
  - 13 cards (one suit) = 25%
  - 26 cards (two suits) = 50%
  - 52 cards (all suits) = 100%

---

### getPerceivedDifficulty

```typescript
getPerceivedDifficulty(state: GameState): number
```

Returns perceived difficulty score based on board analysis.

**Parameters:**
- `state: GameState` - Game state to analyze

**Returns:** `number` - Difficulty score (0-100)

**Example:**
```typescript
const difficulty = engine.getPerceivedDifficulty(state);

if (difficulty > 70) {
  console.log('⚠️ Very difficult position');
} else if (difficulty > 40) {
  console.log('😐 Moderate difficulty');
} else {
  console.log('😊 Easy position');
}
```

**Difficulty Factors:**
1. **Hidden Cards** (+2 points each) - Cards face-down in tableau
2. **Buried Kings** (+5 points each) - Kings not on top and face-down
3. **Empty Columns** (-3 points each) - Empty tableau columns (easier)
4. **Discard Pile** (+0.5 points per card) - Missed opportunities
5. **Foundation Progress** (-1 point per card) - Cards in foundations (easier)

**Score Range:**
- Clamped to 0-100
- 0 = Very easy (e.g., won game)
- 100 = Very difficult (many hidden cards, buried Kings)

---

### exportState

```typescript
exportState(state: GameState): string
```

Exports game state to JSON string.

**Parameters:**
- `state: GameState` - Game state to export

**Returns:** `string` - JSON string representation

**Example:**
```typescript
// Save to localStorage
const json = engine.exportState(state);
localStorage.setItem('savedGame', json);

// Save to file (Node.js)
import fs from 'fs';
fs.writeFileSync('game.json', json);

// Send to server
fetch('/api/save-game', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: json
});
```

**Format:**
- Pretty-printed JSON with 2-space indentation
- Includes all game state fields
- Compatible with `importState()`

---

### importState

```typescript
importState(json: string): GameState
```

Imports game state from JSON string with validation.

**Parameters:**
- `json: string` - JSON string to import

**Returns:** `GameState` - Validated game state

**Throws:** 
- `Error` with message "Invalid JSON: ..." if JSON parsing fails
- `Error` from `validateGameState()` if state is invalid

**Example:**
```typescript
// Load from localStorage
const json = localStorage.getItem('savedGame');
if (json) {
  try {
    const state = engine.importState(json);
    console.log('Game loaded successfully');
  } catch (error) {
    console.error('Failed to load:', error.message);
  }
}

// Load from file (Node.js)
import fs from 'fs';
try {
  const json = fs.readFileSync('game.json', 'utf-8');
  const state = engine.importState(json);
} catch (error) {
  console.error('Invalid save file:', error.message);
}
```

**Validation:**
- Checks JSON syntax
- Validates exactly 52 cards
- Checks no duplicate card IDs
- Validates foundation sequences
- Validates tableau face-up/face-down order

---

## Type Definitions

### GameState

Complete game state containing all information about a Solitaire game.

```typescript
interface GameState {
  /** Cards remaining in the stock (draw pile) */
  readonly drawPile: readonly Card[];
  
  /** Cards in the waste pile (discard pile) */
  readonly discardPile: readonly Card[];
  
  /** The four foundation piles */
  readonly foundations: Foundations;
  
  /** The seven tableau columns */
  readonly tableau: readonly (readonly Card[])[];
  
  /** Move history for undo/replay */
  readonly moveHistory: readonly Move[];
  
  /** Difficulty level of the game */
  readonly difficulty: Difficulty;
  
  /** Whether the game has been won */
  readonly gameWon: boolean;
  
  /** Game completion percentage (0-100) */
  readonly completionProgress: number;
  
  /** Initial board setup for replay/analysis */
  readonly initialBoardSetup?: {
    readonly drawPile: readonly Card[];
    readonly discardPile: readonly Card[];
    readonly foundations: Foundations;
    readonly tableau: readonly (readonly Card[])[];
  };
  
  /** Perceived difficulty score (0-100) */
  readonly perceivedDifficulty?: number;
}
```

---

### Card

Represents a playing card.

```typescript
interface Card {
  /** Card suit */
  readonly suit: Suit;
  
  /** Card rank */
  readonly rank: Rank;
  
  /** Whether the card is face-up */
  readonly faceUp: boolean;
  
  /** Unique identifier */
  readonly id: string;
}
```

**Related Types:**
```typescript
type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';

type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
```

---

### MoveCommand

Represents a move command in the game.

```typescript
type MoveCommand =
  | { type: 'draw_card' }
  | { type: 'recycle_stock' }
  | { type: 'tableau_to_tableau'; from: Location; to: Location }
  | { type: 'tableau_to_foundation'; from: Location; to: { suit: Suit } }
  | { type: 'discard_to_tableau'; to: { column: number } }
  | { type: 'discard_to_foundation'; to: { suit: Suit } };

interface Location {
  column?: number;
  cardIndex?: number;
}
```

---

### Foundations

The four foundation piles, one for each suit.

```typescript
interface Foundations {
  readonly hearts: readonly Card[];
  readonly diamonds: readonly Card[];
  readonly clubs: readonly Card[];
  readonly spades: readonly Card[];
}
```

---

### InitializeOptions

Options for initializing a new game.

```typescript
interface InitializeOptions {
  /** Difficulty level (default: 3) */
  readonly difficulty?: Difficulty;
  
  /** Custom deck to use instead of generating one */
  readonly customDeck?: readonly Card[];
  
  /** Random seed for reproducible games */
  readonly seed?: number;
}

type Difficulty = 1 | 2 | 3 | 4 | 5;
```

---

## Utility Functions

### Card Utilities

#### createCard

```typescript
createCard(suit: Suit, rank: Rank, faceUp?: boolean): Card
```

Creates a new card with a unique ID.

**Parameters:**
- `suit: Suit` - Card suit
- `rank: Rank` - Card rank
- `faceUp?: boolean` - Face-up state (default: `false`)

**Returns:** `Card`

**Example:**
```typescript
const aceOfHearts = createCard('hearts', 'A', true);
const kingOfSpades = createCard('spades', 'K'); // Face down
```

---

#### flipCard

```typescript
flipCard(card: Card): Card
```

Returns a new card with flipped face-up state.

**Parameters:**
- `card: Card` - Card to flip

**Returns:** `Card` - New card with opposite `faceUp` value

**Example:**
```typescript
const faceDown = createCard('hearts', 'A', false);
const faceUp = flipCard(faceDown); // faceUp: true
const faceDownAgain = flipCard(faceUp); // faceUp: false
```

---

#### isRed / isRedCard

```typescript
isRed(card: Card): boolean
isRedCard(card: Card): boolean
```

Checks if a card is red (hearts or diamonds).

**Parameters:**
- `card: Card` - Card to check

**Returns:** `boolean`

**Example:**
```typescript
const card = createCard('hearts', 'A');
console.log(isRed(card)); // true
```

---

#### isBlack / isBlackCard

```typescript
isBlack(card: Card): boolean
isBlackCard(card: Card): boolean
```

Checks if a card is black (clubs or spades).

**Parameters:**
- `card: Card` - Card to check

**Returns:** `boolean`

**Example:**
```typescript
const card = createCard('spades', 'K');
console.log(isBlack(card)); // true
```

---

#### getColor / getCardColor

```typescript
getColor(card: Card): 'red' | 'black'
getCardColor(card: Card): 'red' | 'black'
```

Gets the color of a card.

**Parameters:**
- `card: Card` - Card to check

**Returns:** `'red' | 'black'`

**Example:**
```typescript
const red = getColor(createCard('diamonds', 'Q')); // 'red'
const black = getColor(createCard('clubs', '7')); // 'black'
```

---

#### getRankValue

```typescript
getRankValue(rank: Rank): number
```

Gets the numeric value of a rank.

**Parameters:**
- `rank: Rank` - Card rank

**Returns:** `number` - Value (1-13)

**Example:**
```typescript
getRankValue('A');  // 1
getRankValue('5');  // 5
getRankValue('J');  // 11
getRankValue('Q');  // 12
getRankValue('K');  // 13
```

---

#### compareRanks

```typescript
compareRanks(rank1: Rank, rank2: Rank): number
```

Compares two ranks.

**Parameters:**
- `rank1: Rank` - First rank
- `rank2: Rank` - Second rank

**Returns:** `number`
- Negative if rank1 < rank2
- Zero if rank1 === rank2
- Positive if rank1 > rank2

**Example:**
```typescript
compareRanks('A', 'K');  // -12 (A < K)
compareRanks('Q', 'Q');  // 0 (equal)
compareRanks('K', 'A');  // 12 (K > A)
```

---

#### areOppositeColors

```typescript
areOppositeColors(card1: Card, card2: Card): boolean
```

Checks if two cards have opposite colors.

**Parameters:**
- `card1: Card` - First card
- `card2: Card` - Second card

**Returns:** `boolean`

**Example:**
```typescript
const red = createCard('hearts', 'A');
const black = createCard('spades', 'K');
console.log(areOppositeColors(red, black)); // true
console.log(areOppositeColors(red, red)); // false
```

---

### Deck Utilities

#### createDeck

```typescript
createDeck(faceUp?: boolean): Card[]
```

Creates a standard 52-card deck.

**Parameters:**
- `faceUp?: boolean` - Initial face-up state for all cards (default: `false`)

**Returns:** `Card[]` - Array of 52 cards

**Example:**
```typescript
const deck = createDeck(); // All face down
const faceUpDeck = createDeck(true); // All face up
```

---

#### shuffleDeck

```typescript
shuffleDeck(deck: readonly Card[], seed?: number): Card[]
```

Shuffles a deck using Fisher-Yates algorithm.

**Parameters:**
- `deck: readonly Card[]` - Deck to shuffle
- `seed?: number` - Optional seed for reproducible shuffles

**Returns:** `Card[]` - New shuffled deck

**Example:**
```typescript
const deck = createDeck();
const shuffled = shuffleDeck(deck);

// Reproducible shuffle
const shuffled1 = shuffleDeck(deck, 12345);
const shuffled2 = shuffleDeck(deck, 12345);
// shuffled1 and shuffled2 are identical
```

---

#### arrangeDeckByDifficulty

```typescript
arrangeDeckByDifficulty(difficulty: Difficulty, seed?: number): Card[]
```

Arranges a deck based on difficulty level.

**Parameters:**
- `difficulty: Difficulty` - Difficulty level (1-5)
- `seed?: number` - Optional seed for reproducibility

**Returns:** `Card[]` - Arranged deck

**Difficulty Levels:**
1. **Very Easy** - Mostly ordered, few shuffles
2. **Easy** - Partially ordered
3. **Medium** - Balanced mix
4. **Hard** - More randomized
5. **Very Hard** - Fully randomized

**Example:**
```typescript
const easyDeck = arrangeDeckByDifficulty(1);
const hardDeck = arrangeDeckByDifficulty(5, 123);
```

---

### Validation Utilities

#### countCards

```typescript
countCards(state: GameState): number
```

Counts total cards in a game state.

**Parameters:**
- `state: GameState` - Game state to count

**Returns:** `number` - Total card count (should be 52)

**Example:**
```typescript
const count = countCards(state);
if (count !== 52) {
  console.error(`Invalid state: ${count} cards (expected 52)`);
}
```

---

#### validateGameState

```typescript
validateGameState(state: GameState): void
```

Validates a game state and throws on errors.

**Parameters:**
- `state: GameState` - State to validate

**Throws:** `Error` with descriptive message

**Validation Checks:**
1. Exactly 52 cards total
2. No duplicate card IDs
3. All cards valid (suit/rank combinations)
4. Foundation piles sequential (A, 2, 3, ...)
5. Tableau face-up cards come after face-down

**Example:**
```typescript
try {
  validateGameState(state);
  console.log('State is valid');
} catch (error) {
  console.error('Invalid state:', error.message);
}
```

---

#### isValidGameState

```typescript
isValidGameState(state: GameState): boolean
```

Checks if a game state is valid (boolean).

**Parameters:**
- `state: GameState` - State to check

**Returns:** `boolean` - `true` if valid

**Example:**
```typescript
if (!isValidGameState(state)) {
  console.error('State validation failed');
  return;
}
```

---

### Hash Utilities

#### hashGameState

```typescript
hashGameState(state: GameState): string
```

Generates a hash of the game state using FNV-1a algorithm.

**Parameters:**
- `state: GameState` - State to hash

**Returns:** `string` - Hash string

**Example:**
```typescript
const hash1 = hashGameState(state1);
const hash2 = hashGameState(state2);

if (hash1 === hash2) {
  console.log('States are likely identical');
}
```

**Performance:**
- Fast: <1ms for typical state
- Collision rate: <0.1% for 10k states

---

#### areStatesEqual

```typescript
areStatesEqual(state1: GameState, state2: GameState): boolean
```

Checks if two states are equal using hash comparison.

**Parameters:**
- `state1: GameState` - First state
- `state2: GameState` - Second state

**Returns:** `boolean` - `true` if states are equal

**Example:**
```typescript
if (areStatesEqual(currentState, previousState)) {
  console.log('No change in state');
}
```

---

## Rule Modules

### Tableau Rules

#### canMoveToTableau

```typescript
canMoveToTableau(card: Card, targetColumn: readonly Card[]): boolean
```

Checks if a card can be moved to a tableau column.

**Rules:**
- Empty column: Only Kings allowed
- Non-empty: Opposite color, one rank lower

**Parameters:**
- `card: Card` - Card to move
- `targetColumn: readonly Card[]` - Target column

**Returns:** `boolean`

**Example:**
```typescript
const redSeven = createCard('hearts', '7', true);
const blackEight = createCard('spades', '8', true);

// Can place red 7 on black 8
const canMove = canMoveToTableau(redSeven, [blackEight]);
console.log(canMove); // true
```

---

#### canMoveSequence

```typescript
canMoveSequence(cards: readonly Card[], targetColumn: readonly Card[]): boolean
```

Checks if a card sequence can be moved to a tableau column.

**Parameters:**
- `cards: readonly Card[]` - Cards to move (in order)
- `targetColumn: readonly Card[]` - Target column

**Returns:** `boolean`

**Example:**
```typescript
const sequence = [
  createCard('hearts', '7', true),
  createCard('spades', '6', true),
  createCard('hearts', '5', true),
];

const canMove = canMoveSequence(sequence, [blackEight]);
```

---

#### getValidTableauDestinations

```typescript
getValidTableauDestinations(
  card: Card, 
  tableau: readonly (readonly Card[])[], 
  sourceColumn?: number
): number[]
```

Gets all valid tableau destinations for a card.

**Parameters:**
- `card: Card` - Card to move
- `tableau: readonly Card[][]` - All tableau columns
- `sourceColumn?: number` - Source column to exclude

**Returns:** `number[]` - Array of valid column indices

**Example:**
```typescript
const king = createCard('hearts', 'K', true);
const destinations = getValidTableauDestinations(king, tableau);

console.log(`King can move to columns: ${destinations.join(', ')}`);
```

---

### Foundation Rules

#### canMoveToFoundation

```typescript
canMoveToFoundation(card: Card, foundationPile: readonly Card[]): boolean
```

Checks if a card can be moved to a foundation pile.

**Rules:**
- Empty pile: Only Aces allowed
- Non-empty: Same suit, one rank higher

**Parameters:**
- `card: Card` - Card to move
- `foundationPile: readonly Card[]` - Foundation pile

**Returns:** `boolean`

**Example:**
```typescript
const ace = createCard('hearts', 'A', true);
const two = createCard('hearts', '2', true);

// Ace to empty foundation
console.log(canMoveToFoundation(ace, [])); // true

// Two on Ace
console.log(canMoveToFoundation(two, [ace])); // true
```

---

#### getNextFoundationRank

```typescript
getNextFoundationRank(foundationPile: readonly Card[]): Rank | null
```

Gets the next expected rank for a foundation pile.

**Parameters:**
- `foundationPile: readonly Card[]` - Foundation pile

**Returns:** `Rank | null` - Next rank, or `null` if complete (has King)

**Example:**
```typescript
const pile = [
  createCard('hearts', 'A'),
  createCard('hearts', '2'),
  createCard('hearts', '3'),
];

const nextRank = getNextFoundationRank(pile);
console.log(nextRank); // '4'
```

---

#### hasValidFoundationDestination

```typescript
hasValidFoundationDestination(card: Card, foundations: Foundations): boolean
```

Checks if a card has any valid foundation destination.

**Parameters:**
- `card: Card` - Card to check
- `foundations: Foundations` - All foundation piles

**Returns:** `boolean`

**Example:**
```typescript
const ace = createCard('hearts', 'A', true);

if (hasValidFoundationDestination(ace, foundations)) {
  console.log('Can move to foundation');
}
```

---

### Stock Rules

#### canDraw

```typescript
canDraw(state: GameState): boolean
```

Checks if a card can be drawn from stock.

**Parameters:**
- `state: GameState` - Current game state

**Returns:** `boolean` - `true` if draw pile is not empty

**Example:**
```typescript
if (canDraw(state)) {
  state = draw(state);
}
```

---

#### draw

```typescript
draw(state: GameState): GameState
```

Draws one card from stock to waste.

**Parameters:**
- `state: GameState` - Current game state

**Returns:** `GameState` - New state after drawing

**Throws:** `Error` if draw pile is empty

**Example:**
```typescript
if (canDraw(state)) {
  const newState = draw(state);
  console.log('Drew a card');
}
```

---

#### canRecycle

```typescript
canRecycle(state: GameState): boolean
```

Checks if waste pile can be recycled to stock.

**Parameters:**
- `state: GameState` - Current game state

**Returns:** `boolean` - `true` if draw pile is empty and waste has cards

**Example:**
```typescript
if (canRecycle(state)) {
  state = recycle(state);
}
```

---

#### recycle

```typescript
recycle(state: GameState): GameState
```

Moves all waste cards back to stock (reversed, face-down).

**Parameters:**
- `state: GameState` - Current game state

**Returns:** `GameState` - New state after recycling

**Throws:** `Error` if recycling is not allowed

**Example:**
```typescript
if (canRecycle(state)) {
  const newState = recycle(state);
  console.log('Recycled waste to stock');
}
```

---

## Scoring Functions

### getCompletionProgress

```typescript
getCompletionProgress(state: GameState): number
```

Calculates completion progress as a percentage.

**Parameters:**
- `state: GameState` - Game state to analyze

**Returns:** `number` - Progress (0-100)

**Formula:**
```
progress = (cards_in_foundations / 52) * 100
```

**Example:**
```typescript
const progress = getCompletionProgress(state);
console.log(`${progress.toFixed(1)}% complete`);
```

---

### getPerceivedDifficulty

```typescript
getPerceivedDifficulty(state: GameState): number
```

Calculates perceived difficulty based on board analysis.

**Parameters:**
- `state: GameState` - Game state to analyze

**Returns:** `number` - Difficulty score (0-100)

**Factors:**
- Hidden cards: +2 points each
- Buried Kings: +5 points each
- Empty columns: -3 points each
- Discard pile: +0.5 points per card
- Foundation cards: -1 point each

**Example:**
```typescript
const difficulty = getPerceivedDifficulty(state);

if (difficulty > 70) {
  console.log('⚠️ Very difficult!');
}
```

---

## Error Handling

All functions that modify state or validate data may throw errors:

### Common Error Messages

**GameEngine.applyMove:**
- `"Cannot draw: draw pile is empty"`
- `"Cannot recycle: draw pile is not empty or discard pile is empty"`
- `"Invalid move command"`

**GameEngine.importState:**
- `"Invalid JSON: <parsing error>"`
- `"Game state must have exactly 52 cards, found X"`
- `"Duplicate card ID: <id>"`
- `"Foundation sequence is invalid"`
- `"Tableau column has face-down card after face-up cards"`

**Example Error Handling:**
```typescript
try {
  const state = engine.applyMove(currentState, move);
} catch (error) {
  if (error.message.includes('Cannot draw')) {
    console.log('No cards left to draw');
  } else {
    console.error('Move failed:', error.message);
  }
}
```

---

## Performance Characteristics

### Time Complexity

| Function | Complexity | Typical Time |
|----------|-----------|--------------|
| `initialize()` | O(n) | <5ms |
| `applyMove()` | O(n) | <1ms |
| `getLegalMoves()` | O(n) | <10ms |
| `isWon()` | O(1) | <0.1ms |
| `isLost()` | O(n) | <10ms |
| `getCompletionProgress()` | O(1) | <0.1ms |
| `getPerceivedDifficulty()` | O(n) | <1ms |
| `exportState()` | O(n) | <5ms |
| `importState()` | O(n) | <10ms |
| `hashGameState()` | O(n) | <1ms |

Where `n` = number of cards (~52)

### Memory Usage

- GameState: ~5-10 KB
- Move list: ~1-2 KB per move
- Hash string: ~10 bytes

All operations use structural sharing for efficiency.

---

## Version History

See [CHANGELOG.md](CHANGELOG.md) for detailed release notes.

---

## Additional Resources

- [README.md](README.md) - Quick start and examples
- [CHANGELOG.md](CHANGELOG.md) - Version history
- [GitHub Repository](https://github.com/chayuto/Solitaire) - Source code
- [npm Package](https://www.npmjs.com/package/@chayuto/solitaire-core) - Package page

---

*This documentation is for `@chayuto/solitaire-core` version 0.1.0*
