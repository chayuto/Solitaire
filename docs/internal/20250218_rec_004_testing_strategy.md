# Recommendation: Comprehensive Testing Strategy

**Date:** 2025-02-18
**Status:** Proposed

## Context
The current repository uses `vitest` for unit testing. This is excellent for logic (`packages/core`) but insufficient for a UI-heavy application like a Solitaire game. AI agents need a way to verify that their UI changes actually work as intended.

## Proposal
Implement a layered testing strategy including E2E testing and visual regression testing.

## Detailed Recommendations

### 1. End-to-End (E2E) Testing with Playwright
Install Playwright in `packages/app`.
- **Why**: It allows simulating real user interactions (drag and drop, clicking).
- **Agent Usage**: Agents can be given a task to "write a Playwright test to verify that the game is won when all foundations are full."
- **Visuals**: Playwright can take screenshots.

### 2. Visual Regression Testing
Use Playwright's snapshot testing capabilities.
- **Why**: CSS changes can easily break the layout without throwing errors. A "visual diff" catches this.
- **Implementation**: Run visual tests in CI. If they fail, the agent knows it broke the UI.

### 3. Property-Based Testing (FastCheck)
For `packages/core`, use `fast-check`.
- **Why**: Instead of writing specific test cases (e.g., "test 1+1=2"), you define properties (e.g., "moving a card from A to B should preserve the total number of cards").
- **Agent Benefit**: This finds edge cases that agents (and humans) often miss.

### 4. Test Accessibility (A11y)
Integrate `axe-core` or `jest-axe` into the tests.
- **Why**: Ensures the game is playable by screen readers.

## Benefits
- **Safety Net**: Agents can refactor code with confidence.
- **Verification**: Provides a definitive "Done" state for UI tasks.
