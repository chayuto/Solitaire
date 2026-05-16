import { describe, it, expect, beforeEach } from 'vitest';
import { scenarios, scenarioNames, isScenarioName } from './testScenarios';
import { useGameStore } from './store/gameStore';

/**
 * Validates that every board-state fixture is a complete, legal 52-card deal
 * the store will accept — a broken fixture should fail here, not mid-test.
 */

describe('testScenarios', () => {
  beforeEach(() => {
    useGameStore.getState().initializeGame();
  });

  it('exposes a non-empty, consistent scenario list', () => {
    expect(scenarioNames.length).toBeGreaterThan(0);
    expect(scenarioNames).toEqual(Object.keys(scenarios));
  });

  it.each(scenarioNames)('"%s" is a complete 52-card deal with unique cards', (name) => {
    const state = scenarios[name]();
    const allCards = [
      ...state.drawPile,
      ...state.discardPile,
      ...state.foundations.hearts,
      ...state.foundations.diamonds,
      ...state.foundations.clubs,
      ...state.foundations.spades,
      ...state.tableau.flat(),
    ];

    expect(allCards).toHaveLength(52);
    expect(new Set(allCards.map((c) => c.id)).size).toBe(52);
    expect(state.tableau).toHaveLength(7);
  });

  it.each(scenarioNames)('"%s" is accepted by importGameState', (name) => {
    const ok = useGameStore.getState().importGameState(JSON.stringify(scenarios[name]()));
    expect(ok).not.toBe(false);
  });

  it('isScenarioName guards unknown names', () => {
    expect(isScenarioName('oneMoveFromWinning')).toBe(true);
    expect(isScenarioName('nope')).toBe(false);
  });
});
