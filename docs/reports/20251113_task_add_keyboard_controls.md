# Task: Add Comprehensive Keyboard Controls

**Date**: 2025-11-13  
**Difficulty**: Medium  
**Estimated Time**: 3-4 hours  
**Priority**: Medium  
**Type**: Feature Addition

## Objective

Enable complete game control using only the keyboard, making the game accessible and faster for power users.

## Current State

- Limited keyboard support
- Primarily mouse/drag-and-drop interaction
- No documented keyboard shortcuts

## Requirements

### Functional Requirements

1. **Navigation**:
   - Tab/Shift+Tab: Navigate between interactive elements
   - Arrow keys: Move focus between cards
   - Home/End: Jump to first/last column

2. **Actions**:
   - Space/Enter: Select card
   - Space/Enter again: Place selected card
   - Escape: Cancel selection
   - D: Draw card from pile
   - U: Undo last move
   - R: Redo move
   - H: Show hint
   - N: New game (with confirmation)

3. **Quick Actions**:
   - F: Auto-move to foundations
   - 1-7: Jump to tableau columns 1-7
   - ?: Show keyboard shortcuts help

### Technical Requirements

1. Implement keyboard event handlers
2. Visual feedback for keyboard focus
3. Help modal with shortcuts list
4. Prevent default browser shortcuts conflicts
5. Support both Windows/Linux and macOS shortcuts

## Implementation Steps

### 1. Create Keyboard Manager

**Create KeyboardManager** (`src/utils/keyboardManager.ts`):
```typescript
type KeyboardAction = 
  | 'NEW_GAME'
  | 'DRAW_CARD'
  | 'UNDO'
  | 'REDO'
  | 'HINT'
  | 'SELECT'
  | 'CANCEL'
  | 'AUTO_FOUNDATION'
  | 'HELP'
  | 'COLUMN_1' | 'COLUMN_2' | 'COLUMN_3' | 'COLUMN_4'
  | 'COLUMN_5' | 'COLUMN_6' | 'COLUMN_7';

interface KeyBinding {
  key: string;
  ctrlOrCmd?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: KeyboardAction;
  description: string;
}

const DEFAULT_KEY_BINDINGS: KeyBinding[] = [
  { key: 'n', ctrlOrCmd: true, action: 'NEW_GAME', description: 'New Game' },
  { key: 'd', action: 'DRAW_CARD', description: 'Draw Card' },
  { key: 'z', ctrlOrCmd: true, action: 'UNDO', description: 'Undo' },
  { key: 'y', ctrlOrCmd: true, action: 'REDO', description: 'Redo' },
  { key: 'z', ctrlOrCmd: true, shift: true, action: 'REDO', description: 'Redo (Alt)' },
  { key: 'h', action: 'HINT', description: 'Show Hint' },
  { key: ' ', action: 'SELECT', description: 'Select/Place Card' },
  { key: 'Enter', action: 'SELECT', description: 'Select/Place Card' },
  { key: 'Escape', action: 'CANCEL', description: 'Cancel Selection' },
  { key: 'f', action: 'AUTO_FOUNDATION', description: 'Auto-move to Foundation' },
  { key: '?', action: 'HELP', description: 'Show Keyboard Help' },
  { key: '1', action: 'COLUMN_1', description: 'Jump to Column 1' },
  { key: '2', action: 'COLUMN_2', description: 'Jump to Column 2' },
  { key: '3', action: 'COLUMN_3', description: 'Jump to Column 3' },
  { key: '4', action: 'COLUMN_4', description: 'Jump to Column 4' },
  { key: '5', action: 'COLUMN_5', description: 'Jump to Column 5' },
  { key: '6', action: 'COLUMN_6', description: 'Jump to Column 6' },
  { key: '7', action: 'COLUMN_7', description: 'Jump to Column 7' },
];

export class KeyboardManager {
  private bindings: KeyBinding[];
  private handlers: Map<KeyboardAction, () => void>;

  constructor() {
    this.bindings = DEFAULT_KEY_BINDINGS;
    this.handlers = new Map();
  }

  registerHandler(action: KeyboardAction, handler: () => void) {
    this.handlers.set(action, handler);
  }

  handleKeyDown(event: KeyboardEvent): boolean {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const ctrlOrCmd = isMac ? event.metaKey : event.ctrlKey;

    for (const binding of this.bindings) {
      if (
        binding.key === event.key &&
        (!binding.ctrlOrCmd || ctrlOrCmd) &&
        (!binding.shift || event.shiftKey) &&
        (!binding.alt || event.altKey)
      ) {
        const handler = this.handlers.get(binding.action);
        if (handler) {
          event.preventDefault();
          handler();
          return true;
        }
      }
    }

    return false;
  }

  getKeyBindings(): KeyBinding[] {
    return this.bindings;
  }
}

export const keyboardManager = new KeyboardManager();
```

### 2. Integrate with Game

