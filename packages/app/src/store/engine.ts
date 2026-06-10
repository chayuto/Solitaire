import { GameEngine } from '@chayuto/solitaire-core';

/**
 * Shared core engine instance — legal-move generation, validation and board
 * transitions for every slice and the AI advisor (ADR-0005).
 */
export const engine = new GameEngine();
