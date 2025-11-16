# Solitaire Card Game

A modern, interactive Solitaire (Klondike) card game built with React and TypeScript. Organized as a monorepo with reusable game logic libraries.

## 🎮 Features

- Classic Klondike Solitaire gameplay
- Smooth drag-and-drop card interactions
- Save/Load game state functionality
- Export game history and board setup
- Responsive green felt-style game board
- Built with modern React 19
- Modular architecture with reusable game logic libraries

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
- **Monorepo**: npm workspaces with 3 packages

## 📦 Installation

```bash
# Install all workspace dependencies
npm install

# Build core library (required for first run)
npm run build:libs
```

## 🚀 Development

```bash
# Start development server
npm run dev

# Build all packages
npm run build:all

# Build libraries only
npm run build:libs

# Build app for production
npm run build

# Preview production build
npm run preview

# Run tests for all packages
npm run test:libs

# Type check all packages
npm run typecheck
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

## 📁 Monorepo Structure

This project uses npm workspaces with three packages:

```
packages/
├── core/                      # @chayuto/solitaire-core (Game Logic Library)
│   ├── src/
│   │   ├── types/            # Core type definitions
│   │   ├── utils/            # Card/deck utilities, validation, hashing
│   │   ├── rules/            # Game rules (tableau, foundation, stock)
│   │   ├── scoring/          # Difficulty and progress calculation
│   │   ├── engine/           # Game engine
│   │   └── index.ts          # Public API exports
│   ├── tests/                # Core library tests
│   └── package.json          # Library metadata (v0.1.0)
│
├── mcts/                      # @chayuto/solitaire-mcts (AI Solver Library)
│   ├── src/                  # Monte Carlo Tree Search solver
│   └── package.json          # Library metadata (v0.1.0)
│
└── app/                       # Main Application
    ├── src/
    │   ├── components/       # React components (Card, GameBoard, etc.)
    │   ├── store/            # Zustand state management
    │   │   ├── gameStore.ts  # Main game store (uses @chayuto/solitaire-core)
    │   │   └── uiHelpers.ts  # UI-specific helpers
    │   ├── adapters/         # Core↔UI state adapters
    │   ├── constants/        # UI-specific constants
    │   ├── types/            # UI-specific types
    │   └── App.tsx           # Main App component
    ├── public/               # Static assets
    └── package.json          # App dependencies
```

### Package Relationships

- **`@chayuto/solitaire-core`**: Pure game logic library (zero dependencies)
  - Type-safe Klondike Solitaire engine
  - Framework-agnostic, reusable in any JavaScript project
  - ESM + CJS builds with TypeScript declarations

- **`@chayuto/solitaire-mcts`**: AI solver library (depends on core)
  - Monte Carlo Tree Search implementation
  - Provides hint/solver functionality

- **`app`**: React application (uses both libraries)
  - UI components and user interactions
  - State management with Zustand
  - Imports game logic from `@chayuto/solitaire-core`

**Recent Architecture Update (Nov 2025):** Extracted game logic into reusable libraries:
- Created monorepo structure with npm workspaces
- Extracted 800+ lines of pure game logic into `@chayuto/solitaire-core`
- Removed duplicate helper functions (544 lines eliminated)
- App now uses library for all game logic
- See `/docs/internal/20251115_lib_v0_summary_index.md` for full planning docs

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
