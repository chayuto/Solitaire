# Agentic AI Friendliness Recommendations

**Date:** December 27, 2025  
**Status:** 📋 Recommendations for AI Coding Agents  
**Priority:** 🔴 High

---

## Executive Summary

This document provides recommendations specifically designed to make the Solitaire codebase more friendly for AI coding agents (like GitHub Copilot, Claude, GPT-based agents) to understand, navigate, and modify safely.

---

## Current State Analysis

### Strengths ✅
1. **Excellent copilot-instructions.md** with detailed repository overview
2. **Clear monorepo structure** with defined package boundaries
3. **Consistent naming conventions** documented
4. **Validation checklist** for changes
5. **Documentation in /docs/internal/** with dated files

### Areas for Improvement 🔧
1. **Large files** difficult for context windows (gameStore.ts ~1400 lines)
2. **Missing inline guidance** for AI agents in complex code
3. **No explicit "safe to modify" markers**
4. **Complex functions** without clear entry/exit points
5. **Missing dependency maps** between modules
6. **No automated code generation templates**

---

## Recommendations

### 1. Add AI Guidance Comments

**Priority:** 🔴 High  
**Effort:** 2-3 hours  
**Impact:** Prevents AI mistakes, guides modifications

**Recommendation:**
Add structured comments for AI agents:

```typescript
/**
 * @ai-context Main game store managing all game state
 * @ai-safe-to-modify toggleValidMoves, toggleGodMode
 * @ai-caution performAutoPlayMove - complex with timing
 * @ai-avoid Direct state mutations - always use immutable updates
 * @ai-test-file gameStore.test.ts, gameStore.metrics.test.ts
 */
export const useGameStore = create<GameStore>((set, get) => ({
  // ...
}));
```

```typescript
/**
 * @ai-context Scoring algorithm for auto-play move selection
 * @ai-priority 
 *   1. UNLOCK TABLEAU (1000000+)
 *   2. KING MANAGEMENT (100000+)
 *   3. FOUNDATION HANDLING (10000+)
 *   4. DRAW PILE MANAGEMENT (1000+)
 *   5. FLEXIBILITY (100+)
 * @ai-tunable All score values in AUTOPLAY_CONFIG
 * @ai-test See gameStore.test.ts "Smart Auto-Play Strategy" suite
 */
const scoreMove = (move: PossibleMove): number => {
  // ...
};
```

**Comment Types:**
- `@ai-context` - Brief explanation of what this code does
- `@ai-safe-to-modify` - Functions/areas safe to change
- `@ai-caution` - Areas requiring careful modification
- `@ai-avoid` - Patterns or changes to avoid
- `@ai-test-file` - Related test files
- `@ai-see` - Related code/documentation
- `@ai-tunable` - Configurable values
- `@ai-entry-point` - Main entry functions
- `@ai-dependency` - Key dependencies

---

### 2. Create Code Navigation Maps

**Priority:** 🔴 High  
**Effort:** 2-3 hours  
**Impact:** Faster orientation for AI agents

**Recommendation:**
Create navigation documents:

```markdown
<!-- packages/app/src/CODE_MAP.md -->
# App Package Code Map

## Quick Reference
| Task | Start Here | Key Files |
|------|------------|-----------|
| Add game feature | store/gameStore.ts | types/index.ts |
| Modify UI | components/*.tsx | store/gameStore.ts |
| Change auto-play | store/gameStore.ts:performAutoPlayMove | uiHelpers.ts |
| Add test | [filename].test.ts | test/factories/*.ts |
| Modify core logic | packages/core/src | adapters/coreAdapter.ts |

## Module Dependencies
```
GameBoard.tsx
  ├── DrawPile.tsx
  ├── DiscardPile.tsx
  ├── FoundationPile.tsx (x4)
  ├── TableauColumn.tsx (x7)
  │     └── Card.tsx
  ├── ControlPanel.tsx
  ├── ActivityLog.tsx
  ├── WinModal.tsx
  └── ReplayControls.tsx
```

## State Flow
```
User Action → Component → useGameStore.action() → State Update → Re-render
```

## Key Entry Points
- Game initialization: `initializeGameState()` (line ~65)
- Card movement: `moveCardToTableau()`, `moveCardToFoundation()`
- Auto-play: `performAutoPlayMove()` (line ~600)
- State export: `exportGameState()` (line ~480)
```

---

### 3. Add Function Complexity Indicators

**Priority:** 🟡 Medium  
**Effort:** 1-2 hours  
**Impact:** Helps AI prioritize attention

**Recommendation:**
Add complexity markers:

```typescript
/**
 * @complexity LOW
 * @lines 5
 * Simple toggle function - safe to modify
 */
