# Task: Add Auto-Complete Feature

**Date**: 2025-11-13  
**Difficulty**: Medium  
**Estimated Time**: 2-3 hours  
**Priority**: Medium  
**Type**: Feature Addition

## Objective

Automatically complete the game when all cards can be safely moved to foundations, saving players time on obvious end-game moves.

## Current State

- Players must manually move all cards to foundations
- End-game can be tedious with many obvious moves
- No automation for completing the game

## Requirements

### Functional Requirements

1. Detect when auto-complete is possible:
   - All cards face-up
   - All moves deterministic (safe to foundation)
2. Offer auto-complete button/option
3. Animate cards moving to foundations
4. Option to auto-complete automatically or manually trigger
5. Show animation of completion
6. Count auto-completed moves in statistics

### Technical Requirements

1. Algorithm to detect safe auto-complete state
2. Sequential animation of card movements
3. Button in control panel
4. Settings option for automatic vs manual
5. Update move history

## Implementation Steps

### 1. Detect Auto-Complete Condition

**Add to gameStore.ts**:
```typescript
canAutoComplete: (): boolean => {
  const state = get();

  // Check if all tableau cards are face-up
  for (const column of state.tableau) {
    if (column.some(card => !card.faceUp)) {
      return false;
    }
  }

  // Check if discard pile is empty or only has safe cards
  // A card is safe if all cards below it in rank are already in foundations
  return state.isAutoCompleteSafe();
},

isAutoCompleteSafe: (): boolean => {
  const state = get();
  const { foundations } = state;

  // Get minimum rank in each suit in foundations
  const minRanks: Record<Suit, number> = {
    hearts: foundations.hearts.length,
    diamonds: foundations.diamonds.length,
    clubs: foundations.clubs.length,
    spades: foundations.spades.length,
  };

  const rankValues: Record<Rank, number> = {
    'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
    '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13,
  };

  // Check if any face-up card can be safely moved
  // A card is safe if opposing color cards of rank-1 are both in foundations
  const checkSafe = (card: Card): boolean => {
    const cardRank = rankValues[card.rank];
    const requiredRank = cardRank - 1;

    if (cardRank === 1) return true; // Aces always safe

    // Get opposing color suits
    const isRed = ['hearts', 'diamonds'].includes(card.suit);
    const opposingSuits = isRed
      ? ['clubs' as Suit, 'spades' as Suit]
      : ['hearts' as Suit, 'diamonds' as Suit];

    // Both opposing suits must have at least requiredRank cards
    return opposingSuits.every(suit => minRanks[suit] >= requiredRank);
  };

  // Check all tableau cards
  for (const column of state.tableau) {
    for (const card of column) {
      if (card.faceUp && !checkSafe(card)) {
        return false;
      }
    }
  }

  // Check discard pile
  if (state.discardPile.length > 0) {
    const topCard = state.discardPile[state.discardPile.length - 1];
    if (!checkSafe(topCard)) {
      return false;
    }
  }

  return true;
}
```

### 2. Implement Auto-Complete

**Add to gameStore.ts**:
```typescript
autoComplete: async (): Promise<void> => {
  const state = get();
  if (!state.canAutoComplete()) return;

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  let moveMade = true;
  while (moveMade) {
    moveMade = false;

    // Try to move from discard pile
    if (state.discardPile.length > 0) {
      const card = state.discardPile[state.discardPile.length - 1];
      if (state.canMoveToFoundation(card, card.suit)) {
        state.selectCard('discard');
        state.moveCardToFoundation(card.suit);
        await delay(150); // Animation delay
        moveMade = true;
        continue;
      }
    }

    // Try to move from tableau
    for (let col = 0; col < state.tableau.length; col++) {
      const column = state.tableau[col];
      if (column.length === 0) continue;

      const card = column[column.length - 1];
      if (card.faceUp && state.canMoveToFoundation(card, card.suit)) {
        state.selectCard('tableau', col, column.length - 1);
        state.moveCardToFoundation(card.suit);
        await delay(150); // Animation delay
        moveMade = true;
        break;
      }
    }
  }

  // Check for win
  state.checkWinCondition();
}
```

### 3. Create Auto-Complete Button

**Update ControlPanel.tsx**:
```typescript
const ControlPanel: React.FC = () => {
  const canAutoComplete = useGameStore(state => state.canAutoComplete());
  const autoComplete = useGameStore(state => state.autoComplete);
  const [isAutoCompleting, setIsAutoCompleting] = useState(false);

  const handleAutoComplete = async () => {
    setIsAutoCompleting(true);
    await autoComplete();
    setIsAutoCompleting(false);
  };

  return (
    <div className="flex gap-4">
      {/* Other buttons */}
      
      {canAutoComplete && (
        <button
          onClick={handleAutoComplete}
          disabled={isAutoCompleting}
          className={`
            px-4 py-2 rounded text-white font-bold
            ${isAutoCompleting 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-purple-600 hover:bg-purple-700 animate-pulse'
            }
          `}
          title="Automatically complete the game"
        >
          {isAutoCompleting ? '⏳ Auto-completing...' : '✨ Auto-Complete'}
        </button>
      )}
    </div>
  );
};
```

