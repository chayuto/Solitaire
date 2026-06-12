/**
 * Tests for the TokenRouter provider — HTTP and response handling are
 * exercised against a mocked `fetch`.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { tokenRouterProvider } from './TokenRouterProvider';
import { AI_TEMPERATURE, TOKENROUTER_API_BASE } from '../constants';
import { clearAIInteractions, getLastAIInteraction } from '../interactionLog';
import { AIError, type AIMoveContext, type AIRequest } from '../types';

const context: AIMoveContext = {
  notation: 'test',
  foundations: { hearts: null, diamonds: null, clubs: null, spades: null },
  tableau: [],
  discardTop: null,
  drawPileCount: 0,
  canRecycleStock: false,
  cycle: 1,
  legalMoves: [
    { index: 0, type: 'draw_card', describe: 'Draw' },
    { index: 1, type: 'discard_to_foundation', describe: 'To foundation' },
  ],
};

const request: AIRequest = {
  apiKey: 'test-key',
  model: 'MiniMax-M3',
  systemInstruction: 'Be a solitaire advisor.',
  context,
};

const DECISION_JSON =
  '{"board_analysis":"An ace is playable.",' +
  '"strategic_plan":"Bank the card.",' +
  '"final_decision":{"move_index":1,"confidence":0.9}}';

/** Build a minimal `Response`-like object. */
function mockResponse(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    json: async () => body,
  } as Response;
}

/** A successful chat-completions body wrapping `content`. */
function completion(content: string, extra: Record<string, unknown> = {}): unknown {
  return {
    choices: [{ message: { content, ...extra }, finish_reason: 'stop' }],
    usage: {
      prompt_tokens: 183,
      completion_tokens: 28,
      total_tokens: 211,
      completion_tokens_details: { reasoning_tokens: 30 },
    },
  };
}

describe('tokenRouterProvider.suggestMove', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    clearAIInteractions();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects when no API key is supplied', async () => {
    await expect(
      tokenRouterProvider.suggestMove({ ...request, apiKey: '' }),
    ).rejects.toMatchObject({ kind: 'no_key' });
  });

  it('sends an OpenAI-style request with Bearer auth, model, and temperature', async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse(200, completion(DECISION_JSON)));
    await tokenRouterProvider.suggestMove(request);

    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${TOKENROUTER_API_BASE}/chat/completions`);
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-key');
    const body = JSON.parse(init.body as string) as {
      model: string;
      temperature: number;
      messages: { role: string; content: string }[];
    };
    expect(body.model).toBe('MiniMax-M3');
    expect(body.temperature).toBe(AI_TEMPERATURE);
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0].role).toBe('user');
    expect(body.messages[0].content).toContain('Be a solitaire advisor.');
  });

  it('strips an inline <think> block and logs it as the thinking text', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse(
        200,
        completion(`<think>\nWeighing the foundation play...\n</think>\n\n${DECISION_JSON}`),
      ),
    );

    const decision = await tokenRouterProvider.suggestMove(request);
    expect(decision.moveIndex).toBe(1);
    expect(decision.reasoning).toBe('Bank the card.');
    expect(decision.boardAnalysis).toBe('An ace is playable.');

    const last = getLastAIInteraction();
    expect(last?.thinkingText).toBe('Weighing the foundation play...');
    expect(last?.rawResponse).toBe(DECISION_JSON);
  });

  it('captures a distinct reasoning_content field when present', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse(
        200,
        completion(DECISION_JSON, { reasoning_content: 'Separate reasoning channel.' }),
      ),
    );
    await tokenRouterProvider.suggestMove(request);
    expect(getLastAIInteraction()?.thinkingText).toBe('Separate reasoning channel.');
  });

  it('records OpenAI-style usage tokens on the logged interaction', async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse(200, completion(DECISION_JSON)));
    await tokenRouterProvider.suggestMove(request);

    const last = getLastAIInteraction();
    expect(last?.provider).toBe('tokenrouter');
    expect(last?.outcome).toBe('success');
    expect(last?.promptTokens).toBe(183);
    expect(last?.outputTokens).toBe(28);
    expect(last?.thoughtTokens).toBe(30);
    expect(last?.totalTokens).toBe(211);
  });

  it('records a resignation (move_index -1) with outcome "resigned"', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse(
        200,
        completion(
          '{"board_analysis":"No outs.","strategic_plan":"Resign.",' +
            '"final_decision":{"move_index":-1}}',
        ),
      ),
    );
    const decision = await tokenRouterProvider.suggestMove(request);
    expect(decision.moveIndex).toBe(-1);
    expect(getLastAIInteraction()?.outcome).toBe('resigned');
  });

  it('maps HTTP 401 to invalid_key', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse(401, { error: { message: 'invalid api key' } }),
    );
    await expect(tokenRouterProvider.suggestMove(request)).rejects.toMatchObject({
      kind: 'invalid_key',
    });
    expect(getLastAIInteraction()?.outcome).toBe('error');
  });

  it('maps HTTP 429 to rate_limited, honouring a Retry-After header', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse(429, { error: { message: 'slow down' } }, { 'retry-after': '17' }),
    );
    await expect(tokenRouterProvider.suggestMove(request)).rejects.toMatchObject({
      kind: 'rate_limited',
      retryAfterMs: 17_000,
    });
  });

  it('maps HTTP 404 to config (unknown model)', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse(404, { error: { message: 'model not found' } }),
    );
    await expect(tokenRouterProvider.suggestMove(request)).rejects.toMatchObject({
      kind: 'config',
    });
  });

  it('maps HTTP 5xx to unavailable', async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse(503, null));
    await expect(tokenRouterProvider.suggestMove(request)).rejects.toMatchObject({
      kind: 'unavailable',
    });
  });

  it('maps a network failure to a typed network error', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(tokenRouterProvider.suggestMove(request)).rejects.toMatchObject({
      kind: 'network',
    });
  });

  it('rejects with bad_response when the body is not JSON', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => {
        throw new SyntaxError('Unexpected token');
      },
    } as unknown as Response);
    await expect(tokenRouterProvider.suggestMove(request)).rejects.toMatchObject({
      kind: 'bad_response',
    });
  });

  it('rejects with bad_response when the answer is empty after <think> stripping', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse(200, completion('<think>all thinking, no answer</think>')),
    );
    await expect(tokenRouterProvider.suggestMove(request)).rejects.toBeInstanceOf(AIError);
    await expect(
      tokenRouterProvider.suggestMove(request),
    ).rejects.toMatchObject({ kind: 'bad_response' });
  });

  it('surfaces an abort during the response-body read as aborted, not bad JSON', async () => {
    const controller = new AbortController();
    vi.mocked(fetch).mockImplementation(async () => {
      controller.abort();
      return {
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => {
          throw new DOMException('Aborted', 'AbortError');
        },
      } as unknown as Response;
    });
    await expect(
      tokenRouterProvider.suggestMove({ ...request, signal: controller.signal }),
    ).rejects.toMatchObject({ kind: 'aborted' });
  });
});
