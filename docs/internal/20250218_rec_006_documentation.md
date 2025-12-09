# Recommendation: Automated Documentation

**Date:** 2025-02-18
**Status:** Proposed

## Context
Documentation often rots. For agents, outdated documentation is worse than no documentation because it leads to incorrect assumptions.

## Proposal
Use tools to generate documentation from the code itself.

## Detailed Recommendations

### 1. TypeDoc
Install `typedoc` for generating API documentation for `packages/core`.
- **Why**: It parses TSDoc comments (`/** ... */`) and generates a static site.
- **Workflow**: Add a CI step to build and deploy these docs (e.g., to GitHub Pages under `/docs/api`).
- **Agent Usage**: An agent can "read the docs" by simply reading the generated markdown or the source comments, knowing they match.

### 2. Mermaid.js Diagrams
Encourage the use of Mermaid diagrams in Markdown files.
- **Why**: Visualizing state machines or flowcharts is easier than text.
- **Agent Usage**: Modern LLMs can understand and generate Mermaid syntax well.

### 3. Architecture Decision Records (ADRs)
Formalize the `docs/internal` logs into ADRs.
- **Structure**: Title, Status, Context, Decision, Consequences.
- **Benefit**: Explains *why* a decision was made, preventing agents from "fixing" a deliberate architectural choice (Chesterton's Fence).

## Benefits
- **Truth**: Documentation is always in sync with code.
- **Clarity**: Visuals and structured records provide deeper understanding.
