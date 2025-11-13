# Task: Add Move Counter Display

**Date**: 2025-11-13  
**Difficulty**: Easy  
**Estimated Time**: 30 minutes - 1 hour  
**Priority**: Low  
**Type**: Feature Addition

## Objective

Display the number of moves made in the current game session in the control panel.

## Current State

- Move history is tracked in `moveHistory` array
- No visible move counter in UI
- `moveHistory.length` provides move count

## Requirements

### Functional Requirements

1. Display move count in control panel
2. Update count in real-time as moves are made
3. Reset count on new game
4. Include in save/load state (automatic via moveHistory)

### Technical Requirements

1. Read from existing `moveHistory.length`
2. Add display component in `ControlPanel.tsx`
3. Style consistently with other UI elements

## Implementation Steps

1. **Update Control Panel** (`src/components/ControlPanel.tsx`):
   ```typescript
   const moveCount = useGameStore(state => state.moveHistory.length);
   
   return (
     <div className="...">
       {/* Existing buttons */}
       <div className="text-white text-lg">
         Moves: {moveCount}
       </div>
     </div>
   );
   ```

2. **Style the Counter**:
   - Use white text on green background
   - Font size: text-lg or text-xl
   - Position near timer (if implemented)
   - Add spacing for visual separation

3. **Optional Enhancements**:
   - Add icon (↔️ or similar)
   - Add tooltip with move history
   - Highlight number on move

## Testing Requirements

1. Test counter shows 0 on new game
2. Test counter increments on moves
3. Test counter resets on new game
4. Test counter persists with save/load
5. Test display is visible and readable

## Acceptance Criteria

- [ ] Move counter displays in control panel
- [ ] Counter shows correct number of moves
- [ ] Counter updates in real-time
- [ ] Counter resets on new game
- [ ] Counter included in save/load
- [ ] Clean visual integration
- [ ] Tests pass

## Files to Modify

- `src/components/ControlPanel.tsx` - Add move counter display

## Dependencies

- None (uses existing moveHistory)

## Notes

- This is a simple read-only display
- No new state needed
- Move history already tracked for undo/redo
- Consider displaying move efficiency score later

## UI Example

```
+----------------------------------+
|  [New Game] [Save] [Load]        |
|  Moves: 42                       |
+----------------------------------+
```

Or with timer:
```
+----------------------------------+
|  [New Game] [Save] [Load]        |
|  Time: 05:32  |  Moves: 42       |
+----------------------------------+
```

## Success Metrics

- Players can see move count
- Minimal code changes
- Clean UI integration
