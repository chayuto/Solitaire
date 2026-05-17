/**
 * Tests for the UUIDv7 generator.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { uuidv7 } from './uuid';

const UUIDV7_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('uuidv7', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('produces a valid v7 UUID string', () => {
    expect(uuidv7()).toMatch(UUIDV7_RE);
  });

  it('sets the version nibble to 7 and a valid variant', () => {
    const id = uuidv7();
    expect(id[14]).toBe('7');
    expect(['8', '9', 'a', 'b']).toContain(id[19]);
  });

  it('produces unique values', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => uuidv7()));
    expect(ids.size).toBe(1000);
  });

  it('sorts chronologically by generation time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const earlier = uuidv7();
    vi.setSystemTime(new Date('2026-06-01T00:00:00Z'));
    const later = uuidv7();
    expect(earlier < later).toBe(true);
  });
});
