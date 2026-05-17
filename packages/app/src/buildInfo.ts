/**
 * Build metadata, injected at build time by Vite (see `vite.config.ts`).
 *
 * Used to stamp exported data so a harvested log or save can be traced back to
 * the exact code revision that produced it.
 *
 * @module buildInfo
 */

/** Short git commit hash of the running build (`unknown` if unavailable). */
export const APP_COMMIT: string =
  typeof __COMMIT_HASH__ === 'string' ? __COMMIT_HASH__ : 'unknown';

/** ISO timestamp of when the running build was produced. */
export const APP_BUILD_TIME: string =
  typeof __BUILD_TIME__ === 'string' ? __BUILD_TIME__ : 'unknown';
