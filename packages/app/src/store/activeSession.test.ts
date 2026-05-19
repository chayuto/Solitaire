/**
 * Tests for the per-tab active-session anchor.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  resolveActiveSessionId,
  setActiveSessionId,
  wasCleanVisit,
} from './activeSession';

const STORAGE_KEY = 'solitaire:activeSessionId';

/** Set the page URL (path + query) without a navigation. */
function setUrl(pathAndQuery: string): void {
  window.history.replaceState({}, '', pathAndQuery);
}

describe('activeSession', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    setUrl('/');
  });

  it('resolves the id from the URL and mirrors it into sessionStorage', () => {
    setUrl('/?session=abc-123');
    expect(resolveActiveSessionId()).toBe('abc-123');
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBe('abc-123');
    expect(wasCleanVisit()).toBe(false);
  });

  it('falls back to sessionStorage when the URL has no anchor', () => {
    window.sessionStorage.setItem(STORAGE_KEY, 'from-storage');
    expect(resolveActiveSessionId()).toBe('from-storage');
  });

  it('prefers the URL over sessionStorage', () => {
    window.sessionStorage.setItem(STORAGE_KEY, 'stale');
    setUrl('/?session=fresh');
    expect(resolveActiveSessionId()).toBe('fresh');
  });

  it('a ?fork=1 launch starts fresh and discards the inherited anchor', () => {
    // sessionStorage copied from the opener tab.
    window.sessionStorage.setItem(STORAGE_KEY, 'opener-session');
    setUrl('/?seed=42&difficulty=3&fork=1');
    expect(resolveActiveSessionId()).toBeNull();
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    // A fork is not a plain visit — it must not show the picker.
    expect(wasCleanVisit()).toBe(false);
  });

  it('a plain first visit is a clean visit', () => {
    setUrl('/');
    expect(resolveActiveSessionId()).toBeNull();
    expect(wasCleanVisit()).toBe(true);
  });

  it('an explicit ?seed= deal is not a clean visit', () => {
    setUrl('/?seed=99');
    expect(resolveActiveSessionId()).toBeNull();
    expect(wasCleanVisit()).toBe(false);
  });

  it('setActiveSessionId writes the URL and sessionStorage, dropping fork', () => {
    setUrl('/?seed=7&fork=1');
    setActiveSessionId('new-session');
    const params = new URLSearchParams(window.location.search);
    expect(params.get('session')).toBe('new-session');
    expect(params.has('fork')).toBe(false);
    expect(params.get('seed')).toBe('7');
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBe('new-session');
  });
});
