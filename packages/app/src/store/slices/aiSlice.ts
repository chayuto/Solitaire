/**
 * AI advisor slice — thin delegations to the injected advisor controller
 * (the orchestration lives in ai/advisorController, which never imports the
 * store), plus advisor configuration and the interaction-log export.
 */
import type { AIConfig } from '../../ai';
import {
  DEFAULT_AI_CONFIG,
  applyPreset,
  exportAIInteractions as serializeAIInteractions,
} from '../../ai';
import type { AdvisorController } from '../../ai/advisorController';
import { uiToCore } from '../../adapters/coreAdapter';
import { engine } from '../engine';
import type { GameStore, StoreGet, StoreSet } from '../types';

/** Keys in {@link AIConfig} that a context preset controls. */
const AI_TOGGLE_KEYS: readonly (keyof AIConfig)[] = [
  'includeMoveHistory',
  'moveHistoryLimit',
  'includeGameMetrics',
  'includeStrategyGuidance',
  'includeHeuristicScores',
  'includeSeenDrawPileCards',
  'includeReasoningTrail',
  'reasoningTrailLimit',
];

type AiSlice = Pick<
  GameStore,
  | 'askAIForMove'
  | 'toggleAIAutoPlay'
  | 'continueAIAutoPlay'
  | 'cancelAIRequest'
  | 'setAIConfig'
  | 'clearAIError'
  | 'setAIKeyModalOpen'
  | 'exportAIInteractions'
>;

export function createAiSlice(set: StoreSet, get: StoreGet, advisor: AdvisorController): AiSlice {
  return {
  askAIForMove: () => advisor.askForMove(),

  toggleAIAutoPlay: () => advisor.toggleAutoPlay(),

  continueAIAutoPlay: () => advisor.continueAutoPlay(),

  cancelAIRequest: () => advisor.cancel(),

  setAIConfig: (patch: Partial<AIConfig>) => {
    const current = get().aiConfig ?? DEFAULT_AI_CONFIG;
    let next: AIConfig = { ...current, ...patch };

    if (patch.preset !== undefined && patch.preset !== 'custom') {
      // Switching to a named preset applies its whole toggle bundle.
      next = applyPreset(next, patch.preset);
    } else if (patch.preset === undefined && AI_TOGGLE_KEYS.some((k) => k in patch)) {
      // Changing an individual toggle moves the config into 'custom' mode.
      next.preset = 'custom';
    }

    set({ aiConfig: next });
  },

  clearAIError: () => {
    set({ aiError: undefined });
  },

  setAIKeyModalOpen: (open: boolean) => {
    set({ aiKeyModalOpen: open });
  },

  exportAIInteractions: () => {
    // Stamp the export with the current game's outcome so a harvested dataset
    // can be filtered for quality games (e.g. wins only) on its own.
    // `stalled_auto_terminated` is preferred over `incomplete` so the
    // analytics side can tell a machine-terminated doom-loop apart from a
    // genuinely abandoned game.
    const state = get();
    const outcome: 'won' | 'lost' | 'stalled_auto_terminated' | 'incomplete' =
      state.gameWon
        ? 'won'
        : engine.getLegalMoves(uiToCore(state)).length === 0
          ? 'lost'
          : advisor.wasStalled()
            ? 'stalled_auto_terminated'
            : 'incomplete';
    return serializeAIInteractions(
      {
        sessionId: state.gameSessionId ?? '',
        seed: state.seed,
        model: (state.aiConfig ?? DEFAULT_AI_CONFIG).model,
        outcome,
        finalProgress: Math.round(state.completionProgress),
        moveCount: state.moveHistory.length,
      },
      // Embed the turn-0 deal so the ai-log alone can reconstruct the board —
      // the only way we recover the deck for plain losses, which emit no
      // win/game file.
      state.initialBoardSetup,
    );
  },
  };
}
