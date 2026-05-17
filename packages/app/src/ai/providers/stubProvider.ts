/**
 * A stub provider for deterministic testing.
 *
 * Wraps a caller-supplied decision function so tests (unit and E2E via the
 * test bridge) can exercise the full advisor pipeline without a network call
 * or a real API key.
 *
 * @module ai/providers/stubProvider
 */

import { recordAIDiagnostics } from '../diagnostics';
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
      try {
        const decision = await fn(request.context);
        recordAIDiagnostics({
          timestamp: Date.now(),
          model: request.model,
          outcome: 'success',
          durationMs: Date.now() - startedAt,
        });
        return decision;
      } catch (err) {
        recordAIDiagnostics({
          timestamp: Date.now(),
          model: request.model,
          outcome: 'error',
          durationMs: Date.now() - startedAt,
          errorKind: err instanceof AIError ? err.kind : 'bad_response',
        });
        throw err;
      }
    },
  };
}
