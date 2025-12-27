# Developer Experience Recommendations

**Date:** December 27, 2025  
**Status:** 📋 Recommendations for AI Coding Agents  
**Priority:** 🟡 Medium

---

## Executive Summary

This document provides recommendations for improving developer experience (DX), tooling, and workflow efficiency in the Solitaire monorepo.

---

## Current State Analysis

### Strengths ✅
1. **Comprehensive copilot-instructions.md** for AI agents
2. **Clear npm scripts** for common tasks
3. **Fast Vite** dev server with HMR
4. **ESLint** configured with TypeScript support
5. **Vitest** for fast testing
6. **Monorepo structure** well-organized

### Areas for Improvement 🔧
1. **No Prettier** for code formatting
2. **No pre-commit hooks** (husky/lint-staged)
3. **Missing VS Code settings** for team consistency
4. **No Storybook** for component development
5. **Missing code generators** for common patterns
6. **No local development documentation**
7. **Test watch mode** doesn't filter well

---

## Recommendations

### 1. Add Prettier for Code Formatting

**Priority:** 🔴 High  
**Effort:** 30 minutes  
**Impact:** Consistent code style

**Installation:**
```bash
npm install -D prettier eslint-config-prettier -w app
```

**Configuration:**
```json
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

```json
// .prettierignore
node_modules
dist
packages/*/dist
coverage
*.md
package-lock.json
```

**Update ESLint:**
```javascript
// packages/app/eslint.config.js
import prettier from 'eslint-config-prettier';

export default defineConfig([
  // ... existing config
  prettier, // Add at end to disable conflicting rules
]);
```

**Add npm scripts:**
```json
{
  "scripts": {
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

---

### 2. Add Pre-commit Hooks

**Priority:** 🔴 High  
**Effort:** 30 minutes  
**Impact:** Catch issues before commit

**Installation:**
```bash
npm install -D husky lint-staged
npx husky init
```

**Configuration:**
```json
// package.json (root)
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md,yml,yaml}": [
      "prettier --write"
    ]
  }
}
```

```bash
# .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
```

---

### 3. Add VS Code Workspace Settings

**Priority:** 🟡 Medium  
**Effort:** 30 minutes  
**Impact:** Team consistency

**Recommendation:**
```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.updateImportsOnFileMove.enabled": "always",
  "typescript.suggest.autoImports": true,
  
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/coverage": true
  },
  
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/coverage": true,
    "package-lock.json": true
  },
  
  "explorer.fileNesting.enabled": true,
  "explorer.fileNesting.patterns": {
    "*.ts": "${capture}.test.ts",
    "*.tsx": "${capture}.test.tsx, ${capture}.stories.tsx",
    "package.json": "package-lock.json, .npmrc, .eslintrc*, tsconfig*.json"
  }
}
```

```json
// .vscode/extensions.json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-playwright.playwright",
    "vitest.explorer",
    "bradlc.vscode-tailwindcss",
    "formulahendry.auto-rename-tag",
    "dsznajder.es7-react-js-snippets"
  ]
}
```

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Vitest",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/vitest/vitest.mjs",
      "args": ["run", "--pool=forks", "${relativeFile}"],
      "cwd": "${workspaceFolder}/packages/app",
      "console": "integratedTerminal"
    },
    {
      "name": "Debug Current Test File",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/vitest/vitest.mjs",
      "args": ["run", "${relativeFile}"],
      "cwd": "${workspaceFolder}/packages/app",
      "console": "integratedTerminal"
    }
  ]
}
```

---

### 4. Add Code Snippets

**Priority:** 🟡 Medium  
**Effort:** 1 hour  
**Impact:** Faster development

**Recommendation:**
```json
// .vscode/snippets.code-snippets
{
  "React Functional Component": {
    "prefix": "rfc",
    "body": [
      "import React from 'react';",
      "",
      "interface ${1:Component}Props {",
      "  ${2:prop}: ${3:string};",
      "}",
      "",
      "const ${1:Component}: React.FC<${1:Component}Props> = ({ ${2:prop} }) => {",
      "  return (",
      "    <div>",
      "      ${4:content}",
      "    </div>",
      "  );",
      "};",
      "",
      "export default ${1:Component};"
    ],
    "description": "React Functional Component"
  },
  
  "Vitest Test Suite": {
    "prefix": "vtest",
    "body": [
      "import { describe, it, expect, beforeEach } from 'vitest';",
      "",
      "describe('${1:ModuleName}', () => {",
      "  beforeEach(() => {",
      "    ${2:// Setup}",
      "  });",
      "",
      "  it('should ${3:do something}', () => {",
      "    ${4:// Arrange}",
      "    ",
      "    ${5:// Act}",
      "    ",
      "    ${6:// Assert}",
      "    expect(${7:result}).toBe(${8:expected});",
      "  });",
      "});"
    ],
    "description": "Vitest Test Suite"
  },
  
  "Zustand Selector": {
    "prefix": "zsel",
    "body": [
      "export const use${1:SelectorName} = () => useGameStore(state => state.${2:property});"
    ],
    "description": "Zustand selector hook"
  },
  
  "Game Store Action": {
    "prefix": "gsaction",
    "body": [
      "${1:actionName}: (${2:params}) => {",
      "  const state = get();",
      "  ",
      "  ${3:// Validate}",
      "  ",
      "  ${4:// Execute}",
      "  ",
      "  set({",
      "    ${5:updates}",
      "  });",
      "},"
    ],
    "description": "Game store action"
  }
}
```

---

### 5. Add Development Documentation

**Priority:** 🟡 Medium  
**Effort:** 2-3 hours  
**Impact:** Faster onboarding

**Recommendation:**
```markdown
<!-- DEVELOPMENT.md -->
# Development Guide

## Prerequisites
- Node.js 20.x
- npm 10.x

## Getting Started

```bash
# Clone and install
git clone https://github.com/chayuto/Solitaire.git
cd Solitaire
npm ci

# Build libraries (required first time)
npm run build:libs

# Start development server
npm run dev
```

Open http://localhost:5173 to see the game.

## Project Structure

```
packages/
├── core/    # Game logic library (no dependencies)
├── mcts/    # AI solver (work in progress)
└── app/     # React application
```

## Development Workflow

### Making Changes to Core Library
1. Edit files in `packages/core/src/`
2. Run `npm run build -w @chayuto/solitaire-core`
3. Changes will be picked up by the app

### Making Changes to App
1. Edit files in `packages/app/src/`
2. Hot Module Replacement (HMR) will update automatically

### Running Tests
```bash
# All tests
npm run test:run

# Watch mode
npm test

# Specific file
npm run test:run -- gameStore.test.ts

# With coverage
npm run test:coverage
```

### Common Tasks

| Task | Command |
|------|---------|
| Start dev server | `npm run dev` |
| Build everything | `npm run build:all` |
| Run tests | `npm run test:run` |
| Lint code | `npm run lint` |
| Type check | `npm run typecheck` |

## Troubleshooting

### "Module not found" errors
```bash
npm run build:libs
```

### Tests failing with import errors
```bash
npm ci
npm run build:libs
```

### TypeScript errors not updating
Restart TypeScript server in VS Code: Cmd/Ctrl+Shift+P → "TypeScript: Restart TS Server"

## IDE Setup

### VS Code (Recommended)
1. Install recommended extensions (popup on first open)
2. Settings are pre-configured in `.vscode/settings.json`

### WebStorm/IntelliJ
1. Open the project root
2. Mark `packages/*/src` as Sources
3. Mark `packages/*/dist` as Excluded
```

---

### 6. Add npm Scripts for Common Tasks

**Priority:** 🟡 Medium  
**Effort:** 30 minutes  
**Impact:** Streamlined workflow

**Recommendation:**
```json
// package.json (root)
{
  "scripts": {
    // Existing scripts...
    
    // Development
    "dev": "npm run dev -w app",
    "dev:core": "npm run build -w @chayuto/solitaire-core -- --watch",
    
    // Building
    "build": "npm run build -w app",
    "build:libs": "npm run build -w @chayuto/solitaire-core && npm run build -w @chayuto/solitaire-mcts",
    "build:all": "npm run build:libs && npm run build -w app",
    "build:clean": "npm run clean && npm run build:all",
    
    // Testing
    "test": "npm run test -w app",
    "test:run": "npm run test:run -w app",
    "test:libs": "npm run test -w @chayuto/solitaire-core && npm run test -w @chayuto/solitaire-mcts",
    "test:all": "npm run test:libs && npm run test:run",
    "test:coverage": "npm run test:coverage -w app",
    
    // Linting & Formatting
    "lint": "npm run lint -w app",
    "lint:fix": "npm run lint -w app -- --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    
    // Type checking
    "typecheck": "npm run typecheck --workspaces --if-present",
    "typecheck:watch": "npm run typecheck -w app -- --watch",
    
    // Utilities
    "clean": "rimraf packages/*/dist packages/*/coverage",
    "deps:check": "npm outdated",
    "deps:update": "npm update",
    "audit": "npm audit --omit=dev",
    
    // CI validation (run before commit)
    "validate": "npm run lint && npm run test:run && npm run build"
  }
}
```

---

### 7. Add Storybook for Component Development

**Priority:** 🟢 Low  
**Effort:** 4-6 hours  
**Impact:** Isolated component development

**Recommendation:**
```bash
# Initialize Storybook
cd packages/app
npx storybook@latest init
```

**Example story:**
```typescript
// packages/app/src/components/Card.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import Card from './Card';

const meta: Meta<typeof Card> = {
  title: 'Game/Card',
  component: Card,
  tags: ['autodocs'],
  argTypes: {
    card: {
      description: 'The card object to display',
    },
    isSelected: {
      control: 'boolean',
      description: 'Whether the card is currently selected',
    },
    isValidTarget: {
      control: 'boolean',
      description: 'Whether the card is a valid move target',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Card>;

export const FaceUp: Story = {
  args: {
    card: { suit: 'hearts', rank: 'A', faceUp: true, id: 'hearts-A' },
    isSelected: false,
    isValidTarget: false,
  },
};

export const FaceDown: Story = {
  args: {
    card: { suit: 'spades', rank: 'K', faceUp: false, id: 'spades-K' },
    isSelected: false,
    isValidTarget: false,
  },
};

export const Selected: Story = {
  args: {
    card: { suit: 'diamonds', rank: 'Q', faceUp: true, id: 'diamonds-Q' },
    isSelected: true,
    isValidTarget: false,
  },
};

export const ValidTarget: Story = {
  args: {
    card: { suit: 'clubs', rank: '7', faceUp: true, id: 'clubs-7' },
    isSelected: false,
    isValidTarget: true,
  },
};

export const AllSuits: Story = {
  render: () => (
    <div className="flex gap-4">
      <Card card={{ suit: 'hearts', rank: 'K', faceUp: true, id: 'h-K' }} />
      <Card card={{ suit: 'diamonds', rank: 'Q', faceUp: true, id: 'd-Q' }} />
      <Card card={{ suit: 'clubs', rank: 'J', faceUp: true, id: 'c-J' }} />
      <Card card={{ suit: 'spades', rank: '10', faceUp: true, id: 's-10' }} />
    </div>
  ),
};
```

---

### 8. Add Code Generation CLI

**Priority:** 🟢 Low  
**Effort:** 2-3 hours  
**Impact:** Consistent code patterns

**Recommendation:**
```typescript
// scripts/generate.ts
#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const templates = {
  component: (name: string) => `
import React, { memo } from 'react';

interface ${name}Props {
  // Add props here
}

const ${name}: React.FC<${name}Props> = (props) => {
  return (
    <div>
      {/* ${name} content */}
    </div>
  );
};

