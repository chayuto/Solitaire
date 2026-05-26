/**
 * A stub provider for deterministic testing.
 *
 * Wraps a caller-supplied decision function so tests (unit and E2E via the
 * test bridge) can exercise the full advisor pipeline without a network call
 * or a real API key. It records interactions like a real provider.
 *
 * @module ai/providers/stubProvider
 */

import { recordAIInteraction } from '../interactionLog';
import { uuidv7 } from '../uuid';
import { AIError, type AIMoveContext, type AIMoveDecision, type AIProvider } from '../types';

/** A function that turns a game context into a decision. */
export type StubDecisionFn = (
  context: AIMoveContext,
) => AIMoveDecision | Promise<AIMoveDecision>;

/**
 * Create a stub {@link AIProvider} backed by `decide`.
 *
 * The stub requires no API key. By default it picks the first legal move with
 * a placeholder reasoning — pass `decide` to control the choice.
 */
export function createStubProvider(decide?: StubDecisionFn): AIProvider {
  const fallback: StubDecisionFn = () => ({
    moveIndex: 0,
    reasoning: 'Stub provider: chose the first legal move.',
    confidence: 1,
  });
  const fn = decide ?? fallback;

  return {
    id: 'stub',
    displayName: 'Stub (test)',
    requiresKey: false,
    defaultModel: 'stub',
    availableModels: ['stub'],
    apiKeyUrl: '',
    async suggestMove(request): Promise<AIMoveDecision> {
      const startedAt = Date.now();
      const prompt = `${request.systemInstruction}\n\n${JSON.stringify(request.context)}`;
      try {
        const decision = await fn(request.context);
        recordAIInteraction({
          id: uuidv7(),
          requestId: request.requestId ?? uuidv7(),
          sessionId: request.sessionId ?? '',
          attempt: request.attempt ?? 1,
          timestamp: Date.now(),
          provider: 'stub',
          model: request.model,
          seed: request.seed,
          turnIndex: request.turnIndex,
          config: request.config,
          outcome: decision.moveIndex === -1 ? 'resigned' : 'success',
          durationMs: Date.now() - startedAt,
          prompt,
          rawResponse: JSON.stringify(decision),
          decision,
        });
        return decision;
      } catch (err) {
        recordAIInteraction({
          id: uuidv7(),
          requestId: request.requestId ?? uuidv7(),
          sessionId: request.sessionId ?? '',
          attempt: request.attempt ?? 1,
          timestamp: Date.now(),
          provider: 'stub',
          model: request.model,
          seed: request.seed,
          turnIndex: request.turnIndex,
          config: request.config,
          outcome: 'error',
          durationMs: Date.now() - startedAt,
          prompt,
          errorKind: err instanceof AIError ? err.kind : 'bad_response',
          errorMessage: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }
    },
  };
}
