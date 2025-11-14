# Solitaire - Architecture Documentation

**Version:** 2.0 (Post-Refactoring)  
**Last Updated:** November 14, 2025

## Overview

Solitaire is a modern React single-page application implementing Klondike Solitaire with advanced features including difficulty levels, auto-play, save/load functionality, and comprehensive metrics tracking.

## Technology Stack

### Core Technologies
- **React 19.2** - UI framework with latest features
- **TypeScript 5.9** - Type-safe development with strict mode
- **Zustand 5.0** - Lightweight state management
- **Vite 7.2** - Fast build tool and dev server
- **Tailwind CSS 4.1** - Utility-first styling

### Additional Libraries
- **@dnd-kit/core 6.3** - Drag-and-drop functionality
- **Framer Motion 12.23** - Smooth animations
- **Vitest 4.0** - Fast unit testing
- **React Testing Library 16.3** - Component testing

## Architecture Principles

### 1. Modular Design
- **Separation of Concerns**: Logic separated into focused modules
- **Single Responsibility**: Each module/component has one clear purpose
- **Loose Coupling**: Modules communicate through well-defined interfaces
- **High Cohesion**: Related functionality grouped together

### 2. Type Safety
- **Strict TypeScript**: All code type-checked with strict mode enabled
- **Type Definitions**: Comprehensive types in `src/types/`
- **Const Assertions**: Used for compile-time type narrowing
- **No Any Types**: Explicit types throughout codebase

### 3. State Management
- **Zustand Store**: Single source of truth for game state
- **Immutable Updates**: State changes create new objects
- **Computed Values**: Derived data calculated from state
- **Action Methods**: All mutations go through store actions

### 4. Testing Strategy
- **Unit Tests**: Individual function testing
- **Integration Tests**: Component interaction testing
- **CI/CD**: Automated testing on every commit
- **100% Critical Path Coverage**: All game logic tested

## Directory Structure

```
src/
├── constants/          # Configuration and constants
│   ├── game.ts         # Card and game constants
│   ├── difficulty.ts   # Difficulty system config
│   └── index.ts        # Barrel export
│
├── store/              # State management
│   ├── helpers/        # Pure helper functions
│   │   ├── deckHelpers.ts       # Deck operations
│   │   ├── cardHelpers.ts       # Card utilities
│   │   ├── validationHelpers.ts # Move validation
│   │   ├── metricsHelpers.ts    # Metrics calculation
│   │   ├── gameStateHelpers.ts  # State utilities
│   │   └── index.ts             # Barrel export
│   │
│   ├── gameStore.ts    # Main Zustand store
│   └── *.test.ts       # Store tests
│
├── components/         # React components
│   ├── Card.tsx               # Card display
│   ├── DrawPile.tsx           # Draw pile
│   ├── DiscardPile.tsx        # Discard pile
│   ├── FoundationPile.tsx     # Foundation pile
│   ├── TableauColumn.tsx      # Tableau column
│   ├── GameBoard.tsx          # Main game layout
│   ├── ControlPanel.tsx       # Game controls
│   ├── ActivityLog.tsx        # Move history log
│   ├── WinModal.tsx           # Win condition modal
│   └── index.ts               # Component exports
│
├── types/              # TypeScript definitions
│   └── index.ts        # All type definitions
│
├── utils/              # Utility functions
│   └── motion.ts       # Motion detection utility
│
├── test/               # Test configuration
│   └── setup.ts        # Vitest setup
│
├── assets/             # Static assets
│   └── react.svg       # React logo
│
├── App.tsx             # Root application component
├── main.tsx            # Application entry point
└── index.css           # Global styles
```

## Module Descriptions

### Constants Module (`src/constants/`)

**Purpose:** Centralized configuration and game constants

**Files:**
- `game.ts` - Card definitions, game dimensions, suit symbols
- `difficulty.ts` - Difficulty level configurations
- `index.ts` - Barrel export for easy imports

**Key Exports:**
```typescript
// From game.ts
export const SUITS, RANKS, RANK_VALUES, SUIT_SYMBOLS
export const DECK_SIZE, TABLEAU_COLUMNS

// From difficulty.ts
export const DIFFICULTY_SHUFFLE_CONFIG, DEFAULT_DIFFICULTY
```

