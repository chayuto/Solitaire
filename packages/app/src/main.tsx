import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { installTestBridge } from './testBridge.ts'

// Expose window.__solitaire for high-fidelity automated/agentic testing.
installTestBridge()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
