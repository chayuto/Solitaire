import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'
import { resolve } from 'path'

// Get build info
const getBuildInfo = () => {
  try {
    const commitHash = execSync('git rev-parse --short HEAD').toString().trim()
    const buildTime = new Date().toISOString()
    return { commitHash, buildTime }
  } catch {
    return { commitHash: 'unknown', buildTime: new Date().toISOString() }
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env vars from the repo root (.env is two levels up from packages/app).
  // The empty prefix loads ALL vars, including the non-VITE_-prefixed GEMINI_API_KEY.
  const rootEnv = loadEnv(mode, resolve(__dirname, '../..'), '')

  // Dev-only convenience: in `pnpm dev` the AI Move Advisor is pre-filled with
  // this local key, so a developer needn't paste one. It is injected ONLY in
  // development — a production build always receives an empty string, so the
  // key is never embedded in shipped code and prod users must paste their own.
  const devGeminiKey = mode === 'development' ? (rootEnv.GEMINI_API_KEY ?? '') : ''

  return {
    plugins: [react()],
    base: '/',
    define: {
      __BUILD_TIME__: JSON.stringify(getBuildInfo().buildTime),
      __COMMIT_HASH__: JSON.stringify(getBuildInfo().commitHash),
      __DEV_GEMINI_KEY__: JSON.stringify(devGeminiKey),
    },
    build: {
      // The `echarts` chunk below is a deliberately large vendor bundle that is
      // lazy-loaded only when the Insights charts open — it never touches the
      // eager entry path — so its size shouldn't trip the default 500 kB warning.
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          // ECharts (canvas chart lib + its zrender dep) is the heavy,
          // lazy-loaded chart vendor bundle shared by ProgressChart and
          // CardFlowChart. Pin it to a stable `echarts` chunk name so the build
          // output stays honest regardless of which tiny app module Rollup
          // happens to pick as the shared chunk's namesake. Referenced only by
          // the lazy charts, so it stays out of the eager entry bundle.
          manualChunks(id: string) {
            if (
              id.includes('node_modules/echarts/') ||
              id.includes('node_modules/echarts-for-react/') ||
              id.includes('node_modules/zrender/')
            ) {
              return 'echarts';
            }
            return undefined;
          },
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      css: true,
      exclude: ['e2e/**', 'node_modules/**'],
    },
  }
})
