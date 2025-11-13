# Task: Improve Accessibility (A11y)

**Date**: 2025-11-13  
**Difficulty**: Medium  
**Estimated Time**: 3-4 hours  
**Priority**: High  
**Type**: Enhancement

## Objective

Make the Solitaire game accessible to users with disabilities by following WCAG 2.1 AA guidelines.

## Current State

- Limited accessibility features
- No ARIA labels
- No screen reader support
- Limited keyboard navigation
- Color contrast may not meet standards

## Requirements

### Functional Requirements

1. **Keyboard Navigation**:
   - Tab through interactive elements
   - Enter/Space to select cards
   - Arrow keys to move between piles
   - Keyboard shortcuts for actions

2. **Screen Reader Support**:
   - ARIA labels for all interactive elements
   - Announce card movements
   - Announce game state changes
   - Describe card suits and ranks

3. **Visual Accessibility**:
   - High contrast mode option
   - Larger text option
   - Color-blind friendly suits
   - Focus indicators

4. **Motor Accessibility**:
   - Click targets ≥44x44px
   - No time limits on actions
   - Alternative to drag-and-drop

### Technical Requirements

1. WCAG 2.1 AA compliance
2. Semantic HTML
3. ARIA attributes
4. Keyboard event handlers
5. Focus management

## Implementation Steps

### 1. Keyboard Navigation

**Update GameBoard.tsx**:
```typescript
const GameBoard: React.FC = () => {
  const [focusedElement, setFocusedElement] = useState<string>('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'n':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            // New game
          }
          break;
        case 'h':
          // Show hint
          break;
        case 'z':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            // Undo
          }
          break;
        // Add more shortcuts
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    // ... component
  );
};
```

### 2. Card Accessibility

**Update Card.tsx**:
```typescript
const Card: React.FC<CardProps> = ({ card, onClick, isSelectable }) => {
  const suitSymbol = {
    hearts: '♥️',
    diamonds: '♦️',
    clubs: '♣️',
    spades: '♠️',
  };

  const suitName = {
    hearts: 'hearts',
    diamonds: 'diamonds',
    clubs: 'clubs',
    spades: 'spades',
  };

  const ariaLabel = card.faceUp
    ? `${card.rank} of ${suitName[card.suit]}`
    : 'Face down card';

  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={isSelectable ? 'false' : undefined}
      tabIndex={isSelectable ? 0 : -1}
      className={`
        card
        focus:outline-none
        focus:ring-4
        focus:ring-yellow-400
        ${isSelectable ? 'cursor-pointer' : 'cursor-default'}
      `}
    >
      {card.faceUp ? (
        <div>
          <span aria-hidden="true">{suitSymbol[card.suit]}</span>
          <span className="sr-only">{suitName[card.suit]}</span>
          {card.rank}
        </div>
      ) : (
        <div aria-label="Face down card">
          🂠
        </div>
      )}
    </button>
  );
};
```

### 3. ARIA Live Regions

**Create Announcer Component** (`src/components/Announcer.tsx`):
```typescript
import React, { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';

const Announcer: React.FC = () => {
  const [announcement, setAnnouncement] = useState('');
  const moveHistory = useGameStore(state => state.moveHistory);
  const isGameWon = useGameStore(state => state.isGameWon);

  useEffect(() => {
    if (moveHistory.length === 0) return;

    const lastMove = moveHistory[moveHistory.length - 1];
    const message = describeMove(lastMove);
    setAnnouncement(message);
  }, [moveHistory]);

  useEffect(() => {
    if (isGameWon) {
      setAnnouncement('Congratulations! You won the game!');
    }
  }, [isGameWon]);

  const describeMove = (move: Move): string => {
    const card = `${move.card.rank} of ${move.card.suit}`;
    switch (move.type) {
      case 'tableau_to_foundation':
        return `Moved ${card} to foundation`;
      case 'tableau_to_tableau':
        return `Moved ${card} to tableau column`;
      case 'draw_card':
        return 'Drew a card';
      case 'flip_card':
        return 'Flipped a card face up';
      default:
        return 'Move made';
    }
  };

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
};

export default Announcer;
```

### 4. Screen Reader Only Utility

**Add to index.css**:
```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

### 5. High Contrast Mode

**Create AccessibilitySettings** (`src/components/AccessibilitySettings.tsx`):
```typescript
interface A11ySettings {
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;
}

