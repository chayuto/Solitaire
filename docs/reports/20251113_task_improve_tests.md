# Task: Improve Test Coverage

**Date**: 2025-11-13  
**Difficulty**: Medium  
**Estimated Time**: 4-6 hours  
**Priority**: Medium  
**Type**: Quality Improvement

## Objective

Expand test coverage to include more components, edge cases, and integration tests.

## Current State

- 2 test files with 9 passing tests
- Basic store and App component tests
- No component-specific tests
- No integration tests
- No E2E tests

## Requirements

### Functional Requirements

1. **Unit Tests** (80%+ coverage):
   - All store functions
   - All utility functions
   - Card logic
   - Move validation
   - Win detection

2. **Component Tests**:
   - Card component
   - GameBoard component
   - ControlPanel component
   - All pile components
   - Modals

3. **Integration Tests**:
   - Complete game flow
   - Save/load functionality
   - Undo/redo sequences
   - Win scenario

4. **Edge Cases**:
   - Empty piles
   - Invalid moves
   - Boundary conditions
   - Error handling

### Technical Requirements

1. Use Vitest + React Testing Library
2. Mock external dependencies
3. Use test utilities for common setups
4. Add coverage reporting
5. Add visual regression tests (optional)

## Implementation Steps

### 1. Expand Store Tests

**Update gameStore.test.ts**:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from './gameStore';