**Update GameBoard.tsx**:
```typescript
import { keyboardManager } from '../utils/keyboardManager';

const GameBoard: React.FC = () => {
  const [showHelp, setShowHelp] = useState(false);
  const [focusedColumn, setFocusedColumn] = useState<number>(0);

  const initializeGame = useGameStore(state => state.initializeGame);
  const drawCard = useGameStore(state => state.drawCard);
  const undo = useGameStore(state => state.undo);
  const redo = useGameStore(state => state.redo);
  const findHint = useGameStore(state => state.findHint);
  const selectedCard = useGameStore(state => state.selectedCard);
  const deselectCard = useGameStore(state => state.deselectCard);

  useEffect(() => {
    // Register keyboard handlers
    keyboardManager.registerHandler('NEW_GAME', () => {
      if (confirm('Start a new game?')) {
        initializeGame();
      }
    });

    keyboardManager.registerHandler('DRAW_CARD', drawCard);
    keyboardManager.registerHandler('UNDO', undo);
    keyboardManager.registerHandler('REDO', redo);
    keyboardManager.registerHandler('HINT', findHint);
    keyboardManager.registerHandler('HELP', () => setShowHelp(true));
    keyboardManager.registerHandler('CANCEL', deselectCard);

    // Register column jumping
    for (let i = 1; i <= 7; i++) {
      keyboardManager.registerHandler(`COLUMN_${i}` as any, () => {
        setFocusedColumn(i - 1);
        // Focus first card in column
        const element = document.querySelector(`[data-column="${i - 1}"]`);
        if (element instanceof HTMLElement) {
          element.focus();
        }
      });
    }

    // Add global keyboard listener
    const handleKeyDown = (e: KeyboardEvent) => {
      keyboardManager.handleKeyDown(e);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [initializeGame, drawCard, undo, redo, findHint, deselectCard]);

  return (
    <>
      {/* Game board */}
      {showHelp && (
        <KeyboardHelpModal
          onClose={() => setShowHelp(false)}
        />
      )}
    </>
  );
};
```

### 3. Create Help Modal

**Create KeyboardHelpModal** (`src/components/KeyboardHelpModal.tsx`):
```typescript
interface KeyboardHelpModalProps {
  onClose: () => void;
}

const KeyboardHelpModal: React.FC<KeyboardHelpModalProps> = ({ onClose }) => {
  const bindings = keyboardManager.getKeyBindings();
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  const formatKey = (binding: KeyBinding): string => {
    const parts: string[] = [];
    if (binding.ctrlOrCmd) parts.push(isMac ? '⌘' : 'Ctrl');
    if (binding.shift) parts.push('Shift');
    if (binding.alt) parts.push('Alt');
    parts.push(binding.key === ' ' ? 'Space' : binding.key);
    return parts.join(' + ');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold">⌨️ Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {bindings.map((binding, index) => (
            <div key={index} className="flex justify-between items-center p-2 border-b">
              <span className="text-gray-700">{binding.description}</span>
              <kbd className="px-2 py-1 bg-gray-100 rounded border border-gray-300 text-sm font-mono">
                {formatKey(binding)}
              </kbd>
            </div>
          ))}
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
};

export default KeyboardHelpModal;
```

### 4. Visual Focus Indicators

**Update Card.tsx**:
```typescript
const Card: React.FC<CardProps> = ({ card, onClick, ...props }) => {
  return (
    <button
      {...props}
      onClick={onClick}
      className={`
        card
        focus:outline-none
        focus:ring-4
        focus:ring-yellow-400
        focus:ring-offset-2
        focus:z-10
        transition-all
      `}
      tabIndex={0}
    >
      {/* Card content */}
    </button>
  );
};
```

### 5. Auto-Foundation Feature

**Add to gameStore.ts**:
```typescript
autoMoveToFoundations: () => {
  const state = get();
  let moved = false;

  // Try to move from tableau
  for (let col = 0; col < state.tableau.length; col++) {
    const column = state.tableau[col];
    if (column.length === 0) continue;

    const card = column[column.length - 1];
    if (card.faceUp && state.canMoveToFoundation(card, card.suit)) {
      state.selectCard('tableau', col, column.length - 1);
      state.moveCardToFoundation(card.suit);
      moved = true;
      break;
    }
  }

  // Try from discard pile
  if (!moved && state.discardPile.length > 0) {
    const card = state.discardPile[state.discardPile.length - 1];
    if (state.canMoveToFoundation(card, card.suit)) {
      state.selectCard('discard');
      state.moveCardToFoundation(card.suit);
      moved = true;
    }
  }

  return moved;
}
```

## Testing Requirements

1. Test all keyboard shortcuts work
2. Test focus indicators are visible
3. Test tab navigation works correctly
4. Test shortcuts don't conflict with browser
5. Test on Windows, macOS, Linux
6. Test help modal displays all shortcuts
7. Test keyboard-only game completion

## Acceptance Criteria

- [ ] All game actions accessible via keyboard
- [ ] Help modal shows all shortcuts
- [ ] Focus indicators clearly visible
- [ ] Tab navigation logical and complete
- [ ] Shortcuts work on all platforms
- [ ] No conflicts with browser shortcuts
- [ ] Can complete game using keyboard only
- [ ] Tests pass

## Files to Create

- `src/utils/keyboardManager.ts` - Keyboard manager
- `src/components/KeyboardHelpModal.tsx` - Help modal

## Files to Modify

- `src/components/GameBoard.tsx` - Keyboard integration
- `src/components/Card.tsx` - Focus indicators
- `src/store/gameStore.ts` - Auto-foundation feature

## Dependencies

- None (uses browser APIs)

## Notes

- Support both Windows (Ctrl) and Mac (Cmd) modifiers
- Avoid conflicting with browser shortcuts
- Make focus indicators prominent but not distracting
- Consider customizable keybindings (future)
- Document shortcuts in README

## UI Additions

Add a keyboard icon in control panel:
```typescript
<button
  onClick={() => setShowHelp(true)}
  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
  aria-label="Show keyboard shortcuts"
  title="Keyboard shortcuts (?)"
>
  ⌨️
</button>
```

## Success Metrics

- Users can play entirely with keyboard
- Faster gameplay for power users
- Improved accessibility
- Positive user feedback
