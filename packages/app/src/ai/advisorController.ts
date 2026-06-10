/**
 * AI Move Advisor controller — the orchestration engine behind the store's
 * AI actions (ask-for-move, AI auto-play, cancellation).
 *
 * Lives in `ai/` but deliberately does NOT import the store: it receives
 * `{ get, set, engine }` by injection ({@link AdvisorDeps}), preserving the
 * one-way `ai/ -> (nothing)` dependency rule. All per-run mutable state that
 * used to live at the store's module scope (abort controller, loop/stall
 * tracking, the token-runaway turn cap) is owned here and cleared by
 * {@link AdvisorController.resetRunState} on new game / session load.
 *
 * @module ai/advisorController
 */

import { hashGameState, shuffle } from '@chayuto/solitaire-core';
import type { GameEngine, MoveCommand } from '@chayuto/solitaire-core';
import { uiToCore } from '../adapters/coreAdapter';
import type { GameState } from '../types';
import {
  AIError,
  AI_DECISION_LOG_LIMIT,
  AI_AUTO_MOVE_DELAY,
  AI_AUTO_HISTORY_LIMIT,
  AI_AUTO_LOOP_LIMIT,
  AI_AUTO_STALL_SHUFFLE_FRACTION,
  AI_AUTO_TURN_CAP,
  AI_AUTO_TURN_CAP_RESUME_INCREMENT,
  AI_AUTO_RETRY_COOLDOWN,
  AI_RETRY_MAX_ATTEMPTS,
  DEFAULT_AI_CONFIG,
  buildContext,
  buildSystemInstruction,
  computeProgressComponents,
  describeMoveCommand,
  getEffectiveKey,
  getLastAIInteraction,
  getProvider,
  isTransientAIError,
  recordAIInteraction,
  setLastInteractionMovesApplied,
  shouldTerminateOnStall,
  shuffleFraction,
  suggestMoveWithRetry,
  uuidv7,
} from './index';
import type { AIDecisionRecord } from './index';

/** The slice of the store the controller drives: state plus the one action it applies moves through. */
export type AdvisorStore = GameState & {
  applyMoveCommand: (command: MoveCommand) => void;
};

/** Store access + engine, injected so ai/ never imports the store. */
export interface AdvisorDeps {
  get: () => AdvisorStore;
  set: (partial: Partial<GameState>) => void;
  engine: GameEngine;
}

export interface AdvisorController {
  /** Ask the configured LLM for the next move and apply it (one turn). */
  askForMove: () => Promise<void>;
  /** Toggle AI auto-play on/off (with the same guards the store always had). */
  toggleAutoPlay: () => void;
  /** Schedule the next AI auto-play turn (loop/stall/turn-cap guards). */
  continueAutoPlay: () => void;
  /** Abort the in-flight request, if any. */
  cancel: () => void;
  /** Clear all per-run state: abort, counters, timers. Call on new game/session load. */
  resetRunState: () => void;
  /** Whether the current game's auto-play was halted by the stall terminator. */
  wasStalled: () => boolean;
}

