import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'

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
export default defineConfig({
  plugins: [react()],
  base: '/Solitaire/',
  define: {
    __BUILD_TIME__: JSON.stringify(getBuildInfo().buildTime),
    __COMMIT_HASH__: JSON.stringify(getBuildInfo().commitHash),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
})