describe('GameStore - Detailed Tests', () => {
  beforeEach(() => {
    const store = useGameStore.getState();
    store.initializeGame();
  });

  describe('Game Initialization', () => {
    it('should initialize with 52 cards total', () => {
      const state = useGameStore.getState();
      const totalCards = 
        state.drawPile.length +
        state.discardPile.length +
        state.tableau.flat().length +
        Object.values(state.foundations).flat().length;
      
      expect(totalCards).toBe(52);
    });

    it('should have 7 tableau columns', () => {
      const state = useGameStore.getState();
      expect(state.tableau).toHaveLength(7);
    });

    it('should have correct number of cards per column', () => {
      const state = useGameStore.getState();
      state.tableau.forEach((column, index) => {
        expect(column.length).toBe(index + 1);
      });
    });

    it('should have last card face-up in each column', () => {
      const state = useGameStore.getState();
      state.tableau.forEach(column => {
        if (column.length > 0) {
          expect(column[column.length - 1].faceUp).toBe(true);
        }
      });
    });
  });

  describe('Card Movement', () => {
    it('should move valid card to foundation', () => {
      const store = useGameStore.getState();
      // Setup: Place Ace in discard pile
      store.discardPile = [{ suit: 'hearts', rank: 'A', faceUp: true, id: 'hearts-A' }];
      
      store.selectCard('discard');
      store.moveCardToFoundation('hearts');
      
      expect(store.foundations.hearts).toHaveLength(1);
      expect(store.foundations.hearts[0].rank).toBe('A');
    });

    it('should not move invalid card to foundation', () => {
      const store = useGameStore.getState();
      store.discardPile = [{ suit: 'hearts', rank: '5', faceUp: true, id: 'hearts-5' }];
      
      store.selectCard('discard');
      const result = store.canMoveToFoundation(store.discardPile[0], 'hearts');
      
      expect(result).toBe(false);
    });

    it('should move King to empty tableau column', () => {
      const store = useGameStore.getState();
      // Setup
      store.tableau[0] = [];
      store.discardPile = [{ suit: 'hearts', rank: 'K', faceUp: true, id: 'hearts-K' }];
      
      store.selectCard('discard');
      store.moveCardToTableau(0);
      
      expect(store.tableau[0]).toHaveLength(1);
      expect(store.tableau[0][0].rank).toBe('K');
    });

    it('should move card in descending order with alternating colors', () => {
      const store = useGameStore.getState();
      // Setup: Red 6 on top of tableau column
      store.tableau[0] = [{ suit: 'hearts', rank: '6', faceUp: true, id: 'hearts-6' }];
      store.discardPile = [{ suit: 'spades', rank: '5', faceUp: true, id: 'spades-5' }];
      
      store.selectCard('discard');
      const canMove = store.canMoveToTableau(store.discardPile[0], 0);
      
      expect(canMove).toBe(true);
    });
  });

  describe('Draw Pile', () => {
    it('should draw card from draw pile', () => {
      const store = useGameStore.getState();
      const initialDrawSize = store.drawPile.length;
      
      store.drawCard();
      
      expect(store.drawPile.length).toBe(initialDrawSize - 1);
      expect(store.discardPile.length).toBeGreaterThan(0);
    });

    it('should recycle discard pile when draw pile empty', () => {
      const store = useGameStore.getState();
      store.drawPile = [];
      store.discardPile = [
        { suit: 'hearts', rank: 'A', faceUp: true, id: 'hearts-A' },
        { suit: 'spades', rank: '2', faceUp: true, id: 'spades-2' },
      ];
      
      store.drawCard();
      
      expect(store.drawPile.length).toBe(1);
      expect(store.discardPile.length).toBe(1);
    });
  });

  describe('Win Detection', () => {
    it('should detect win when all foundations complete', () => {
      const store = useGameStore.getState();
      // Setup: Fill all foundations
      const ranks: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
      
      (['hearts', 'diamonds', 'clubs', 'spades'] as Suit[]).forEach(suit => {
        store.foundations[suit] = ranks.map(rank => ({
          suit,
          rank,
          faceUp: true,
          id: `${suit}-${rank}`,
        }));
      });
      
      const isWon = store.checkWinCondition();
      expect(isWon).toBe(true);
    });

    it('should not detect win when foundations incomplete', () => {
      const store = useGameStore.getState();
      const isWon = store.checkWinCondition();
      expect(isWon).toBe(false);
    });
  });

  describe('Save/Load', () => {
    it('should export game state as JSON', () => {
      const store = useGameStore.getState();
      const exported = store.exportGameState();
      
      expect(() => JSON.parse(exported)).not.toThrow();
    });

    it('should import valid game state', () => {
      const store = useGameStore.getState();
      const exported = store.exportGameState();
      
      store.initializeGame(); // Reset
      const result = store.importGameState(exported);
      
      expect(result).toBe(true);
    });

    it('should reject invalid game state', () => {
      const store = useGameStore.getState();
      const result = store.importGameState('invalid json');
      
      expect(result).toBe(false);
    });
  });
});
```

### 2. Create Component Tests

**Create Card.test.tsx**:
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Card from './Card';

describe('Card Component', () => {
  const mockCard = {
    suit: 'hearts' as const,
    rank: 'K' as const,
    faceUp: true,
    id: 'hearts-K',
  };

  it('should render face-up card', () => {
    render(<Card card={mockCard} />);
    expect(screen.getByText('K')).toBeInTheDocument();
  });

  it('should render face-down card', () => {
    const faceDownCard = { ...mockCard, faceUp: false };
    render(<Card card={faceDownCard} />);
    expect(screen.queryByText('K')).not.toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Card card={mockCard} onClick={handleClick} />);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should display red suit in red color', () => {
    render(<Card card={mockCard} />);
    const card = screen.getByRole('button');
    // Check for red color class or style
    expect(card.className).toMatch(/red|hearts|diamonds/);
  });

  it('should display black suit in black color', () => {
    const blackCard = { ...mockCard, suit: 'spades' as const };
    render(<Card card={blackCard} />);
    const card = screen.getByRole('button');
    expect(card.className).toMatch(/black|spades|clubs/);
  });
});
```

**Create ControlPanel.test.tsx**:
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ControlPanel from './ControlPanel';

