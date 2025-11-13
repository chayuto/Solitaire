# Task: Add Game Statistics Tracking

**Date**: 2025-11-13  
**Difficulty**: Medium  
**Estimated Time**: 2-3 hours  
**Priority**: Medium  
**Type**: Feature Addition

## Objective

Track and display player statistics across multiple games using localStorage.

## Current State

- No statistics tracking exists
- No persistent storage beyond manual save/load
- Single game data tracked (moves, time)

## Requirements

### Functional Requirements

1. Track statistics across all games:
   - Total games played
   - Games won
   - Games lost/abandoned
   - Win percentage
   - Best time
   - Average time
   - Fewest moves
   - Average moves
2. Persist statistics in localStorage
3. Display statistics in a modal/page
4. Add "Statistics" button to control panel
5. Reset statistics option

### Technical Requirements

1. Create statistics interface:
   ```typescript
   interface GameStatistics {
     totalGames: number;
     gamesWon: number;
     gamesLost: number;
     bestTime: number | null;
     bestMoves: number | null;
     totalTime: number;
     totalMoves: number;
     currentStreak: number;
     longestStreak: number;
     lastPlayed: number;
   }
   ```

2. Use localStorage for persistence
3. Create statistics modal component
4. Update statistics on game end

## Implementation Steps

1. **Create Statistics Type** (`src/types/index.ts`):
   ```typescript
   export interface GameStatistics {
     totalGames: number;
     gamesWon: number;
     gamesLost: number;
     bestTime: number | null;
     bestMoves: number | null;
     totalTime: number;
     totalMoves: number;
     currentStreak: number;
     longestStreak: number;
     lastPlayed: number;
   }
   ```

2. **Create Statistics Manager** (`src/utils/statistics.ts`):
   ```typescript
   const STATS_KEY = 'solitaire-statistics';

   export const loadStatistics = (): GameStatistics => {
     const stored = localStorage.getItem(STATS_KEY);
     if (stored) {
       return JSON.parse(stored);
     }
     return {
       totalGames: 0,
       gamesWon: 0,
       gamesLost: 0,
       bestTime: null,
       bestMoves: null,
       totalTime: 0,
       totalMoves: 0,
       currentStreak: 0,
       longestStreak: 0,
       lastPlayed: 0,
     };
   };

   export const saveStatistics = (stats: GameStatistics): void => {
     localStorage.setItem(STATS_KEY, JSON.stringify(stats));
   };

   export const updateStatisticsOnWin = (
     stats: GameStatistics,
     moves: number,
     time: number
   ): GameStatistics => {
     const newStats = {
       ...stats,
       totalGames: stats.totalGames + 1,
       gamesWon: stats.gamesWon + 1,
       bestTime: stats.bestTime === null ? time : Math.min(stats.bestTime, time),
       bestMoves: stats.bestMoves === null ? moves : Math.min(stats.bestMoves, moves),
       totalTime: stats.totalTime + time,
       totalMoves: stats.totalMoves + moves,
       currentStreak: stats.currentStreak + 1,
       longestStreak: Math.max(stats.longestStreak, stats.currentStreak + 1),
       lastPlayed: Date.now(),
     };
     saveStatistics(newStats);
     return newStats;
   };

   export const updateStatisticsOnLoss = (
     stats: GameStatistics
   ): GameStatistics => {
     const newStats = {
       ...stats,
       totalGames: stats.totalGames + 1,
       gamesLost: stats.gamesLost + 1,
       currentStreak: 0,
       lastPlayed: Date.now(),
     };
     saveStatistics(newStats);
     return newStats;
   };

   export const resetStatistics = (): void => {
     localStorage.removeItem(STATS_KEY);
   };
   ```

