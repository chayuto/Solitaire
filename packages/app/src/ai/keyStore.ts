/**
 * Session-scoped storage for LLM API keys.
 *
 * Keys live in `sessionStorage` only: they survive page reloads within the
 * same browser tab but are cleared when the tab closes. They are never written
 * to `localStorage`, never exported with a save file, and never logged.
 *
 * This is the *only* module permitted to read or write API keys to storage.
 *
 * @module ai/keyStore
 */

import type { AIProviderId } from './types';

/** `sessionStorage` key prefix for provider API keys. */
const STORAGE_PREFIX = 'solitaire.ai.key.';

/** Safely access `sessionStorage` (absent in SSR / some test environments). */
function getStorage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return null;
    return window.sessionStorage;
  } catch {
    // Accessing sessionStorage can throw in sandboxed iframes / privacy modes.
    return null;
  }
}

/**
 * Dev-only fallback key for a provider, injected from the repo-root `.env` at
 * build time. Empty string in production builds. Lets `pnpm dev` use a `.env`
 * key without pasting it into the UI. See `vite.config.ts`.
 */
export function getDevFallbackKey(provider: AIProviderId): string {
  try {
    switch (provider) {
      case 'gemini':
        return typeof __DEV_GEMINI_KEY__ === 'string' ? __DEV_GEMINI_KEY__ : '';
      case 'tokenrouter':
        return typeof __DEV_TOKENROUTER_KEY__ === 'string' ? __DEV_TOKENROUTER_KEY__ : '';
      default:
        return '';
    }
  } catch {
    return '';
  }
}

/** Retrieve the stored API key for a provider, or `null` if none is set. */
export function getKey(provider: AIProviderId): string | null {
  const storage = getStorage();
  if (!storage) return null;
  const value = storage.getItem(STORAGE_PREFIX + provider);
  return value && value.length > 0 ? value : null;
}

/**
 * Retrieve the key to actually use for a request: the user-provided key if
 * present, otherwise the dev fallback key (development builds only).
 */
export function getEffectiveKey(provider: AIProviderId): string | null {
  const stored = getKey(provider);
  if (stored) return stored;
  const fallback = getDevFallbackKey(provider);
  return fallback.length > 0 ? fallback : null;
}

/** Store an API key for a provider. An empty/blank key clears it instead. */
export function setKey(provider: AIProviderId, key: string): void {
  const storage = getStorage();
  if (!storage) return;
  const trimmed = key.trim();
  if (trimmed.length === 0) {
    storage.removeItem(STORAGE_PREFIX + provider);
  } else {
    storage.setItem(STORAGE_PREFIX + provider, trimmed);
  }
}

/** Remove a provider's stored API key. */
export function clearKey(provider: AIProviderId): void {
  const storage = getStorage();
  storage?.removeItem(STORAGE_PREFIX + provider);
}

/** Whether a usable key (user-provided or dev fallback) exists for a provider. */
export function hasUsableKey(provider: AIProviderId): boolean {
  return getEffectiveKey(provider) !== null;
}

/** Whether the user has explicitly stored a key (ignores the dev fallback). */
export function hasUserKey(provider: AIProviderId): boolean {
  return getKey(provider) !== null;
}
