# Accessibility & Internationalization Recommendations

**Date:** December 27, 2025  
**Status:** 📋 Recommendations for AI Coding Agents  
**Priority:** 🟡 Medium

---

## Executive Summary

This document provides recommendations for improving accessibility (a11y) and internationalization (i18n) in the Solitaire application.

---

## Current State Analysis

### Strengths ✅
1. **Reduced motion support** implemented via `shouldReduceMotion()` utility
2. **Semantic HTML** generally used
3. **Color contrast** reasonable on green background
4. **No time limits** that could affect users
5. **Visual indicators** for selected/valid cards

### Areas for Improvement 🔧
1. **No keyboard navigation** for card selection/movement
2. **Missing ARIA labels** on interactive elements
3. **No screen reader announcements** for game events
4. **Missing focus management**
5. **No skip links** for navigation
6. **No language/locale support**
7. **Color-only indicators** for suit (red/black)

---

## Accessibility Recommendations

### 1. Add Keyboard Navigation

**Priority:** 🔴 High  
**Effort:** 6-8 hours  
**Impact:** Critical for accessibility

**Recommendation:**
```typescript
// packages/app/src/hooks/useKeyboardNavigation.ts
import { useCallback, useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';

interface FocusPosition {
  zone: 'draw' | 'discard' | 'foundation' | 'tableau';
  column?: number;
  cardIndex?: number;
}

export function useKeyboardNavigation() {
  const [focus, setFocus] = useState<FocusPosition>({ zone: 'tableau', column: 0, cardIndex: 0 });
  const store = useGameStore();
  
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        moveFocusLeft();
        break;
      case 'ArrowRight':
        event.preventDefault();
        moveFocusRight();
        break;
      case 'ArrowUp':
        event.preventDefault();
        moveFocusUp();
        break;
      case 'ArrowDown':
        event.preventDefault();
        moveFocusDown();
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        selectOrMoveFocusedCard();
        break;
      case 'Escape':
        event.preventDefault();
        store.deselectCard();
        break;
      case 'd':
        event.preventDefault();
        store.drawCard();
        break;
    }
  }, [focus, store]);
  
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
  
  const moveFocusLeft = () => {
    setFocus(prev => {
      if (prev.zone === 'tableau' && prev.column !== undefined) {
        return { ...prev, column: Math.max(0, prev.column - 1) };
      }
      if (prev.zone === 'foundation') {
        return { zone: 'discard' };
      }
      return prev;
    });
  };
  
  const moveFocusRight = () => {
    setFocus(prev => {
      if (prev.zone === 'tableau' && prev.column !== undefined) {
        return { ...prev, column: Math.min(6, prev.column + 1) };
      }
      if (prev.zone === 'discard') {
        return { zone: 'foundation', column: 0 };
      }
      return prev;
    });
  };
  
  const moveFocusUp = () => {
    setFocus(prev => {
      if (prev.zone === 'tableau') {
        return { zone: 'draw' };
      }
      if (prev.cardIndex !== undefined && prev.cardIndex > 0) {
        return { ...prev, cardIndex: prev.cardIndex - 1 };
      }
      return prev;
    });
  };
  
  const moveFocusDown = () => {
    setFocus(prev => {
      if (prev.zone === 'draw' || prev.zone === 'discard' || prev.zone === 'foundation') {
        return { zone: 'tableau', column: prev.column || 0, cardIndex: 0 };
      }
      return prev;
    });
  };
  
  const selectOrMoveFocusedCard = () => {
    if (focus.zone === 'draw') {
      store.drawCard();
    } else if (focus.zone === 'tableau' && focus.column !== undefined) {
      const column = store.tableau[focus.column];
      const cardIndex = focus.cardIndex ?? column.length - 1;
      const card = column[cardIndex];
      
      if (card?.faceUp) {
        if (store.selectedCard) {
          // Try to move to this column
          store.moveCardToTableau(focus.column);
        } else {
          // Select this card
          store.selectCard('tableau', focus.column, cardIndex);
        }
      }
    }
  };
  
  return { focus, setFocus };
}
```

