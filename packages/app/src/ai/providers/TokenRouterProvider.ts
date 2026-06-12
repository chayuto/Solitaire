/**
 * TokenRouter provider for the AI Move Advisor.
 *
 * TokenRouter (https://www.tokenrouter.com) is a unified OpenAI-compatible
 * gateway in front of many hosted models. The app calls its
 * `/chat/completions` endpoint directly from the browser with the user's own
 * API key (Bearer auth, permissive CORS) — there is no backend.
 *
 * Design notes:
 * - Same single-user-message prompt as the Gemini provider: system
 *   instruction + hybrid game context concatenated. One code path, one
 *   prompt-template hash, regardless of gateway-side model.
 * - `MiniMax-M3` is a thinking model that emits its reasoning *inline* as a
 *   `<think>…</think>` block at the start of `message.content` (TokenRouter
 *   does not split it into a separate field). The block is stripped before
 *   decision parsing and captured as the interaction's `thinkingText`. A
 *   separate `reasoning_content` field, when a gateway model provides one,
 *   is honoured too.
 *
 * @module ai/providers/TokenRouterProvider
 */

import {
  AI_RATE_LIMIT_FALLBACK_DELAY,
  AI_REQUEST_TIMEOUT_MS,
  AI_TEMPERATURE,
  TOKENROUTER_API_BASE,
} from '../constants';
import {
  PROMPT_LAYOUT_VERSION,
  renderHybridContext,
} from '../context/renderContext';
import {
  PROMPT_TEMPLATE_FINALISED_AT,
  PROMPT_TEMPLATE_VERSION,
  hashSystemInstruction,
} from '../context/systemInstruction';
import { parseDecision } from '../decision/schema';
import { recordAIInteraction } from '../interactionLog';
import { uuidv7 } from '../uuid';
import { AIError, type AIMoveDecision, type AIProvider, type AIRequest } from '../types';

/** Token-usage block from an OpenAI-compatible response. */
interface TokenRouterUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  completion_tokens_details?: { reasoning_tokens?: number };
}

/** Minimal shape of the `/chat/completions` response we rely on. */
interface TokenRouterResponse {
  choices?: {
    message?: { content?: string; reasoning_content?: string };
    finish_reason?: string;
  }[];
  usage?: TokenRouterUsage;
  error?: { code?: number | string; message?: string; type?: string };
}

/** Parse a `Retry-After` header (delta-seconds form) into milliseconds. */
function retryAfterMsFromHeader(response: Response): number | undefined {
  let raw: string | null;
  try {
    raw = response.headers?.get('retry-after') ?? null;
  } catch {
    return undefined;
  }
  if (!raw) return undefined;
  const seconds = Number(raw.trim());
  if (!Number.isFinite(seconds) || seconds <= 0) return undefined;
  return Math.round(seconds * 1000);
}

/** Map a non-OK HTTP response to a typed {@link AIError}. */
function errorFromHttp(
  status: number,
  body: TokenRouterResponse | null,
  retryAfterMs?: number,
): AIError {
  const message = body?.error?.message ?? '';
  const lower = message.toLowerCase();

  if (status === 429) {
    // Honor the server's Retry-After; otherwise wait long enough to clear a
    // per-minute window (a short retry would just hit the limit again).
    const delay = retryAfterMs ?? AI_RATE_LIMIT_FALLBACK_DELAY;
    return new AIError(
      'rate_limited',
      `TokenRouter rate limit reached (retry in ~${Math.round(delay / 1000)}s).`,
      delay,
    );
  }
  if (status === 401 || status === 403) {
    return new AIError('invalid_key', 'TokenRouter rejected the API key. Check that it is valid.');
  }
  if (status === 400) {
    if (lower.includes('api key') || lower.includes('api_key')) {
      return new AIError('invalid_key', 'TokenRouter rejected the API key. Check that it is valid.');
    }
    return new AIError(
      'bad_response',
      `TokenRouter rejected the request: ${message || 'bad request'}.`,
    );
  }
  if (status === 404) {
    return new AIError(
      'config',
      `Model not found (404). ${message || 'Check the model id in AI settings.'}`,
    );
  }
  if (status >= 500) {
    return new AIError('unavailable', 'TokenRouter is temporarily unavailable. Try again shortly.');
  }
  return new AIError('network', `TokenRouter request failed (HTTP ${status}). ${message}`.trim());
}

/**
 * Extract the model's answer and reasoning trace from a response.
 *
 * Thinking models routed through TokenRouter prepend their internal
 * reasoning to `message.content` as a `<think>…</think>` block; some models
 * instead return a distinct `reasoning_content` field. Both are captured.
 */
function extractAnswer(data: TokenRouterResponse): { text: string; thinking: string } {
  const choice = data.choices?.[0];
  const content = choice?.message?.content;
  if (typeof content !== 'string') {
    throw new AIError('bad_response', 'TokenRouter returned no message content.');
  }

  const thinkBlocks: string[] = [];
  const answer = content
    .replace(/<think>([\s\S]*?)<\/think>/g, (_, inner: string) => {
      thinkBlocks.push(inner.trim());
      return '';
    })
    .trim();

  const thinking = [choice?.message?.reasoning_content?.trim(), ...thinkBlocks]
    .filter((t): t is string => Boolean(t && t.length > 0))
    .join('\n')
    .trim();

  if (answer.length === 0) {
    throw new AIError(
      'bad_response',
      `TokenRouter returned an empty answer (finish_reason: ${choice?.finish_reason ?? 'unknown'}).`,
    );
  }
  return { text: answer, thinking };
}