### 4. Add Settings for Auto Mode

**Create AutoCompleteSettings** (`src/components/AutoCompleteSettings.tsx`):
```typescript
interface AutoCompleteSettings {
  automatic: boolean;
  animationSpeed: 'slow' | 'medium' | 'fast';
}

const AutoCompleteSettings: React.FC = () => {
  const [settings, setSettings] = useState<AutoCompleteSettings>(() => {
    const saved = localStorage.getItem('autocomplete-settings');
    return saved ? JSON.parse(saved) : { automatic: false, animationSpeed: 'medium' };
  });

  useEffect(() => {
    localStorage.setItem('autocomplete-settings', JSON.stringify(settings));
  }, [settings]);

  return (
    <div className="p-4">
      <h3 className="text-lg font-bold mb-4">Auto-Complete Settings</h3>
      
      <label className="flex items-center gap-2 mb-3">
        <input
          type="checkbox"
          checked={settings.automatic}
          onChange={(e) => setSettings(prev => ({
            ...prev,
            automatic: e.target.checked
          }))}
        />
        <span>Automatically complete when possible</span>
      </label>

      <div className="mb-3">
        <label className="block mb-2">Animation Speed:</label>
        <select
          value={settings.animationSpeed}
          onChange={(e) => setSettings(prev => ({
            ...prev,
            animationSpeed: e.target.value as AutoCompleteSettings['animationSpeed']
          }))}
          className="px-3 py-2 rounded border"
        >
          <option value="slow">Slow (300ms)</option>
          <option value="medium">Medium (150ms)</option>
          <option value="fast">Fast (50ms)</option>
        </select>
      </div>
    </div>
  );
};
```

### 5. Auto-Trigger Check

**Update gameStore.ts move functions**:
```typescript
moveCardToTableau: (targetColumn: number) => {
  // ... existing logic ...

  // After successful move, check for auto-complete
  const settings = loadAutoCompleteSettings();
  if (settings.automatic && get().canAutoComplete()) {
    setTimeout(() => {
      get().autoComplete();
    }, 500);
  }
}
```

### 6. Add Visual Feedback

**Highlight auto-complete button**:
```css
@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(168, 85, 247, 0.7);
  }
  50% {
    box-shadow: 0 0 20px 10px rgba(168, 85, 247, 0.3);
  }
}

.auto-complete-ready {
  animation: pulse-glow 2s infinite;
}
```

### 7. Add Notification

**Create AutoCompleteNotification**:
```typescript
const AutoCompleteNotification: React.FC = () => {
  const canAutoComplete = useGameStore(state => state.canAutoComplete());
  const [dismissed, setDismissed] = useState(false);

  if (!canAutoComplete || dismissed) return null;

  return (
    <div className="fixed top-20 right-4 bg-purple-600 text-white px-6 py-4 rounded-lg shadow-2xl animate-slide-in">
      <div className="flex items-center gap-3">
        <span className="text-2xl">✨</span>
        <div>
          <p className="font-bold">Auto-Complete Available!</p>
          <p className="text-sm">All remaining moves are safe</p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="ml-4 text-xl hover:text-gray-200"
        >
          ×
        </button>
      </div>
    </div>
  );
};
```

## Testing Requirements

1. Test detection of auto-complete conditions
2. Test safe move algorithm is correct
3. Test animation timing and sequence
4. Test auto-complete completes game
5. Test manual vs automatic modes
6. Test settings persistence
7. Test with various game states

## Acceptance Criteria

- [ ] Correctly detects when auto-complete is safe
- [ ] Auto-complete button appears when ready
- [ ] Smooth animation of completion
- [ ] Settings for automatic vs manual
- [ ] No false positives (unsafe completions)
- [ ] Proper move history recording
- [ ] Win detection after auto-complete
- [ ] Tests pass

## Files to Modify

- `src/store/gameStore.ts` - Add auto-complete logic
- `src/components/ControlPanel.tsx` - Add button
- `src/components/GameBoard.tsx` - Add notification

## Files to Create

- `src/components/AutoCompleteSettings.tsx` - Settings component
- `src/components/AutoCompleteNotification.tsx` - Notification

## Dependencies

- None (uses existing state management)

## Notes

- Be conservative with auto-complete detection (safety first)
- Consider adding "undo auto-complete" feature
- Animation speed should be configurable
- Don't auto-complete if it might lose the game
- Consider adding sound effects for auto-complete

## Algorithm Details

A card is safe to move to foundation if:
1. It's the next card in sequence for that suit, AND
2. All cards of opposite color and one rank lower are already in foundations

Example: 5♥ is safe if 4♣ and 4♠ are both in foundations.

## Success Metrics

- Reduces end-game tedium
- Correct detection (no unsafe moves)
- Smooth user experience
- Positive user feedback
- No bugs in auto-complete logic
