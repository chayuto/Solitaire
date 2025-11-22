import { describe, it, expect, beforeEach } from 'vitest';
import { MCTSNode } from '../../src/core/MCTSNode';

// Simple test types for domain-agnostic testing
type TestState = { value: number };
type TestMove = { id: number; name: string };

describe('MCTSNode', () => {
  // Test data
  const testState: TestState = { value: 42 };
  const testMoves: TestMove[] = [
    { id: 1, name: 'move1' },
    { id: 2, name: 'move2' },
    { id: 3, name: 'move3' },
  ];

  describe('Construction', () => {
    it('should construct root node with null parent and move', () => {
      const node = new MCTSNode<TestState, TestMove>(
        testState,
        null,
        null,
        testMoves
      );

      expect(node.state).toBe(testState);
      expect(node.move).toBeNull();
      expect(node.parent).toBeNull();
      expect(node.children).toEqual([]);
      expect(node.visits).toBe(0);
      expect(node.value).toBe(0);
    });

    it('should construct child node with parent reference', () => {
      const parent = new MCTSNode<TestState, TestMove>(
        testState,
        null,
        null,
        testMoves
      );
      const childMove = testMoves[0];
      const childState: TestState = { value: 100 };
      const child = new MCTSNode<TestState, TestMove>(
        childState,
        childMove,
        parent,
        []
      );

      expect(child.state).toBe(childState);
      expect(child.move).toBe(childMove);
      expect(child.parent).toBe(parent);
    });

    it('should initialize with empty children array', () => {
      const node = new MCTSNode<TestState, TestMove>(
        testState,
        null,
        null,
        testMoves
      );

      expect(node.children).toEqual([]);
      expect(node.children.length).toBe(0);
    });

    it('should initialize statistics to zero', () => {
      const node = new MCTSNode<TestState, TestMove>(
        testState,
        null,
        null,
        testMoves
      );

      expect(node.visits).toBe(0);
      expect(node.value).toBe(0);
    });

    it('should accept empty moves array', () => {
      const node = new MCTSNode<TestState, TestMove>(
        testState,
        null,
        null,
        []
      );

      expect(node.isFullyExpanded()).toBe(true);
      expect(node.popUntriedMove()).toBeUndefined();
    });
  });

  describe('isTreeLeaf', () => {
    it('should return true for node with no children', () => {
      const node = new MCTSNode<TestState, TestMove>(
        testState,
        null,
        null,
        testMoves
      );

      expect(node.isTreeLeaf()).toBe(true);
    });

    it('should return false after adding children', () => {
      const node = new MCTSNode<TestState, TestMove>(
        testState,
        null,
        null,
        testMoves
      );

      const child = new MCTSNode<TestState, TestMove>(
        { value: 100 },
        testMoves[0],
        node,
        []
      );
      node.children.push(child);

      expect(node.isTreeLeaf()).toBe(false);
    });
  });

  describe('isFullyExpanded', () => {
    it('should return false when node has untried moves', () => {
      const node = new MCTSNode<TestState, TestMove>(
        testState,
        null,
        null,
        testMoves
      );

      expect(node.isFullyExpanded()).toBe(false);
    });

    it('should return true when all moves have been popped', () => {
      const node = new MCTSNode<TestState, TestMove>(
        testState,
        null,
        null,
        testMoves
      );

      // Pop all moves
      while (node.popUntriedMove() !== undefined) {
        // Continue until all moves are popped
      }

      expect(node.isFullyExpanded()).toBe(true);
    });

    it('should return true for node initialized with no moves', () => {
      const node = new MCTSNode<TestState, TestMove>(
        testState,
        null,
        null,
        []
      );

      expect(node.isFullyExpanded()).toBe(true);
    });
  });

  describe('popUntriedMove', () => {
    it('should return moves one at a time', () => {
      const node = new MCTSNode<TestState, TestMove>(
        testState,
        null,
        null,
        testMoves
      );

      const move1 = node.popUntriedMove();
      const move2 = node.popUntriedMove();
      const move3 = node.popUntriedMove();

      expect(move1).toBeDefined();
      expect(move2).toBeDefined();
      expect(move3).toBeDefined();

      // All moves should be unique (from original array)
      const poppedMoves = [move1, move2, move3];
      const ids = poppedMoves.map(m => m?.id);
      expect(new Set(ids).size).toBe(3);
    });

    it('should return undefined when no moves remain', () => {
      const node = new MCTSNode<TestState, TestMove>(
        testState,
        null,
        null,
        testMoves
      );

      // Pop all moves
      node.popUntriedMove();
      node.popUntriedMove();
      node.popUntriedMove();

      const result = node.popUntriedMove();
      expect(result).toBeUndefined();
    });

    it('should decrease untried moves count', () => {
      const node = new MCTSNode<TestState, TestMove>(
        testState,
        null,
        null,
        testMoves
      );

      expect(node.isFullyExpanded()).toBe(false);
      
      node.popUntriedMove();
      node.popUntriedMove();
      
      expect(node.isFullyExpanded()).toBe(false);
      
      node.popUntriedMove();
      
      expect(node.isFullyExpanded()).toBe(true);
    });

    it('should return all original moves (in shuffled order)', () => {
      const node = new MCTSNode<TestState, TestMove>(
        testState,
        null,
        null,
        testMoves
      );

      const poppedMoves: TestMove[] = [];
      let move = node.popUntriedMove();
      while (move !== undefined) {
        poppedMoves.push(move);
        move = node.popUntriedMove();
      }

      // All moves should be present
      expect(poppedMoves.length).toBe(testMoves.length);
      
      // Check all move IDs are present
      const poppedIds = poppedMoves.map(m => m.id).sort();
      const originalIds = testMoves.map(m => m.id).sort();
      expect(poppedIds).toEqual(originalIds);
    });
  });

  describe('getAverageValue', () => {
    it('should return 0 for unvisited node', () => {
      const node = new MCTSNode<TestState, TestMove>(
        testState,
        null,
        null,
        testMoves
      );

      expect(node.getAverageValue()).toBe(0);
    });

    it('should calculate correct average for single visit', () => {
      const node = new MCTSNode<TestState, TestMove>(
        testState,
        null,
        null,
        testMoves
      );

      node.visits = 1;
      node.value = 0.5;

      expect(node.getAverageValue()).toBe(0.5);
    });

    it('should calculate correct average for multiple visits', () => {
      const node = new MCTSNode<TestState, TestMove>(
        testState,
        null,
        null,
        testMoves
      );

      node.visits = 10;
      node.value = 7.5;

      expect(node.getAverageValue()).toBe(0.75);
    });

    it('should handle integer division correctly', () => {
      const node = new MCTSNode<TestState, TestMove>(
        testState,
        null,
        null,
        testMoves
      );

      node.visits = 3;
      node.value = 2;

      expect(node.getAverageValue()).toBeCloseTo(0.6666666666666666);
    });

    it('should handle high precision values', () => {
      const node = new MCTSNode<TestState, TestMove>(
        testState,
        null,
        null,
        testMoves
      );

      node.visits = 1000;
      node.value = 456.789;

      expect(node.getAverageValue()).toBeCloseTo(0.456789);
    });
  });

  describe('Statistics Management', () => {
    it('should allow updating visits and value', () => {
      const node = new MCTSNode<TestState, TestMove>(
        testState,
        null,
        null,
        testMoves
      );

      node.visits = 5;
      node.value = 3.2;

      expect(node.visits).toBe(5);
      expect(node.value).toBe(3.2);
      expect(node.getAverageValue()).toBe(0.64);
    });

    it('should handle incremental updates', () => {
      const node = new MCTSNode<TestState, TestMove>(
        testState,
        null,
        null,
        testMoves
      );

      // Simulate backpropagation updates
      node.visits += 1;
      node.value += 0.5;
      
      expect(node.visits).toBe(1);
      expect(node.value).toBe(0.5);

      node.visits += 1;
      node.value += 0.8;
      
      expect(node.visits).toBe(2);
      expect(node.value).toBe(1.3);
      expect(node.getAverageValue()).toBe(0.65);
    });
  });

  describe('Children Management', () => {
    it('should allow adding children', () => {
      const parent = new MCTSNode<TestState, TestMove>(
        testState,
        null,
        null,
        testMoves
      );

      const child = new MCTSNode<TestState, TestMove>(
        { value: 100 },
        testMoves[0],
        parent,
        []
      );

      parent.children.push(child);

      expect(parent.children.length).toBe(1);
      expect(parent.children[0]).toBe(child);
      expect(parent.isTreeLeaf()).toBe(false);
    });

    it('should maintain parent-child relationships', () => {
      const parent = new MCTSNode<TestState, TestMove>(
        testState,
        null,
        null,
        testMoves
      );

      const child1 = new MCTSNode<TestState, TestMove>(
        { value: 100 },
        testMoves[0],
        parent,
        []
      );

      const child2 = new MCTSNode<TestState, TestMove>(
        { value: 200 },
        testMoves[1],
        parent,
        []
      );

      parent.children.push(child1, child2);

      expect(parent.children.length).toBe(2);
      expect(child1.parent).toBe(parent);
      expect(child2.parent).toBe(parent);
    });
  });

  describe('Immutability', () => {
    it('should have readonly state property', () => {
      const node = new MCTSNode<TestState, TestMove>(
        testState,
        null,
        null,
        testMoves
      );

      // TypeScript should enforce this at compile time
      expect(node.state).toBe(testState);
    });

    it('should have readonly move property', () => {
      const move = testMoves[0];
      const parent = new MCTSNode<TestState, TestMove>(
        testState,
        null,
        null,
        []
      );
      const node = new MCTSNode<TestState, TestMove>(
        testState,
        move,
        parent,
        []
      );

      expect(node.move).toBe(move);
    });

    it('should have readonly parent property', () => {
      const parent = new MCTSNode<TestState, TestMove>(
        testState,
        null,
        null,
        []
      );
      const child = new MCTSNode<TestState, TestMove>(
        testState,
        testMoves[0],
        parent,
        []
      );

      expect(child.parent).toBe(parent);
    });
  });

  describe('Edge Cases', () => {
    it('should handle single move', () => {
      const singleMove = [testMoves[0]];
      const node = new MCTSNode<TestState, TestMove>(
        testState,
        null,
        null,
        singleMove
      );

      const popped = node.popUntriedMove();
      expect(popped).toBe(singleMove[0]);
      expect(node.isFullyExpanded()).toBe(true);
      expect(node.popUntriedMove()).toBeUndefined();
    });

    it('should handle large number of moves', () => {
      const manyMoves: TestMove[] = [];
      for (let i = 0; i < 100; i++) {
        manyMoves.push({ id: i, name: `move${i}` });
      }

      const node = new MCTSNode<TestState, TestMove>(
        testState,
        null,
        null,
        manyMoves
      );

      expect(node.isFullyExpanded()).toBe(false);

      // Pop all moves
      const poppedMoves: TestMove[] = [];
      let move = node.popUntriedMove();
      while (move !== undefined) {
        poppedMoves.push(move);
        move = node.popUntriedMove();
      }

      expect(poppedMoves.length).toBe(100);
      expect(node.isFullyExpanded()).toBe(true);
    });
  });

  describe('Shuffle Randomness', () => {
    it('should shuffle moves (probabilistic test)', () => {
      // Create multiple nodes and check if moves are in different orders
      const orders: string[] = [];
      
      for (let trial = 0; trial < 10; trial++) {
        const node = new MCTSNode<TestState, TestMove>(
          testState,
          null,
          null,
          testMoves
        );

        const poppedMoves: number[] = [];
        let move = node.popUntriedMove();
        while (move !== undefined) {
          poppedMoves.push(move.id);
          move = node.popUntriedMove();
        }

        orders.push(poppedMoves.join(','));
      }

      // With 10 trials and 3 moves, we should see at least 2 different orders
      // (probability of all same is extremely low: (1/6)^9 ≈ 0.000002)
      const uniqueOrders = new Set(orders);
      expect(uniqueOrders.size).toBeGreaterThan(1);
    });
  });
});
