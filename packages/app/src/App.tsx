import { useEffect } from 'react'
import GameBoard from './components/GameBoard'
import { useGameStore } from './store/gameStore'

function App() {
  const undo = useGameStore((s) => s.undo)
  const redo = useGameStore((s) => s.redo)

  // Ctrl/Cmd+Z undoes, Ctrl/Cmd+Shift+Z redoes — except while typing in a
  // text field (the import dialog and the API-key modal have inputs where
  // the browser's native text undo must keep working).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return
      }
      e.preventDefault()
      if (e.shiftKey) redo()
      else undo()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [undo, redo])

  return <GameBoard />
}

export default App
