# Task: Add Win Detection and Victory Modal

**Date**: 2025-11-13  
**Difficulty**: Medium  
**Estimated Time**: 2-3 hours  
**Priority**: High  
**Type**: Feature Addition

## Objective

Detect when the player has won the game and display a victory modal with game statistics.

## Current State

- No win detection logic exists
- No victory screen or modal
- Game continues even when won
- Game state has all necessary data for win detection

## Requirements

### Functional Requirements

1. Detect when all foundations are complete (K at top)
2. Display victory modal automatically
3. Show game statistics:
   - Time taken
   - Number of moves
   - Congratulatory message
4. Provide "New Game" button in modal
5. Pause game timer on win
6. Optional: Confetti or celebration animation

### Technical Requirements

1. Add to `GameState`:
   ```typescript
   isGameWon: boolean;
   winTime?: number;
   ```

2. Add to `GameStore`:
   ```typescript
   checkWinCondition: () => boolean;
   setGameWon: () => void;
   ```

3. Create new component `VictoryModal.tsx`

## Implementation Steps

1. **Update Types** (`src/types/index.ts`):
   - Add `isGameWon: boolean` to `GameState`
   - Add `winTime?: number` to track when game was won

2. **Implement Win Detection** (`src/store/gameStore.ts`):
   ```typescript
   checkWinCondition: () => {
     const { foundations } = get();
     // All foundations must have 13 cards (A through K)
     return Object.values(foundations).every(pile => pile.length === 13);
   },

   setGameWon: () => {
     const state = get();
     if (state.checkWinCondition() && !state.isGameWon) {
       set({
         isGameWon: true,
         winTime: Date.now(),
       });
       state.pauseTimer?.(); // If timer implemented
     }
   }
   ```

3. **Call Win Check**:
   - Add to `moveCardToFoundation()`
   - Check after every successful foundation move

4. **Create Victory Modal** (`src/components/VictoryModal.tsx`):
   ```typescript
   interface VictoryModalProps {
     isOpen: boolean;
     onClose: () => void;
     stats: {
       moves: number;
       time: string;
     };
   }

   const VictoryModal: React.FC<VictoryModalProps> = ({ isOpen, onClose, stats }) => {
     if (!isOpen) return null;

     return (
       <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
         <div className="bg-white rounded-lg p-8 max-w-md text-center shadow-2xl">
           <h2 className="text-3xl font-bold text-green-600 mb-4">
             🎉 Congratulations! 🎉
           </h2>
           <p className="text-xl mb-6">You won!</p>
           <div className="bg-gray-100 rounded p-4 mb-6">
             <p className="text-lg">Time: {stats.time}</p>
             <p className="text-lg">Moves: {stats.moves}</p>
           </div>
           <button
             onClick={onClose}
             className="bg-green-600 text-white px-6 py-3 rounded hover:bg-green-700"
           >
             New Game
           </button>
         </div>
       </div>
     );
   };
   ```

5. **Integrate Modal** (`src/components/GameBoard.tsx`):
   - Import `VictoryModal`
   - Subscribe to `isGameWon` state
   - Calculate stats (moves, time)
   - Pass to modal component
   - On modal close, call `initializeGame()`

6. **Optional: Add Confetti**:
   - Use `canvas-confetti` package or CSS animation
   - Trigger on win detection

## Testing Requirements

1. Test win detection when all foundations complete
2. Test modal appears on win
3. Test modal shows correct statistics
4. Test "New Game" button works
5. Test timer stops on win
6. Test win state persists with save/load
7. Test no false positives (incomplete game)

## Acceptance Criteria

- [ ] Game detects win correctly
- [ ] Modal appears automatically on win
- [ ] Statistics display correctly
- [ ] New Game button resets game
- [ ] Timer stops on win (if implemented)
- [ ] Modal is styled attractively
- [ ] No win detection when game incomplete
- [ ] Tests pass
- [ ] No console errors

## Files to Modify

- `src/types/index.ts` - Add win state
- `src/store/gameStore.ts` - Add win detection logic
- `src/components/VictoryModal.tsx` - Create new component
- `src/components/GameBoard.tsx` - Integrate modal
- `src/store/gameStore.test.ts` - Add tests

## Dependencies

### Optional
- `canvas-confetti` - For celebration animation (optional)

## Notes

- Win detection is simple: all 4 foundations have 13 cards
- Consider adding score calculation (time bonus, move efficiency)
- Consider adding win statistics tracking over multiple games
- Consider adding "Share Score" functionality
- Modal should be keyboard accessible (Esc to close)

## UI Mockup

```
+--------------------------------------------------+
|                                                  |
|           🎉 Congratulations! 🎉                 |
|                                                  |
|               You won the game!                  |
|                                                  |
|            ┌─────────────────┐                   |
|            │  Time: 05:32    │                   |
|            │  Moves: 142     │                   |
|            └─────────────────┘                   |
|                                                  |
|              [ New Game ]                        |
|                                                  |
+--------------------------------------------------+
```

## Success Metrics

- Players feel rewarded when winning
- Clear indication of victory
- Encourages playing again
- No bugs in win detection