/** The TokenRouter provider. */
export const tokenRouterProvider: AIProvider = {
  id: 'tokenrouter',
  displayName: 'TokenRouter',
  requiresKey: true,
  defaultModel: 'MiniMax-M3',
  availableModels: ['MiniMax-M3'],
  apiKeyUrl: 'https://www.tokenrouter.com/',

  async suggestMove(request: AIRequest): Promise<AIMoveDecision> {
    if (!request.apiKey) {
      throw new AIError('no_key', 'No TokenRouter API key configured.');
    }

    const startedAt = Date.now();
    // Single user message: system instruction + hybrid game context — same
    // prompt construction as the Gemini provider so the harvested log stays
    // comparable across providers (layout contract in `context/renderContext`).
    const prompt =
      `${request.systemInstruction}\n\n` +
      `CURRENT GAME:\n${renderHybridContext(request.context)}\n\n` +
      'Now choose the best move and reply with only the JSON object.';
    const promptTemplateHash = await hashSystemInstruction(request.systemInstruction);
    let rawResponse: string | undefined;
    let thinkingText: string | undefined;
    let httpStatus: number | undefined;

    try {
      const body = {
        model: request.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: AI_TEMPERATURE,
      };

      // Combine our timeout with any caller-supplied abort signal.
      const controller = new AbortController();
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, AI_REQUEST_TIMEOUT_MS);
      const onParentAbort = () => controller.abort();
      request.signal?.addEventListener('abort', onParentAbort);

      // The timeout must cover the *whole* operation — the fetch AND the
      // response-body read (a stalled body read is otherwise unbounded), so
      // `response.json()` stays inside the timed/abortable section.
      let response: Response | undefined;
      let data: TokenRouterResponse | null = null;
      try {
        response = await fetch(`${TOKENROUTER_API_BASE}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${request.apiKey}`,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        httpStatus = response.status;
        try {
          data = (await response.json()) as TokenRouterResponse;
        } catch (jsonErr) {
          // An abort during the body read must surface as a timeout/cancel,
          // not be swallowed as "malformed JSON".
          if (jsonErr instanceof DOMException && jsonErr.name === 'AbortError') {
            throw jsonErr;
          }
          data = null;
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          throw new AIError(
            timedOut ? 'timeout' : 'aborted',
            timedOut
              ? `The model did not respond within ${Math.round(AI_REQUEST_TIMEOUT_MS / 1000)}s.`
              : 'The AI request was cancelled.',
          );
        }
        throw new AIError('network', 'Could not reach TokenRouter. Check your network connection.');
      } finally {
        clearTimeout(timer);
        request.signal?.removeEventListener('abort', onParentAbort);
      }

      if (!response) {
        throw new AIError('network', 'Could not reach TokenRouter.');
      }
      if (!response.ok) {
        throw errorFromHttp(response.status, data, retryAfterMsFromHeader(response));
      }
      if (!data) {
        throw new AIError('bad_response', 'TokenRouter returned a response that was not JSON.');
      }
      if (data.error) {
        const code = typeof data.error.code === 'number' ? data.error.code : 500;
        throw errorFromHttp(code, data);
      }

      const answer = extractAnswer(data);
      rawResponse = answer.text;
      thinkingText = answer.thinking || undefined;
      const decision = parseDecision(rawResponse, request.context.legalMoves.length);

      // Log the full interaction: prompt, response, thinking, decision, tokens.
      // `moveIndex === -1` is the resignation signal — recorded as `resigned`,
      // no move is applied (same contract as the Gemini provider).
      const usage = data.usage;
      const isResign = decision.moveIndex === -1;
      recordAIInteraction({
        id: uuidv7(),
        requestId: request.requestId ?? uuidv7(),
        sessionId: request.sessionId ?? '',
        attempt: request.attempt ?? 1,
        timestamp: Date.now(),
        provider: 'tokenrouter',
        model: request.model,
        seed: request.seed,
        turnIndex: request.turnIndex,
        config: request.config,
        outcome: isResign ? 'resigned' : 'success',
        durationMs: Date.now() - startedAt,
        prompt,
        promptTemplateHash,
        promptTemplateFinalisedAt: PROMPT_TEMPLATE_FINALISED_AT,
        promptTemplateVersion: PROMPT_TEMPLATE_VERSION,
        inferenceParams: { temperature: AI_TEMPERATURE },
        promptLayoutVersion: PROMPT_LAYOUT_VERSION,
        rawResponse,
        thinkingText,
        decision,
        httpStatus,
        promptTokens: usage?.prompt_tokens,
        thoughtTokens: usage?.completion_tokens_details?.reasoning_tokens,
        outputTokens: usage?.completion_tokens,
        totalTokens: usage?.total_tokens,
      });
      return decision;
    } catch (err) {
      recordAIInteraction({
        id: uuidv7(),
        requestId: request.requestId ?? uuidv7(),
        sessionId: request.sessionId ?? '',
        attempt: request.attempt ?? 1,
        timestamp: Date.now(),
        provider: 'tokenrouter',
        model: request.model,
        seed: request.seed,
        turnIndex: request.turnIndex,
        config: request.config,
        outcome: 'error',
        durationMs: Date.now() - startedAt,
        prompt,
        promptTemplateHash,
        promptTemplateFinalisedAt: PROMPT_TEMPLATE_FINALISED_AT,
        promptTemplateVersion: PROMPT_TEMPLATE_VERSION,
        inferenceParams: { temperature: AI_TEMPERATURE },
        promptLayoutVersion: PROMPT_LAYOUT_VERSION,
        rawResponse,
        thinkingText,
        httpStatus,
        errorKind: err instanceof AIError ? err.kind : 'network',
        errorMessage: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  },
};
