# Recommendation: Strict TypeScript Configuration

**Date:** 2025-02-18
**Status:** Proposed

## Context
TypeScript is a powerful tool for correctness, but its default settings are often too loose. For AI agents, strong static analysis is arguably more important than for humans, as agents rely entirely on the code and types to understand intent.

## Proposal
Tighten the TypeScript configuration in `tsconfig.base.json` and package-level configs.

## Detailed Recommendations

### 1. Enable `noUncheckedIndexedAccess`
This is the single most valuable "strict" flag often left off. It forces developers to handle the case where an array access returns `undefined`.

```json
{
  "compilerOptions": {
    "noUncheckedIndexedAccess": true
  }
}
```

*Why?* It prevents runtime crashes like `undefined is not an object` when accessing arrays, which are common sources of bugs.

### 2. `exactOptionalPropertyTypes`
Enforces that if a property is optional (`?`), you cannot explicitly assign `undefined` to it unless `undefined` is in the type union. This leads to cleaner code.

### 3. `noImplicitOverride`
Forces the use of the `override` keyword when overriding a method in a subclass. This clarifies intent and prevents accidental overrides or "zombie" methods when the parent class changes.

### 4. Zod for Runtime Validation
While TS handles compile time, use `zod` for validating external data (local storage, user input, API responses). This bridges the gap between static types and runtime reality.

## Benefits
- **Self-Documenting**: stricter types mean the code tells you exactly what it can and cannot be.
- **Bug Prevention**: Catches entire classes of errors (undefined access) at compile time.
- **Agent Friendliness**: Agents rely on type definitions. If the types lie (e.g., saying an array element is always `Card` when it might be `undefined`), the agent will write buggy code.