toggleValidMoves: () => {
  set((state) => ({ showValidMoves: !state.showValidMoves }));
},

/**
 * @complexity HIGH
 * @lines 500+
 * @ai-warning Complex scoring algorithm with many edge cases
 * @ai-requires Full test suite run after any changes
 * @ai-timing Contains setTimeout - async behavior
 */
performAutoPlayMove: () => {
  // Complex logic...
},
```

---

### 4. Create Task Templates for AI Agents

**Priority:** 🔴 High  
**Effort:** 2-3 hours  
**Impact:** Consistent, predictable outputs

**Recommendation:**
Create templates in `/docs/templates/`:

```markdown
<!-- docs/templates/FEATURE_TEMPLATE.md -->
# Feature Implementation Template

## Pre-Implementation Checklist
- [ ] Read copilot-instructions.md
- [ ] Identify affected packages (core, mcts, app)
- [ ] Check existing related code
- [ ] Review test patterns

## Implementation Steps

### 1. Types (if new types needed)
Location: `packages/{package}/src/types/`
```typescript
// Add interface/type definitions
```

### 2. Core Logic
Location: `packages/core/src/` or `packages/app/src/store/`
```typescript
// Implement pure functions first
```

### 3. Tests
Location: Same directory as source with `.test.ts` suffix
```typescript
// Write tests for new functionality
```

### 4. Integration
Location: Connect to existing code
```typescript
// Wire up to store/components
```

## Post-Implementation Checklist
- [ ] npm run build:libs (if core changed)
- [ ] npm run lint
- [ ] npm run test:run
- [ ] npm run build
- [ ] Update documentation if needed
```

```markdown
<!-- docs/templates/BUG_FIX_TEMPLATE.md -->
# Bug Fix Template

## Investigation
1. Identify failing behavior
2. Locate relevant code (use CODE_MAP.md)
3. Write failing test first

## Fix Steps
1. Make minimal change to fix issue
2. Verify test passes
3. Check for regressions
4. Update related tests if needed

## Validation
- [ ] Failing test now passes
- [ ] All existing tests pass
- [ ] No new lint warnings
- [ ] Build succeeds
```

---

### 5. Add Contextual README Files

**Priority:** 🟡 Medium  
**Effort:** 2-3 hours  
**Impact:** Local context for AI agents

**Recommendation:**
Add README.md in complex directories:

```markdown
<!-- packages/app/src/store/README.md -->
# Game Store Module

## Overview
Zustand-based state management for the Solitaire game.

## Files
| File | Purpose | Test Coverage |
|------|---------|---------------|
| gameStore.ts | Main store with all actions | 90 tests |
| uiHelpers.ts | UI-specific helper functions | Tested via gameStore |

## Key Concepts

### State Structure
- `drawPile` / `discardPile`: Stock management
- `foundations`: Four piles (hearts, diamonds, clubs, spades)
- `tableau`: Seven columns
- `selectedCard`: Currently selected card for move
- `autoPlay*`: Auto-play state management

