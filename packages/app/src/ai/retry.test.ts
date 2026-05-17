/**
 * Tests for retry-with-backoff of AI move requests.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  backoffDelay,
  isRetryableAIError,
  isTransientAIError,
  suggestMoveWithRetry,
} from './retry';
import { AI_RETRY_MAX_DELAY } from './constants';
import { AIError, type AIMoveContext, type AIMoveDecision, type AIProvider, type AIRequest } from './types';

const DECISION: AIMoveDecision = { moveIndex: 0, reasoning: 'ok', confidence: 1 };

const CONTEXT: AIMoveContext = {
  notation: '',
  foundations: { hearts: null, diamonds: null, clubs: null, spades: null },
  tableau: [],
  discardTop: null,
  drawPileCount: 0,
  canRecycleStock: false,
  legalMoves: [{ index: 0, type: 'draw_card', describe: 'Draw' }],
};

const REQUEST: AIRequest = {
  apiKey: '',
  model: 'fake',
  systemInstruction: '',
  context: CONTEXT,
};

/** A provider whose `suggestMove` is the supplied mock. */
function fakeProvider(suggestMove: AIProvider['suggestMove']): AIProvider {
  return {
    id: 'fake',
    displayName: 'Fake',
    requiresKey: false,
    defaultModel: 'fake',
    availableModels: ['fake'],
    apiKeyUrl: '',
    suggestMove,
  };
}

describe('backoffDelay', () => {
  it('grows with the attempt number', () => {
    expect(backoffDelay(1)).toBeLessThan(backoffDelay(3));
  });

  it('is capped at the maximum delay', () => {
    expect(backoffDelay(20)).toBeLessThanOrEqual(AI_RETRY_MAX_DELAY + 500);
  });
});

describe('isRetryableAIError / isTransientAIError', () => {
  it('classifies retryable errors', () => {
    expect(isRetryableAIError(new AIError('network', ''))).toBe(true);
    expect(isRetryableAIError(new AIError('unavailable', ''))).toBe(true);
    expect(isRetryableAIError(new AIError('bad_response', ''))).toBe(true);
    expect(isRetryableAIError(new AIError('invalid_key', ''))).toBe(false);
    expect(isRetryableAIError(new Error('plain'))).toBe(false);
  });

  it('classifies transient (infrastructure) errors', () => {
    expect(isTransientAIError(new AIError('timeout', ''))).toBe(true);
    expect(isTransientAIError(new AIError('rate_limited', ''))).toBe(true);
    // bad_response is retryable but not "transient": auto-play stops on it.
    expect(isTransientAIError(new AIError('bad_response', ''))).toBe(false);
    expect(isTransientAIError(new AIError('invalid_key', ''))).toBe(false);
  });
});

describe('suggestMoveWithRetry', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the decision on a first-attempt success', async () => {
    const suggestMove = vi.fn().mockResolvedValue(DECISION);
    const result = await suggestMoveWithRetry(fakeProvider(suggestMove), REQUEST, {
      maxAttempts: 4,
    });
    expect(result).toBe(DECISION);
    expect(suggestMove).toHaveBeenCalledTimes(1);
  });

  it('does not retry a non-retryable error', async () => {
    const suggestMove = vi.fn().mockRejectedValue(new AIError('invalid_key', 'bad key'));
    await expect(
      suggestMoveWithRetry(fakeProvider(suggestMove), REQUEST, { maxAttempts: 4 }),
    ).rejects.toMatchObject({ kind: 'invalid_key' });
    expect(suggestMove).toHaveBeenCalledTimes(1);
  });

  it('does not retry an aborted request', async () => {
    const suggestMove = vi.fn().mockRejectedValue(new AIError('aborted', 'cancelled'));
    await expect(
      suggestMoveWithRetry(fakeProvider(suggestMove), REQUEST, { maxAttempts: 4 }),
    ).rejects.toMatchObject({ kind: 'aborted' });
    expect(suggestMove).toHaveBeenCalledTimes(1);
  });

  it('retries a transient failure and then succeeds', async () => {
    vi.useFakeTimers();
    const suggestMove = vi
      .fn()
      .mockRejectedValueOnce(new AIError('unavailable', 'down'))
      .mockResolvedValueOnce(DECISION);
    const onRetry = vi.fn();

    const promise = suggestMoveWithRetry(fakeProvider(suggestMove), REQUEST, {
      maxAttempts: 4,
      onRetry,
    });
    await vi.advanceTimersByTimeAsync(60_000);

    await expect(promise).resolves.toBe(DECISION);
    expect(suggestMove).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry.mock.calls[0][0]).toMatchObject({ attempt: 1, maxAttempts: 4 });
  });

  it('waits the server-suggested delay instead of its own backoff', async () => {
    vi.useFakeTimers();
    const suggestMove = vi
      .fn()
      .mockRejectedValueOnce(new AIError('rate_limited', 'limited', 57_000))
      .mockResolvedValueOnce(DECISION);
    const onRetry = vi.fn();

    const promise = suggestMoveWithRetry(fakeProvider(suggestMove), REQUEST, {
      maxAttempts: 4,
      onRetry,
    });
    await vi.advanceTimersByTimeAsync(120_000);

    await expect(promise).resolves.toBe(DECISION);
    // The retry waited ~57s (the server's RetryInfo), not the ~2s backoff.
    expect(onRetry.mock.calls[0][0].delayMs).toBeGreaterThanOrEqual(57_000);
  });

  it('gives up after the maximum number of attempts', async () => {
    vi.useFakeTimers();
    const suggestMove = vi.fn().mockRejectedValue(new AIError('unavailable', 'down'));

    const promise = suggestMoveWithRetry(fakeProvider(suggestMove), REQUEST, {
      maxAttempts: 3,
    });
    const assertion = expect(promise).rejects.toMatchObject({ kind: 'unavailable' });
    await vi.advanceTimersByTimeAsync(120_000);
    await assertion;

    expect(suggestMove).toHaveBeenCalledTimes(3);
  });

  it('stops retrying when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const suggestMove = vi.fn().mockResolvedValue(DECISION);

    await expect(
      suggestMoveWithRetry(fakeProvider(suggestMove), REQUEST, {
        maxAttempts: 4,
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ kind: 'aborted' });
    expect(suggestMove).not.toHaveBeenCalled();
  });
});