const AccessibilitySettings: React.FC = () => {
  const [settings, setSettings] = useState<A11ySettings>({
    highContrast: false,
    largeText: false,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  });

  useEffect(() => {
    document.documentElement.classList.toggle('high-contrast', settings.highContrast);
    document.documentElement.classList.toggle('large-text', settings.largeText);
  }, [settings]);

  return (
    <div role="group" aria-labelledby="a11y-settings">
      <h3 id="a11y-settings">Accessibility Settings</h3>
      
      <label>
        <input
          type="checkbox"
          checked={settings.highContrast}
          onChange={(e) => setSettings(prev => ({
            ...prev,
            highContrast: e.target.checked
          }))}
        />
        High Contrast Mode
      </label>

      <label>
        <input
          type="checkbox"
          checked={settings.largeText}
          onChange={(e) => setSettings(prev => ({
            ...prev,
            largeText: e.target.checked
          }))}
        />
        Large Text
      </label>
    </div>
  );
};
```

### 6. Color-Blind Friendly Suits

Add visual patterns in addition to colors:
```typescript
const suitPatterns = {
  hearts: { color: 'red', pattern: 'solid' },
  diamonds: { color: 'red', pattern: 'striped' },
  clubs: { color: 'black', pattern: 'solid' },
  spades: { color: 'black', pattern: 'dotted' },
};
```

### 7. Focus Management

**Create FocusManager** (`src/utils/focusManager.ts`):
```typescript
export class FocusManager {
  private previousFocus: HTMLElement | null = null;

  saveFocus() {
    this.previousFocus = document.activeElement as HTMLElement;
  }

  restoreFocus() {
    if (this.previousFocus) {
      this.previousFocus.focus();
    }
  }

  trapFocus(container: HTMLElement) {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    container.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    });
  }
}
```

### 8. Alternative Text and Labels

**Update all interactive elements**:
```typescript
<button
  aria-label="Draw a card from the deck"
  title="Draw card"
>
  Draw
</button>

<div
  role="region"
  aria-label="Foundation piles"
>
  {/* Foundation piles */}
</div>

<div
  role="region"
  aria-label="Tableau columns"
>
  {/* Tableau */}
</div>
```

## Testing Requirements

1. **Keyboard Testing**:
   - Navigate entire game with keyboard only
   - All actions accessible via keyboard
   - Focus visible at all times
   - No keyboard traps

2. **Screen Reader Testing**:
   - Test with NVDA (Windows)
   - Test with JAWS (Windows)
   - Test with VoiceOver (macOS/iOS)
   - Cards properly announced
   - Actions properly announced

3. **Automated Testing**:
   - Run axe-core or Lighthouse
   - Check for ARIA errors
   - Validate HTML semantics

4. **Visual Testing**:
   - Test high contrast mode
   - Test with 200% zoom
   - Check color contrast ratios
   - Test focus indicators

## Acceptance Criteria

- [ ] Full keyboard navigation works
- [ ] Screen reader announces all content
- [ ] ARIA labels on all interactive elements
- [ ] Focus indicators visible
- [ ] Color contrast meets WCAG AA
- [ ] High contrast mode available
- [ ] No accessibility errors (axe/Lighthouse)
- [ ] Click targets ≥44x44px
- [ ] Tests pass

## Files to Create

- `src/components/Announcer.tsx` - Screen reader announcements
- `src/components/AccessibilitySettings.tsx` - A11y settings
- `src/utils/focusManager.ts` - Focus management

## Files to Modify

- `src/components/Card.tsx` - Add ARIA labels
- `src/components/GameBoard.tsx` - Keyboard navigation
- `src/components/ControlPanel.tsx` - ARIA labels
- `src/components/VictoryModal.tsx` - Focus trap
- `src/index.css` - High contrast styles

## Dependencies

Optional:
- `@axe-core/react` - Accessibility testing

## Tools for Testing

- **Browser DevTools**: Lighthouse audit
- **axe DevTools**: Browser extension
- **WAVE**: Web accessibility evaluation tool
- **Screen Readers**: NVDA, JAWS, VoiceOver
- **Keyboard Only**: Unplug mouse!

## WCAG 2.1 AA Checklist

- [ ] 1.1.1 Non-text Content
- [ ] 1.3.1 Info and Relationships
- [ ] 1.4.3 Contrast (Minimum)
- [ ] 2.1.1 Keyboard
- [ ] 2.1.2 No Keyboard Trap
- [ ] 2.4.3 Focus Order
- [ ] 2.4.7 Focus Visible
- [ ] 3.2.4 Consistent Identification
- [ ] 4.1.2 Name, Role, Value
- [ ] 4.1.3 Status Messages

## Success Metrics

- Lighthouse accessibility score ≥95
- Zero critical accessibility issues
- Positive feedback from users with disabilities
- Full keyboard usability
- Screen reader compatibility
