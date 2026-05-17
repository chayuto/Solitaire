/**
 * Tests for the session-scoped API key store.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  clearKey,
  getEffectiveKey,
  getKey,
  hasUsableKey,
  hasUserKey,
  setKey,
} from './keyStore';

describe('keyStore', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('returns null when no key is stored', () => {
    expect(getKey('gemini')).toBeNull();
    expect(hasUserKey('gemini')).toBe(false);
  });

  it('stores and retrieves a key', () => {
    setKey('gemini', 'my-secret-key');
    expect(getKey('gemini')).toBe('my-secret-key');
    expect(hasUserKey('gemini')).toBe(true);
  });

  it('trims whitespace around a stored key', () => {
    setKey('gemini', '  spaced-key  ');
    expect(getKey('gemini')).toBe('spaced-key');
  });

  it('treats a blank key as a clear', () => {
    setKey('gemini', 'real-key');
    setKey('gemini', '   ');
    expect(getKey('gemini')).toBeNull();
  });

  it('clearKey removes a stored key', () => {
    setKey('gemini', 'real-key');
    clearKey('gemini');
    expect(getKey('gemini')).toBeNull();
  });

  it('persists the key under the sessionStorage namespace', () => {
    setKey('gemini', 'abc123');
    expect(sessionStorage.getItem('solitaire.ai.key.gemini')).toBe('abc123');
  });

  it('getEffectiveKey returns the stored key', () => {
    setKey('gemini', 'effective-key');
    expect(getEffectiveKey('gemini')).toBe('effective-key');
    expect(hasUsableKey('gemini')).toBe(true);
  });

  it('getEffectiveKey returns null when nothing is available', () => {
    // The dev fallback key is empty in test builds.
    expect(getEffectiveKey('gemini')).toBeNull();
    expect(hasUsableKey('gemini')).toBe(false);
  });
});
