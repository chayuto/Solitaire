# Metrics Implementation - Perceived Difficulty & Completion Progress

**Date:** November 14, 2025  
**Author:** GitHub Copilot  
**Issue:** Add perceived difficulty score and completion progress metrics

## Overview

This document describes the implementation of two new game metrics for the Solitaire game:

1. **Perceived Difficulty Score**: A 0-100 score that analyzes the starting board configuration to estimate game difficulty
2. **Completion Progress**: A 0-100% metric showing how close the player is to winning

## Requirements Analysis

From the issue:
- Calculate perceived difficulty score based on deck starting condition (separate from user difficulty setting)
- If starting condition not found (loaded game), don't throw error - leave as nil
- Calculate game completion progress metric
- Display both metrics in UI

## Implementation Details

### 1. Perceived Difficulty Score

**Location:** `src/store/gameStore.ts` - `calculatePerceivedDifficulty()`

**Algorithm:**
The score is calculated based on multiple factors from the initial board setup:

1. **Buried Low Cards (0-30 points)**
   - Aces and 2s are critical for starting foundations
   - Cards buried deeper in face-down stacks score higher
   - Formula: `depthFactor * 5` per buried low card, capped at 30

2. **Face-Down Card Distribution (0-25 points)**
   - More face-down cards = harder game
   - Based on ratio of face-down cards to total (21 face-down in standard deal)
   - Formula: `(totalFaceDown / 21) * 25`

3. **Empty Columns (0 to -25 points)**
   - Empty columns provide flexibility (negative score = easier)
   - Each empty column: `-5 points`

4. **Card Sequence Potential (0 to -20 points)**
   - Counts immediate tableau card pairings available
   - More available sequences = easier game
   - Formula: `-(sequencePotential / maxPossibleSequences) * 20`

5. **Draw Pile Size (0-10 points)**
   - More cards in draw pile = more options but more work
   - Formula: `(drawPileSize / 24) * 10`

**Result:** Score normalized to 0-100 range, rounded to integer

**Edge Cases:**
- Returns `undefined` if `initialBoardSetup` is not available
- Handles empty columns gracefully
- All calculations bounded to prevent overflow

### 2. Completion Progress

**Location:** `src/store/gameStore.ts` - `calculateCompletionProgress()`

**Algorithm:**

1. **Basic Progress (0-100%)**
   - Primary metric: cards in foundations / 52 total cards
   - Represents actual win progress

2. **Face-Up Bonus (0-7%)**
   - Awards small bonus for revealing tableau cards
   - Initial deal has 7 face-up cards (one per column)
   - Additional face-ups: `additionalFaceUp * 0.5%`, capped at 7%
   - Shows progress even when not moving cards to foundation

**Result:** Total progress capped at 100%, rounded to 1 decimal place

**Updates:** Automatically recalculated after:
- Cards moved to tableau
- Cards moved to foundation
- Game state imported

### 3. Type Definitions

**Location:** `src/types/index.ts`

Added to `GameState` interface:
```typescript
perceivedDifficulty?: number; // 0-100, undefined if no initial setup
completionProgress: number;   // 0-100
```

### 4. State Management

**Initialization:** (`initializeGameState`)
- `perceivedDifficulty`: Calculated from `initialBoardSetup`
- `completionProgress`: Starts at 0

**Updates:**
- Perceived difficulty: Set only at initialization or import (doesn't change during game)
- Completion progress: Updated after every move via `calculateCompletionProgress()`

**Export/Import:**
- Both metrics included in game state export
- Import recalculates completion progress from current state
- Import preserves or recalculates perceived difficulty based on availability

### 5. UI Integration

**Location:** `src/components/ControlPanel.tsx`

**Display:**
- Added metrics section below move counter
- Completion progress: Blue progress bar with percentage
- Perceived difficulty: Color-coded progress bar (green <30, yellow 30-59, red 60+)
- Perceived difficulty only shown when available (undefined handling)

**Styling:**
- Compact design fitting Control Panel width
- Progress bars with smooth transitions
- Clear labels and percentage/score display

## Testing

**Test File:** `src/store/gameStore.metrics.test.ts`

**Coverage:**
- 13 comprehensive tests covering:
  - Perceived difficulty calculation and ranges
  - Handling of missing initial board setup
  - Completion progress tracking
  - Progress updates after moves
  - Export/import functionality
  - Integration between both metrics

**Results:** All 62 tests passing (49 existing + 13 new)

## Security

- **CodeQL Analysis:** No security vulnerabilities found
- **Input Validation:** All calculations handle edge cases safely
- **No External Dependencies:** Pure calculation based on game state

## Performance Considerations

- **Perceived Difficulty:** Calculated once at game start (O(n) where n = tableau cards)
- **Completion Progress:** Lightweight calculation (O(1) - just counting foundation cards)
- **UI Updates:** Smooth with CSS transitions, no performance impact

## Edge Cases Handled

1. ✅ Loaded game without `initialBoardSetup` → `perceivedDifficulty` is `undefined`
2. ✅ Empty columns in initial setup → Correctly factored into difficulty score
3. ✅ All cards in foundation → Progress exactly 100%
4. ✅ Export/import cycle → Metrics preserved correctly
5. ✅ Different difficulty settings → Each generates unique board with own perceived score

## Future Enhancements

Potential improvements (not in scope):
- Historical tracking of perceived difficulty vs actual completion time
- Difficulty score adjustments based on player actions
- More sophisticated AI-based difficulty prediction
- Completion progress prediction based on current state

## Files Changed

1. `src/types/index.ts` - Added metric types
2. `src/store/gameStore.ts` - Calculation functions and state management
3. `src/components/ControlPanel.tsx` - UI display
4. `src/store/gameStore.metrics.test.ts` - Test suite

## Validation

- ✅ Lint: Passing
- ✅ Build: Successful
- ✅ Tests: 62/62 passing
- ✅ Security: No vulnerabilities
- ✅ Manual Testing: Verified in browser with screenshots

## Screenshots

See PR for screenshots showing:
- Initial game metrics display
- Progress after moves (11.2% completion)
- Different difficulty levels (varying perceived difficulty scores)

## Conclusion

The metrics implementation successfully meets all requirements:
- Perceived difficulty calculated from initial board (or nil if unavailable)
- Completion progress tracks game state
- Both displayed in UI with clear visual feedback
- Comprehensive test coverage
- No security issues
- Handles all edge cases gracefully
