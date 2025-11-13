# Task: Add Difficulty Levels

**Date**: 2025-11-13  
**Difficulty**: Medium  
**Estimated Time**: 2-3 hours  
**Priority**: Low  
**Type**: Feature Addition

## Objective

Add different difficulty levels to make the game more accessible for beginners and more challenging for experienced players.

## Current State

- Single difficulty (standard Klondike rules)
- Draw 1 card at a time
- No variations or difficulty options

## Requirements

### Functional Requirements

1. Three difficulty levels:
   - **Easy**: Draw 1, unlimited redeals, hints available
   - **Medium**: Draw 1, limited redeals, hints limited
   - **Hard**: Draw 3, no hints, Vegas rules (optional)

2. Difficulty selector in new game dialog
3. Display current difficulty
4. Track statistics per difficulty
5. Award points/badges based on difficulty

### Technical Requirements

1. Extend GameState with difficulty setting
2. Adjust game rules based on difficulty
3. UI for difficulty selection
4. Persist difficulty preference
5. Update statistics per difficulty level

## Implementation Steps

### 1. Define Difficulty Types

**Update types/index.ts**:
```typescript
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface DifficultySettings {
  drawCount: 1 | 3;
  maxRedeals: number | 'unlimited';
  hintsAllowed: number | 'unlimited';
  timeLimit: number | null; // seconds, null for no limit
  scoring: boolean;
}

export const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultySettings> = {
  easy: {
    drawCount: 1,
    maxRedeals: 'unlimited',
    hintsAllowed: 'unlimited',
    timeLimit: null,
    scoring: false,
  },
  medium: {
    drawCount: 1,
    maxRedeals: 3,
    hintsAllowed: 3,
    timeLimit: null,
    scoring: true,
  },
  hard: {
    drawCount: 3,
    maxRedeals: 0,
    hintsAllowed: 0,
    timeLimit: null,
    scoring: true,
  },
};
```

### 2. Update GameState

**Update types/index.ts GameState**:
```typescript
export interface GameState {
  // ... existing properties
  difficulty: Difficulty;
  redealCount: number;
  hintsUsed: number;
  score: number;
}
```

### 3. Update Game Store

**Update gameStore.ts**:
```typescript
interface GameStore extends GameState {
  // ... existing properties
  setDifficulty: (difficulty: Difficulty) => void;
  canRedeal: () => boolean;
  canUseHint: () => boolean;
}

const useGameStore = create<GameStore>((set, get) => ({
  // ... existing state
  difficulty: 'medium',
  redealCount: 0,
  hintsUsed: 0,
  score: 0,

  initializeGame: (difficulty?: Difficulty) => {
    const diff = difficulty || get().difficulty;
    const config = DIFFICULTY_CONFIGS[diff];
    
    // ... existing initialization
    set({
      difficulty: diff,
      redealCount: 0,
      hintsUsed: 0,
      score: 0,
      // ... other initial state
    });
  },

  setDifficulty: (difficulty: Difficulty) => {
    set({ difficulty });
    localStorage.setItem('solitaire-difficulty', difficulty);
  },

  drawCard: () => {
    const state = get();
    const config = DIFFICULTY_CONFIGS[state.difficulty];

    if (state.drawPile.length === 0) {
      // Check redeal limit
      if (!state.canRedeal()) {
        return; // No more redeals allowed
      }

      // Recycle discard pile
      set({
        drawPile: [...state.discardPile].reverse().map(card => ({
          ...card,
          faceUp: false,
        })),
        discardPile: [],
        redealCount: state.redealCount + 1,
      });
      return;
    }

    // Draw cards based on difficulty
    const drawCount = config.drawCount;
    const cardsToMove = state.drawPile.slice(-drawCount).map(card => ({
      ...card,
      faceUp: true,
    }));

    set({
      drawPile: state.drawPile.slice(0, -drawCount),
      discardPile: [...state.discardPile, ...cardsToMove],
    });
  },

  canRedeal: () => {
    const state = get();
    const config = DIFFICULTY_CONFIGS[state.difficulty];
    return config.maxRedeals === 'unlimited' || 
           state.redealCount < config.maxRedeals;
  },

  canUseHint: () => {
    const state = get();
    const config = DIFFICULTY_CONFIGS[state.difficulty];
    return config.hintsAllowed === 'unlimited' || 
           state.hintsUsed < config.hintsAllowed;
  },

  findHint: () => {
    if (!get().canUseHint()) {
      return; // No hints available
    }
    
    // ... existing hint logic
    set({ hintsUsed: get().hintsUsed + 1 });
  },

  // Scoring (for medium/hard)
  calculateScore: () => {
    const state = get();
    const config = DIFFICULTY_CONFIGS[state.difficulty];
    
    if (!config.scoring) return 0;

    let score = 0;
    
    // Points for foundation cards
    Object.values(state.foundations).forEach(pile => {
      score += pile.length * 10;
    });
    
    // Bonus for completion
    if (state.isGameWon) {
      score += 500;
      // Time bonus
      const timeSeconds = state.totalElapsedSeconds;
      const timeBonus = Math.max(0, 1000 - timeSeconds);
      score += timeBonus;
    }
    
    // Penalties
    score -= state.hintsUsed * 20;
    score -= state.redealCount * 10;
    
    return Math.max(0, score);
  },
}));
```

### 4. Create Difficulty Selector

