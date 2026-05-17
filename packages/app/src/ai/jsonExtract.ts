/**
 * Lenient extraction of a JSON object from free-form model output.
 *
 * Thinking models (e.g. `gemma-4-31b-it`) and chat models sometimes wrap their
 * answer in markdown fences or emit reasoning prose alongside it. This module
 * recovers the intended JSON object from such output.
 *
 * @module ai/jsonExtract
 */

/**
 * Extract the first balanced top-level `{...}` object from `text`.
 *
 * Brace counting is string-aware: braces inside JSON string literals (and
 * escaped quotes) are ignored. Returns the object's source substring, or
 * `null` if no balanced object is found.
 */
export function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
    } else if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  return null;
}

/**
 * Parse a JSON object out of free-form model output.
 *
 * Tries, in order: the whole (fence-stripped) string, then the first balanced
 * `{...}` object found within it. Returns the parsed value, or `null` if
 * nothing usable could be parsed.
 */
export function parseLooseJsonObject(text: string): unknown {
  // Strip a leading/trailing markdown code fence if present.
  const stripped = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  // Fast path: the whole thing is valid JSON.
  try {
    return JSON.parse(stripped);
  } catch {
    // Fall through to substring extraction.
  }

  const candidate = extractFirstJsonObject(stripped);
  if (candidate) {
    try {
      return JSON.parse(candidate);
    } catch {
      return null;
    }
  }

  return null;
}
