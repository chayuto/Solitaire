/**
 * MCTSNode - Node in the Monte Carlo Search Tree
 * 
 * Represents a single node in the MCTS tree structure. Each node contains:
 * - Immutable game state
 * - Parent/child relationships
 * - Mutable statistics (visits, value)
 * - Unexpanded moves (shuffled for unbiased expansion)
 * 
 * @template TState - Game state type (e.g., GameState from @chayuto/solitaire-core)
 * @template TMove - Move type (e.g., MoveCommand from @chayuto/solitaire-core)
 */
export class MCTSNode<TState, TMove> {
  // === Immutable Properties ===
  
  /** Game state at this node (never mutated) */
  public readonly state: TState;
  
  /** Move that led from parent to this node (null for root) */
  public readonly move: TMove | null;
  
  /** Parent node reference (null for root) */
  public readonly parent: MCTSNode<TState, TMove> | null;
  
  // === Mutable Statistics ===
  
  /** Array of expanded child nodes */
  public children: MCTSNode<TState, TMove>[] = [];
  
  /** Number of simulations backpropagated through this node */
  public visits: number = 0;
  
  /** Total normalized value accumulated from simulations [0, visits] */
  public value: number = 0;
  
  // === Private Expansion State ===
  
  /** Moves that haven't been expanded yet (shuffled for randomness) */
  private untriedMoves: TMove[];
  
  /**
   * Construct a new MCTS node
   * 
   * @param state - Immutable game state at this node
   * @param move - Move that led from parent to this node (null for root)
   * @param parent - Parent node reference (null for root)
   * @param allMoves - All legal moves from this state (will be shuffled)
   */
  constructor(
    state: TState,
    move: TMove | null,
    parent: MCTSNode<TState, TMove> | null,
    allMoves: TMove[]
  ) {
    this.state = state;
    this.move = move;
    this.parent = parent;
    // Shuffle moves to prevent expansion bias
    this.untriedMoves = this.shuffleArray([...allMoves]);
  }
  
  // === Public Methods ===
  
  /**
   * Check if all possible moves from this node have been expanded
   * @returns true if no untried moves remain
   */
  public isFullyExpanded(): boolean {
    return this.untriedMoves.length === 0;
  }
  
  /**
   * Check if this node is a leaf in the tree (no expanded children)
   * @returns true if no children have been expanded yet
   */
  public isTreeLeaf(): boolean {
    return this.children.length === 0;
  }
  
  /**
   * Calculate the average value per visit (exploitation term)
   * @returns Average value, or 0 if no visits
   */
  public getAverageValue(): number {
    return this.visits === 0 ? 0 : this.value / this.visits;
  }
  
  /**
   * Pop one untried move from the stack (for expansion)
   * @returns An untried move, or undefined if all moves have been tried
   */
  public popUntriedMove(): TMove | undefined {
    return this.untriedMoves.pop();
  }
  
  // === Private Methods ===
  
  /**
   * Fisher-Yates shuffle algorithm
   * Shuffles array in-place and returns it
   * 
   * @param array - Array to shuffle
   * @returns The same array, shuffled
   */
  private shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}
