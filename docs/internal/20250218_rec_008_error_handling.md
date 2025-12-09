# Recommendation: Standardized Error Handling

**Date:** 2025-02-18
**Status:** Proposed

## Context
In TypeScript/JavaScript, throwing errors is common, but it makes control flow opaque. You don't know if a function throws just by looking at its signature.

## Proposal
Adopt a Result pattern for core logic.

## Detailed Recommendations

### 1. `Result<T, E>` Type
Define a generic type:
```typescript
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };
```

### 2. Usage in Core
Functions in `packages/core` should return `Result` instead of throwing.
- **Bad**:
  ```typescript
  function moveCard(from: string, to: string) {
    if (!isValid) throw new Error("Invalid move");
    // ...
  }
  ```
- **Good**:
  ```typescript
  function moveCard(from: string, to: string): Result<GameState, MoveError> {
    if (!isValid) return { success: false, error: new MoveError("Invalid move") };
    // ...
    return { success: true, data: newState };
  }
  ```

### 3. UI Integration
The UI can then handle these results gracefully (e.g., showing a toast notification on failure) without `try/catch` blocks scattered everywhere.

## Benefits
- **Predictability**: The type signature tells the whole story.
- **Safety**: You are forced to handle the error case.
- **Agent Friendly**: Agents can write more robust code because the compiler forces them to check for `success`.
