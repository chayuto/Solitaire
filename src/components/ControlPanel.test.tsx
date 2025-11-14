import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import ControlPanel from './ControlPanel';
import { useGameStore } from '../store/gameStore';

describe('ControlPanel - Move Counter', () => {
  beforeEach(() => {
    // Reset the store before each test
    useGameStore.getState().initializeGame();
  });

  it('should display move counter with initial value of 0', () => {
    render(<ControlPanel />);
    
    // Check that "Moves" label is present
    expect(screen.getByText('Moves')).toBeInTheDocument();
    
    // Check that the counter shows 0 initially
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('should update move counter when a move is made', async () => {
    render(<ControlPanel />);
    
    // Verify initial state
    expect(screen.getByText('0')).toBeInTheDocument();
    
    // Make a move (draw a card)
    act(() => {
      useGameStore.getState().drawCard();
    });
    
    // Verify counter updated to 1 - need to be specific since difficulty buttons also show numbers
    await waitFor(() => {
      const moveCounter = screen.getByText('Moves').nextElementSibling;
      expect(moveCounter).toHaveTextContent('1');
    });
  });

  it('should show correct move count after multiple moves', async () => {
    render(<ControlPanel />);
    
    // Make multiple moves
    act(() => {
      const store = useGameStore.getState();
      store.drawCard();
      store.drawCard();
      store.drawCard();
    });
    
    // Verify counter shows 3 - need to be specific since difficulty buttons also show numbers
    await waitFor(() => {
      const moveCounter = screen.getByText('Moves').nextElementSibling;
      expect(moveCounter).toHaveTextContent('3');
    });
  });

  it('should reset move counter to 0 on new game', async () => {
    render(<ControlPanel />);
    
    // Make some moves
    act(() => {
      const store = useGameStore.getState();
      store.drawCard();
      store.drawCard();
    });
    
    // Verify counter is not 0 - need to be specific since difficulty buttons also show numbers
    await waitFor(() => {
      const moveCounter = screen.getByText('Moves').nextElementSibling;
      expect(moveCounter).toHaveTextContent('2');
    });
    
    // Start new game
    act(() => {
      useGameStore.getState().initializeGame();
    });
    
    // Verify counter reset to 0
    await waitFor(() => {
      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });

  it('should persist move counter after save/load', async () => {
    render(<ControlPanel />);
    
    // Make some moves
    act(() => {
      const store = useGameStore.getState();
      store.drawCard();
      store.drawCard();
      store.drawCard();
    });
    
    // Verify counter shows 3 - need to be specific since difficulty buttons also show numbers
    await waitFor(() => {
      const moveCounter = screen.getByText('Moves').nextElementSibling;
      expect(moveCounter).toHaveTextContent('3');
    });
    
    // Export and import game state
    let savedState: string;
    act(() => {
      const store = useGameStore.getState();
      savedState = store.exportGameState();
      store.initializeGame(); // Reset to verify import works
    });
    
    await waitFor(() => {
      expect(screen.getByText('0')).toBeInTheDocument();
    });
    
    act(() => {
      useGameStore.getState().importGameState(savedState);
    });
    
    // Verify counter restored to 3
    await waitFor(() => {
      const moveCounter = screen.getByText('Moves').nextElementSibling;
      expect(moveCounter).toHaveTextContent('3');
    });
  });
});
