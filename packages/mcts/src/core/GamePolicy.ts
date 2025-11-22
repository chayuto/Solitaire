/**
 * GamePolicy - Abstract interface for game-specific logic in MCTS
 * 
 * This interface defines the contract that any game must implement to work
 * with the MCTS solver. It abstracts game-specific operations (move generation,
 * state transitions, scoring) from the generic MCTS algorithm.
 * 
 * The interface is generic over two type parameters:
 * - TState: The game state type (must be immutable)
 * - TMove: The move/action type
 * 
 * @template TState - Game state type (e.g., GameState from @chayuto/solitaire-core)
 * @template TMove - Move/action type (e.g., MoveCommand from @chayuto/solitaire-core)
 * 
 * @example
 * ```typescript
 * // Example implementation for a simple game
 * class TicTacToePolicy implements GamePolicy<TicTacToeState, TicTacToeMove> {
 *   getLegalMoves(state: TicTacToeState): TicTacToeMove[] {
 *     return state.board
 *       .map((cell, index) => cell === null ? { position: index } : null)
 *       .filter(move => move !== null);
 *   }
 * 
 *   applyMove(state: TicTacToeState, move: TicTacToeMove): TicTacToeState {
 *     const newBoard = [...state.board];
 *     newBoard[move.position] = state.currentPlayer;
 *     return {
 *       ...state,
 *       board: newBoard,
 *       currentPlayer: state.currentPlayer === 'X' ? 'O' : 'X'
 *     };
 *   }
 * 
 *   isTerminal(state: TicTacToeState): boolean {
 *     return hasWinner(state) || isBoardFull(state);
 *   }
 * 
 *   getScore(state: TicTacToeState): number {
 *     if (hasWinner(state)) return 1.0;
 *     if (isBoardFull(state)) return 0.5;
 *     return 0.0;
 *   }
 * 
 *   selectSimulationMove(state: TicTacToeState, legalMoves: TicTacToeMove[]): TicTacToeMove {
 *     // Random selection for simple games
 *     return legalMoves[Math.floor(Math.random() * legalMoves.length)];
 *   }
 * }
 * ```
 */
export interface GamePolicy<TState, TMove> {
  /**
   * Get all legal moves from the current game state
   * 
   * This method should return all valid moves that can be executed from the
   * given state. The MCTS algorithm uses this to:
   * - Initialize untried moves in new nodes
   * - Detect terminal states (no legal moves)
   * - Ensure only valid moves are explored
   * 
   * **Requirements**:
   * - Must return an array (can be empty)
   * - Moves must be executable via applyMove()
   * - Should not modify the input state
   * - Order doesn't matter (will be shuffled by MCTSNode)
   * 
   * **Performance**: This method is called frequently during tree expansion.
   * Optimize for speed if possible (target: <1ms for typical states).
   * 
   * @param state - Current game state (immutable)
   * @returns Array of legal moves (empty if terminal state or no moves available)
   * 
   * @example
   * ```typescript
   * const moves = policy.getLegalMoves(currentState);
   * if (moves.length === 0) {
   *   console.log('Terminal state or no legal moves');
   * }
   * ```
   */
  getLegalMoves(state: TState): TMove[];

  /**
   * Apply a move to a state and return the resulting new state
   * 
   * This method performs a state transition: given a state and a move,
   * it returns a new state representing the game after the move is executed.
   * 
   * **Requirements**:
   * - Must NOT mutate the input state (functional/immutable approach)
   * - Must return a new state object
   * - The move must be legal (from getLegalMoves)
   * - If move is illegal, behavior is undefined (may throw or return invalid state)
   * 
   * **Performance**: This is the most frequently called method in MCTS
   * (called once per simulation). Optimize aggressively (target: <0.5ms).
   * 
   * @param state - Current game state (immutable)
   * @param move - Legal move to apply
   * @returns New state after applying the move
   * 
   * @example
   * ```typescript
   * const currentState = { score: 10, position: 0 };
   * const move = { direction: 'right' };
   * const newState = policy.applyMove(currentState, move);
   * // currentState remains unchanged (immutability)
   * // newState = { score: 10, position: 1 }
   * ```
   */
  applyMove(state: TState, move: TMove): TState;

