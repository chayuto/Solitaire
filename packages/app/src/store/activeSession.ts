/**
 * Per-tab active-session anchor.
 *
 * A tab needs to remember which saved game it is playing so a reload — or an
 * accidental swipe-back/forward — restores the *same* board, while other tabs
 * (Parallel Windows) keep their own boards.
 *
 * The id is anchored in two places ("Both"):
 *  - the URL (`?session=<id>`) — intrinsically per-tab and reload-stable, and
 *    the authoritative source on load;
 *  - `sessionStorage` — a fallback if the URL is ever stripped.
 *
 * The Parallel Window trap: `window.open()` to a same-origin page *copies* the
 * opener's `sessionStorage` into the child. A child must therefore not inherit
 * the opener's session. The opener opens it with `?fork=1`; the child sees that
 * flag, discards the inherited anchor, and starts a brand-new session.
 *
 * @module store/activeSession
 */

/** URL query parameter holding the active session id. */
const URL_PARAM = 'session';

/** URL query parameter marking a freshly-forked Parallel Window. */
const FORK_PARAM = 'fork';

/** `sessionStorage` key mirroring the active session id. */
const STORAGE_KEY = 'solitaire:activeSessionId';

/** True when startup found no anchor and the launch was not an explicit deal. */
let cleanVisit = false;

/** Safe `sessionStorage` accessor (it can throw in private modes / SSR). */
function sessionStore(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Resolve the session id this tab should restore on startup.
 *
 * Returns `null` when the tab should start a fresh game: a `?fork=1` launch, an
 * explicit `?seed=`/`?difficulty=` deal, or a plain first visit. {@link wasCleanVisit}
 * distinguishes the plain first visit (the only case that may show the picker).
 */
export function resolveActiveSessionId(): string | null {
  cleanVisit = false;
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);

  // A Parallel Window fork must ignore the sessionStorage copied from its
  // opener and start its own session.
  if (params.has(FORK_PARAM)) {
    sessionStore()?.removeItem(STORAGE_KEY);
    return null;
  }

  // The URL is authoritative; mirror it into sessionStorage.
  const fromUrl = params.get(URL_PARAM);
  if (fromUrl) {
    sessionStore()?.setItem(STORAGE_KEY, fromUrl);
    return fromUrl;
  }

  // No URL anchor — fall back to sessionStorage (e.g. URL stripped by a tool).
  const fromStorage = sessionStore()?.getItem(STORAGE_KEY) ?? null;
  if (fromStorage) return fromStorage;

  // Nothing to restore. A plain visit may show the saved-games picker; an
  // explicit deal (?seed=/?difficulty=) should just deal that board.
  cleanVisit = !params.has('seed') && !params.has('difficulty');
  return null;
}

/**
 * Whether startup was a plain first visit with no session to restore — the
 * only case in which the saved-games picker should be offered.
 */
export function wasCleanVisit(): boolean {
  return cleanVisit;
}

/**
 * Anchor this tab to `sessionId`: reflect it into the URL (via `replaceState`,
 * so no history entry is added) and into `sessionStorage`. The one-shot
 * `?fork=1` flag is removed once consumed.
 */
export function setActiveSessionId(sessionId: string): void {
  if (typeof window === 'undefined') return;

  sessionStore()?.setItem(STORAGE_KEY, sessionId);

  const url = new URL(window.location.href);
  url.searchParams.set(URL_PARAM, sessionId);
  url.searchParams.delete(FORK_PARAM);
  window.history.replaceState(window.history.state, '', url);
}
