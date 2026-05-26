/**
 * Tests for the Gemini / Gemma provider — HTTP and response handling are
 * exercised against a mocked `fetch`.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { geminiProvider } from './GeminiProvider';
import { AI_TEMPERATURE } from '../constants';
import { PROMPT_LAYOUT_VERSION } from '../context/renderContext';
import { PROMPT_TEMPLATE_VERSION } from '../context/systemInstruction';
import { clearAIInteractions, getLastAIInteraction } from '../interactionLog';
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
    clearAIInteractions();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects when no API key is supplied', async () => {
    await expect(geminiProvider.suggestMove({ ...request, apiKey: '' })).rejects.toMatchObject({
      kind: 'no_key',
    });
  });

  it('parses a thinking-model three-key response, ignoring "thought" parts', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse(200, {
        candidates: [
          {
            content: {
              parts: [
                { text: 'Internal reasoning about the board...', thought: true },
                {
                  text:
                    '{"board_analysis":"An ace is playable.",' +
                    '"strategic_plan":"Bank the card.",' +
                    '"final_decision":{"move_index":1,"confidence":0.9}}',
                },
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
    expect(decision.boardAnalysis).toBe('An ace is playable.');
    expect(decision.confidence).toBeCloseTo(0.9);
  });

  it('stamps the prompt template hash and finalised date on the logged interaction', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse(200, {
        candidates: [
          {
            content: { parts: [{ text: '{"moveIndex":0,"reasoning":"Draw.","confidence":0.5}' }] },
            finishReason: 'STOP',
          },
        ],
      }),
    );
    await geminiProvider.suggestMove(request);
    const last = getLastAIInteraction();
    // SHA-256 hex of `request.systemInstruction` ('Be a solitaire advisor.').
    expect(last?.promptTemplateHash).toMatch(/^[0-9a-f]{64}$/);
    // Finalised date is the constant from systemInstruction.ts, in ISO 8601.
    expect(last?.promptTemplateFinalisedAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/,
    );
  });

  it('stamps the prompt template hash on an error-outcome interaction too', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse(401, { error: { code: 401, message: 'API key not valid' } }),
    );
    await expect(geminiProvider.suggestMove(request)).rejects.toBeInstanceOf(AIError);
    const last = getLastAIInteraction();
    expect(last?.outcome).toBe('error');
    expect(last?.promptTemplateHash).toMatch(/^[0-9a-f]{64}$/);
    expect(last?.promptTemplateFinalisedAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/,
    );
  });

  it('stamps the inference parameters (temperature) on a success interaction', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse(200, {
        candidates: [
          {
            content: { parts: [{ text: '{"moveIndex":0,"reasoning":"Draw.","confidence":0.5}' }] },
            finishReason: 'STOP',
          },
        ],
      }),
    );
    await geminiProvider.suggestMove(request);
    const last = getLastAIInteraction();
    // The value must match the constant actually sent to the API — that's
    // the whole point of stamping it. If `AI_TEMPERATURE` moves, this row
    // moves with it so the dataset side can attribute by exact value.
    expect(last?.inferenceParams).toEqual({ temperature: AI_TEMPERATURE });
  });

  it('stamps the inference parameters on an error-outcome interaction too', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse(401, { error: { code: 401, message: 'API key not valid' } }),
    );
    await expect(geminiProvider.suggestMove(request)).rejects.toBeInstanceOf(AIError);
    const last = getLastAIInteraction();
    expect(last?.outcome).toBe('error');
    expect(last?.inferenceParams).toEqual({ temperature: AI_TEMPERATURE });
  });

  it('renders the per-turn game context as the hybrid ASCII layout, not JSON', async () => {
    // The cross-team change PR ships: the wire format for the per-turn block
    // is the hybrid layout. Pin the markers here so a future refactor that
    // silently regresses to JSON is caught.
    vi.mocked(fetch).mockResolvedValue(
      mockResponse(200, {
        candidates: [
          {
            content: { parts: [{ text: '{"moveIndex":0,"reasoning":"Draw.","confidence":0.5}' }] },
            finishReason: 'STOP',
          },
        ],
      }),
    );
    await geminiProvider.suggestMove(request);
    const last = getLastAIInteraction();
    const prompt = last?.prompt ?? '';
    // Hybrid markers present. (NOTATION lives in the static rules block now,
    // not the per-turn render; the system instruction is stubbed here so the
    // marker is not in `prompt`. Per-turn markers below are what we pin.)
    expect(prompt).toContain('FOUNDATIONS:');
    expect(prompt).toContain('TABLEAU:');
    expect(prompt).toContain('LEGAL MOVES (respond with the index of your chosen move):');
    // JSON form is gone.
    expect(prompt).not.toContain('CURRENT GAME (JSON):');
    expect(prompt).not.toContain('"legalMoves":');
  });

  it('stamps the prompt-layout version on a success interaction', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse(200, {
        candidates: [
          {
            content: { parts: [{ text: '{"moveIndex":0,"reasoning":"Draw.","confidence":0.5}' }] },
            finishReason: 'STOP',
          },
        ],
      }),
    );
    await geminiProvider.suggestMove(request);
    expect(getLastAIInteraction()?.promptLayoutVersion).toBe(PROMPT_LAYOUT_VERSION);
  });

  it('stamps the prompt-layout version on an error-outcome interaction too', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse(401, { error: { code: 401, message: 'API key not valid' } }),
    );
    await expect(geminiProvider.suggestMove(request)).rejects.toBeInstanceOf(AIError);
    const last = getLastAIInteraction();
    expect(last?.outcome).toBe('error');
    expect(last?.promptLayoutVersion).toBe(PROMPT_LAYOUT_VERSION);
  });

  it('stamps the prompt-template semantic version on success and error interactions', async () => {
    // Per the 2026-05-26 versioning ask: every harvested interaction must
    // carry the human-readable template version (e.g. `hybrid-v1.1`)
    // alongside the per-row hash, so the dataset side can partition on it
    // without inferring from `appCommit`.
    vi.mocked(fetch).mockResolvedValue(
      mockResponse(200, {
        candidates: [
          {
            content: { parts: [{ text: '{"moveIndex":0,"reasoning":"Draw.","confidence":0.5}' }] },
            finishReason: 'STOP',
          },
        ],
      }),
    );
    await geminiProvider.suggestMove(request);
    expect(getLastAIInteraction()?.promptTemplateVersion).toBe(PROMPT_TEMPLATE_VERSION);

    vi.mocked(fetch).mockResolvedValue(
      mockResponse(401, { error: { code: 401, message: 'API key not valid' } }),
    );
    await expect(geminiProvider.suggestMove(request)).rejects.toBeInstanceOf(AIError);
    expect(getLastAIInteraction()?.promptTemplateVersion).toBe(PROMPT_TEMPLATE_VERSION);
  });

  it('records outcome="resigned" when the model returns move_index -1, no error thrown', async () => {
    // Resign sentinel: parser passes `-1` through, harness (not provider)
    // skips move application. The provider's job is to log the interaction
    // with the right outcome.
    vi.mocked(fetch).mockResolvedValue(
      mockResponse(200, {
        candidates: [
          {
            content: {
              parts: [
                {
                  text:
                    '{"board_analysis":"oscillation, no out","strategic_plan":"resign",' +
                    '"final_decision":{"move_index":-1,"confidence":0.6}}',
                },
              ],
            },
            finishReason: 'STOP',
          },
        ],
      }),
    );
    const decision = await geminiProvider.suggestMove(request);
    expect(decision.moveIndex).toBe(-1);
    const last = getLastAIInteraction();
    expect(last?.outcome).toBe('resigned');
    expect(last?.decision?.moveIndex).toBe(-1);
    expect(last?.errorKind).toBeUndefined();
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

  it('maps HTTP 429 to a rate_limited error with a fallback retry delay', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse(429, { error: { code: 429, message: 'Quota exceeded' } }),
    );
    try {
      await geminiProvider.suggestMove(request);
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(AIError);
      expect((err as AIError).kind).toBe('rate_limited');
      // No RetryInfo => a fallback delay long enough to clear a 1-minute window.
      expect((err as AIError).retryAfterMs).toBeGreaterThanOrEqual(30_000);
    }
  });

  it('honors the RetryInfo retry delay on a 429', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse(429, {
        error: {
          code: 429,
          status: 'RESOURCE_EXHAUSTED',
          message: 'Quota exceeded',
          details: [
            { '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '42s' },
          ],
        },
      }),
    );
    try {
      await geminiProvider.suggestMove(request);
      expect.unreachable('should have thrown');
    } catch (err) {
      expect((err as AIError).kind).toBe('rate_limited');
      expect((err as AIError).retryAfterMs).toBe(42_000);
    }
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

  it('captures the thinking trace and HTTP status in the interaction log', async () => {
    clearAIInteractions();
    vi.mocked(fetch).mockResolvedValue(
      mockResponse(200, {
        candidates: [
          {
            content: {
              parts: [
                { text: 'Let me weigh the reveal moves...', thought: true },
                {
                  text:
                    '{"strategic_plan":"Reveal a card.",' +
                    '"final_decision":{"move_index":1,"confidence":0.9}}',
                },
              ],
            },
          },
        ],
      }),
    );

    await geminiProvider.suggestMove(request);
    const last = getLastAIInteraction();
    expect(last?.thinkingText).toBe('Let me weigh the reveal moves...');
    expect(last?.httpStatus).toBe(200);
    expect(last?.rawResponse).toContain('move_index');
  });

  it('treats an abort during the response-body read as an aborted error', async () => {
    // The body read used to run after the timeout was cleared, so a stalled
    // body could hang indefinitely. An abort during `.json()` must now surface.
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new DOMException('aborted', 'AbortError');
      },
    } as unknown as Response);

    await expect(geminiProvider.suggestMove(request)).rejects.toMatchObject({
      kind: 'aborted',
    });
  });
});