  /**
   * Check if a state is terminal (game over)
   * 
   * A terminal state is one where the game has ended, either because:
   * - A win/loss condition has been met
   * - No more moves are available
   * - A draw condition has been reached
   * 
   * The MCTS algorithm uses this to:
   * - Stop simulation playouts at terminal states
   * - Avoid expanding terminal nodes
   * - Calculate final scores
   * 
   * **Requirements**:
   * - Must return true if game is definitively over
   * - Must return false if game can continue
   * - Should be consistent with getLegalMoves() returning empty array
   * - Should not modify the input state
   * 
   * **Performance**: Called frequently during simulation.
   * Should be fast (target: <0.1ms).
   * 
   * @param state - Game state to check
   * @returns true if the game has ended, false otherwise
   * 
   * @example
   * ```typescript
   * if (policy.isTerminal(state)) {
   *   const finalScore = policy.getScore(state);
   *   console.log(`Game over! Final score: ${finalScore}`);
   * }
   * ```
   */
  isTerminal(state: TState): boolean;

  /**
   * Evaluate a game state and return a raw score
   * 
   * This method provides a heuristic evaluation of how good a state is.
   * The score is used by MCTS to guide search and estimate state values.
   * 
   * **Score Interpretation**:
   * - Higher scores = better states (for the current player)
   * - The raw score will be normalized to [0, 1] by the MCTS solver
   * - For terminal states, should return the final game outcome
   * - For non-terminal states, should return a heuristic estimate
   * 
   * **Requirements**:
   * - Must return a numeric value
   * - Should be deterministic (same state → same score)
   * - Should not modify the input state
   * - Recommended range: [0, maxScore] where maxScore is known/bounded
   * 
   * **Performance**: Called once per simulation at terminal state.
   * Complexity is acceptable here (target: <10ms for complex heuristics).
   * 
   * @param state - Game state to evaluate
   * @returns Raw score (will be normalized by solver)
   * 
   * @example
   * ```typescript
   * // Simple win/loss scoring
   * getScore(state: ChessState): number {
   *   if (state.checkmate) return state.winner === 'white' ? 1000 : 0;
   *   if (state.stalemate) return 500;
   *   return evaluateMaterialAdvantage(state);
   * }
   * 
   * // Complex heuristic scoring
   * getScore(state: SolitaireState): number {
   *   return (
   *     state.foundationCount * 10 +    // Foundation cards worth 10 points
   *     state.faceUpTableauCards * 1 +  // Face-up cards worth 1 point
   *     (state.gameWon ? 1000 : 0)      // Bonus for winning
   *   );
   * }
   * ```
   */
  getScore(state: TState): number;

  /**
   * Select a move for simulation/playout phase
   * 
   * This method is called during the simulation phase of MCTS to select
   * moves for the random playout from a non-terminal leaf node to a
   * terminal state.
   * 
   * **Strategy Options**:
   * - **Random**: Select uniformly at random (simple, unbiased)
   * - **Greedy**: Use heuristics to prefer promising moves (faster convergence)
   * - **Hybrid**: Mix random and greedy selection
   * 
   * **Requirements**:
   * - Must return one of the provided legal moves
   * - Should not return null/undefined
   * - legalMoves array is guaranteed to be non-empty
   * - Should not modify state or moves array
   * 
   * **Trade-offs**:
   * - Random selection: More exploration, slower convergence, simpler
   * - Greedy selection: Faster convergence, potential bias, more complex
   * 
   * **Performance**: Called many times during simulation.
   * Should be very fast (target: <0.1ms for random, <1ms for greedy).
   * 
   * @param state - Current game state during simulation
   * @param legalMoves - Non-empty array of legal moves (from getLegalMoves)
   * @returns Selected move for simulation
   * 
   * @example
   * ```typescript
   * // Random selection (simple, unbiased)
   * selectSimulationMove(state: GameState, legalMoves: Move[]): Move {
   *   const randomIndex = Math.floor(Math.random() * legalMoves.length);
   *   return legalMoves[randomIndex];
   * }
   * 
   * // Greedy selection (heuristic-guided)
   * selectSimulationMove(state: GameState, legalMoves: Move[]): Move {
   *   // Prefer moves that increase foundation count
   *   const priorityMoves = legalMoves.filter(m => m.type === 'tableau_to_foundation');
   *   if (priorityMoves.length > 0) {
   *     return priorityMoves[Math.floor(Math.random() * priorityMoves.length)];
   *   }
   *   return legalMoves[Math.floor(Math.random() * legalMoves.length)];
   * }
   * 
   * // Hybrid selection (configurable mix)
   * selectSimulationMove(state: GameState, legalMoves: Move[]): Move {
   *   if (Math.random() < 0.3) {
   *     return selectGreedy(state, legalMoves);  // 30% greedy
   *   }
   *   return selectRandom(legalMoves);  // 70% random
   * }
   * ```
   */
  selectSimulationMove(state: TState, legalMoves: TMove[]): TMove;
}
