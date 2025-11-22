# Task 011: Implement Accessibility Features (WCAG 2.1 AA)

**Priority:** CRITICAL  
**Estimated Effort:** 2-3 weeks  
**Risk Level:** MEDIUM  
**Impact:** VERY HIGH - Legal compliance, inclusivity

---

## Problem Statement

The current application has minimal accessibility support:
- Only 1 ARIA attribute in entire codebase
- No keyboard-only navigation
- No screen reader support
- Cards cannot be played without mouse
- Game state changes not announced
- Poor focus management

**Impact:**
- Violates WCAG 2.1 AA standards
- Potential ADA/legal compliance issues
- Excludes users with disabilities
- Poor user experience for keyboard users
- Not usable with screen readers

**Current Status:** 4/10 accessibility score

---

## Objectives

Achieve WCAG 2.1 Level AA compliance by implementing:

1. **Keyboard Navigation** - Full game playable with keyboard only
2. **Screen Reader Support** - All game elements properly announced
3. **ARIA Attributes** - Proper semantic markup
4. **Focus Management** - Clear focus indicators and logical order
5. **Color Contrast** - WCAG AA compliant (4.5:1 for text)
6. **Reduced Motion** - Already implemented ✅
7. **Alternative Input** - Support for assistive technologies

---

## Technical Implementation

### Phase 1: Keyboard Navigation (Week 1)

#### 1.1 Card Selection & Movement

**File:** `packages/app/src/components/Card.tsx`

```typescript
interface CardProps {
  // ... existing props
  tabIndex?: number;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

const Card: React.FC<CardProps> = ({ 
  card, 
  onClick, 
  isInteractable, 
  tabIndex = isInteractable ? 0 : -1,
  onKeyDown,
  ...props 
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    }
    onKeyDown?.(e);
  };

  return (
    <motion.div
      role="button"
      tabIndex={tabIndex}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      aria-label={`${rank} of ${suit}, ${faceUp ? 'face up' : 'face down'}`}
      aria-pressed={isSelected}
      aria-disabled={!isInteractable}
      className={/* ... */}
    >
      {/* ... card content ... */}
    </motion.div>
  );
};
```

#### 1.2 Global Keyboard Shortcuts

**File:** `packages/app/src/hooks/useKeyboardShortcuts.ts`

```typescript
import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';

export const useKeyboardShortcuts = () => {
  const {
    initializeGame,
    drawCard,
    toggleValidMoves,
    toggleGodMode,
    toggleAutoPlay,
  } = useGameStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in input
      if (e.target instanceof HTMLInputElement) return;

      switch (e.key) {
        case 'n':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            initializeGame();
          }
          break;
        case 'd':
          e.preventDefault();
          drawCard();
          break;
        case 'h':
          e.preventDefault();
          toggleValidMoves();
          break;
        case 'g':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            toggleGodMode();
          }
          break;
        case 'a':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            toggleAutoPlay();
          }
          break;
        case '?':
          e.preventDefault();
          // Show keyboard shortcuts help
          break;
        case 'Escape':
          // Close modals, deselect cards
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [initializeGame, drawCard, toggleValidMoves, toggleGodMode, toggleAutoPlay]);
};
```

#### 1.3 Focus Management for Modals

**File:** `packages/app/src/components/WinModal.tsx`

```typescript
import { useEffect, useRef } from 'react';

const WinModal: React.FC = () => {
  const gameWon = useGameStore((state) => state.gameWon);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (gameWon) {
      // Focus close button when modal opens
      closeButtonRef.current?.focus();
      
      // Trap focus in modal
      const handleTab = (e: KeyboardEvent) => {
        if (e.key === 'Tab') {
          const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];

          if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            (lastElement as HTMLElement).focus();
          } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            (firstElement as HTMLElement).focus();
          }
        }
      };

      document.addEventListener('keydown', handleTab);
      return () => document.removeEventListener('keydown', handleTab);
    }
  }, [gameWon]);

  return (
    <AnimatePresence>
      {gameWon && (
        <motion.div
          role="dialog"
          aria-labelledby="win-modal-title"
          aria-modal="true"
          /* ... */
        >
          <h1 id="win-modal-title">Congratulations! You Won!</h1>
          <button ref={closeButtonRef} aria-label="Close victory modal">
            {/* ... */}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
```

