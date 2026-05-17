/**
 * Tests for the Gemini / Gemma provider — HTTP and response handling are
 * exercised against a mocked `fetch`.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { geminiProvider } from './GeminiProvider';
import { AIError, type AIMoveContext, type AIRequest } from '../types';

const context: AIMoveContext = {
  notation: 'test',
  foundations: { hearts: null, diamonds: null, clubs: null, spades: null },
  tableau: [],
  discardTop: null,
  drawPileCount: 0,
  canRecycleStock: false,
  legalMoves: [
    { index: 0, type: 'draw_card', describe: 'Draw' },
    { index: 1, type: 'discard_to_foundation', describe: 'To foundation' },
  ],
};

const request: AIRequest = {
  apiKey: 'test-key',
  model: 'gemma-4-31b-it',
  systemInstruction: 'Be a solitaire advisor.',
  context,
};

/** Build a minimal `Response`-like object. */
function mockResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe('geminiProvider.suggestMove', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects when no API key is supplied', async () => {
    await expect(geminiProvider.suggestMove({ ...request, apiKey: '' })).rejects.toMatchObject({
      kind: 'no_key',
    });
  });

  it('parses a thinking-model response, ignoring "thought" parts', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse(200, {
        candidates: [
          {
            content: {
              parts: [
                { text: 'Internal reasoning about the board...', thought: true },
                { text: '{"moveIndex":1,"reasoning":"Bank the card.","confidence":0.9}' },
              ],
            },
            finishReason: 'STOP',
          },
        ],
      }),
    );

    const decision = await geminiProvider.suggestMove(request);
    expect(decision.moveIndex).toBe(1);
    expect(decision.reasoning).toBe('Bank the card.');
    expect(decision.confidence).toBeCloseTo(0.9);
  });

  it('falls back to all parts when none are flagged as thoughts', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse(200, {
        candidates: [
          {
            content: {
              parts: [{ text: '{"moveIndex":0,"reasoning":"Draw.","confidence":0.5}' }],
            },
            finishReason: 'STOP',
          },
        ],
      }),
    );

    const decision = await geminiProvider.suggestMove(request);
    expect(decision.moveIndex).toBe(0);
  });

  it('maps HTTP 401 to an invalid_key error', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse(401, { error: { code: 401, message: 'API key not valid' } }),
    );
    await expect(geminiProvider.suggestMove(request)).rejects.toMatchObject({
      kind: 'invalid_key',
    });
  });

  it('maps HTTP 429 to a rate_limited error', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse(429, { error: { code: 429, message: 'Quota exceeded' } }),
    );
    await expect(geminiProvider.suggestMove(request)).rejects.toMatchObject({
      kind: 'rate_limited',
    });
  });

  it('maps HTTP 404 to a config error', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse(404, { error: { code: 404, message: 'model not found' } }),
    );
    await expect(geminiProvider.suggestMove(request)).rejects.toMatchObject({
      kind: 'config',
    });
  });

  it('maps HTTP 503 to an unavailable error', async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse(503, { error: { code: 503 } }));
    await expect(geminiProvider.suggestMove(request)).rejects.toMatchObject({
      kind: 'unavailable',
    });
  });

  it('maps a network failure to a network error', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(geminiProvider.suggestMove(request)).rejects.toMatchObject({
      kind: 'network',
    });
  });

  it('maps an aborted fetch to an aborted error', async () => {
    vi.mocked(fetch).mockRejectedValue(new DOMException('aborted', 'AbortError'));
    await expect(geminiProvider.suggestMove(request)).rejects.toMatchObject({
      kind: 'aborted',
    });
  });

  it('rejects bad_response when the model returns no usable text', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse(200, {
        candidates: [{ content: { parts: [] }, finishReason: 'SAFETY' }],
      }),
    );
    await expect(geminiProvider.suggestMove(request)).rejects.toMatchObject({
      kind: 'bad_response',
    });
  });

  it('rejects bad_response when the model picks an out-of-range index', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse(200, {
        candidates: [
          {
            content: {
              parts: [{ text: '{"moveIndex":7,"reasoning":"x","confidence":1}' }],
            },
          },
        ],
      }),
    );
    await expect(geminiProvider.suggestMove(request)).rejects.toBeInstanceOf(AIError);
  });
});