### Action Categories
1. **Initialization**: `initializeGame`, `setDifficulty`
2. **Card Selection**: `selectCard`, `deselectCard`
3. **Movement**: `moveCardToTableau`, `moveCardToFoundation`
4. **Drawing**: `drawCard`
5. **Toggles**: `toggleValidMoves`, `toggleGodMode`, `toggleAutoPlay`
6. **Import/Export**: `exportGameState`, `importGameState`
7. **Replay**: `startReplay`, `pauseReplay`, `stopReplay`, etc.

## Common Tasks

### Adding a new toggle
1. Add state field to GameState interface in types/
2. Add toggle action in gameStore.ts
3. Add to exportGameState/importGameState
4. Add test in gameStore.test.ts
5. Add UI control in ControlPanel.tsx

### Modifying auto-play strategy
1. Find performAutoPlayMove (~line 600)
2. Modify scoring in scoreMove function
3. Run test suite: npm run test:run
4. Test manually: npm run dev

## Anti-patterns to Avoid
- Don't mutate state directly
- Don't add UI rendering logic here
- Don't import React in store files
```

---

### 6. Implement File Size Guidelines

**Priority:** 🟡 Medium  
**Effort:** 4-6 hours (for refactoring)  
**Impact:** Better fit in AI context windows

**Recommendation:**
Establish and enforce file size limits:

```typescript
// .eslintrc or eslint.config.js
{
  rules: {
    'max-lines': ['warn', {
      max: 300,
      skipBlankLines: true,
      skipComments: true,
    }],
    'max-lines-per-function': ['warn', {
      max: 50,
      skipBlankLines: true,
      skipComments: true,
    }],
  },
}
```

**Target structure for large files:**
```
gameStore.ts (1400 lines) should become:

store/
├── gameStore.ts          # Core store (~200 lines)
├── actions/
│   ├── gameActions.ts    # Game lifecycle (~100 lines)
│   ├── moveActions.ts    # Card movement (~150 lines)
│   ├── autoPlayActions.ts # Auto-play (~250 lines)
│   ├── replayActions.ts  # Replay system (~150 lines)
│   └── exportActions.ts  # Save/load (~100 lines)
├── selectors/
│   └── gameSelectors.ts  # Derived state (~50 lines)
└── helpers/
    ├── scoreHelpers.ts   # Move scoring (~200 lines)
    └── stateHelpers.ts   # State utilities (~100 lines)
```

---

### 7. Add Error Boundary Comments

**Priority:** 🟡 Medium  
**Effort:** 1-2 hours  
**Impact:** Safer AI modifications

**Recommendation:**
Mark critical sections:

```typescript
// ============================================
// @ai-critical-section START
// This section handles game state validation
// Changes here can corrupt game state
// REQUIRES: Full test suite run after changes
// ============================================

function validateAndApplyMove(state: GameState, move: Move): GameState {
  // Critical logic...
}

// ============================================
// @ai-critical-section END
// ============================================
```

---

### 8. Create Prompt Engineering Guide

**Priority:** 🟡 Medium  
**Effort:** 1-2 hours  
**Impact:** Better AI interactions

**Recommendation:**
Create guide for working with AI agents:

```markdown
<!-- docs/AI_PROMPTING_GUIDE.md -->
# AI Agent Prompting Guide

## Effective Prompts for This Repository

### For Adding Features
✅ Good:
"Add a new toggle button in ControlPanel.tsx that enables/disables 
sound effects. Add state for this in gameStore.ts following the 
existing toggle pattern (see toggleValidMoves). Include tests."

❌ Avoid:
"Add sound effects" (too vague)

### For Bug Fixes
✅ Good:
"The auto-play stops unexpectedly when moving a King to an empty 
column. The issue is in performAutoPlayMove in gameStore.ts. 
Add a test case first, then fix the issue."

❌ Avoid:
"Auto-play is broken" (not specific)

### For Refactoring
✅ Good:
"Extract the scoring logic from performAutoPlayMove (lines 750-900 
in gameStore.ts) into a separate file at store/helpers/scoreHelpers.ts. 
Keep the same function signatures and add JSDoc comments. Run tests 
to verify no regression."

