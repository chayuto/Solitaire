import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import WinModal from './WinModal';
import { useGameStore } from '../store/gameStore';

describe('WinModal', () => {
  beforeEach(() => {
    // Reset the store before each test
    useGameStore.setState({
      gameWon: false,
      moveHistory: [],
      difficulty: 3,
      perceivedDifficulty: 50,
    });
  });

  it('should not render when game is not won', () => {
    useGameStore.setState({ gameWon: false });
    const { container } = render(<WinModal />);
    expect(container).toBeEmptyDOMElement();
  });

  it('should render congratulations message when game is won', () => {
    useGameStore.setState({ gameWon: true, moveHistory: [], difficulty: 3 });
    render(<WinModal />);
    expect(screen.getByText('Congratulations!')).toBeInTheDocument();
  });

  it('should display game statistics when game is won', () => {
    useGameStore.setState({
      gameWon: true,
      moveHistory: [
        { type: 'draw_card', timestamp: Date.now(), card: { suit: 'hearts', rank: 'A', faceUp: true, id: '1' } },
        { type: 'draw_card', timestamp: Date.now(), card: { suit: 'spades', rank: 'K', faceUp: true, id: '2' } },
      ],
      difficulty: 3,
      perceivedDifficulty: 45,
    });
    
    render(<WinModal />);
    
    // Check for statistics section
    expect(screen.getByText('Game Statistics')).toBeInTheDocument();
    
    // Check for total moves
    expect(screen.getByText('Total Moves:')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    
    // Check for difficulty
    expect(screen.getByText('Difficulty:')).toBeInTheDocument();
    expect(screen.getByText('Normal')).toBeInTheDocument();
    
    // Check for board difficulty
    expect(screen.getByText('Board Difficulty:')).toBeInTheDocument();
    expect(screen.getByText('45/100')).toBeInTheDocument();
  });

  it('should display correct difficulty labels', () => {
    // Test Very Easy (1)
    useGameStore.setState({ gameWon: true, difficulty: 1, moveHistory: [] });
    const { rerender } = render(<WinModal />);
    expect(screen.getByText('Very Easy')).toBeInTheDocument();
    
    // Test Hard (4)
    useGameStore.setState({ gameWon: true, difficulty: 4, moveHistory: [] });
    rerender(<WinModal />);
    expect(screen.getByText('Hard')).toBeInTheDocument();
    
    // Test Very Hard (5)
    useGameStore.setState({ gameWon: true, difficulty: 5, moveHistory: [] });
    rerender(<WinModal />);
    expect(screen.getByText('Very Hard')).toBeInTheDocument();
  });

  it('should not display board difficulty when not available', () => {
    useGameStore.setState({
      gameWon: true,
      moveHistory: [],
      difficulty: 3,
      perceivedDifficulty: undefined,
    });
    
    render(<WinModal />);
    
    expect(screen.queryByText('Board Difficulty:')).not.toBeInTheDocument();
  });
});