**Key bindings documentation:**
```typescript
// packages/app/src/constants/keyboard.ts
export const KEYBOARD_SHORTCUTS = {
  navigation: {
    '←': 'Move focus left',
    '→': 'Move focus right',
    '↑': 'Move focus up / to top row',
    '↓': 'Move focus down / to tableau',
  },
  actions: {
    'Enter/Space': 'Select or move card',
    'Escape': 'Deselect current card',
    'D': 'Draw card from pile',
    'A': 'Toggle auto-play',
    'N': 'New game',
  },
  foundations: {
    '1-4': 'Move selected card to foundation (Hearts, Diamonds, Clubs, Spades)',
  },
} as const;
```

---

### 2. Add ARIA Labels and Roles

**Priority:** 🔴 High  
**Effort:** 2-3 hours  
**Impact:** Screen reader support

**Recommendation:**
```typescript
// packages/app/src/components/Card.tsx
const Card: React.FC<CardProps> = ({ card, isSelected, isValidTarget, onClick }) => {
  const cardLabel = card.faceUp 
    ? `${card.rank} of ${card.suit}` 
    : 'Face down card';
  
  const stateLabel = [
    isSelected && 'selected',
    isValidTarget && 'valid move target',
  ].filter(Boolean).join(', ');
  
  return (
    <button
      role="button"
      aria-label={`${cardLabel}${stateLabel ? `, ${stateLabel}` : ''}`}
      aria-pressed={isSelected}
      aria-disabled={!card.faceUp}
      className={/* styles */}
      onClick={onClick}
      tabIndex={card.faceUp ? 0 : -1}
    >
      {/* Card content */}
    </button>
  );
};
```

```typescript
// packages/app/src/components/FoundationPile.tsx
const FoundationPile: React.FC<FoundationPileProps> = ({ suit }) => {
  const pile = useGameStore(state => state.foundations[suit]);
  const topCard = pile[pile.length - 1];
  
  return (
    <div
      role="region"
      aria-label={`${suit} foundation pile, ${pile.length} cards`}
    >
      <div
        role="button"
        aria-label={topCard 
          ? `${topCard.rank} of ${suit}, click to move card here` 
          : `Empty ${suit} foundation, accepts Ace`
        }
        aria-dropeffect="move"
      >
        {/* Pile content */}
      </div>
    </div>
  );
};
```

```typescript
// packages/app/src/components/TableauColumn.tsx
const TableauColumn: React.FC<TableauColumnProps> = ({ columnIndex }) => {
  const column = useGameStore(state => state.tableau[columnIndex]);
  
  return (
    <div
      role="list"
      aria-label={`Tableau column ${columnIndex + 1}, ${column.length} cards`}
    >
      {column.map((card, index) => (
        <div
          key={card.id}
          role="listitem"
          aria-posinset={index + 1}
          aria-setsize={column.length}
        >
          <Card card={card} />
        </div>
      ))}
    </div>
  );
};
```

---

### 3. Add Screen Reader Announcements

**Priority:** 🟡 Medium  
**Effort:** 2-3 hours  
**Impact:** Game event accessibility

**Recommendation:**
```typescript
// packages/app/src/components/LiveRegion.tsx
import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';

export function LiveRegion() {
  const [announcement, setAnnouncement] = useState('');
  
  const gameWon = useGameStore(state => state.gameWon);
  const moveHistory = useGameStore(state => state.moveHistory);
  const autoPlayEnabled = useGameStore(state => state.autoPlayEnabled);
  
  useEffect(() => {
    if (gameWon) {
      setAnnouncement('Congratulations! You won the game!');
    }
  }, [gameWon]);
  
  useEffect(() => {
    const lastMove = moveHistory[moveHistory.length - 1];
    if (lastMove) {
      const message = describeMoveForScreenReader(lastMove);
      setAnnouncement(message);
    }
  }, [moveHistory.length]);
  
  useEffect(() => {
    setAnnouncement(autoPlayEnabled ? 'Auto-play enabled' : 'Auto-play disabled');
  }, [autoPlayEnabled]);
  
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  );
}

function describeMoveForScreenReader(move: Move): string {
  const cardName = `${move.card.rank} of ${move.card.suit}`;
  
  switch (move.type) {
    case 'draw_card':
      return `Drew ${cardName}`;
    case 'tableau_to_tableau':
      return `Moved ${cardName} from column ${move.from?.columnIndex! + 1} to column ${move.to?.columnIndex! + 1}`;
    case 'tableau_to_foundation':
      return `Moved ${cardName} to ${move.to?.suit} foundation`;
    case 'discard_to_tableau':
      return `Moved ${cardName} from discard pile to column ${move.to?.columnIndex! + 1}`;
    case 'discard_to_foundation':
      return `Moved ${cardName} from discard pile to ${move.to?.suit} foundation`;
    case 'flip_card':
      return `Revealed ${cardName}`;
    default:
      return '';
  }
}
```

