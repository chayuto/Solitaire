# Loop Detection Bug Fix - Summary

## Date: 2025-11-15

## Issue
**Title:** Bug in loop detection?  
**Description:** "Double check the loop detection logic. It seems that auto play game move trigger this, despite the card is move properly"

### User Evidence
The user provided move history showing:
- Three consecutive tableau-to-tableau moves (hearts-5, spades-4, hearts-3 from column 6 to column 3)
- These moves executed successfully at timestamps 1763185217031/032/032
- Loop detection triggered immediately after at timestamp 1763185218033
- This suggested the loop detection was triggering prematurely despite valid moves being made

## Root Cause Analysis

### The Bug
The predictive loop detection feature (added in a previous fix) had a subtle variable scoping bug:

```typescript
// Line 616: Capture state history from current state (before adding current state hash)
const stateHistory = state.autoPlayStateHistory || [];

// Line 638: Create updated history including current state
const updatedStateHistory = [...stateHistory, currentStateHash].slice(-20);
set({ autoPlayStateHistory: updatedStateHistory });

// ... later in the code ...

// Line 1048-1050: BUG - Using OLD stateHistory instead of NEW updatedStateHistory
const nonLoopingMoves = possibleMoves.filter(move => {
  const futureStateHash = getStateHashAfterMove(state, move);
  return !stateHistory.includes(futureStateHash);  // ❌ Should use updatedStateHistory!
});
```

### Impact
The predictive loop detection was checking against the OLD history (before adding the current state) instead of the NEW history (after adding the current state). This meant:

1. **Moves that would return to the current state were NOT being filtered out**
2. The system would make a move back to the current state
3. On the next iteration, it would detect the current state in history and trigger loop detection
4. This caused premature loop detection even when valid alternative moves existed

### Why It Manifested as Premature Detection
In the user's scenario:
1. State A: cards in positions before multi-card move
2. Add hash(A) to history using `updatedStateHistory` → store has [hash(A)]
3. Predictive check uses `stateHistory` (still empty []) instead of `updatedStateHistory` ([hash(A)])
4. Doesn't filter out moves that would lead back to A
5. Makes a move that returns to A
6. Next iteration: sees A in history → Loop detected ❌

## The Fix

### Code Change
**File:** `src/store/gameStore.ts`  
**Line:** 1050

**Before:**
```typescript
return !stateHistory.includes(futureStateHash);
```

**After:**
```typescript
return !updatedStateHistory.includes(futureStateHash);
```

### Why This Works
By using `updatedStateHistory` (which includes the current state), the predictive loop detection now:
1. Properly filters out moves that would return to the current state
2. Only allows moves that lead to genuinely new states
3. Prevents the premature loop detection issue

## Testing

### Unit Tests
- ✅ All 79 existing tests pass
- ✅ No test changes required (behavior is now more correct)

### Manual Testing
Started dev server and enabled auto-play:

**Results:**
- Auto-play made **28 successful moves** before detecting a genuine loop
- Moves included:
  - Moving cards to foundations (A♣, A♦, 2♦)
  - Drawing cards from draw pile
  - Moving cards between tableau columns
  - Flipping face-down cards
- Completion reached **7.8%** before stopping
- Loop detection triggered appropriately when truly stuck

**Before Fix:** Would trigger loop detection prematurely (based on user report)  
**After Fix:** Makes significant progress before detecting genuine loops

### Code Quality
- ✅ ESLint: No issues
- ✅ TypeScript: Compiles successfully
- ✅ Build: Succeeds (dist/ generated)
- ✅ CodeQL: 0 security alerts

## Files Changed

1. **src/store/gameStore.ts** - Fixed predictive loop detection to use correct history variable
2. **docs/internal/20251115_loop_detection_analysis.md** - Analysis documentation (created during investigation)
3. **docs/internal/20251115_loop_detection_bug_fix_summary.md** - This summary document

## Impact

### Correctness
- ✅ Loop detection now works as intended
- ✅ Predictive filtering properly prevents returning to current state
- ✅ Auto-play explores more moves before giving up

### Performance
- No performance impact (same number of operations)
- Still maintains efficient state history (last 20 states)

### User Experience
- Much better auto-play behavior
- Game progresses further before detecting loops
- Fewer false positive loop detections

## Related Documentation

- **Previous Fix:** `docs/internal/20251114_autoplay_loop_fix.md` - Implemented predictive loop detection
- **This Fix:** Corrects a variable scoping bug in that implementation

## Conclusion

The bug was a subtle variable scoping issue where the predictive loop detection was using a stale reference to the state history. By changing one variable name from `stateHistory` to `updatedStateHistory`, the loop detection now works correctly, allowing auto-play to make significant progress before stopping only when genuinely stuck in a loop.

The fix is minimal, surgical, and maintains all existing functionality while correcting the premature loop detection issue reported by the user.
