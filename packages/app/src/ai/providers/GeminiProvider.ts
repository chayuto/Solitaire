/**
 * Google Gemini / Gemma provider for the AI Move Advisor.
 *
 * Calls the Generative Language REST API directly from the browser using the
 * user's own API key. There is no backend: the key is sent only to Google.
 *
 * Design notes:
 * - The request is a single user message: the system instruction, the game
 *   context JSON, and the output instruction are concatenated. Gemma models do
 *   not reliably support a separate `systemInstruction`, so folding everything
 *   into one message keeps a single code path that works for both Gemma and
 *   Gemini models.
 * - `gemma-4-31b-it` is a *thinking* model: its response splits into parts
 *   flagged `thought: true` (internal reasoning) and the final answer part.
 *   We read only the non-thought parts, then parse leniently as a safety net.
 *
 * @module ai/providers/GeminiProvider
 */

import {
  AI_RATE_LIMIT_FALLBACK_DELAY,
  AI_REQUEST_TIMEOUT_MS,
  AI_TEMPERATURE,
  GEMINI_API_BASE,
} from '../constants';
import { parseDecision } from '../decision/schema';
import { recordAIInteraction } from '../interactionLog';
import { uuidv7 } from '../uuid';
import { AIError, type AIMoveDecision, type AIProvider, type AIRequest } from '../types';

/** Shape of a single content part in a Gemini API response. */
interface GeminiPart {
  text?: string;
  thought?: boolean;
}

/** Token-usage block from a Gemini response. */
interface GeminiUsage {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  thoughtsTokenCount?: number;
  totalTokenCount?: number;
}

/** Minimal shape of the Gemini `generateContent` response we rely on. */
interface GeminiResponse {
  candidates?: {
    content?: { parts?: GeminiPart[] };
    finishReason?: string;
  }[];
  promptFeedback?: { blockReason?: string };
  usageMetadata?: GeminiUsage;
  error?: { code?: number; message?: string; status?: string; details?: unknown[] };
}

/**
 * Extract a server-suggested retry delay (ms) from an error body's
 * `RetryInfo` detail (a protobuf Duration string like `"57s"`).
 */
function extractRetryDelayMs(body: GeminiResponse | null): number | undefined {
  const details = body?.error?.details;
  if (!Array.isArray(details)) return undefined;
  for (const detail of details) {
    if (detail && typeof detail === 'object' && 'retryDelay' in detail) {
      const raw = (detail as { retryDelay?: unknown }).retryDelay;
      if (typeof raw === 'string') {
        const match = /^([\d.]+)s$/.exec(raw.trim());
        if (match) return Math.round(parseFloat(match[1]) * 1000);
      }
    }
  }
  return undefined;
}

/** Map a non-OK HTTP response to a typed {@link AIError}. */
function errorFromHttp(status: number, body: GeminiResponse | null): AIError {
  const message = body?.error?.message ?? '';
  const lower = message.toLowerCase();

  if (status === 429) {
    // Honor the server's RetryInfo; otherwise wait long enough to clear a
    // per-minute window (a short retry would just hit the limit again).
    const retryAfterMs = extractRetryDelayMs(body) ?? AI_RATE_LIMIT_FALLBACK_DELAY;
    return new AIError(
      'rate_limited',
      `Gemini rate limit reached (retry in ~${Math.round(retryAfterMs / 1000)}s).`,
      retryAfterMs,
    );
  }
  if (status === 401 || status === 403) {
    return new AIError('invalid_key', 'Gemini rejected the API key. Check that it is valid.');
  }
  if (status === 400) {
    if (lower.includes('api key') || lower.includes('api_key')) {
      return new AIError('invalid_key', 'Gemini rejected the API key. Check that it is valid.');
    }
    return new AIError('bad_response', `Gemini rejected the request: ${message || 'bad request'}.`);
  }
  if (status === 404) {
    return new AIError(
      'config',
      `Model not found (404). ${message || 'Check the model id in AI settings.'}`,
    );
  }
  if (status >= 500) {
    return new AIError('unavailable', 'Gemini is temporarily unavailable. Try again shortly.');
  }
  return new AIError('network', `Gemini request failed (HTTP ${status}). ${message}`.trim());
}

/**
 * Extract the model's answer and its internal reasoning trace from a response.
 *
 * Thinking models split their output into `thought: true` parts (the internal
 * reasoning) and the final answer part. We return both: the answer to parse,
 * and the thinking trace to log for distillation harvesting.
 */