**Add to App:**
```typescript
// packages/app/src/App.tsx
import { LiveRegion } from './components/LiveRegion';

function App() {
  return (
    <>
      <LiveRegion />
      <GameBoard />
    </>
  );
}
```

---

### 4. Add Focus Management

**Priority:** 🟡 Medium  
**Effort:** 2-3 hours  
**Impact:** Keyboard usability

**Recommendation:**
```typescript
// packages/app/src/hooks/useFocusManagement.ts
import { useRef, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';

export function useFocusManagement() {
  const lastSelectedRef = useRef<HTMLElement | null>(null);
  const selectedCard = useGameStore(state => state.selectedCard);
  
  useEffect(() => {
    if (selectedCard) {
      // Focus the selected card
      const element = document.querySelector(
        `[data-card-id="${selectedCard.card.id}"]`
      ) as HTMLElement;
      element?.focus();
      lastSelectedRef.current = element;
    } else if (lastSelectedRef.current) {
      // Return focus after deselection
      lastSelectedRef.current.focus();
    }
  }, [selectedCard]);
  
  return { lastSelectedRef };
}
```

```typescript
// packages/app/src/components/Card.tsx
const Card = ({ card, isSelected, ...props }) => (
  <button
    data-card-id={card.id}
    tabIndex={card.faceUp ? 0 : -1}
    aria-selected={isSelected}
    {...props}
  />
);
```

---

### 5. Add Skip Links

**Priority:** 🟢 Low  
**Effort:** 30 minutes  
**Impact:** Navigation efficiency

**Recommendation:**
```typescript
// packages/app/src/components/SkipLinks.tsx
export function SkipLinks() {
  return (
    <div className="sr-only focus-within:not-sr-only">
      <a
        href="#game-board"
        className="absolute top-2 left-2 bg-green-800 text-white px-4 py-2 rounded z-50 focus:outline-none focus:ring-2"
      >
        Skip to game board
      </a>
      <a
        href="#controls"
        className="absolute top-2 left-40 bg-green-800 text-white px-4 py-2 rounded z-50 focus:outline-none focus:ring-2"
      >
        Skip to controls
      </a>
    </div>
  );
}
```

```tsx
// In GameBoard.tsx
<main id="game-board" tabIndex={-1}>
  {/* Game content */}
</main>

<aside id="controls" tabIndex={-1}>
  <ControlPanel />
</aside>
```

---

### 6. Add Color-Blind Friendly Indicators

**Priority:** 🟡 Medium  
**Effort:** 1-2 hours  
**Impact:** Visual accessibility

**Recommendation:**
```typescript
// packages/app/src/components/Card.tsx
const SuitIcon: React.FC<{ suit: Suit }> = ({ suit }) => {
  const suitSymbols = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠',
  };
  
  const suitPatterns = {
    hearts: '♥ filled',      // Pattern: filled
    diamonds: '◆ outline',    // Pattern: outline/hollow
    clubs: '♣ filled+stripe', // Pattern: filled with stripe
    spades: '♠ solid',        // Pattern: solid
  };
  
  const isRed = suit === 'hearts' || suit === 'diamonds';
  
  return (
    <span
      className={`${isRed ? 'text-red-600' : 'text-gray-900'}`}
      aria-label={suit}
      role="img"
    >
      {suitSymbols[suit]}
      {/* Add pattern indicator for color-blind users */}
      <span className="sr-only"> ({suitPatterns[suit]})</span>
    </span>
  );
};
```