---

### Phase 2: Screen Reader Support (Week 2)

#### 2.1 Game State Announcements

**File:** `packages/app/src/components/LiveRegion.tsx`

```typescript
import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';

/**
 * LiveRegion - Announces game state changes to screen readers
 */
export const LiveRegion: React.FC = () => {
  const [announcement, setAnnouncement] = useState('');
  const moveHistory = useGameStore((state) => state.moveHistory);
  const gameWon = useGameStore((state) => state.gameWon);
  const autoPlayInProgress = useGameStore((state) => state.autoPlayInProgress);

  useEffect(() => {
    if (moveHistory.length > 0) {
      const lastMove = moveHistory[moveHistory.length - 1];
      setAnnouncement(formatMoveForScreenReader(lastMove));
    }
  }, [moveHistory]);

  useEffect(() => {
    if (gameWon) {
      setAnnouncement('Congratulations! You have won the game!');
    }
  }, [gameWon]);

  useEffect(() => {
    if (autoPlayInProgress) {
      setAnnouncement('Auto-play in progress');
    }
  }, [autoPlayInProgress]);

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

function formatMoveForScreenReader(move: Move): string {
  const card = `${move.card.rank} of ${move.card.suit}`;
  
  switch (move.type) {
    case 'draw_card':
      return `Drew ${card} from draw pile`;
    case 'tableau_to_tableau':
      return `Moved ${card} from column ${(move.from?.columnIndex ?? 0) + 1} to column ${(move.to?.columnIndex ?? 0) + 1}`;
    case 'tableau_to_foundation':
      return `Moved ${card} to ${move.to?.suit} foundation`;
    case 'discard_to_tableau':
      return `Moved ${card} from discard to column ${(move.to?.columnIndex ?? 0) + 1}`;
    case 'discard_to_foundation':
      return `Moved ${card} from discard to ${move.to?.suit} foundation`;
    default:
      return '';
  }
}
```

#### 2.2 Semantic Landmarks

**File:** `packages/app/src/components/GameBoard.tsx`

```typescript
<div className="min-h-screen ...">
  <header>
    <h1>Solitaire</h1>
  </header>

  <nav aria-label="Game controls">
    <ControlPanel />
  </nav>

  <main aria-label="Game board">
    <section aria-label="Stock and waste piles">
      <DrawPile />
      <DiscardPile />
    </section>

    <section aria-label="Foundation piles">
      <FoundationPile suit="hearts" aria-label="Hearts foundation" />
      <FoundationPile suit="diamonds" aria-label="Diamonds foundation" />
      <FoundationPile suit="clubs" aria-label="Clubs foundation" />
      <FoundationPile suit="spades" aria-label="Spades foundation" />
    </section>

    <section aria-label="Tableau">
      {Array.from({ length: 7 }, (_, i) => (
        <TableauColumn key={i} index={i} aria-label={`Column ${i + 1}`} />
      ))}
    </section>
  </main>

  <aside aria-label="Move history">
    <ActivityLog />
  </aside>

  <LiveRegion />
</div>
```

#### 2.3 Button and Control Labels

Update all interactive elements:

```typescript
// ControlPanel.tsx
<button 
  onClick={initializeGame}
  aria-label="Start new game"
>
  New Game
</button>

<button
  onClick={toggleValidMoves}
  aria-pressed={showValidMoves}
  aria-label={`${showValidMoves ? 'Hide' : 'Show'} valid moves`}
>
  {/* ... */}
</button>

<button
  onClick={toggleAutoPlay}
  aria-pressed={autoPlayEnabled}
  aria-label={`${autoPlayEnabled ? 'Disable' : 'Enable'} auto-play`}
>
  {/* ... */}
</button>
```

---

### Phase 3: Visual Accessibility (Week 2-3)

#### 3.1 Color Contrast Audit

Check all text/background combinations:

```typescript
// Current green background: from-green-700 via-green-600 to-green-800
// Need to verify contrast ratios

// Tool to use: https://webaim.org/resources/contrastchecker/

// Required ratios (WCAG AA):
// Normal text: 4.5:1
// Large text (18pt+): 3:1
// UI components: 3:1
```

**Update if needed:**
```typescript
// If contrast fails, adjust colors:
const colors = {
  background: {
    light: 'from-green-600 via-green-500 to-green-700', // Lighter
    dark: 'from-green-800 via-green-900 to-green-950',  // Darker
  },
  card: {
    background: 'bg-white', // Already good contrast
    border: 'border-gray-800', // Dark border for definition
  },
};
```

#### 3.2 Focus Indicators

**File:** `packages/app/src/index.css`

```css
/* Enhanced focus indicators */
*:focus-visible {
  outline: 3px solid #fbbf24; /* Amber-400 */
  outline-offset: 2px;
  border-radius: 4px;
}

/* Remove default focus ring */
*:focus {
  outline: none;
}

/* Specific focus styles for cards */
[role="button"]:focus-visible {
  box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.5),
              0 0 0 5px rgba(251, 191, 36, 0.3);
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  *:focus-visible {
    outline-width: 4px;
  }
}
```

#### 3.3 Skip Links

**File:** `packages/app/src/components/SkipLinks.tsx`

```typescript
export const SkipLinks: React.FC = () => (
  <div className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50">
    <a 
      href="#main-content" 
      className="bg-blue-600 text-white px-4 py-2 rounded"
    >
      Skip to game board
    </a>
    <a 
      href="#controls" 
      className="bg-blue-600 text-white px-4 py-2 rounded ml-2"
    >
      Skip to controls
    </a>
  </div>
);
```

---

### Phase 4: Testing & Documentation (Week 3)

#### 4.1 Automated Accessibility Testing

**Install tools:**
```bash
npm install --save-dev @axe-core/react jest-axe
```

**File:** `packages/app/src/test/accessibility.test.tsx`

```typescript
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import App from '../App';

expect.extend(toHaveNoViolations);

describe('Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(<App />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

#### 4.2 Keyboard Navigation Documentation

**File:** `packages/app/src/components/KeyboardShortcutsHelp.tsx`

```typescript
export const KeyboardShortcuts = [
  { key: 'Ctrl/⌘ + N', action: 'New Game' },
  { key: 'D', action: 'Draw Card' },
  { key: 'H', action: 'Toggle Hints' },
  { key: 'Ctrl/⌘ + G', action: 'Toggle God Mode' },
  { key: 'Ctrl/⌘ + A', action: 'Toggle Auto-play' },
  { key: 'Tab', action: 'Navigate forward' },
  { key: 'Shift + Tab', action: 'Navigate backward' },
  { key: 'Enter / Space', action: 'Select card or button' },
  { key: 'Arrow Keys', action: 'Navigate cards in tableau' },
  { key: 'Escape', action: 'Deselect card / Close modal' },
  { key: '?', action: 'Show this help' },
];

