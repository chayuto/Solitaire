# Task: Add Undo/Redo Functionality

**Date**: 2025-11-13  
**Difficulty**: Medium  
**Estimated Time**: 2-3 hours  
**Priority**: High  
**Type**: Feature Addition

## Objective

Implement undo and redo functionality to allow players to reverse and replay their moves.

## Current State

- Game tracks move history in `moveHistory` array in the store
- No undo/redo UI or logic exists
- Move history records all game actions with timestamps

## Requirements

### Functional Requirements

1. Add undo button to reverse the last move
2. Add redo button to replay an undone move
3. Maintain separate undo and redo stacks
4. Update game state correctly when undoing/redoing
5. Clear redo stack when new move is made
6. Limit undo history (e.g., last 50 moves)
7. Disable buttons when stacks are empty

### Technical Requirements

1. Extend `gameStore.ts` with:
   - `undoStack: Move[]`
   - `redoStack: Move[]`
   - `undo()` function
   - `redo()` function
   - `canUndo()` computed property
   - `canRedo()` computed property

2. Update `ControlPanel.tsx` to add undo/redo buttons

3. Ensure all move types are reversible:
   - `draw_card` - return card to draw pile
   - `tableau_to_tableau` - reverse the move
   - `tableau_to_foundation` - return card to tableau
   - `discard_to_tableau` - return card to discard
   - `discard_to_foundation` - return card to discard
   - `flip_card` - flip card back face down

## Implementation Steps

1. **Update Store** (`src/store/gameStore.ts`):
   ```typescript
   interface GameStore extends GameState {
     // ... existing properties
     undoStack: Move[];
     redoStack: Move[];
     undo: () => void;
     redo: () => void;
     canUndo: () => boolean;
     canRedo: () => boolean;
   }
   ```

2. **Implement Undo Logic**:
   - Pop move from undoStack
   - Reverse the move effect on game state
   - Push move to redoStack
   - Update all relevant piles

3. **Implement Redo Logic**:
   - Pop move from redoStack
   - Reapply the move effect
   - Push move back to undoStack

4. **Update UI** (`src/components/ControlPanel.tsx`):
   - Add "Undo" button (keyboard: Ctrl+Z)
   - Add "Redo" button (keyboard: Ctrl+Y)
   - Disable when stacks are empty
   - Style consistently with existing buttons

5. **Keyboard Shortcuts**:
   - Ctrl+Z or Cmd+Z for undo
   - Ctrl+Y or Cmd+Shift+Z for redo

6. **Clear Redo Stack**:
   - On new move, clear redoStack
   - Modify all move-making functions

## Testing Requirements

1. Test undo for each move type
2. Test redo for each move type
3. Test multiple undo/redo in sequence
4. Test redo stack clearing on new move
5. Test button disabled states
6. Test keyboard shortcuts
7. Test with saved/loaded games

## Acceptance Criteria

- [ ] Undo button reverses last move correctly
- [ ] Redo button replays undone move correctly
- [ ] Buttons disabled when appropriate
- [ ] Keyboard shortcuts work
- [ ] All move types are reversible
- [ ] Game state is correct after undo/redo
- [ ] Multiple undo/redo operations work
- [ ] Tests pass
- [ ] No console errors

## Files to Modify

- `src/store/gameStore.ts` - Add undo/redo logic
- `src/components/ControlPanel.tsx` - Add UI buttons
- `src/store/gameStore.test.ts` - Add tests

## Dependencies

- None (uses existing state structure)

## Notes

- Consider adding visual feedback when undo/redo occurs
- Consider showing undo stack size to user
- Ensure face-down cards remain face-down after undo
- Consider adding undo limit configuration

## References

- Existing move history implementation in `gameStore.ts`
- Control panel styling in `ControlPanel.tsx`

## Success Metrics

- Players can undo mistakes
- Improved user experience
- No bugs in game state after undo/redo
