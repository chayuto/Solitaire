/**
 * Tests for AI request diagnostics (time / token logging).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  recordAIDiagnostics,
  getAIDiagnostics,
  getLastAIDiagnostics,
  clearAIDiagnostics,
  type AIDiagnostics,
} from './diagnostics';

const success: AIDiagnostics = {
  timestamp: 1,
  model: 'gemma-4-31b-it',
  outcome: 'success',
  durationMs: 61_000,
  promptTokens: 620,
  thoughtTokens: 1840,
  outputTokens: 42,
  totalTokens: 2502,
};

describe('diagnostics', () => {
  beforeEach(() => {
    clearAIDiagnostics();
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('records and returns an entry', () => {
    recordAIDiagnostics(success);
    expect(getAIDiagnostics()).toEqual([success]);
  });

  it('getLastAIDiagnostics returns the most recent entry', () => {
    expect(getLastAIDiagnostics()).toBeNull();
    recordAIDiagnostics(success);
    recordAIDiagnostics({ ...success, timestamp: 2 });
    expect(getLastAIDiagnostics()?.timestamp).toBe(2);
  });

  it('logs token usage to the console for a success', () => {
    const info = vi.mocked(console.info);
    recordAIDiagnostics(success);
    expect(info).toHaveBeenCalled();
    expect(info.mock.calls.some((c) => String(c[0]).includes('total=2502'))).toBe(true);
  });

  it('logs a warning for an error outcome', () => {
    const warn = vi.mocked(console.warn);
    recordAIDiagnostics({
      timestamp: 3,
      model: 'gemma-4-31b-it',
      outcome: 'error',
      durationMs: 1200,
      errorKind: 'unavailable',
    });
    expect(warn).toHaveBeenCalled();
    expect(warn.mock.calls.some((c) => String(c[0]).includes('unavailable'))).toBe(true);
  });

  it('caps the ring buffer at 100 entries', () => {
    for (let i = 0; i < 130; i++) {
      recordAIDiagnostics({ ...success, timestamp: i });
    }
    const entries = getAIDiagnostics();
    expect(entries).toHaveLength(100);
    // Oldest entries were dropped; the newest is retained.
    expect(entries[entries.length - 1].timestamp).toBe(129);
    expect(entries[0].timestamp).toBe(30);
  });

  it('clearAIDiagnostics empties the buffer', () => {
    recordAIDiagnostics(success);
    clearAIDiagnostics();
    expect(getAIDiagnostics()).toEqual([]);
  });
});