3. **Create Statistics Modal** (`src/components/StatisticsModal.tsx`):
   ```typescript
   interface StatisticsModalProps {
     isOpen: boolean;
     onClose: () => void;
     statistics: GameStatistics;
     onReset: () => void;
   }

   const StatisticsModal: React.FC<StatisticsModalProps> = ({
     isOpen,
     onClose,
     statistics,
     onReset
   }) => {
     if (!isOpen) return null;

     const winPercentage = statistics.totalGames > 0
       ? ((statistics.gamesWon / statistics.totalGames) * 100).toFixed(1)
       : '0.0';

     const avgTime = statistics.gamesWon > 0
       ? Math.floor(statistics.totalTime / statistics.gamesWon)
       : 0;

     const avgMoves = statistics.gamesWon > 0
       ? Math.floor(statistics.totalMoves / statistics.gamesWon)
       : 0;

     return (
       <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
         <div className="bg-white rounded-lg p-8 max-w-2xl w-full">
           <h2 className="text-3xl font-bold mb-6">📊 Statistics</h2>
           
           <div className="grid grid-cols-2 gap-4 mb-6">
             <StatCard label="Games Played" value={statistics.totalGames} />
             <StatCard label="Games Won" value={statistics.gamesWon} />
             <StatCard label="Win Rate" value={`${winPercentage}%`} />
             <StatCard label="Current Streak" value={statistics.currentStreak} />
             <StatCard label="Longest Streak" value={statistics.longestStreak} />
             <StatCard label="Best Time" value={formatTime(statistics.bestTime)} />
             <StatCard label="Best Moves" value={statistics.bestMoves ?? '-'} />
             <StatCard label="Avg Time" value={formatTime(avgTime)} />
             <StatCard label="Avg Moves" value={avgMoves} />
           </div>

           <div className="flex gap-4">
             <button
               onClick={onClose}
               className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
             >
               Close
             </button>
             <button
               onClick={() => {
                 if (confirm('Reset all statistics?')) {
                   onReset();
                 }
               }}
               className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
             >
               Reset Stats
             </button>
           </div>
         </div>
       </div>
     );
   };

   const StatCard: React.FC<{ label: string; value: string | number }> = ({
     label,
     value
   }) => (
     <div className="bg-gray-100 rounded p-4 text-center">
       <p className="text-sm text-gray-600 mb-1">{label}</p>
       <p className="text-2xl font-bold">{value}</p>
     </div>
   );
   ```

4. **Integrate with Game Store** (`src/store/gameStore.ts`):
   ```typescript
   import { loadStatistics, updateStatisticsOnWin } from '../utils/statistics';

   // In setGameWon function:
   setGameWon: () => {
     // ... existing win detection
     const moves = get().moveHistory.length;
     const time = get().getElapsedTime();
     const stats = loadStatistics();
     updateStatisticsOnWin(stats, moves, time);
   }
   ```

5. **Add Statistics Button** (`src/components/ControlPanel.tsx`):
   ```typescript
   const [showStats, setShowStats] = useState(false);
   const [statistics, setStatistics] = useState(loadStatistics());

   <button
     onClick={() => {
       setStatistics(loadStatistics());
       setShowStats(true);
     }}
     className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
   >
     📊 Stats
   </button>

   <StatisticsModal
     isOpen={showStats}
     onClose={() => setShowStats(false)}
     statistics={statistics}
     onReset={() => {
       resetStatistics();
       setStatistics(loadStatistics());
     }}
   />
   ```

## Testing Requirements

1. Test statistics load from localStorage
2. Test statistics update on win
3. Test statistics update on new game (loss)
4. Test win percentage calculation
5. Test best time/moves tracking
6. Test streak tracking
7. Test statistics reset
8. Test statistics modal display

## Acceptance Criteria

- [ ] Statistics tracked across games
- [ ] Statistics persist in localStorage
- [ ] Statistics modal displays all data
- [ ] Statistics update correctly on win/loss
- [ ] Best time and moves tracked
- [ ] Streak tracking works
- [ ] Reset functionality works
- [ ] Tests pass

## Files to Create

- `src/types/index.ts` - Add GameStatistics interface
- `src/utils/statistics.ts` - Statistics manager
- `src/components/StatisticsModal.tsx` - Statistics display

## Files to Modify

- `src/store/gameStore.ts` - Integrate statistics updates
- `src/components/ControlPanel.tsx` - Add stats button

## Dependencies

- None (uses localStorage)

## Notes

- Consider adding graphs for trends over time
- Consider exporting statistics as CSV
- Consider comparing with global leaderboards
- Format times nicely (MM:SS)
- Consider adding today's stats vs all-time

## Success Metrics

- Players can track their progress
- Statistics motivate continued play
- Data persists correctly
- No localStorage issues