export function createAdvisorController(deps: AdvisorDeps): AdvisorController {
  const { get, set, engine } = deps;

  /** Abort controller for the in-flight AI request. */
  let aiAbortController: AbortController | null = null;
  /** Board hashes seen during the current auto-play run (loop detection). */
  let aiAutoStateHistory: string[] = [];
  /** Progress components at the previous turn + consecutive flat-turn count. */
  let aiAutoLastProgress: { f: number; d: number } | null = null;
  let aiAutoStallCount = 0;
  /** Move types applied across the current flat-progress plateau. */
  let aiAutoRecentMoveTypes: string[] = [];
  /** Whether the stall terminator halted this game's auto-play. */
  let aiAutoStalled = false;
  /** Move-count at which auto-play pauses for manual resume (token cap). */
  let aiAutoTurnCap = AI_AUTO_TURN_CAP;
  /** Owned handle for the scheduled next turn / retry cooldown. */
  let pendingTimer: ReturnType<typeof setTimeout> | null = null;

  const askForMove = async (): Promise<void> => {
    const state = get();

    // --- Guards ---
    if (state.aiThinking) {
      return; // a request is already in flight
    }
    if (state.gameWon) {
      set({ aiError: 'The game is already won.', aiAutoPlay: false });
      return;
    }
    if (state.replayMode) {
      set({ aiError: 'Cannot ask the AI while in replay mode.', aiAutoPlay: false });
      return;
    }
    if (state.autoPlayEnabled) {
      set({ aiError: 'Cannot ask the AI while auto-play is running.', aiAutoPlay: false });
      return;
    }

    const config = state.aiConfig ?? DEFAULT_AI_CONFIG;

    // Resolve the provider.
    let provider;
    try {
      provider = getProvider(config.provider);
    } catch (err) {
      set({
        aiError: err instanceof AIError ? err.message : 'AI provider configuration error.',
        aiAutoPlay: false,
      });
      return;
    }

    // Resolve the API key. No key => prompt for one instead of erroring.
    const apiKey = provider.requiresKey ? getEffectiveKey(config.provider) : '';
    if (provider.requiresKey && !apiKey) {
      set({ aiError: undefined, aiKeyModalOpen: true, aiAutoPlay: false });
      return;
    }

    // Generate the legal moves the AI must choose from. Shuffle them so the
    // draw move is not always at index 0 — a fixed order biases the model
    // toward index 0 and skews any harvested decision dataset.
    const coreState = uiToCore(state);
    const legalMoves = shuffle(engine.getLegalMoves(coreState));
    if (legalMoves.length === 0) {
      set({
        aiError: 'No legal moves are available — try drawing or starting a new game.',
        aiAutoPlay: false,
      });
      return;
    }

    // Forced position: exactly one legal move. There is no decision to make, so
    // auto-play it without spending an API call, and log a synthetic interaction
    // (`event: 'forced_move'`) so the harvested move sequence stays complete.
    // This path lives entirely inside the advisor flow — a person playing by
    // hand is never auto-advanced; manual play stays natural.
    if (legalMoves.length === 1) {
      const command = legalMoves[0];
      const beforeLen = get().moveHistory.length;
      get().applyMoveCommand(command);
      const afterMoves = get().moveHistory;
      const applied = afterMoves.slice(beforeLen);
      if (applied.length > 0) {
        const annotated = afterMoves.map((move, i) =>
          i < beforeLen ? move : { ...move, aiMove: true },
        );
        annotated[beforeLen] = {
          ...annotated[beforeLen],
          aiReasoning: 'Only one legal move — auto-played.',
        };
        set({ moveHistory: annotated });
      }
      recordAIInteraction({
        id: uuidv7(),
        requestId: uuidv7(),
        sessionId: get().gameSessionId ?? '',
        attempt: 1,
        timestamp: Date.now(),
        provider: config.provider,
        model: config.model,
        seed: state.seed,
        turnIndex: beforeLen,
        config,
        event: 'forced_move',
        movesApplied: applied.map((m) => m.type),
        outcome: 'success',
        durationMs: 0,
        prompt: '',
      });
      set({ aiError: undefined, aiStatus: undefined });
      if (get().aiAutoPlay) continueAutoPlay();
      return;
    }

    const context = buildContext(state, legalMoves, config, state.aiDecisionLog ?? []);
    const systemInstruction = buildSystemInstruction(config);

    // --- Begin the request ---
    aiAbortController = new AbortController();
    const requestStartedAt = Date.now();
    // UUIDv7 idempotency id for this logical request; retries reuse it and
    // every interaction is logged under it.
    const requestId = uuidv7();
    set({
      aiThinking: true,
      aiThinkingSince: requestStartedAt,
      aiStatus: undefined,
      aiRetryCount: 0,
      aiError: undefined,
    });

    try {
      // Retry transient failures (flaky network, rate limits, 5xx responses,
      // the occasional unparseable answer) with exponential backoff.
      const decision = await suggestMoveWithRetry(
        provider,
        {
          apiKey: apiKey ?? '',
          model: config.model,
          systemInstruction,
          context,
          signal: aiAbortController.signal,
          requestId,
          sessionId: get().gameSessionId,
          seed: state.seed,
          turnIndex: state.moveHistory.length,
          config,
        },
        {
          maxAttempts: AI_RETRY_MAX_ATTEMPTS,
          signal: aiAbortController.signal,
          onRetry: ({ attempt, maxAttempts, error, delayMs }) => {
            set({
              aiRetryCount: attempt,
              aiStatus:
                `${error.message} Retrying ${attempt + 1}/${maxAttempts} ` +
                `in ${Math.round(delayMs / 1000)}s.`,
            });
          },
        },
      );

      // Resignation: `move_index: -1` means the model surrendered the game
      // because no legal move can productively advance and drawing is
      // exhausted. The 2026-05-26 ask wired this through; the harness applies
      // no move, records the decision with `moveType: 'resign'`, stops
      // auto-play, and ends the session. The interaction was logged by the
      // provider with `outcome: 'resigned'` and the decision's analysis text
      // / confidence intact.
      if (decision.moveIndex === -1) {
        setLastInteractionMovesApplied([]);
        const interaction = getLastAIInteraction();
        const record: AIDecisionRecord = {
          timestamp: Date.now(),
          moveType: 'resign',
          describe: 'AI resigned',
          boardAnalysis: decision.boardAnalysis,
          reasoning: decision.reasoning,
          confidence: decision.confidence,
          model: config.model,
          requestId,
          moveIndex: -1,
          legalMoveCount: legalMoves.length,
          durationMs: Date.now() - requestStartedAt,
          retries: get().aiRetryCount ?? 0,
          promptTokens: interaction?.promptTokens,
          thoughtTokens: interaction?.thoughtTokens,
          outputTokens: interaction?.outputTokens,
          totalTokens: interaction?.totalTokens,
        };
        const aiDecisionLog = [...(get().aiDecisionLog ?? []), record].slice(
          -AI_DECISION_LOG_LIMIT,
        );
        set({
          aiThinking: false,
          aiThinkingSince: undefined,
          aiStatus: 'AI resigned.',
          aiDecisionLog,
          aiError: undefined,
          aiAutoPlay: false,
        });
        console.info(
          `[AI] resign applied in ${((Date.now() - requestStartedAt) / 1000).toFixed(1)}s`,
        );
        return;
      }

      // Defensive: the provider already range-checked moveIndex, but never
      // index a move list with an unverified value.
      if (decision.moveIndex < 0 || decision.moveIndex >= legalMoves.length) {
        throw new AIError('bad_response', 'AI chose a move outside the legal set.');
      }
      const command = legalMoves[decision.moveIndex];

      // Re-validate against the *current* state before applying. The board is
      // locked while aiThinking, so this should always pass.
      if (!engine.canApplyMove(uiToCore(get()), command)) {
        throw new AIError('bad_response', 'The chosen move is no longer valid.');
      }

      // Apply the move, then annotate the new move-history entries: every
      // entry of the move is flagged as an AI move (so a multi-card move
      // reads as one AI action, not a mix), and the lead entry carries the
      // reasoning the Activity Log surfaces.
      const beforeLen = get().moveHistory.length;
      get().applyMoveCommand(command);
      const afterMoves = get().moveHistory;
      if (afterMoves.length > beforeLen) {
        const annotated = afterMoves.map((move, i) =>
          i < beforeLen ? move : { ...move, aiMove: true },
        );
        annotated[beforeLen] = {
          ...annotated[beforeLen],
          aiReasoning: decision.reasoning,
          aiConfidence: decision.confidence,
        };
        set({ moveHistory: annotated });
      }

      // Attach the move-history entry types this decision produced to its
      // interaction, so a consequence entry (e.g. an automatic `flip_card`) is
      // not misread as a turn with a missing log entry.
      setLastInteractionMovesApplied(
        afterMoves.slice(beforeLen).map((m) => m.type),
      );

      // Record the decision. This drives the advisor panel and the reasoning
      // trail, is exported with the game, and carries enough cost/choice
      // detail to serve as a benchmarking dataset row.
      const interaction = getLastAIInteraction();
      const record: AIDecisionRecord = {
        timestamp: Date.now(),
        moveType: command.type,
        describe: describeMoveCommand(command, state),
        boardAnalysis: decision.boardAnalysis,
        reasoning: decision.reasoning,
        confidence: decision.confidence,
        alternativeDescribe:
          decision.alternativeMoveIndex !== undefined
            ? describeMoveCommand(legalMoves[decision.alternativeMoveIndex], state)
            : undefined,
        model: config.model,
        requestId,
        moveIndex: decision.moveIndex,
        legalMoveCount: legalMoves.length,
        durationMs: Date.now() - requestStartedAt,
        retries: get().aiRetryCount ?? 0,
        promptTokens: interaction?.promptTokens,
        thoughtTokens: interaction?.thoughtTokens,
        outputTokens: interaction?.outputTokens,
        totalTokens: interaction?.totalTokens,
      };
      const aiDecisionLog = [...(get().aiDecisionLog ?? []), record].slice(
        -AI_DECISION_LOG_LIMIT,
      );
      set({
        aiThinking: false,
        aiThinkingSince: undefined,
        aiStatus: undefined,
        aiDecisionLog,
        aiError: undefined,
      });

      // Diagnostic: total time for this move, including any retries.
      const retries = get().aiRetryCount ?? 0;
      console.info(
        `[AI] move applied in ${((Date.now() - requestStartedAt) / 1000).toFixed(1)}s` +
          (retries > 0 ? ` after ${retries} retr${retries === 1 ? 'y' : 'ies'}` : ''),
      );

      // If AI auto-play is engaged, queue the next move.
      if (get().aiAutoPlay) {
        continueAutoPlay();
      }
    } catch (err) {
      // A user-initiated cancel is not an error worth surfacing.
      if (err instanceof AIError && err.kind === 'aborted') {
        set({
          aiThinking: false,
          aiThinkingSince: undefined,
          aiStatus: undefined,
          aiError: undefined,
        });
        return;
      }
      const message =
        err instanceof AIError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Unexpected AI error.';

      // In auto-play, a transient (infrastructure) failure must not stop the
      // run. The retries above are already exhausted, so cool down and
      // re-attempt the move. LLM endpoints are not always stable.
      if (get().aiAutoPlay && isTransientAIError(err)) {
        // Honor a server-suggested wait (e.g. a 429 RetryInfo) so auto-play
        // does not re-attempt before a rate-limit window has cleared.
        const cooldownMs =
          err instanceof AIError && err.retryAfterMs !== undefined
            ? err.retryAfterMs
            : AI_AUTO_RETRY_COOLDOWN;
        set({
          aiThinking: false,
          aiThinkingSince: undefined,
          aiStatus: undefined,
          aiError: `${message} Auto-play retries in ${Math.round(cooldownMs / 1000)}s.`,
        });
        pendingTimer = setTimeout(() => {
          pendingTimer = null;
          if (get().aiAutoPlay && !get().aiThinking) {
            void askForMove();
          }
        }, cooldownMs);
        return;
      }

      // Otherwise stop: a non-transient error, or a manual single request.
      set({
        aiThinking: false,
        aiThinkingSince: undefined,
        aiStatus: undefined,
        aiError: message,
        aiAutoPlay: false,
      });
    } finally {
      aiAbortController = null;
    }
  };


  const toggleAutoPlay = (): void => {
    const state = get();
    if (state.aiAutoPlay) {
      // Stop: abort any in-flight request and the scheduled next turn so it
      // halts immediately.
      aiAbortController?.abort();
      if (pendingTimer) {
        clearTimeout(pendingTimer);
        pendingTimer = null;
      }
      set({ aiAutoPlay: false });
      return;
    }
    // Start.
    if (state.gameWon) {
      set({ aiError: 'The game is already won.' });
      return;
    }
    if (state.replayMode || state.autoPlayEnabled) {
      set({ aiError: 'Stop replay / auto-play before starting AI auto-play.' });
      return;
    }
    aiAutoStateHistory = [];
    aiAutoLastProgress = null;
    aiAutoStallCount = 0;
    aiAutoRecentMoveTypes = [];
    aiAutoStalled = false;
    // Arm the token-runaway cap. A fresh run pauses at the AI_AUTO_TURN_CAP
    // boundary; resuming at or past it grants another increment of moves, so
    // each manual restart is a deliberate opt-in for more spend.
    const movesAtStart = state.moveHistory.length;
    aiAutoTurnCap =
      movesAtStart < AI_AUTO_TURN_CAP
        ? AI_AUTO_TURN_CAP
        : movesAtStart + AI_AUTO_TURN_CAP_RESUME_INCREMENT;
    set({ aiAutoPlay: true, aiError: undefined });
    void askForMove();
  };


  const continueAutoPlay = (): void => {
    const state = get();
    if (!state.aiAutoPlay) return;

    // Stop cleanly when the game is won.
    if (state.gameWon) {
      set({ aiAutoPlay: false });
      return;
    }

    // Token-runaway cap: pause once the run reaches its move budget and require
    // a deliberate manual resume. Unlike the stall/loop terminators below (which
    // catch *unproductive* play), this fires even on a healthy, progressing game
    // so an unattended tab cannot spend tokens without bound.
    if (state.moveHistory.length >= aiAutoTurnCap) {
      set({
        aiAutoPlay: false,
        aiError:
          `AI auto-play paused at the ${aiAutoTurnCap}-move cap ` +
          `(token-runaway guard). Click AI Auto-Play to resume for ` +
          `another ${AI_AUTO_TURN_CAP_RESUME_INCREMENT} moves.`,
      });
      return;
    }

    // Loop detection: a position recurring is allowed up to AI_AUTO_LOOP_LIMIT
    // times — the AI may legitimately unwind and retry a line — but a position
    // seen that many times means it is genuinely stuck, so stop.
    const hash = hashGameState(uiToCore(state));
    const timesSeen = aiAutoStateHistory.filter((h) => h === hash).length;
    if (timesSeen >= AI_AUTO_LOOP_LIMIT) {
      set({
        aiAutoPlay: false,
        aiError:
          `AI auto-play stopped: the board returned to the same position ` +
          `${AI_AUTO_LOOP_LIMIT} times (stuck loop).`,
      });
      return;
    }
    aiAutoStateHistory = [...aiAutoStateHistory, hash].slice(-AI_AUTO_HISTORY_LIMIT);

    // Stall detection — two-gate rule. A turn is "flat" when neither a card
    // reached a foundation nor a face-down card was revealed. A few flat turns
    // are normal (cycling the stock to reach a card); AI_AUTO_STALL_LIMIT in a
    // row is the first gate. The second gate is the *shuffle fraction* over
    // the plateau: a long flat run dominated by `tableau_to_tableau` /
    // `discard_to_tableau` is a doom-loop and terminates; the same length
    // dominated by `draw_card` / `recycle_stock` is an honest hunt for a still
    // face-down card and is allowed to continue. Loop detection above misses
    // both cases — the board keeps changing — so this is a separate guard.
    // Log it so a harvested game reads as auto-terminated, not abandoned.
    const { foundationCards, faceDownTotal } = computeProgressComponents(state);
    const lastInteractionMoveType = getLastAIInteraction()?.movesApplied?.[0];
    if (
      aiAutoLastProgress &&
      aiAutoLastProgress.f === foundationCards &&
      aiAutoLastProgress.d === faceDownTotal
    ) {
      aiAutoStallCount += 1;
      if (lastInteractionMoveType) aiAutoRecentMoveTypes.push(lastInteractionMoveType);
    } else {
      aiAutoStallCount = 0;
      aiAutoRecentMoveTypes = [];
    }
    aiAutoLastProgress = { f: foundationCards, d: faceDownTotal };
    if (shouldTerminateOnStall(aiAutoStallCount, aiAutoRecentMoveTypes)) {
      const stallConfig = state.aiConfig ?? DEFAULT_AI_CONFIG;
      const fraction = shuffleFraction(aiAutoRecentMoveTypes);
      const window = [...aiAutoRecentMoveTypes];
      aiAutoStalled = true;
      recordAIInteraction({
        id: uuidv7(),
        requestId: uuidv7(),
        sessionId: state.gameSessionId ?? '',
        attempt: 1,
        timestamp: Date.now(),
        provider: stallConfig.provider,
        model: stallConfig.model,
        seed: state.seed,
        turnIndex: state.moveHistory.length,
        config: stallConfig,
        event: 'stall_terminated',
        plateauLength: aiAutoStallCount,
        shuffleFraction: fraction,
        moveTypeWindow: window,
        outcome: 'success',
        durationMs: 0,
        prompt: '',
      });
      set({
        aiAutoPlay: false,
        aiError:
          `AI auto-play stopped: no progress for ${aiAutoStallCount} turns ` +
          `with ${Math.round(fraction * 100)}% shuffle moves ` +
          `(threshold ${Math.round(AI_AUTO_STALL_SHUFFLE_FRACTION * 100)}%).`,
      });
      return;
    }

    pendingTimer = setTimeout(() => {
      pendingTimer = null;
      if (get().aiAutoPlay && !get().aiThinking) {
        void askForMove();
      }
    }, AI_AUTO_MOVE_DELAY);
  };


  const cancel = (): void => {
    aiAbortController?.abort();
    // Clear the thinking state immediately for responsive UI; the in-flight
    // promise's catch handler will also run and is a no-op for 'aborted'.
    set({ aiThinking: false, aiThinkingSince: undefined });
  };



  const resetRunState = (): void => {
    // A new game / restored session invalidates any in-flight request and all
    // per-run tracking (plateau, window, outcome, position history, cap).
    aiAbortController?.abort();
    aiAbortController = null;
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      pendingTimer = null;
    }
    aiAutoStateHistory = [];
    aiAutoLastProgress = null;
    aiAutoStallCount = 0;
    aiAutoRecentMoveTypes = [];
    aiAutoStalled = false;
    aiAutoTurnCap = AI_AUTO_TURN_CAP;
  };

  const wasStalled = (): boolean => aiAutoStalled;

  return { askForMove, toggleAutoPlay, continueAutoPlay, cancel, resetRunState, wasStalled };
}
