# Security & Dependencies Recommendations

**Date:** December 27, 2025  
**Status:** 📋 Recommendations for AI Coding Agents  
**Priority:** 🔴 High

---

## Executive Summary

This document provides recommendations for improving security posture and dependency management in the Solitaire monorepo.

---

## Current State Analysis

### Strengths ✅
1. **Dependabot** configured for automated updates
2. **Minimal dependencies** in core library (zero runtime deps)
3. **TypeScript strict mode** catches many issues at compile time
4. **Private: true** in root package.json (prevents accidental publish)
5. **No authentication** required (no secrets to protect in game)

### Areas for Improvement 🔧
1. **No npm audit** in CI pipeline
2. **No CodeQL** or SAST scanning
3. **Missing Subresource Integrity (SRI)** for CDN assets
4. **No Content Security Policy** headers
5. **JSON parsing** without validation (import state)
6. **No rate limiting** on file operations
7. **Missing .npmrc** security settings

---

## Recommendations

### 1. Add npm Audit to CI

**Priority:** 🔴 High  
**Effort:** 30 minutes  
**Impact:** Catch vulnerable dependencies

**Recommendation:**
Add to CI workflow:

```yaml
# .github/workflows/ci.yml
  security-audit:
    name: Security Audit
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run npm audit (production)
        run: npm audit --omit=dev --audit-level=moderate
      
      - name: Run npm audit (all)
        run: npm audit --audit-level=high
        continue-on-error: true
```

**Add npm script:**
```json
{
  "scripts": {
    "audit": "npm audit --omit=dev",
    "audit:fix": "npm audit fix"
  }
}
```

---

### 2. Add CodeQL Security Scanning

**Priority:** 🔴 High  
**Effort:** 1 hour  
**Impact:** Catch security vulnerabilities in code

**Recommendation:**
```yaml
# .github/workflows/codeql.yml
name: CodeQL Analysis

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * 0'  # Weekly on Sunday

jobs:
  analyze:
    name: Analyze
    runs-on: ubuntu-latest
    permissions:
      actions: read
      contents: read
      security-events: write
    
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
      
      - name: Initialize CodeQL
        uses: github/codeql-action/init@v3
        with:
          languages: javascript-typescript
          queries: security-extended
      
      - name: Build
        run: |
          npm ci
          npm run build:libs
          npm run build
      
      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v3
        with:
          category: "/language:javascript-typescript"
```

---

### 3. Implement Input Validation for Import

**Priority:** 🔴 High  
**Effort:** 2-3 hours  
**Impact:** Prevent malformed data attacks

**Current Issue:**
```typescript
// Minimal validation - could accept malformed data
importGameState: (jsonString: string) => {
  try {
    const importedState = JSON.parse(jsonString) as GameState;
    // Basic checks...
    return true;
  } catch (error) {
    return false;
  }
}
```

**Recommendation:**
Use Zod for comprehensive validation:

```typescript
// packages/app/src/validation/gameStateSchema.ts
import { z } from 'zod';

const SuitSchema = z.enum(['hearts', 'diamonds', 'clubs', 'spades']);
const RankSchema = z.enum(['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']);

const CardSchema = z.object({
  suit: SuitSchema,
  rank: RankSchema,
  faceUp: z.boolean(),
  id: z.string().regex(/^(hearts|diamonds|clubs|spades)-(A|[2-9]|10|J|Q|K)$/),
});

const MoveSchema = z.object({
  type: z.enum([
    'draw_card',
    'tableau_to_tableau',
    'tableau_to_foundation',
    'discard_to_tableau',
    'discard_to_foundation',
    'flip_card',
    'autoplay_start',
    'autoplay_stop',
    'autoplay_deadend',
    'autoplay_loop_detected',
  ]),
  timestamp: z.number().positive(),
  card: CardSchema,
  from: z.object({
    source: z.enum(['tableau', 'discard', 'draw']),
    columnIndex: z.number().int().min(0).max(6).optional(),
    cardIndex: z.number().int().min(0).optional(),
  }).optional(),
  to: z.object({
    target: z.enum(['tableau', 'foundation']),
    columnIndex: z.number().int().min(0).max(6).optional(),
    suit: SuitSchema.optional(),
  }).optional(),
});

export const GameStateSchema = z.object({
  drawPile: z.array(CardSchema).max(52),
  discardPile: z.array(CardSchema).max(52),
  foundations: z.object({
    hearts: z.array(CardSchema).max(13),
    diamonds: z.array(CardSchema).max(13),
    clubs: z.array(CardSchema).max(13),
    spades: z.array(CardSchema).max(13),
  }),
  tableau: z.array(z.array(CardSchema).max(19)).length(7),
  moveHistory: z.array(MoveSchema).max(10000),
  showValidMoves: z.boolean(),
  godMode: z.boolean(),
  autoPlayEnabled: z.boolean(),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  gameWon: z.boolean(),
  completionProgress: z.number().min(0).max(100),
}).refine(
  (data) => {
    // Validate exactly 52 cards
    const allCards = [
      ...data.drawPile,
      ...data.discardPile,
      ...data.foundations.hearts,
      ...data.foundations.diamonds,
      ...data.foundations.clubs,
      ...data.foundations.spades,
      ...data.tableau.flat(),
    ];
    return allCards.length === 52;
  },
  { message: 'Game state must contain exactly 52 cards' }
).refine(
  (data) => {
    // Validate no duplicate card IDs
    const allCards = [
      ...data.drawPile,
      ...data.discardPile,
      ...data.foundations.hearts,
      ...data.foundations.diamonds,
      ...data.foundations.clubs,
      ...data.foundations.spades,
      ...data.tableau.flat(),
    ];
    const ids = allCards.map(c => c.id);
    return new Set(ids).size === ids.length;
  },
  { message: 'Duplicate card IDs found' }
);

export type ValidatedGameState = z.infer<typeof GameStateSchema>;
```

**Updated import function:**
```typescript
importGameState: (jsonString: string) => {
  try {
    // Size limit check
    if (jsonString.length > 500000) {
      console.error('Import failed: File too large');
      return false;
    }
    
    const parsed = JSON.parse(jsonString);
    const validated = GameStateSchema.parse(parsed);
    
    // Set validated state
    set({
      ...validated,
      selectedCard: undefined,
      autoPlayInProgress: false,
    });
    
    return true;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation errors:', error.errors);
    }
    return false;
  }
}
```

---

### 4. Add Security Headers for Production

**Priority:** 🟡 Medium  
**Effort:** 1 hour  
**Impact:** Defense in depth

**Recommendation:**
For GitHub Pages (via _headers file or Netlify headers):

```
# packages/app/public/_headers (Netlify)
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'
```

**For Vite dev server:**
```typescript
// packages/app/vite.config.ts
export default defineConfig({
  server: {
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
    },
  },
});
```

---

### 5. Add .npmrc Security Settings

**Priority:** 🟡 Medium  
**Effort:** 15 minutes  
**Impact:** Prevent supply chain attacks

**Recommendation:**
Create `.npmrc`:

```ini
# .npmrc
# Security settings

# Require exact versions in package-lock.json
save-exact=true

# Prevent running pre/post install scripts from dependencies
ignore-scripts=false

# Enable package-lock.json
package-lock=true

# Audit level for install
audit-level=moderate

# Prevent publishing to npm (use private: true in package.json instead)
# dry-run=true

# Use HTTPS for registry
registry=https://registry.npmjs.org/

# Strict SSL
strict-ssl=true
```

---

### 6. Implement File Size Limits

**Priority:** 🟡 Medium  
**Effort:** 30 minutes  
**Impact:** Prevent DoS via large files