**Add shape-based suit indicators:**
```css
/* packages/app/src/index.css */
.suit-hearts::after { content: '♥'; }
.suit-diamonds::after { content: '◇'; } /* Hollow diamond */
.suit-clubs::after { content: '♣'; }
.suit-spades::after { content: '♠'; }

/* Pattern-based for severe color blindness */
@media (prefers-contrast: more) {
  .suit-hearts { text-decoration: underline; }
  .suit-diamonds { font-style: italic; }
}
```

---

## Internationalization Recommendations

### 7. Add i18n Infrastructure

**Priority:** 🟢 Low  
**Effort:** 4-6 hours  
**Impact:** Multi-language support

**Recommendation:**
```bash
npm install i18next react-i18next -w app
```

```typescript
// packages/app/src/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';

const resources = {
  en: { translation: en },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
```

```json
// packages/app/src/i18n/locales/en.json
{
  "game": {
    "title": "Solitaire",
    "newGame": "New Game",
    "autoPlay": "Auto Play",
    "showHints": "Show Hints",
    "godMode": "God Mode"
  },
  "cards": {
    "faceDown": "Face down card",
    "of": "of",
    "suits": {
      "hearts": "Hearts",
      "diamonds": "Diamonds",
      "clubs": "Clubs",
      "spades": "Spades"
    },
    "ranks": {
      "A": "Ace",
      "J": "Jack",
      "Q": "Queen",
      "K": "King"
    }
  },
  "actions": {
    "draw": "Draw card",
    "select": "Select card",
    "move": "Move card",
    "deselect": "Cancel selection"
  },
  "status": {
    "won": "Congratulations! You won!",
    "progress": "{{percent}}% complete",
    "moves": "{{count}} moves"
  },
  "difficulty": {
    "veryEasy": "Very Easy",
    "easy": "Easy",
    "normal": "Normal",
    "hard": "Hard",
    "veryHard": "Very Hard"
  }
}
```

**Usage in components:**
```typescript
import { useTranslation } from 'react-i18next';

const ControlPanel: React.FC = () => {
  const { t } = useTranslation();
  
  return (
    <div>
      <button>{t('game.newGame')}</button>
      <button>{t('game.autoPlay')}</button>
    </div>
  );
};
```

---

### 8. Add RTL Support

**Priority:** 🟢 Low  
**Effort:** 2-3 hours  
**Impact:** RTL language support

**Recommendation:**
```typescript
// packages/app/src/hooks/useDirection.ts
import { useEffect } from 'react';
import i18n from '../i18n';

const RTL_LANGUAGES = ['ar', 'he', 'fa', 'ur'];

export function useDirection() {
  useEffect(() => {
    const lang = i18n.language;
    const dir = RTL_LANGUAGES.includes(lang) ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
  }, [i18n.language]);
}
```

**Tailwind RTL utilities:**
```javascript
// tailwind.config.js
module.exports = {
  plugins: [
    require('tailwindcss-rtl'),
  ],
};
```

```tsx
// Use RTL-aware classes
<div className="ml-4 rtl:mr-4 rtl:ml-0">
  {/* Content */}
</div>
```

---

## Accessibility Checklist for AI Agents

When making UI changes:

- [ ] Add `aria-label` to interactive elements
- [ ] Ensure focusable elements have visible focus styles
- [ ] Add keyboard handlers for interactive elements
- [ ] Include screen reader announcements for dynamic changes
- [ ] Test with keyboard-only navigation
- [ ] Check color contrast (4.5:1 for text)
- [ ] Provide non-color indicators for important states
- [ ] Add `role` attributes where semantic HTML isn't sufficient

---

## Testing Accessibility

**Manual testing:**
```bash
# Keyboard navigation test
1. Tab through all interactive elements
2. Verify focus is visible
3. Test Enter/Space on all buttons
4. Test Escape to cancel

# Screen reader test
1. Enable VoiceOver (Mac) or NVDA (Windows)
2. Navigate through game
3. Verify all cards are announced correctly
4. Verify moves are announced
```

**Automated testing:**
```typescript
// packages/app/src/components/__tests__/accessibility.test.tsx
import { axe, toHaveNoViolations } from 'jest-axe';
import { render } from '@testing-library/react';
import GameBoard from '../GameBoard';

expect.extend(toHaveNoViolations);

describe('Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(<GameBoard />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

---

**Author:** AI Analysis  
**Last Updated:** December 27, 2025
