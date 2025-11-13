# Task: Add Hint System

**Date**: 2025-11-13  
**Difficulty**: Hard  
**Estimated Time**: 4-6 hours  
**Priority**: Medium  
**Type**: Feature Addition

## Objective

Implement a hint system that suggests valid moves to help players when stuck.

## Current State

- No hint functionality exists
- Valid move detection logic exists in store
- Can check if moves are legal

## Requirements

### Functional Requirements

1. Add "Hint" button to control panel
2. Find and suggest one valid move when clicked
3. Highlight the card(s) and target location
4. Prioritize helpful moves:
   - Foundation moves (highest priority)
   - Revealing face-down cards
   - Moving Kings to empty columns
   - General tableau organization
5. Show visual indicator (glow/pulse) on suggested cards
6. Clear hint on next player action
7. Optional: Limit hints per game or add cooldown

### Technical Requirements

1. Add to `GameStore`:
   ```typescript
   currentHint?: {
     fromSource: 'tableau' | 'discard';
     fromIndex?: number;
     cardIndex?: number;
     toTarget: 'tableau' | 'foundation';
     toIndex?: number;
     suit?: Suit;
   };
   findHint: () => void;
   clearHint: () => void;
   ```

2. Implement move priority algorithm
3. Add visual highlighting to components

## Implementation Steps

1. **Update Types** (`src/types/index.ts`):
   ```typescript
   interface Hint {
     fromSource: 'tableau' | 'discard';
     fromIndex?: number;
     cardIndex?: number;
     toTarget: 'tableau' | 'foundation';
     toIndex?: number;
     suit?: Suit;
     card: Card;
   }
   ```

2. **Implement Hint Finding** (`src/store/gameStore.ts`):
   ```typescript
   findHint: () => {
     const state = get();
     let hint: Hint | undefined;

     // Priority 1: Check for foundation moves
     hint = findFoundationMoves(state);
     if (hint) {
       set({ currentHint: hint });
       return;
     }

     // Priority 2: Moves that reveal face-down cards
     hint = findRevealingMoves(state);
     if (hint) {
       set({ currentHint: hint });
       return;
     }

     // Priority 3: Kings to empty columns
     hint = findKingMoves(state);
     if (hint) {
       set({ currentHint: hint });
       return;
     }

     // Priority 4: Any valid tableau move
     hint = findTableauMoves(state);
     set({ currentHint: hint });
   }
   ```

3. **Foundation Move Finder**:
   ```typescript
   const findFoundationMoves = (state: GameState): Hint | undefined => {
     // Check discard pile top card
     if (state.discardPile.length > 0) {
       const card = state.discardPile[state.discardPile.length - 1];
       if (state.canMoveToFoundation(card, card.suit)) {
         return {
           fromSource: 'discard',
           toTarget: 'foundation',
           suit: card.suit,
           card
         };
       }
     }

     // Check tableau columns
     for (let i = 0; i < state.tableau.length; i++) {
       const column = state.tableau[i];
       if (column.length > 0) {
         const card = column[column.length - 1];
         if (card.faceUp && state.canMoveToFoundation(card, card.suit)) {
           return {
             fromSource: 'tableau',
             fromIndex: i,
             cardIndex: column.length - 1,
             toTarget: 'foundation',
             suit: card.suit,
             card
           };
         }
       }
     }

     return undefined;
   };
   ```

4. **Revealing Move Finder**:
   ```typescript
   const findRevealingMoves = (state: GameState): Hint | undefined => {
     // Find moves that would flip a face-down card
     for (let fromCol = 0; fromCol < state.tableau.length; fromCol++) {
       const column = state.tableau[fromCol];
       if (column.length === 0) continue;

       // Check if there's a face-down card
       const faceDownIndex = column.findIndex(c => !c.faceUp);
       if (faceDownIndex === -1 || faceDownIndex === column.length - 1) continue;

       // Try to move face-up cards to other columns
       for (let cardIndex = faceDownIndex + 1; cardIndex < column.length; cardIndex++) {
         const card = column[cardIndex];
         for (let toCol = 0; toCol < state.tableau.length; toCol++) {
           if (toCol === fromCol) continue;
           if (state.canMoveToTableau(card, toCol)) {
             return {
               fromSource: 'tableau',
               fromIndex: fromCol,
               cardIndex,
               toTarget: 'tableau',
               toIndex: toCol,
               card
             };
           }
         }
       }
     }

     return undefined;
   };
   ```

5. **Update Components with Highlighting**:
   ```typescript
   // In Card.tsx
   const isHinted = useGameStore(state => {
     const hint = state.currentHint;
     if (!hint) return false;
     // Check if this card is part of the hint
     return hint.card.id === card.id;
   });

   return (
     <div className={`${isHinted ? 'ring-4 ring-yellow-400 animate-pulse' : ''}`}>
       {/* Card content */}
     </div>
   );
   ```

6. **Add Hint Button** (`src/components/ControlPanel.tsx`):
   ```typescript
   const findHint = useGameStore(state => state.findHint);
   const clearHint = useGameStore(state => state.clearHint);

   <button
     onClick={findHint}
     className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
   >
     💡 Hint
   </button>
   ```

7. **Clear Hint on Action**:
   - Call `clearHint()` in all move functions
   - Clear when player makes any move

## Testing Requirements

1. Test hint finds foundation moves
2. Test hint finds revealing moves
3. Test hint finds king moves
4. Test hint highlighting works
5. Test hint clears on player action
6. Test hint when no moves available
7. Test hint button disabled when appropriate

## Acceptance Criteria

- [ ] Hint button in control panel
- [ ] Hint finds valid moves
- [ ] Prioritizes best moves
- [ ] Visual highlighting of suggested move
- [ ] Hint clears after player action
- [ ] Works with all move types
- [ ] No performance issues
- [ ] Tests pass

## Files to Modify

- `src/types/index.ts` - Add Hint type
- `src/store/gameStore.ts` - Add hint logic
- `src/components/ControlPanel.tsx` - Add hint button
- `src/components/Card.tsx` - Add highlighting
- `src/components/TableauColumn.tsx` - Add target highlighting
- `src/components/FoundationPile.tsx` - Add target highlighting
- `src/store/gameStore.test.ts` - Add tests

## Dependencies

- None (uses existing logic)

## Notes

- Hint algorithm can be sophisticated or simple
- Don't solve the entire game (one move at a time)
- Consider limiting hints per game for challenge
- Consider adding hint count to statistics
- Visual feedback is important for clarity
- Hint should time out after 5-10 seconds

## Advanced Features (Optional)

- Multi-step hint (show sequence of moves)
- "Auto-play" to foundations button
- Difficulty levels (more/fewer hints available)
- Hint cooldown timer
- Point penalty for using hints
- Smart hint algorithm using game tree search

## Success Metrics

- Players use hints when stuck
- Hints are actually helpful
- Clear visual feedback
- No false hints (invalid moves)
