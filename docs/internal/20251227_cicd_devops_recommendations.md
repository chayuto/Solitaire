# CI/CD & DevOps Recommendations

**Date:** December 27, 2025  
**Status:** 📋 Recommendations for AI Coding Agents  
**Priority:** 🔴 High

---

## Executive Summary

This document provides recommendations for improving CI/CD pipelines, DevOps practices, and deployment workflows in the Solitaire monorepo.

---

## Current State Analysis

### Strengths ✅
1. **GitHub Actions** CI pipeline with lint, test, build jobs
2. **GitHub Pages** deployment configured
3. **Dependabot** for dependency updates
4. **Parallel job execution** for faster CI
5. **Cache configuration** for npm dependencies

### Areas for Improvement 🔧
1. **No PR preview deployments** for testing changes
2. **Missing code coverage** in CI
3. **No security scanning** (SAST/dependency audit)
4. **No performance monitoring** in CI
5. **CI jobs duplicate setup** (can be optimized)
6. **No automated changelog** generation
7. **Missing branch protection** recommendations

---

## Recommendations

### 1. Add PR Preview Deployments

**Priority:** 🔴 High  
**Effort:** 2-3 hours  
**Impact:** Test changes before merge

**Recommendation:**
Add Vercel or Netlify for PR previews:

```yaml
# .github/workflows/preview.yml
name: PR Preview

on:
  pull_request:
    branches: [main]
    paths-ignore:
      - "**/*.md"
      - "docs/**"

jobs:
  preview:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build libraries
        run: npm run build:libs
      
      - name: Build app
        run: npm run build
        env:
          VITE_BASE_URL: /pr-${{ github.event.number }}/
      
      - name: Deploy to Netlify
        uses: nwtgck/actions-netlify@v3
        with:
          publish-dir: './packages/app/dist'
          production-branch: main
          github-token: ${{ secrets.GITHUB_TOKEN }}
          deploy-message: "Deploy from PR #${{ github.event.number }}"
          alias: pr-${{ github.event.number }}
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

**Alternative: Surge.sh (simpler):**
```yaml
      - name: Install Surge
        run: npm install -g surge
      
      - name: Deploy Preview
        run: surge ./packages/app/dist solitaire-pr-${{ github.event.number }}.surge.sh
        env:
          SURGE_LOGIN: ${{ secrets.SURGE_LOGIN }}
          SURGE_TOKEN: ${{ secrets.SURGE_TOKEN }}
      
      - name: Comment PR
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '🚀 Preview deployed to https://solitaire-pr-${{ github.event.number }}.surge.sh'
            })
```

---

### 2. Add Security Scanning

**Priority:** 🔴 High  
**Effort:** 1-2 hours  
**Impact:** Catch vulnerabilities early

**Recommendation:**
Add npm audit and CodeQL:

```yaml
# .github/workflows/security.yml
name: Security Scan

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * 1'  # Weekly on Monday

jobs:
  dependency-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run npm audit
        run: npm audit --audit-level=high
        continue-on-error: true  # Don't fail build, just report
      
      - name: Run npm audit (production only)
        run: npm audit --omit=dev --audit-level=moderate

  codeql:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Initialize CodeQL
        uses: github/codeql-action/init@v3
        with:
          languages: javascript-typescript
      
      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v3
```

**Update Dependabot for security alerts:**
```yaml
# .github/dependabot.yml (add security updates section)
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    # ... existing config ...
    
    # Enable security updates
    allow:
      - dependency-type: "all"
    
    # Auto-merge minor updates
    versioning-strategy: auto
```

---

### 3. Add Code Coverage to CI

**Priority:** 🔴 High  
**Effort:** 1-2 hours  
**Impact:** Track test coverage trends

**Recommendation:**
```yaml
# .github/workflows/ci.yml - update test job
test:
  name: Test
  runs-on: ubuntu-latest
  
  steps:
    - name: Checkout code
      uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build libraries
      run: npm run build:libs
    
    - name: Run tests with coverage
      run: npm run test:coverage
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v4
      with:
        files: ./packages/app/coverage/lcov.info
        fail_ci_if_error: false
        verbose: true
      env:
        CODECOV_TOKEN: ${{ secrets.CODECOV_TOKEN }}
    
    - name: Check coverage thresholds
      # Using Node.js for portability (bc may not be available in all CI environments)
      run: |
        node -e "
          const coverage = require('./packages/app/coverage/coverage-summary.json');
          const linePct = coverage.total.lines.pct;
          console.log('Line coverage: ' + linePct + '%');
          if (linePct < 70) {
            console.error('Coverage below 70% threshold!');
            process.exit(1);
          }
        "
