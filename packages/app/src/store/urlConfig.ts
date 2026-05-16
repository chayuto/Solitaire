/**
 * URL-driven game configuration.
 *
 * Reads optional query parameters so a game can be launched in a fully
 * reproducible state — essential for deterministic, high-fidelity automated
 * and agentic (Playwright / MCP) testing.
 *
 * Supported parameters:
 *   ?seed=<integer>        Reproducible deal. Same seed => identical board.
 *   ?difficulty=<1..5>     Difficulty level (1=Very Easy ... 5=Very Hard).
 *
 * Examples:
 *   /?seed=42
 *   /?seed=1337&difficulty=2
 *
 * @module store/urlConfig
 */

import type { Difficulty } from '../types';
import { DEFAULT_DIFFICULTY } from '../constants';

/** Resolved game configuration. */
export interface GameConfig {
  difficulty: Difficulty;
  /** RNG seed; `undefined` means a random (non-reproducible) deal. */
  seed?: number;
}

/**
 * Parses game configuration from a URL search string.
 * Pure and side-effect free so it can be unit tested directly.
 *
 * @param search - A `location.search` style string (e.g. `"?seed=42"`).
 * @returns The resolved {@link GameConfig}.
 */
export function parseGameConfig(search: string): GameConfig {
  const config: GameConfig = { difficulty: DEFAULT_DIFFICULTY };
  const params = new URLSearchParams(search);

  const rawSeed = params.get('seed');
  if (rawSeed !== null && rawSeed.trim() !== '') {
    const seed = Number(rawSeed);
    if (Number.isFinite(seed)) {
      config.seed = Math.trunc(seed);
    }
  }

  const rawDifficulty = params.get('difficulty');
  if (rawDifficulty !== null) {
    const difficulty = Number(rawDifficulty);
    if (Number.isInteger(difficulty) && difficulty >= 1 && difficulty <= 5) {
      config.difficulty = difficulty as Difficulty;
    }
  }

  return config;
}

/**
 * Reads game configuration from the current browser URL.
 * Falls back to defaults outside a browser (e.g. SSR / unit tests).
 */
export function readGameConfig(): GameConfig {
  if (typeof window === 'undefined') {
    return { difficulty: DEFAULT_DIFFICULTY };
  }
  return parseGameConfig(window.location.search);
}

/** Game configuration resolved once at module load from the launch URL. */
export const initialGameConfig: GameConfig = readGameConfig();
