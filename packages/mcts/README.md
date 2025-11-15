# @chayuto/solitaire-mcts

Monte Carlo Tree Search (MCTS) solver library for Solitaire.

## Overview

This package provides an intelligent solver using Monte Carlo Tree Search algorithms to find optimal solutions for Solitaire games.

## Installation

```bash
npm install @chayuto/solitaire-mcts @chayuto/solitaire-core
```

## Peer Dependencies

This package requires `@chayuto/solitaire-core` as a peer dependency.

## Structure

- `types/` - Type definitions
- `engine/` - MCTS engine implementation
- `rules/` - MCTS rules and strategies
- `utils/` - Utility functions
- `scoring/` - Scoring and evaluation functions

## Development

```bash
# Build the library
npm run build

# Run tests
npm run test

# Type check
npm run typecheck
```

## License

MIT