```

**Add coverage badge to README:**
```markdown
[![codecov](https://codecov.io/gh/chayuto/Solitaire/branch/main/graph/badge.svg)](https://codecov.io/gh/chayuto/Solitaire)
```

---

### 4. Optimize CI with Caching and Parallelization

**Priority:** 🟡 Medium  
**Effort:** 1-2 hours  
**Impact:** Faster CI runs

**Recommendation:**
Use reusable workflow and better caching:

```yaml
# .github/workflows/ci.yml - optimized version
name: CI

on:
  push:
    branches: [main]
    paths-ignore:
      - "**/*.md"
      - "docs/**"
  pull_request:
    branches: [main]
    paths-ignore:
      - "**/*.md"
      - "docs/**"

env:
  NODE_VERSION: '20'

jobs:
  setup:
    name: Setup
    runs-on: ubuntu-latest
    outputs:
      cache-key: ${{ steps.cache-key.outputs.key }}
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Generate cache key
        id: cache-key
        run: echo "key=${{ runner.os }}-node-${{ hashFiles('package-lock.json') }}" >> $GITHUB_OUTPUT
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build libraries
        run: npm run build:libs
      
      - name: Cache node_modules and dist
        uses: actions/cache/save@v4
        with:
          path: |
            node_modules
            packages/*/node_modules
            packages/core/dist
            packages/mcts/dist
          key: ${{ steps.cache-key.outputs.key }}-built

  lint:
    name: Lint
    runs-on: ubuntu-latest
    needs: setup
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
      
      - name: Restore cache
        uses: actions/cache/restore@v4
        with:
          path: |
            node_modules
            packages/*/node_modules
            packages/core/dist
            packages/mcts/dist
          key: ${{ needs.setup.outputs.cache-key }}-built
      
      - name: Run ESLint
        run: npm run lint

  test:
    name: Test
    runs-on: ubuntu-latest
    needs: setup
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
      
      - name: Restore cache
        uses: actions/cache/restore@v4
        with:
          path: |
            node_modules
            packages/*/node_modules
            packages/core/dist
            packages/mcts/dist
          key: ${{ needs.setup.outputs.cache-key }}-built
      
      - name: Run tests
        run: npm run test:run

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: setup
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
      
      - name: Restore cache
        uses: actions/cache/restore@v4
        with:
          path: |
            node_modules
            packages/*/node_modules
            packages/core/dist
            packages/mcts/dist
          key: ${{ needs.setup.outputs.cache-key }}-built
      
      - name: Build project
        run: npm run build
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: dist
          path: packages/app/dist/
          retention-days: 7
```

---

### 5. Add Bundle Size Tracking

**Priority:** 🟡 Medium  
**Effort:** 1-2 hours  
**Impact:** Prevent bundle bloat

**Recommendation:**
```yaml
# .github/workflows/ci.yml - add to build job
      - name: Analyze bundle size
        run: npx vite-bundle-visualizer --output ./stats.html
        working-directory: packages/app
      
      - name: Upload bundle stats
        uses: actions/upload-artifact@v4
        with:
          name: bundle-stats
          path: packages/app/stats.html
      
      - name: Report bundle size
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const path = './packages/app/dist';
            const { size } = fs.statSync(path);
            
            // Calculate total size in KB
            let totalSize = 0;
            const files = fs.readdirSync(path, { recursive: true });
            for (const file of files) {
              const filePath = `${path}/${file}`;
              if (fs.statSync(filePath).isFile()) {
                totalSize += fs.statSync(filePath).size;
              }
            }
            
            const sizeKB = (totalSize / 1024).toFixed(2);
            console.log(`Total bundle size: ${sizeKB} KB`);
            
            if (totalSize > 500 * 1024) {
              core.warning(`Bundle size ${sizeKB} KB exceeds 500 KB threshold`);
            }
```

**Alternative: Use bundlewatch:**
```json
// package.json
{
  "bundlewatch": {
    "files": [
      {
        "path": "./packages/app/dist/**/*.js",
        "maxSize": "150 KB"
      },
      {
        "path": "./packages/app/dist/**/*.css",
        "maxSize": "20 KB"
      }
    ]
  }
}
```

---

### 6. Add Automated Changelog

**Priority:** 🟡 Medium  
**Effort:** 1-2 hours  
**Impact:** Better release documentation

**Recommendation:**
Use conventional commits and auto-changelog:

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: Generate changelog
        id: changelog
        uses: metcalfc/changelog-generator@v4.3.1
        with:
          myToken: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Create Release
        uses: softprops/action-gh-release@v2
        with:
          body: ${{ steps.changelog.outputs.changelog }}
          draft: false
          prerelease: false
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Commit message format:**
```
feat: Add hint system
fix: Correct auto-play loop detection
docs: Update API documentation
chore: Update dependencies
refactor: Extract scoring logic
test: Add integration tests
```

---

### 7. Add Branch Protection Recommendations

**Priority:** 🟡 Medium  
**Effort:** 30 minutes  
**Impact:** Code quality gate

**Recommendation:**
Configure in GitHub repository settings:

```markdown
## Recommended Branch Protection Rules for `main`

### Required Status Checks
- [x] Require status checks to pass before merging
  - [x] lint
  - [x] test
  - [x] build

### Pull Request Requirements
- [x] Require a pull request before merging
- [ ] Require approvals (enable if team grows)
- [x] Dismiss stale pull request approvals when new commits are pushed

### Branch Updates
- [x] Require branches to be up to date before merging

### Restrictions
- [x] Do not allow force pushes
- [x] Do not allow deletions
```

---

### 8. Add Performance Monitoring

**Priority:** 🟢 Low  
**Effort:** 2-3 hours  
**Impact:** Track app performance

**Recommendation:**
Add Lighthouse CI:

```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: |
          npm run build:libs
          npm run build
      
      - name: Run Lighthouse
        uses: treosh/lighthouse-ci-action@v12
        with:
          uploadArtifacts: true
          configPath: ./lighthouserc.json
```

```json
// lighthouserc.json
{
  "ci": {
    "collect": {
      "staticDistDir": "./packages/app/dist"
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.8 }],
        "categories:accessibility": ["error", { "minScore": 0.9 }],
        "categories:best-practices": ["warn", { "minScore": 0.9 }],
        "categories:seo": ["warn", { "minScore": 0.8 }]
      }
    }
  }
}
```

---

### 9. Add Dependency Update Workflow

**Priority:** 🟢 Low  
**Effort:** 1 hour  
**Impact:** Automated dependency management

**Recommendation:**
Auto-merge safe dependency updates:

```yaml
# .github/workflows/auto-merge-deps.yml
name: Auto-merge Dependabot

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  auto-merge:
    runs-on: ubuntu-latest
    if: github.actor == 'dependabot[bot]'
    
    steps:
      - name: Wait for checks
        uses: actions/github-script@v7
        with:
          script: |
            const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
            await delay(60000); // Wait 1 minute for checks to start
      
      - name: Auto-merge patch updates
        uses: fastify/github-action-merge-dependabot@v3
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          merge-method: squash
          target: patch
```

---

## Recommended CI Pipeline Summary

```
Push/PR
  │
  ├─► Setup (install + build libs)
  │     │
  │     ├─► Lint (parallel)
  │     ├─► Test + Coverage (parallel)
  │     └─► Build + Bundle Analysis (parallel)
  │
  ├─► Security Scan (on main/weekly)
  │
  ├─► Lighthouse (on main)
  │
  └─► Deploy
        ├─► PR Preview (on PR)
        └─► GitHub Pages (on main merge)
```

---

## AI Agent CI Checklist

When making changes:

- [ ] Commit message follows conventional format
- [ ] All CI checks pass before merge
- [ ] No security vulnerabilities introduced
- [ ] Bundle size within limits
- [ ] Test coverage maintained

---

**Author:** AI Analysis  
**Last Updated:** December 27, 2025
