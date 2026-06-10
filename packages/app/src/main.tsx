import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { installTestBridge } from './testBridge.ts'
import { useGameStore } from './store/gameStore.ts'
import { initSessionPersistence } from './store/persistence.ts'

// Anchor the tab to its game and start the debounced autosave. Explicit init
// (not a store-module side effect) so tests can import the store cleanly.
initSessionPersistence(useGameStore)

// Expose window.__solitaire for high-fidelity automated/agentic testing.
installTestBridge()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