**Recommendation:**
```typescript
// packages/app/src/utils/security.ts
export const LIMITS = {
  MAX_IMPORT_SIZE: 500 * 1024, // 500KB
  MAX_MOVE_HISTORY: 10000,
  MAX_FILE_NAME_LENGTH: 255,
} as const;

export function validateFileSize(content: string): boolean {
  return content.length <= LIMITS.MAX_IMPORT_SIZE;
}

export function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .slice(0, LIMITS.MAX_FILE_NAME_LENGTH);
}
```

**Usage:**
```typescript
importGameState: (jsonString: string) => {
  if (!validateFileSize(jsonString)) {
    console.error('File too large');
    return false;
  }
  // Continue with import...
}
```

---

### 7. Dependency Best Practices

**Priority:** 🟡 Medium  
**Effort:** Ongoing  
**Impact:** Reduce attack surface

**Recommendations:**

#### Minimize dependencies
```
Current dependencies analysis:
- @dnd-kit/core (required for drag-drop)
- framer-motion (could be replaced with CSS animations for smaller bundle)
- zustand (minimal, excellent choice)
- react, react-dom (framework, required)

Potential removals:
- framer-motion: Consider CSS animations for simple cases
```

#### Lock dependency versions
```json
{
  "dependencies": {
    "react": "19.2.3",  // Exact version, not ^19.2.3
    "zustand": "5.0.9"
  }
}
```

#### Regular updates
```bash
# Monthly dependency check
npm outdated
npm update

# Major version updates (review changelog)
npx npm-check-updates -u
```

---

### 8. Add Secret Scanning Prevention

**Priority:** 🟢 Low (no secrets currently)  
**Effort:** 30 minutes  
**Impact:** Prevent accidental secret commits

**Recommendation:**
Add pre-commit hook:

```bash
# Install husky
npm install -D husky lint-staged

# Setup
npx husky init
```

```javascript
// .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Check for potential secrets
if git diff --cached --name-only | xargs grep -l -E "(api[_-]?key|secret|password|token|private[_-]?key)" 2>/dev/null; then
  echo "⚠️ Potential secret detected in commit"
  echo "Please review the flagged files"
  exit 1
fi

npx lint-staged
```

---

### 9. Add Security Documentation

**Priority:** 🟢 Low  
**Effort:** 1 hour  
**Impact:** Security awareness

**Recommendation:**
Create `SECURITY.md`:

```markdown
# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

This is a client-side game with no authentication or sensitive data storage.

For security issues:
1. Open an issue on GitHub
2. Or email: security@example.com

## Security Considerations

### Data Storage
- No server-side storage
- Game state stored only in browser memory
- Export/import uses local files only

### Dependencies
- Automatically scanned by Dependabot
- npm audit run weekly
- CodeQL analysis on every PR

### Input Validation
- All imported game states are validated
- File size limits enforced
- JSON structure validated

## Best Practices for Contributors

1. Never commit secrets or API keys
2. Validate all external input
3. Keep dependencies updated
4. Run `npm audit` before commits
```

---

## Security Checklist for AI Agents

When making changes:

- [ ] No hardcoded secrets or API keys
- [ ] Validate all external input (file imports, URL params)
- [ ] Use parameterized queries (if adding database)
- [ ] Sanitize output to prevent XSS (React does this by default)
- [ ] Check for new dependencies with `npm audit`
- [ ] Don't bypass TypeScript with `any` types
- [ ] Add size/length limits to unbounded inputs

---

## Dependency Security Matrix

| Package | Risk Level | Notes |
|---------|------------|-------|
| react | Low | Well-maintained, auto-escapes |
| zustand | Low | Minimal attack surface |
| @dnd-kit | Low | No network, pure UI |
| framer-motion | Low | Animation only |
| tailwindcss | Low | Build-time only |
| vite | Low | Dev/build only |
| vitest | Low | Dev only |

---

**Author:** AI Analysis  
**Last Updated:** December 27, 2025
