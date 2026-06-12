/// <reference types="vite/client" />

declare const __BUILD_TIME__: string
declare const __COMMIT_HASH__: string
/**
 * Dev-only Gemini API key, injected from the repo-root `.env` by Vite.
 * Empty string in production builds. See `vite.config.ts`.
 */
declare const __DEV_GEMINI_KEY__: string
/**
 * Dev-only TokenRouter API key, injected from the repo-root `.env` by Vite.
 * Empty string in production builds. See `vite.config.ts`.
 */
declare const __DEV_TOKENROUTER_KEY__: string
