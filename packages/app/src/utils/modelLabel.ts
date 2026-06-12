/**
 * UI-only model labelling. Maps a raw model ID to a short colour-emoji tag so
 * the different models are easy to tell apart at a glance in the UI.
 *
 * IMPORTANT: this is purely presentational. The raw model ID is what gets sent
 * to the provider API — never pass a labelled string back into a request.
 */

/** Colour emoji per known model. Unknown models fall back to ⚪. */
const MODEL_EMOJI: Record<string, string> = {
  'gemma-4-31b-it': '🔵',
  'gemma-4-26b-a4b-it': '🟢',
  'gemini-3.1-flash-lite': '🟡',
  'MiniMax-M3': '🟣',
};

/** The colour emoji for a model ID, or ⚪ if unrecognised. */
export function modelEmoji(modelId: string): string {
  return MODEL_EMOJI[modelId] ?? '⚪';
}

/** `"<model-id> <emoji>"` — the model ID with its colour emoji appended. */
export function modelLabel(modelId: string): string {
  return `${modelId} ${modelEmoji(modelId)}`;
}
