# Task: Add Game Timer

**Date**: 2025-11-13  
**Difficulty**: Easy  
**Estimated Time**: 1-2 hours  
**Priority**: Medium  
**Type**: Feature Addition

## Objective

Add a timer to track how long a game session takes, displayed in the control panel.

## Current State

- No time tracking exists
- Control panel has space for additional information
- Game state tracks move history with timestamps

## Requirements

### Functional Requirements

1. Display elapsed time in MM:SS format
2. Start timer when game initializes
3. Pause timer when game is won
4. Reset timer on new game
5. Include timer value in save/load state
6. Show timer in control panel

### Technical Requirements

1. Add to `GameState` interface:
   ```typescript
   gameStartTime: number | null;
   gamePausedTime: number | null;
   totalElapsedSeconds: number;
   isTimerRunning: boolean;
   ```

2. Add to `GameStore`:
   ```typescript
   startTimer: () => void;
   pauseTimer: () => void;
   resetTimer: () => void;
   getElapsedTime: () => number;
   ```

3. Use React hook for real-time updates

## Implementation Steps

1. **Update Types** (`src/types/index.ts`):
   - Add timer properties to `GameState` interface

2. **Update Store** (`src/store/gameStore.ts`):
   - Initialize timer state in `initializeGame()`
   - Implement `startTimer()` - record start time
   - Implement `pauseTimer()` - calculate elapsed time
   - Implement `resetTimer()` - reset to zero
   - Implement `getElapsedTime()` - calculate current elapsed time

3. **Create Timer Component** (`src/components/Timer.tsx`):
   ```typescript
   const Timer: React.FC = () => {
     const [displayTime, setDisplayTime] = useState('00:00');
     const getElapsedTime = useGameStore(state => state.getElapsedTime);
     const isTimerRunning = useGameStore(state => state.isTimerRunning);

     useEffect(() => {
       if (!isTimerRunning) return;
       
       const interval = setInterval(() => {
         const seconds = getElapsedTime();
         const mins = Math.floor(seconds / 60);
         const secs = seconds % 60;
         setDisplayTime(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
       }, 1000);

       return () => clearInterval(interval);
     }, [isTimerRunning, getElapsedTime]);

     return <div className="text-white">Time: {displayTime}</div>;
   };
   ```

4. **Update Control Panel** (`src/components/ControlPanel.tsx`):
   - Import and render `Timer` component
   - Position next to other controls

5. **Update Save/Load**:
   - Include timer state in `exportGameState()`
   - Restore timer state in `importGameState()`

## Testing Requirements

1. Test timer starts on game initialization
2. Test timer updates every second
3. Test timer pauses when requested
4. Test timer resets on new game
5. Test timer persists with save/load
6. Test time format displays correctly
7. Test timer doesn't run when paused

## Acceptance Criteria

- [ ] Timer displays in MM:SS format
- [ ] Timer starts on new game
- [ ] Timer updates every second
- [ ] Timer resets on new game
- [ ] Timer included in save/load
- [ ] Timer visible in control panel
- [ ] Tests pass
- [ ] No performance issues

## Files to Modify

- `src/types/index.ts` - Add timer to GameState
- `src/store/gameStore.ts` - Add timer logic
- `src/components/Timer.tsx` - Create new component
- `src/components/ControlPanel.tsx` - Add timer display
- `src/store/gameStore.test.ts` - Add tests

## Dependencies

- None (uses React built-in hooks)

## Notes

- Consider adding elapsed time to move history
- Consider showing total game time on win screen
- Use `Date.now()` for accurate time tracking
- Consider adding pause/resume button
- Timer should not affect game performance

## UI Mockup

```
+----------------------------------+
|  [New Game] [Save] [Load]        |
|  Time: 05:32  Moves: 42          |
+----------------------------------+
```

## Success Metrics

- Players can see how long they've been playing
- Timer is accurate to the second
- No memory leaks from interval
- Clean UI integration