**Usage:**
```typescript
import { SUITS, RANKS, DEFAULT_DIFFICULTY } from '@/constants';
```

### Store Module (`src/store/`)

**Purpose:** Game state management and business logic

#### Main Store (`gameStore.ts`)
- Zustand store definition
- Game state interface
- Action implementations
- State initialization

**Key Responsibilities:**
- Maintain game state
- Handle user actions
- Coordinate helper functions
- Manage save/load functionality
- Auto-play orchestration

#### Helper Modules (`src/store/helpers/`)

**Purpose:** Pure functions for game logic

##### `deckHelpers.ts`
- Card and deck creation
- Shuffle algorithms (Fisher-Yates, partial)
- Difficulty-based deck arrangement

##### `cardHelpers.ts`
- Card property checks (color, rank value)
- Basic placement validation
- Card comparison utilities

##### `validationHelpers.ts`
- Complex move validation
- Valid destination checking
- Game state analysis (win, valid moves, auto-complete)

##### `metricsHelpers.ts`
- Perceived difficulty calculation
- Completion progress tracking
- Multi-factor scoring algorithms

##### `gameStateHelpers.ts`
- State hashing for loop detection
- State snapshot utilities

### Components Module (`src/components/`)

**Purpose:** React UI components

**Component Hierarchy:**
```
App
└── GameBoard
    ├── WinModal
    ├── ActivityLog
    ├── ControlPanel
    ├── DrawPile
    ├── DiscardPile
    ├── FoundationPile (x4)
    └── TableauColumn (x7)
        └── Card (multiple)
```

**Component Responsibilities:**

- **Card**: Display single card with animations
- **DrawPile**: Draw pile with click handler
- **DiscardPile**: Top discard card display
- **FoundationPile**: Foundation pile for each suit
- **TableauColumn**: Tableau column with drag-drop
- **GameBoard**: Main layout and game area
- **ControlPanel**: Controls, settings, metrics
- **ActivityLog**: Move history display
- **WinModal**: Win condition celebration

### Types Module (`src/types/`)

**Purpose:** TypeScript type definitions

**Key Types:**
```typescript
// Basic types
type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
type Difficulty = 1 | 2 | 3 | 4 | 5;

// Complex types
interface Card { suit, rank, faceUp, id }
interface GameState { drawPile, discardPile, foundations, tableau, ... }
interface Move { type, timestamp, card, from, to }
```

## Data Flow

### 1. User Interaction Flow

```
User Action (e.g., click card)
    ↓
Component Event Handler
    ↓
Zustand Store Action
    ↓
Helper Functions (validation, state update)
    ↓
State Update (immutable)
    ↓
React Re-render
    ↓
Updated UI
```

### 2. Game Initialization Flow

```
initializeGame(difficulty)
    ↓
arrangeDeckByDifficulty() [from helpers]
    ↓
Deal cards to tableau
    ↓
Calculate initial metrics
    ↓
Set initial state
    ↓
Render game board
```

### 3. Move Validation Flow

```
User attempts move
    ↓
selectCard() / moveCardToTableau() / moveCardToFoundation()
    ↓
canMoveToTableau() / canMoveToFoundation() [from helpers]
    ↓
Validation logic [from cardHelpers & validationHelpers]
    ↓
If valid: Update state + record move
    ↓
If invalid: No action
    ↓
Re-render with new state
```

## State Management Details

### Zustand Store Structure

```typescript
interface GameStore extends GameState {
  // State (from GameState)
  drawPile: Card[]
  discardPile: Card[]
  foundations: { hearts, diamonds, clubs, spades }
  tableau: Card[][]
  selectedCard?: SelectedCard
  moveHistory: Move[]
  showValidMoves: boolean
  godMode: boolean
  autoPlayEnabled: boolean
  autoPlayInProgress: boolean
  difficulty: Difficulty
  gameWon: boolean
  perceivedDifficulty?: number
  completionProgress: number
  
  // Actions
  initializeGame(difficulty?)
  setDifficulty(difficulty)
  selectCard(source, columnIndex?, cardIndex?)
  deselectCard()
  moveCardToTableau(targetColumn)
  moveCardToFoundation(suit)
  drawCard()
  toggleValidMoves()
  toggleGodMode()
  toggleAutoPlay()
  performAutoPlayMove()
  checkAndTriggerAutoComplete()
  exportGameState(): string
  importGameState(jsonString): boolean
  
  // Validation helpers (exposed as methods)
  canMoveToTableau(card, targetColumn): boolean
  canMoveToFoundation(card, suit): boolean
  hasValidTableauDestination(card, sourceColumn?): boolean
  hasValidFoundationDestination(card): boolean
  hasAnyValidDestination(card, source, ...): boolean
}
```