❌ Avoid:
"Refactor gameStore.ts" (too broad)

## Keywords That Help AI Agents

- "following the existing pattern" - References existing code style
- "add tests" - Ensures test coverage
- "in [filename]" - Specifies exact location
- "verify with npm run test:run" - Includes validation step
- "update documentation" - Keeps docs in sync

## Context to Include

When asking for changes, include:
1. The specific file(s) to modify
2. Related test files
3. Expected behavior
4. Validation command to run
```

---

### 9. Add Change Impact Analysis Comments

**Priority:** 🟢 Low  
**Effort:** 2-3 hours  
**Impact:** Awareness of change ripple effects

**Recommendation:**
Document dependencies:

```typescript
/**
 * @ai-impacts
 *   - Components: ControlPanel.tsx reads this
 *   - Tests: gameStore.test.ts "should toggle showValidMoves"
 *   - Export: Included in exportGameState()
 *   - Import: Restored in importGameState()
 * @ai-breaking-changes
 *   - Renaming: Update all references
 *   - Type change: Update GameState interface
 */
showValidMoves: true,
```

---

### 10. Create Quick Reference Cards

**Priority:** 🟢 Low  
**Effort:** 1-2 hours  
**Impact:** Fast lookup for common tasks

**Recommendation:**
```markdown
<!-- docs/QUICK_REFERENCE.md -->
# Quick Reference for AI Agents

## Commands
| Task | Command |
|------|---------|
| Install deps | `npm ci` |
| Build libs | `npm run build:libs` |
| Lint | `npm run lint` |
| Test | `npm run test:run` |
| Build app | `npm run build` |
| Dev server | `npm run dev` |

## File Locations
| What | Where |
|------|-------|
| Types | `packages/*/src/types/` |
| Tests | `*.test.ts` next to source |
| Store | `packages/app/src/store/gameStore.ts` |
| Components | `packages/app/src/components/` |
| Core logic | `packages/core/src/` |

## Common Patterns
```typescript
// Toggle pattern
toggleXxx: () => {
  set((state) => ({ xxx: !state.xxx }));
},

// Move pattern  
moveCardToXxx: (target) => {
  const state = get();
  // Validate
  // Apply move
  // Record in history
  // Update progress
  set({ ...updates });
},

// Test pattern
it('should [action] when [condition]', () => {
  // Arrange
  const state = createEmptyGameState({ ... });
  useGameStore.setState(state);
  
  // Act
  useGameStore.getState().someAction();
  
  // Assert
  expect(useGameStore.getState().someField).toBe(expected);
});
```
```

---

## AI Agent Workflow Recommendations

### Before Making Changes
1. Read `copilot-instructions.md` for repository overview
2. Check `CODE_MAP.md` for relevant files
3. Review existing patterns in similar code
4. Identify test files to update

### During Changes
1. Make smallest possible change
2. Follow existing code patterns exactly
3. Add inline comments for complex logic
4. Update related tests

### After Changes
1. Run `npm run lint` - fix any errors
2. Run `npm run test:run` - all must pass
3. Run `npm run build` - must succeed
4. Update documentation if needed

---

## Directory Structure for AI Guidance

```
docs/
├── internal/
│   ├── architecture.md           # System design
│   ├── CODE_MAP.md              # Navigation guide
│   └── 20251227_*.md            # Dated recommendations
├── templates/
│   ├── FEATURE_TEMPLATE.md      # New feature guide
│   ├── BUG_FIX_TEMPLATE.md      # Bug fix guide
│   └── REFACTOR_TEMPLATE.md     # Refactoring guide
├── AI_PROMPTING_GUIDE.md        # How to prompt effectively
└── QUICK_REFERENCE.md           # Fast lookup

packages/app/src/
├── store/
│   └── README.md                # Store-specific guidance
├── components/
│   └── README.md                # Component-specific guidance
└── CODE_MAP.md                  # Package navigation
```

---

**Author:** AI Analysis  
**Last Updated:** December 27, 2025