export const KeyboardShortcutsModal: React.FC = () => (
  <dialog role="dialog" aria-labelledby="shortcuts-title">
    <h2 id="shortcuts-title">Keyboard Shortcuts</h2>
    <table>
      <thead>
        <tr>
          <th>Key</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {KeyboardShortcuts.map(({ key, action }) => (
          <tr key={key}>
            <td><kbd>{key}</kbd></td>
            <td>{action}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </dialog>
);
```

#### 4.3 Update README

Add accessibility section:

```markdown
## Accessibility

This game is designed to be fully accessible:

- ✅ WCAG 2.1 Level AA compliant
- ✅ Full keyboard navigation support
- ✅ Screen reader compatible
- ✅ Reduced motion support
- ✅ High contrast mode support

### Keyboard Shortcuts

- `Ctrl/⌘ + N` - New Game
- `D` - Draw Card
- `Tab` - Navigate
- `Enter/Space` - Select
- `?` - Show all shortcuts

For detailed accessibility information, see [ACCESSIBILITY.md](./ACCESSIBILITY.md)
```

---

## Implementation Checklist

### Phase 1: Keyboard Navigation
- [ ] Add keyboard support to Card component
- [ ] Implement useKeyboardShortcuts hook
- [ ] Add focus management to WinModal
- [ ] Add focus management to ControlPanel
- [ ] Implement focus trap for modals
- [ ] Add keyboard navigation for tableau
- [ ] Test all actions work with keyboard only

### Phase 2: Screen Reader Support
- [ ] Create LiveRegion component
- [ ] Add ARIA labels to all interactive elements
- [ ] Add semantic HTML landmarks
- [ ] Add button states (aria-pressed)
- [ ] Add modal attributes (aria-modal, role="dialog")
- [ ] Test with NVDA (Windows)
- [ ] Test with JAWS (Windows)
- [ ] Test with VoiceOver (Mac/iOS)

### Phase 3: Visual Accessibility
- [ ] Audit color contrast ratios
- [ ] Fix any failing contrasts
- [ ] Add enhanced focus indicators
- [ ] Add skip links
- [ ] Test in high contrast mode
- [ ] Test with 200% zoom

### Phase 4: Testing & Documentation
- [ ] Add axe-core automated tests
- [ ] Create keyboard shortcuts help modal
- [ ] Update README with accessibility info
- [ ] Create ACCESSIBILITY.md document
- [ ] Manual testing with screen readers
- [ ] Manual testing with keyboard only
- [ ] Get feedback from users with disabilities

---

## Testing Protocol

### Manual Testing Checklist

#### Keyboard Navigation
- [ ] Can tab through all interactive elements
- [ ] Focus indicators clearly visible
- [ ] Can select and move cards with keyboard
- [ ] Can open/close modals with keyboard
- [ ] Can trigger all buttons with Enter/Space
- [ ] Escape closes modals and deselects
- [ ] Tab order is logical
- [ ] No keyboard traps (except intentional modal traps)

#### Screen Reader Testing
- [ ] All cards properly announced
- [ ] Card moves announced
- [ ] Game state changes announced
- [ ] Buttons have clear labels
- [ ] Modal properly announced
- [ ] Can navigate by landmark
- [ ] Can navigate by heading
- [ ] Images have alt text (if any)

#### Visual Testing
- [ ] All text meets 4.5:1 contrast ratio
- [ ] Focus indicators visible on all backgrounds
- [ ] Works at 200% browser zoom
- [ ] Works in Windows High Contrast mode
- [ ] Works with inverted colors
- [ ] Readable with color blindness simulation

### Automated Testing

```bash
# Run accessibility tests
npm run test -- accessibility.test.tsx

# Run Lighthouse accessibility audit
npx lighthouse http://localhost:5173 --only-categories=accessibility

# Run axe CLI
npx @axe-core/cli http://localhost:5173
```

---

## Risk Assessment

**Benefits:**
- ✅ Legal compliance (ADA, Section 508, WCAG)
- ✅ Inclusive - usable by everyone
- ✅ Better UX for all users (keyboard shortcuts)
- ✅ SEO benefits (semantic HTML)
- ✅ Professional quality
- ✅ Competitive advantage

**Risks:**
- ⚠️ Significant development time (2-3 weeks)
- ⚠️ May affect existing UI/UX
- ⚠️ Requires ongoing maintenance
- ⚠️ Testing can be time-consuming

**Mitigation:**
- Implement incrementally (phase by phase)
- Get user feedback early
- Use automated tools to catch regressions
- Document patterns for future development

---

## Success Criteria

- [ ] Lighthouse accessibility score: 100
- [ ] axe-core: 0 violations
- [ ] WAVE: 0 errors
- [ ] Can play entire game with keyboard only
- [ ] Can play entire game with screen reader
- [ ] All WCAG 2.1 AA criteria met
- [ ] User testing with people with disabilities passes
- [ ] Documentation complete

---

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WAI-ARIA Practices](https://www.w3.org/WAI/ARIA/apg/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)
- [WebAIM](https://webaim.org/)
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [Inclusive Components](https://inclusive-components.design/)

---

## Future Enhancements

1. **Voice Control Support**
2. **Switch Access Support**
3. **Eye Tracking Support**
4. **Braille Display Support**
5. **Cognitive Accessibility** (simplification mode)
6. **Multiple Language Screen Reader Support**
