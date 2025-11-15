# Changelog

All notable changes to `@chayuto/solitaire-core` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-11-15

### Added
- Initial release of `@chayuto/solitaire-core`
- `GameEngine` class for complete game state management
- Core type definitions (Card, GameState, Move, etc.)
- Utility functions for card and deck manipulation
- Complete Klondike Solitaire rules implementation:
  - Tableau rules (move validation, sequence checking)
  - Foundation rules (Ace to King sequences)
  - Stock rules (draw and recycle operations)
- Scoring system:
  - `getCompletionProgress()` - Calculate percentage completion
  - `getPerceivedDifficulty()` - Analyze board difficulty
- Game state validation utilities
- State hashing with FNV-1a algorithm for cycle detection
- State import/export with JSON serialization
- Win/loss detection
- Legal move generation
- Move validation and application
- Comprehensive test suite (249 tests, >95% coverage)
- Full TypeScript support with strict types
- ESM and CommonJS module formats
- Complete API documentation
- Usage examples and guides

### Features
- **Pure Functions**: All functions are immutable and side-effect free
- **Type Safe**: Full TypeScript support with strict mode
- **Zero Dependencies**: Lightweight, self-contained library
- **Reproducible Games**: Seeded random number generation
- **Difficulty Levels**: 5 difficulty levels with smart card distribution
- **Performance**: Optimized algorithms, <10ms for most operations
- **Well Tested**: >95% code coverage with comprehensive tests

### GameEngine Methods
- `initialize(options?)` - Create new game
- `applyMove(state, command)` - Apply move to state
- `canApplyMove(state, command)` - Validate move
- `getLegalMoves(state)` - Get all legal moves
- `isWon(state)` - Check win condition
- `isLost(state)` - Check loss condition
- `getCompletionProgress(state)` - Get progress percentage
- `getPerceivedDifficulty(state)` - Get difficulty score
- `exportState(state)` - Export to JSON
- `importState(json)` - Import from JSON

### Utility Modules
- **Card Utils**: `createCard`, `flipCard`, `isRed`, `isBlack`, `getColor`, `getRankValue`, etc.
- **Deck Utils**: `createDeck`, `shuffleDeck`, `arrangeDeckByDifficulty`
- **Validation Utils**: `countCards`, `validateGameState`, `isValidGameState`, `findDuplicates`
- **Hash Utils**: `hashGameState`, `areStatesEqual`

### Rule Modules
- **Tableau**: `canMoveToTableau`, `canMoveSequence`, `getValidTableauDestinations`
- **Foundation**: `canMoveToFoundation`, `getNextFoundationRank`, `hasValidFoundationDestination`
- **Stock**: `canDraw`, `draw`, `canRecycle`, `recycle`

### Documentation
- Comprehensive README with examples
- Complete API documentation
- TypeScript type definitions
- JSDoc comments for all public APIs

### Build
- Dual module format (ESM + CommonJS)
- TypeScript declarations included
- Source maps for debugging
- Minified production builds
- Bundle size: ~6KB gzipped

## [Unreleased]

### Planned Features
- Undo/redo support with move history
- Hint system for suggesting moves
- Auto-complete for obvious moves
- Game statistics and analytics
- Alternative dealing modes (draw 1/3 cards)
- Timed games and scoring
- Achievement system

---

## Version Guidelines

This project follows [Semantic Versioning](https://semver.org/):

- **MAJOR** version: Incompatible API changes
- **MINOR** version: New functionality (backwards compatible)
- **PATCH** version: Bug fixes (backwards compatible)

## Release Process

1. Update version in `package.json`
2. Update CHANGELOG.md with new version
3. Create git tag: `git tag -a v0.1.0 -m "Release v0.1.0"`
4. Push tag: `git push origin v0.1.0`
5. Publish to npm: `npm publish`

---

[0.1.0]: https://github.com/chayuto/Solitaire/releases/tag/core-v0.1.0
[Unreleased]: https://github.com/chayuto/Solitaire/compare/core-v0.1.0...HEAD
