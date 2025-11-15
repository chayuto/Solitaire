# Loop Detection Bug Analysis
## Date: 2025-11-15

## Issue Description
User reports: "Double check the loop detection logic. It seems that auto play game move trigger this, despite the card is move properly"

### User-Provided Example
```json
{
  "type": "tableau_to_tableau",
  "timestamp": 1763185217031,
  "card": { "suit": "hearts", "rank": "5", "faceUp": true, "id": "hearts-5" },
  "from": { "source": "tableau", "columnIndex": 6, "cardIndex": 10 },
  "to": { "target": "tableau", "columnIndex": 3 }
},
{
  "type": "tableau_to_tableau",
  "timestamp": 1763185217032,
  "card": { "suit": "spades", "rank": "4", "faceUp": true, "id": "spades-4" },
  "from": { "source": "tableau", "columnIndex": 6, "cardIndex": 11 },
  "to": { "target": "tableau", "columnIndex": 3 }
},
{
  "type": "tableau_to_tableau",
  "timestamp": 1763185217032,
  "card": { "suit": "hearts", "rank": "3", "faceUp": true, "id": "hearts-3" },
  "from": { "source": "tableau", "columnIndex": 6, "cardIndex": 12 },
  "to": { "target": "tableau", "columnIndex": 3 }
},
{
  "type": "autoplay_loop_detected",
  "timestamp": 1763185218033,
  "card": { "suit": "hearts", "rank": "A", "faceUp": true, "id": "autoplay-marker" }
}
```

### Analysis
- Three cards moved in succession (hearts-5, spades-4, hearts-3) from column 6 to column 3
- All three moves at nearly same timestamp → This is a MULTI-CARD move
- Loop detection triggers 1 second later

## Code Flow Analysis

### Current Implementation
```typescript
performAutoPlayMove: () => {
  const state = get();
  set({ autoPlayInProgress: true });
  
  // 1. Check current state hash
  const currentStateHash = getGameStateHash(state);
  const stateHistory = state.autoPlayStateHistory || [];
  
  // 2. If current state in history → Loop!
  if (stateHistory.includes(currentStateHash)) {
    // Stop with loop detected
    return;
  }
  
  // 3. Add current state to history
  const updatedStateHistory = [...stateHistory, currentStateHash].slice(-20);
  set({ autoPlayStateHistory: updatedStateHistory });
  
  // 4. Find possible moves
  // 5. Filter out moves that would lead to states in history (predictive)
  const nonLoopingMoves = possibleMoves.filter(move => {
    const futureStateHash = getStateHashAfterMove(state, move);
    return !stateHistory.includes(futureStateHash);
  });
  
  // 6. Execute best move
  // 7. Recursively call performAutoPlayMove()
}
```

### Potential Issues

#### Issue #1: False Positive from Predictive Detection?
If `getStateHashAfterMove` doesn't perfectly match actual move execution, it could filter out valid moves.

**Status:** Unlikely - code comparison shows simulation matches execution

#### Issue #2: Natural Game Convergence
If the game naturally returns to a previous configuration (e.g., moving cards back and forth), it's detected as a loop even though progress might have been made elsewhere.

**Question:** Should loop detection consider foundation progress?
- Current hash DOES include foundations
- So returning to same board with more foundation cards would have different hash
- This is correct behavior

#### Issue #3: Timing/State Mutation
The `state` variable is captured at the start, but mutations happen throughout. Could there be a mismatch?

**Status:** Unlikely - Zustand handles immutability

## Hypothesis

Looking at the user's example more carefully, I notice:
1. Multi-card move happens (three cards from column 6 to column 3)
2. This is a SINGLE game operation that creates multiple move history entries
3. After this operation, autoplay continues
4. On the next iteration, it might try to move those same cards back
5. This would return to the previous state → Loop detected ✓

**This might be CORRECT behavior, not a bug!**

The user says "card is move properly" - yes, cards ARE moving. But if they're moving in a way that creates a cycle (A→B→A), that IS a loop and should be detected.

## Questions to Investigate

1. Does the user's scenario represent a TRUE loop or a false positive?
2. Should we be more lenient with loop detection (e.g., only detect if we return to same state within N moves)?
3. Is there a specific edge case where `getStateHashAfterMove` doesn't match actual execution?

## Next Steps

1. Try to reproduce the exact scenario from user's data
2. Add detailed logging to see what states are being hashed
3. Verify that `getStateHashAfterMove` produces same hash as actual move
4. Consider if loop detection parameters (history size: 20) are appropriate

## Conclusion (Preliminary)

Without more context, the current implementation appears correct. The loop detection is working as designed - detecting when the game returns to a previous state. If the user believes this is a false positive, we need more information about:
- What was the board state before the moves?
- What was the board state after the moves?
- Was there actual progress being made (cards to foundation)?
- Or were cards just shuffling between tableau columns?