### State Update Patterns

**Immutable Updates:**
```typescript
// ✅ Correct: Create new objects
set({ 
  tableau: [...state.tableau.map(col => [...col])],
  moveHistory: [...state.moveHistory, newMove]
});

// ❌ Wrong: Mutate existing objects
state.tableau[0].push(card);
```

**Computed Values:**
```typescript
// Recalculated on each state change
completionProgress: calculateCompletionProgress(state)
perceivedDifficulty: calculatePerceivedDifficulty(initialBoardSetup)
```

## Design Patterns

### 1. Helper Pattern
Pure functions extracted from store for:
- Testability
- Reusability
- Clarity
- Maintainability

### 2. Barrel Exports
Index files in modules for:
- Clean imports
- Centralized exports
- Easy refactoring

### 3. Custom Hooks
Using Zustand selectors:
```typescript
const moveCount = useGameStore(state => state.moveHistory.length);
```

### 4. Separation of Concerns
- **Constants**: Configuration
- **Helpers**: Business logic
- **Store**: State management
- **Components**: UI rendering

## Testing Strategy

### Unit Tests
- Helper functions in isolation
- Validation logic
- State calculations

### Integration Tests
- Component + store interactions
- Game flow scenarios
- Move sequences

### Test Organization
```
src/store/
├── gameStore.test.ts           # Core game logic
├── gameStore.metrics.test.ts   # Metrics calculations
└── gameStore.winCondition.test.ts  # Win detection

src/components/
└── ControlPanel.test.tsx       # UI controls

src/
└── App.test.tsx                # App rendering
```

## Performance Considerations

### Optimization Strategies
1. **Memoization**: Use React.memo for expensive components
2. **Selectors**: Use Zustand selectors to prevent unnecessary re-renders
3. **Lazy Loading**: Code split non-critical features
4. **Motion Detection**: Disable animations for reduced motion preference

### Bundle Size
- Total: ~344 KB (gzipped: ~108 KB)
- Framework overhead: React + Zustand
- Game logic: ~50 KB
- UI components: ~150 KB
- Dependencies: ~144 KB

## Accessibility

### Features
- **Keyboard Navigation**: Full keyboard support planned
- **Reduced Motion**: Respects `prefers-reduced-motion`
- **Color Contrast**: WCAG AA compliant
- **Screen Reader**: Semantic HTML structure

## Future Architecture Considerations

### Potential Improvements
1. **Module Federation**: For larger feature sets
2. **Web Workers**: For heavy computations (AI solver)
3. **Service Worker**: For offline play
4. **State Persistence**: LocalStorage integration
5. **Multiplayer**: WebSocket support
6. **Themes**: Dynamic theme system
7. **i18n**: Internationalization support

### Scalability
- Current architecture supports up to ~5,000 LOC comfortably
- Beyond that, consider:
  - Feature-based directory structure
  - Micro-frontend architecture
  - Monorepo with multiple packages

## Conventions

### Naming
- **Components**: PascalCase (e.g., `GameBoard.tsx`)
- **Utilities**: camelCase (e.g., `deckHelpers.ts`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `DECK_SIZE`)
- **Types**: PascalCase (e.g., `GameState`)

### File Structure
- Co-locate tests with source files
- Use index.ts for barrel exports
- Keep files under 300 lines
- One component per file

### Import Order
1. React imports
2. External libraries
3. Internal modules
4. Types
5. Styles

## Documentation Standards

### JSDoc Comments
All public functions should have:
- Purpose description
- Parameter descriptions
- Return value description
- Usage examples (for complex functions)

### README Files
- Root README: Getting started, features
- Module READMEs: Architecture details
- Component READMEs: Usage examples

---

**Maintained by:** Solo Developer  
**Last Review:** November 14, 2025  
**Next Review:** When adding major features
