# Recommendation: Code Quality Tooling

**Date:** 2025-02-18
**Status:** Proposed

## Context
Maintaining code quality relies on consistency. Asking agents to "be careful" is less effective than enforcing rules automatically.

## Proposal
Integrate pre-commit hooks and commit message linting.

## Detailed Recommendations

### 1. Husky & Lint-Staged
Install `husky` and `lint-staged`.
- **Configuration**:
  ```json
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md,css}": [
      "prettier --write"
    ]
  }
  ```
- **Benefit**: Ensures that every commit is formatted and linted. Agents don't need to worry about style; the tool fixes it or rejects the commit.

### 2. Commitlint
Enforce [Conventional Commits](https://www.conventionalcommits.org/).
- **Format**: `feat(core): add new rule` or `fix(app): resolve drag issue`.
- **Benefit**: Generates automatic changelogs. Helps agents understand the history of changes by reading semantic commit messages.

### 3. EditorConfig
Ensure `.editorconfig` is present and consistent with Prettier config.
- **Benefit**: Keeps file encodings and indentation consistent across different editors.

## Benefits
- **Zero Friction**: Formatting happens automatically.
- **Readable History**: Git history becomes a structured log of the project's evolution.
