import { describe, it, expect } from 'vitest';
import type { GamePolicy } from '../../src/core/GamePolicy';

// Simple test types for verifying the interface
type TestState = { value: number };
type TestMove = { id: number };

describe('GamePolicy', () => {
  it('should be importable as a type', () => {
    // This test verifies that the GamePolicy type can be imported and used
    // TypeScript compilation success is the main assertion here
    
    const createDummyPolicy = (): GamePolicy<TestState, TestMove> => {
      return {
        getLegalMoves: (state: TestState) => [],
        applyMove: (state: TestState, move: TestMove) => state,
        isTerminal: (state: TestState) => false,
        getScore: (state: TestState) => 0,
        selectSimulationMove: (state: TestState, legalMoves: TestMove[]) => legalMoves[0],
      };
    };

    const policy = createDummyPolicy();
    expect(policy).toBeDefined();
    expect(typeof policy.getLegalMoves).toBe('function');
    expect(typeof policy.applyMove).toBe('function');
    expect(typeof policy.isTerminal).toBe('function');
    expect(typeof policy.getScore).toBe('function');
    expect(typeof policy.selectSimulationMove).toBe('function');
  });

  it('should enforce correct method signatures via TypeScript', () => {
    // This test verifies type safety at compile time
    const testState: TestState = { value: 42 };
    const testMove: TestMove = { id: 1 };
    const testMoves: TestMove[] = [testMove];

    const mockPolicy: GamePolicy<TestState, TestMove> = {
      getLegalMoves: (state) => {
        expect(state).toBeDefined();
        return testMoves;
      },
      applyMove: (state, move) => {
        expect(state).toBeDefined();
        expect(move).toBeDefined();
        return { value: state.value + 1 };
      },
      isTerminal: (state) => {
        expect(state).toBeDefined();
        return state.value > 100;
      },
      getScore: (state) => {
        expect(state).toBeDefined();
        return state.value;
      },
      selectSimulationMove: (state, legalMoves) => {
        expect(state).toBeDefined();
        expect(legalMoves).toBeDefined();
        expect(legalMoves.length).toBeGreaterThan(0);
        return legalMoves[0];
      },
    };

    // Exercise all methods
    expect(mockPolicy.getLegalMoves(testState)).toEqual(testMoves);
    expect(mockPolicy.applyMove(testState, testMove)).toEqual({ value: 43 });
    expect(mockPolicy.isTerminal(testState)).toBe(false);
    expect(mockPolicy.getScore(testState)).toBe(42);
    expect(mockPolicy.selectSimulationMove(testState, testMoves)).toEqual(testMove);
  });

  it('should work with different state and move types', () => {
    // Verify interface is generic over TState and TMove
    type StringState = string;
    type StringMove = string;

    const stringPolicy: GamePolicy<StringState, StringMove> = {
      getLegalMoves: (state) => ['move1', 'move2'],
      applyMove: (state, move) => state + move,
      isTerminal: (state) => state.length > 10,
      getScore: (state) => state.length,
      selectSimulationMove: (state, legalMoves) => legalMoves[0],
    };

    expect(stringPolicy.getLegalMoves('test')).toHaveLength(2);
    expect(stringPolicy.applyMove('hello', 'world')).toBe('helloworld');
    expect(stringPolicy.isTerminal('short')).toBe(false);
    expect(stringPolicy.getScore('test')).toBe(4);
    expect(stringPolicy.selectSimulationMove('test', ['a', 'b'])).toBe('a');
  });
});
