# Solitaire Card Game

A modern, interactive Solitaire (Klondike) card game built with React and TypeScript.

## 🎮 Features

- Classic Klondike Solitaire gameplay
- Smooth drag-and-drop card interactions
- Save/Load game state functionality
- Export game history and board setup
- Responsive green felt-style game board
- Built with modern React 19

## 🛠️ Tech Stack

- **Frontend Framework**: React 19.2.0
- **Language**: TypeScript 5.9
- **Build Tool**: Vite 7.2
- **State Management**: Zustand 5.0
- **Styling**: Tailwind CSS 4.1
- **Drag & Drop**: @dnd-kit/core 6.3
- **Animations**: Framer Motion 12.23
- **Testing**: Vitest 4.0 with React Testing Library
- **Code Quality**: ESLint with TypeScript support

## 📦 Installation

```bash
npm install
```

## 🚀 Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🌐 Deployment

The app is automatically deployed to GitHub Pages on every push to the `main` branch.

**Live URL**: <https://chayuto.github.io/Solitaire/>

**Cost**: FREE - GitHub Pages is completely free for public repositories with unlimited bandwidth.

The deployment workflow:

1. Runs linting, tests, and builds the app
2. Only deploys if all checks pass
3. Updates the live site within 1-2 minutes

To enable GitHub Pages after pushing:

1. Go to your repository settings → Pages
2. Set Source to "GitHub Actions"
3. The site will deploy automatically on the next push to main

## 🧪 Testing

```bash
# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

## 🔍 Code Quality

```bash
# Run ESLint
npm run lint
```

## 📁 Project Structure

```
src/
├── constants/          # Game configuration
│   ├── game.ts         # Card and game constants
│   ├── difficulty.ts   # Difficulty system config
│   └── index.ts        # Barrel export
├── components/         # React components
│   ├── Card.tsx        # Individual card component
│   ├── DrawPile.tsx    # Draw pile component
│   ├── DiscardPile.tsx # Discard pile component
│   ├── FoundationPile.tsx # Foundation pile component
│   ├── TableauColumn.tsx  # Tableau column component
│   ├── ControlPanel.tsx   # Game controls
│   ├── ActivityLog.tsx    # Move history log
│   ├── WinModal.tsx       # Win condition modal
│   └── GameBoard.tsx      # Main game board
├── store/              # State management
│   ├── helpers/        # Pure helper functions
│   │   ├── deckHelpers.ts       # Deck operations
│   │   ├── cardHelpers.ts       # Card utilities
│   │   ├── validationHelpers.ts # Move validation
│   │   ├── metricsHelpers.ts    # Metrics calculation
│   │   ├── gameStateHelpers.ts  # State utilities
│   │   └── index.ts             # Barrel export
│   ├── gameStore.ts    # Zustand game state store
│   └── *.test.ts       # Store tests
├── types/              # TypeScript type definitions
│   └── index.ts        # Card, GameState, Move types
├── utils/              # Utility functions
│   └── motion.ts       # Motion detection utility
├── test/               # Test setup
│   └── setup.ts        # Vitest configuration
├── App.tsx             # Main App component
└── main.tsx           # Application entry point
```

**Recent Refactoring (Nov 2025):** The codebase was refactored for improved maintainability:
- Extracted helpers and constants from monolithic gameStore
- Reduced gameStore.ts from 1,324 → 890 lines (33% reduction)
- Added comprehensive JSDoc documentation
- See `/docs/internal/20251114_deep_refactor_summary.md` for details

## 🎯 Game Rules

Classic Klondike Solitaire:
- Move all cards to foundation piles (sorted by suit from Ace to King)
- Tableau cards can be moved in descending order with alternating colors
- Draw cards from the draw pile to the discard pile
- Win by completing all four foundation piles

## 💾 Save/Load System

The game includes:
- **Save State**: Export complete game state as JSON
- **Load State**: Import previously saved game states
- **Move History**: Track all moves made during the game
- **Board Export**: Export initial board setup for replay

## 📚 Documentation

### Development Documentation
- `/docs/internal/architecture.md` - Architecture overview and design patterns
- `/docs/internal/20251114_deep_refactor_summary.md` - Refactoring details
- `/docs/difficulty-system.md` - Difficulty system documentation

### Task Reports
See `/docs/reports/` for:
- Project state documentation
- Improvement suggestions
- Coding agent task breakdowns
- Development guidelines

## 🤝 Contributing

This is a solo development project. For improvements and extensions, see the task files in `/docs/reports/`.

## 📄 License

Private project

## 👤 Author

Solo developer project
