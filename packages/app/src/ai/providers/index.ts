/**
 * Provider registry for the AI Move Advisor.
 *
 * The rest of the app resolves providers through {@link getProvider}, never by
 * importing a concrete provider directly. Adding a new provider means adding it
 * to {@link REGISTRY} — no store or UI changes are required.
 *
 * A test override ({@link setProviderOverride}) lets the test bridge swap in a
 * deterministic stub.
 *
 * @module ai/providers
 */

import { AIError, type AIProvider, type AIProviderId } from '../types';
import { geminiProvider } from './GeminiProvider';

/** All registered providers, keyed by id. */
const REGISTRY: Record<AIProviderId, AIProvider> = {
  gemini: geminiProvider,
};

/** Active test override; when set, {@link getProvider} returns it for any id. */
let override: AIProvider | null = null;

/**
 * Resolve the provider to use. Returns the test override when one is set,
 * otherwise the registered provider for `id`.
 *
 * @throws {AIError} of kind `config` when `id` is unknown.
 */
export function getProvider(id: AIProviderId): AIProvider {
  if (override) return override;
  const provider = REGISTRY[id];
  if (!provider) {
    throw new AIError('config', `Unknown AI provider: ${id}`);
  }
  return provider;
}

/** All registered providers (ignores any test override). */
export function listProviders(): AIProvider[] {
  return Object.values(REGISTRY);
}

/** Install (or clear, with `null`) a provider override for testing. */
export function setProviderOverride(provider: AIProvider | null): void {
  override = provider;
}

/** The current provider override, if any. */
export function getProviderOverride(): AIProvider | null {
  return override;
}

export { geminiProvider } from './GeminiProvider';
export { createStubProvider } from './stubProvider';
export type { StubDecisionFn } from './stubProvider';
