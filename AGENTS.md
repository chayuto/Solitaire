# AI Agent Guide

This repository is a monorepo for a Solitaire card game. It is designed to be maintainable and easy for AI agents to work with.

## Project Structure

- **Root**: Configuration files (`package.json`, `tsconfig.base.json`, etc.)
- **`packages/core`**: Pure game logic library. No UI dependencies.
- **`packages/mcts`**: AI solver library using Monte Carlo Tree Search. Depends on `core`.
- **`packages/app`**: React application using Zustand for state. Depends on `core` and `mcts`.
- **`docs/`**: Documentation. `docs/internal` contains dev logs and architectural decisions.

## Key Commands

Run these from the root directory:

- `npm install`: Install all dependencies.
- `npm run build:libs`: Build the core and mcts libraries. **Required** before building/running the app.
- `npm run dev`: Start the app dev server.
- `npm run test:libs`: Run tests for libraries.
- `npm run test`: Run tests for the app.
- `npm run typecheck`: Run TypeScript type checking across all workspaces.
- `npm run lint`: Run ESLint.

## Coding Standards

### TypeScript
- **Strict Mode**: Generally enabled. See `tsconfig.base.json`.
- **Explicit Types**: Avoid `any`. Use generics where appropriate.
- **Interfaces**: Prefer interfaces over types for object definitions.
- **No Unchecked Indexed Access**: *Recommended*. Check if enabled in `tsconfig.base.json` before relying on it.

### Components (React)
- **Functional Components**: Use functional components with hooks.
- **Props**: Define props interfaces clearly.
- **State**: Use local state for UI-only state, Zustand for global game state.
- **Tailwind CSS**: Use utility classes for styling.

### Testing
- **Vitest**: Used for unit and integration tests.
- **Testing Library**: Used for component testing.
- **Coverage**: Aim for high coverage in `core` logic.

### Documentation
- **Docblocks**: Add TSDoc comments to all public functions and interfaces.
- **Internal Docs**: When making significant architectural changes, add a dated markdown file in `docs/internal/` explaining the change (e.g., `YYYYMMDD_change_summary.md`).

## Workflow for Agents

1.  **Explore**: Read `README.md`, `AGENTS.md` (this file), and relevant files in `docs/internal`.
2.  **Plan**: Create a step-by-step plan before coding.
3.  **Verify**: run `npm run typecheck` and `npm run build:libs` (if touching libs) to ensure no regressions.
4.  **Test**: Run relevant tests. Create new tests for new features.
5.  **Document**: Update documentation if necessary.

## Common Tasks

### Adding a new game rule
1.  Modify `packages/core/src/rules/`.
2.  Update tests in `packages/core/tests/`.
3.  Run `npm run test:libs`.
4.  Update `packages/app` if the rule affects UI state.

### improving the Solver
1.  Work in `packages/mcts`.
2.  Run benchmarks (if available) or create a performance test script.

### UI Changes
1.  Work in `packages/app`.
2.  Use Tailwind for styling.
3.  Verify responsiveness.