function extractAnswer(data: GeminiResponse): { text: string; thinking: string } {
  const candidate = data.candidates?.[0];
  if (!candidate) {
    const block = data.promptFeedback?.blockReason;
    throw new AIError(
      'bad_response',
      block
        ? `Gemini blocked the request (${block}).`
        : 'Gemini returned no candidates.',
    );
  }

  const parts = candidate.content?.parts ?? [];
  const thinking = parts
    .filter((p) => p.thought === true && typeof p.text === 'string')
    .map((p) => p.text as string)
    .join('')
    .trim();

  // Prefer non-"thought" parts (the final answer of a thinking model).
  const answer = parts
    .filter((p) => p.thought !== true && typeof p.text === 'string')
    .map((p) => p.text as string)
    .join('')
    .trim();
  if (answer.length > 0) return { text: answer, thinking };

  // Fallback: some models do not flag thought parts — use everything.
  const all = parts
    .filter((p) => typeof p.text === 'string')
    .map((p) => p.text as string)
    .join('')
    .trim();
  if (all.length > 0) return { text: all, thinking };

  throw new AIError(
    'bad_response',
    `Gemini returned an empty answer (finishReason: ${candidate.finishReason ?? 'unknown'}).`,
  );
}

/** The Google Gemini / Gemma provider. */
export const geminiProvider: AIProvider = {
  id: 'gemini',
  displayName: 'Google Gemini / Gemma',
  requiresKey: true,
  defaultModel: 'gemma-4-31b-it',
  availableModels: ['gemma-4-31b-it', 'gemma-4-26b-a4b-it', 'gemini-3.1-flash-lite'],
  apiKeyUrl: 'https://aistudio.google.com/apikey',

  async suggestMove(request: AIRequest): Promise<AIMoveDecision> {
    if (!request.apiKey) {
      throw new AIError('no_key', 'No Gemini API key configured.');
    }

    const startedAt = Date.now();
    // Single user message: system instruction + game context (the output
    // rules are already inside the system instruction).
    const prompt =
      `${request.systemInstruction}\n\n` +
      `CURRENT GAME (JSON):\n${JSON.stringify(request.context)}\n\n` +
      'Now choose the best move and reply with only the JSON object.';
    let rawResponse: string | undefined;
    let thinkingText: string | undefined;
    let httpStatus: number | undefined;

    try {
      const body = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: AI_TEMPERATURE },
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

      const url =
        `${GEMINI_API_BASE}/models/${encodeURIComponent(request.model)}:generateContent` +
        `?key=${encodeURIComponent(request.apiKey)}`;

      // The timeout must cover the *whole* operation — the fetch AND the
      // response-body read. Reading a stalled body is otherwise unbounded
      // (it once hung ~17 minutes), so `response.json()` stays inside the
      // timed/abortable section and the timer is cleared only afterwards.
      let response: Response | undefined;
      let data: GeminiResponse | null = null;
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        httpStatus = response.status;
        try {
          data = (await response.json()) as GeminiResponse;
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
        throw new AIError('network', 'Could not reach Gemini. Check your network connection.');
      } finally {
        clearTimeout(timer);
        request.signal?.removeEventListener('abort', onParentAbort);
      }

      if (!response) {
        throw new AIError('network', 'Could not reach Gemini.');
      }
      if (!response.ok) {
        throw errorFromHttp(response.status, data);
      }
      if (!data) {
        throw new AIError('bad_response', 'Gemini returned a response that was not JSON.');
      }
      if (data.error) {
        throw errorFromHttp(data.error.code ?? 500, data);
      }

      const answer = extractAnswer(data);
      rawResponse = answer.text;
      thinkingText = answer.thinking || undefined;
      const decision = parseDecision(rawResponse, request.context.legalMoves.length);

      // Log the full interaction: prompt, response, thinking, decision, tokens.
      const usage = data.usageMetadata;
      recordAIInteraction({
        id: uuidv7(),
        requestId: request.requestId ?? uuidv7(),
        sessionId: request.sessionId ?? '',
        attempt: request.attempt ?? 1,
        timestamp: Date.now(),
        provider: 'gemini',
        model: request.model,
        seed: request.seed,
        turnIndex: request.turnIndex,
        config: request.config,
        outcome: 'success',
        durationMs: Date.now() - startedAt,
        prompt,
        rawResponse,
        thinkingText,
        decision,
        httpStatus,
        promptTokens: usage?.promptTokenCount,
        thoughtTokens: usage?.thoughtsTokenCount,
        outputTokens: usage?.candidatesTokenCount,
        totalTokens: usage?.totalTokenCount,
      });
      return decision;
    } catch (err) {
      recordAIInteraction({
        id: uuidv7(),
        requestId: request.requestId ?? uuidv7(),
        sessionId: request.sessionId ?? '',
        attempt: request.attempt ?? 1,
        timestamp: Date.now(),
        provider: 'gemini',
        model: request.model,
        seed: request.seed,
        turnIndex: request.turnIndex,
        config: request.config,
        outcome: 'error',
        durationMs: Date.now() - startedAt,
        prompt,
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
