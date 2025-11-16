# Autoplay Loop Detection Fix - 2025-11-16

## Issue Description
Autoplay was repeatedly hitting loop detection, causing the game to stop prematurely. The root cause was that autoplay would make "useless" moves (moving single face-up cards between tableau columns without revealing new cards), which could be reversed, creating loops between game states.

## Root Cause Analysis

### Original Behavior
The autoplay scoring system gave a massive +1,000,000 bonus to ANY tableau move, regardless of whether it revealed cards. This meant that moving a single card from one tableau to another (even without revealing anything) was scored higher than drawing from the pile.

For example:
- Move 7♠ to 8♥ (doesn't reveal): Score = 1,000,000 + minor bonuses
- Draw a card: Lower priority

This led to situations where autoplay would:
1. Move card A to position B (score: 1,000,000+)
2. Later move card A back to original position (score: 1,000,000+)
3. Loop detection triggers after seeing the same state

### The Problem with Useless Moves
These moves are "useless" because:
- They don't reveal any face-down cards
- They don't advance the game state meaningfully
- They can be reversed, creating loops
- They waste moves without strategic benefit

## Solution Implemented

### 1. Scoring System Refactor
Changed the tableau move scoring to differentiate between revealing and non-revealing moves:

```typescript
// Before: All tableau moves got +1,000,000
if (source === 'tableau') {
  score += 1000000; // Massive bonus for any tableau move
}

// After: Only revealing moves get the big bonus
if (source === 'tableau') {
  const revealsCard = sourceColumn !== undefined && sourceCardIndex !== undefined && 
                     sourceCardIndex > 0 && !state.tableau[sourceColumn][sourceCardIndex - 1].faceUp;
  
  if (revealsCard) {
    score += 1000000; // Massive bonus for revealing moves
  } else {
    score += 2000; // Small bonus for non-revealing moves
    
    // Penalty for single-card moves that don't reveal
    if (targetType === 'tableau' && numCardsMoving === 1) {
      score -= 10000; // Net: -8000
    }
  }
}
```

### 2. Filter Out Negative Scores
Added filtering to skip moves with negative scores:

```typescript
// Sort by score (highest first)
nonLoopingMoves.sort((a, b) => b.score - a.score);

// NEW: Filter out moves with negative scores
const worthwhileMoves = nonLoopingMoves.filter(move => move.score > 0);

// Execute the best move if we have worthwhile moves
if (worthwhileMoves.length > 0) {
  const bestMove = worthwhileMoves[0];
  // ... execute move
} else {
  // Draw card instead
}
```

### 3. Adjusted Discard Pile Penalties
The original code penalized ALL discard pile moves with -50,000, which prevented even Aces from being played to foundations. Fixed to allow foundation moves:

```typescript
// Before: Heavy penalty for all discard moves
if (source === 'discard') {
  score -= 50000;
}

// After: Different penalties for foundation vs tableau
if (source === 'discard') {
  if (targetType === 'foundation') {
    score -= 5000; // Small penalty - still playable
  } else if (targetType === 'tableau') {
    score -= 50000; // Heavy penalty for tableau
  }
}
```

## Results

### Test Results
- All 91 tests pass
- Added new test: "should avoid useless tableau-to-tableau moves that do not reveal cards"
- Updated test: "should avoid moves that would result in loop states (predictive loop detection)"

### Manual Testing Observations
1. **Initial Move**: Autoplay correctly chose to move 6♣ to 7♦, which revealed 10♥
2. **Subsequent Behavior**: After no more revealing moves available, autoplay drew from the draw pile instead of making useless tableau moves
3. **No Loop Detection**: Played through multiple draw pile cycles without triggering loop detection

### Activity Log Example
```
06:00:12 AM - Moved 6♣ from column 2 to column 3  (reveals card)
06:00:12 AM - Flipped 10♥ face up in column 2
06:00:13 AM - Drew 7♥ from draw pile
06:00:14 AM - Drew 5♥ from draw pile
... (continues drawing rather than making useless moves)
```

## Impact

### Positive
- ✅ Eliminates useless moves that lead to loops
- ✅ More strategic gameplay focused on revealing cards
- ✅ Better use of the draw pile
- ✅ Autoplay can progress further in games

### Trade-offs
- Some previously valid (but useless) moves are no longer made
- Autoplay now prefers drawing over non-revealing tableau moves
- This is the correct trade-off for avoiding loops

## Technical Details

### Files Modified
1. `packages/app/src/store/gameStore.ts`
   - Lines 791-828: Refactored tableau move scoring
   - Lines 1096-1110: Added worthwhileMoves filtering
   - Lines 923-946: Adjusted discard pile penalties

2. `packages/app/src/store/gameStore.test.ts`
   - Lines 746-822: Added new test for useless moves
   - Lines 573-685: Updated predictive loop detection test

### Score Examples

#### Revealing Move (6♣ → 7♦, reveals 10♥)
- Base: +1,000,000
- Face-down bonus: +50,000
- Reveal bonus: +100,000
- **Total: ~1,150,000** ✅

#### Non-Revealing Single Card (7♠ → 8♥)
- Base: +2,000
- Single card penalty: -10,000
- **Total: -8,000** ❌ (filtered out)

#### Draw Card
- No scored move available
- **Action: Draw from pile** ✅

## Conclusion
The fix successfully addresses the autoplay loop detection issue by making the scoring system prioritize meaningful moves (those that reveal cards) over useless moves (single cards that don't reveal anything). This aligns with good solitaire strategy and prevents the loops that were occurring before.