describe('ControlPanel Component', () => {
  it('should render all control buttons', () => {
    render(<ControlPanel />);
    
    expect(screen.getByText(/new game/i)).toBeInTheDocument();
    expect(screen.getByText(/save/i)).toBeInTheDocument();
    expect(screen.getByText(/load/i)).toBeInTheDocument();
  });

  it('should trigger new game on button click', () => {
    render(<ControlPanel />);
    const newGameButton = screen.getByText(/new game/i);
    
    fireEvent.click(newGameButton);
    // Verify game was reset (depends on implementation)
  });

  it('should open save dialog', () => {
    render(<ControlPanel />);
    const saveButton = screen.getByText(/save/i);
    
    fireEvent.click(saveButton);
    // Check for save modal or download
  });
});
```

### 3. Create Integration Tests

**Create integration.test.tsx**:
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../App';

describe('Game Integration Tests', () => {
  it('should complete a full game flow', () => {
    render(<App />);
    
    // Game should initialize
    expect(screen.getByText('Solitaire')).toBeInTheDocument();
    
    // Should be able to interact with game
    const drawPile = screen.getByLabelText(/draw pile/i);
    fireEvent.click(drawPile);
    
    // Verify discard pile updated
    // ... more assertions
  });

  it('should save and load game correctly', () => {
    render(<App />);
    
    // Make some moves
    // ...
    
    // Save game
    const saveButton = screen.getByText(/save/i);
    fireEvent.click(saveButton);
    
    // Start new game
    const newGameButton = screen.getByText(/new game/i);
    fireEvent.click(newGameButton);
    
    // Load saved game
    const loadButton = screen.getByText(/load/i);
    fireEvent.click(loadButton);
    
    // Verify game state restored
    // ...
  });
});
```

### 4. Add Test Utilities

**Create test/testUtils.tsx**:
```typescript
import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';

// Setup game state for testing
export const setupTestGame = () => {
  // Initialize game in known state
  // Return helpful utilities
};

// Create a card for testing
export const createTestCard = (suit: Suit, rank: Rank, faceUp = true) => ({
  suit,
  rank,
  faceUp,
  id: `${suit}-${rank}`,
});

// Custom render with providers
export const renderWithProviders = (
  ui: ReactElement,
  options?: RenderOptions
) => {
  return render(ui, { ...options });
};
```

### 5. Add Coverage Scripts

**Update package.json**:
```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui"
  }
}
```

### 6. Configure Coverage Thresholds

**Update vite.config.ts**:
```typescript
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.test.{ts,tsx}',
        '**/*.config.{ts,js}',
      ],
    },
  },
});
```

## Testing Requirements

1. All new tests pass
2. Coverage meets thresholds (80%+)
3. Tests run quickly (<10s)
4. No flaky tests
5. Tests are maintainable
6. Good test names and descriptions

## Acceptance Criteria

- [ ] 80%+ code coverage
- [ ] All components have tests
- [ ] All store functions tested
- [ ] Integration tests pass
- [ ] Edge cases covered
- [ ] Fast test execution
- [ ] Clear test output
- [ ] CI/CD integration ready

## Files to Create

- `src/components/Card.test.tsx`
- `src/components/ControlPanel.test.tsx`
- `src/components/GameBoard.test.tsx`
- `src/test/integration.test.tsx`
- `src/test/testUtils.tsx`

## Files to Modify

- `src/store/gameStore.test.ts` - Expand tests
- `package.json` - Add coverage scripts
- `vite.config.ts` - Configure coverage
- `.github/workflows/ci.yml` - Add coverage reporting

## Dependencies

Already installed:
- `vitest` - Test runner
- `@testing-library/react` - React testing
- `@testing-library/jest-dom` - DOM matchers

Optional:
- `@vitest/coverage-v8` - Coverage provider
- `@testing-library/user-event` - User interactions

## Notes

- Write tests before fixing bugs (TDD)
- Test behavior, not implementation
- Keep tests simple and readable
- Mock external dependencies
- Use descriptive test names
- Group related tests with describe blocks

## Test Categories

1. **Unit Tests**: Individual functions and components
2. **Integration Tests**: Multiple components working together
3. **E2E Tests**: Full user workflows (future consideration)
4. **Snapshot Tests**: UI regression (optional)

## Success Metrics

- High code coverage (80%+)
- Fast test execution
- Catch bugs before production
- Confidence in refactoring
- Good test maintainability