**Create DifficultySelector.tsx**:
```typescript
interface DifficultySelectorProps {
  selectedDifficulty: Difficulty;
  onSelect: (difficulty: Difficulty) => void;
}

const DifficultySelector: React.FC<DifficultySelectorProps> = ({
  selectedDifficulty,
  onSelect,
}) => {
  const difficulties: { level: Difficulty; emoji: string; description: string }[] = [
    {
      level: 'easy',
      emoji: '🌱',
      description: 'Draw 1, unlimited redeals & hints',
    },
    {
      level: 'medium',
      emoji: '⚖️',
      description: 'Draw 1, 3 redeals, 3 hints',
    },
    {
      level: 'hard',
      emoji: '🔥',
      description: 'Draw 3, no redeals, no hints',
    },
  ];

  return (
    <div className="grid gap-4">
      {difficulties.map(({ level, emoji, description }) => (
        <button
          key={level}
          onClick={() => onSelect(level)}
          className={`
            p-4 rounded-lg border-2 text-left transition-all
            ${selectedDifficulty === level
              ? 'border-green-600 bg-green-50 shadow-lg'
              : 'border-gray-300 bg-white hover:border-green-400'
            }
          `}
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">{emoji}</span>
            <div className="flex-1">
              <h3 className="font-bold text-lg capitalize">{level}</h3>
              <p className="text-sm text-gray-600">{description}</p>
            </div>
            {selectedDifficulty === level && (
              <span className="text-green-600 text-2xl">✓</span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
};
```

### 5. Create New Game Dialog

**Create NewGameDialog.tsx**:
```typescript
interface NewGameDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onStartGame: (difficulty: Difficulty) => void;
}

const NewGameDialog: React.FC<NewGameDialogProps> = ({
  isOpen,
  onClose,
  onStartGame,
}) => {
  const currentDifficulty = useGameStore(state => state.difficulty);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>(currentDifficulty);

  if (!isOpen) return null;

  const handleStart = () => {
    onStartGame(selectedDifficulty);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full">
        <h2 className="text-3xl font-bold mb-6">New Game</h2>
        
        <p className="text-gray-600 mb-4">Select difficulty level:</p>
        
        <DifficultySelector
          selectedDifficulty={selectedDifficulty}
          onSelect={setSelectedDifficulty}
        />

        <div className="flex gap-4 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={handleStart}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Start Game
          </button>
        </div>
      </div>
    </div>
  );
};
```

### 6. Display Current Difficulty & Score

**Update ControlPanel.tsx**:
```typescript
const ControlPanel: React.FC = () => {
  const difficulty = useGameStore(state => state.difficulty);
  const score = useGameStore(state => state.calculateScore());
  const hintsUsed = useGameStore(state => state.hintsUsed);
  const hintsAllowed = DIFFICULTY_CONFIGS[difficulty].hintsAllowed;
  const redealCount = useGameStore(state => state.redealCount);
  const maxRedeals = DIFFICULTY_CONFIGS[difficulty].maxRedeals;

  const difficultyEmoji = {
    easy: '🌱',
    medium: '⚖️',
    hard: '🔥',
  };

  return (
    <div className="flex justify-between items-center mb-8">
      <div className="flex gap-4">
        {/* Buttons */}
      </div>

      <div className="flex gap-6 text-white">
        <div className="text-center">
          <div className="text-2xl">{difficultyEmoji[difficulty]}</div>
          <div className="text-xs capitalize">{difficulty}</div>
        </div>

        {DIFFICULTY_CONFIGS[difficulty].scoring && (
          <div className="text-center">
            <div className="text-xl font-bold">{score}</div>
            <div className="text-xs">Score</div>
          </div>
        )}

        <div className="text-center">
          <div className="text-xl">
            {hintsUsed}/{hintsAllowed === 'unlimited' ? '∞' : hintsAllowed}
          </div>
          <div className="text-xs">Hints</div>
        </div>

        <div className="text-center">
          <div className="text-xl">
            {redealCount}/{maxRedeals === 'unlimited' ? '∞' : maxRedeals}
          </div>
          <div className="text-xs">Redeals</div>
        </div>
      </div>
    </div>
  );
};
```

### 7. Update Statistics by Difficulty

**Update statistics.ts**:
```typescript
export interface GameStatistics {
  // ... existing stats
  byDifficulty: {
    easy: DifficultyStats;
    medium: DifficultyStats;
    hard: DifficultyStats;
  };
}

interface DifficultyStats {
  totalGames: number;
  gamesWon: number;
  bestScore: number | null;
  bestTime: number | null;
}
```

## Testing Requirements

1. Test difficulty initialization
2. Test draw count variations
3. Test redeal limits
4. Test hint limits
5. Test scoring calculations
6. Test difficulty switching
7. Test statistics per difficulty

## Acceptance Criteria

- [ ] Three difficulty levels available
- [ ] Difficulty selector on new game
- [ ] Draw count matches difficulty
- [ ] Redeal limits enforced
- [ ] Hint limits enforced
- [ ] Scoring works for medium/hard
- [ ] Current difficulty displayed
- [ ] Statistics track per difficulty
- [ ] Tests pass

## Files to Create

- `src/components/DifficultySelector.tsx`
- `src/components/NewGameDialog.tsx`

## Files to Modify

- `src/types/index.ts` - Add difficulty types
- `src/store/gameStore.ts` - Add difficulty logic
- `src/components/ControlPanel.tsx` - Display difficulty
- `src/utils/statistics.ts` - Track by difficulty

## Dependencies

- None (uses existing state management)

## Notes

- Start with medium difficulty by default
- Consider adding custom difficulty creator
- Vegas rules: scoring with money, draw 3, no redeals
- Consider daily challenges at specific difficulties
- Badge system for completing each difficulty

## Success Metrics

- Players try different difficulties
- Balanced challenge across levels
- Clear difficulty indicators
- Proper difficulty scaling