export default memo(${name});
`.trim(),

  test: (name: string) => `
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ${name} from './${name}';

describe('${name}', () => {
  it('renders correctly', () => {
    render(<${name} />);
    // Add assertions
  });
});
`.trim(),

  hook: (name: string) => `
import { useState, useCallback } from 'react';

export function ${name}() {
  const [state, setState] = useState<unknown>(null);
  
  const action = useCallback(() => {
    // Implement action
  }, []);
  
  return { state, action };
}
`.trim(),
};

const [,, type, name] = process.argv;

if (!type || !name) {
  console.log('Usage: npx ts-node scripts/generate.ts <type> <name>');
  console.log('Types: component, test, hook');
  process.exit(1);
}

const template = templates[type as keyof typeof templates];
if (!template) {
  console.error(`Unknown type: ${type}`);
  process.exit(1);
}

const content = template(name);
console.log(content);
```

**Add npm script:**
```json
{
  "scripts": {
    "generate": "npx ts-node scripts/generate.ts"
  }
}
```

---

## Developer Experience Checklist

For new developers:

- [ ] Install recommended VS Code extensions
- [ ] Run `npm ci` and `npm run build:libs`
- [ ] Read `copilot-instructions.md`
- [ ] Run `npm run dev` to start development
- [ ] Run `npm test` to run tests in watch mode
- [ ] Run `npm run validate` before committing

---

**Author:** AI Analysis  
**Last Updated:** December 27, 2025
