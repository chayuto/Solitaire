# Task 003: Add Bundle Size Tracking

**Priority:** HIGH (Quick Win)  
**Estimated Effort:** 2-3 hours  
**Risk Level:** LOW  
**Impact:** MEDIUM - Prevent bundle bloat, track performance

---

## Problem Statement

Current state:
- Bundle size: 357KB JS (111KB gzipped)
- No tracking or monitoring in place
- No alerts when bundle size increases
- No visibility into what's causing bundle size
- No size budgets enforced

**Risk:**
- Bundle can grow unchecked
- Performance degradation over time
- Slow loading on poor connections
- No early warning of size issues

---

## Objectives

1. Add bundle size analysis to build process
2. Track bundle size in CI/CD
3. Set size budgets and enforce them
4. Visualize bundle composition
5. Get alerts on size increases
6. Document optimization opportunities

---

## Technical Implementation

### Step 1: Add Vite Bundle Analyzer

**Install dependency:**
```bash
cd packages/app
npm install --save-dev rollup-plugin-visualizer
```

**Update vite.config.ts:**

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: './dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  // ... rest of config
})
```

### Step 2: Add Build Scripts

**Update packages/app/package.json:**

```json
{
  "scripts": {
    "build": "tsc -b && vite build",
    "build:analyze": "tsc -b && vite build && open dist/stats.html",
    "size": "npm run build && size-limit",
    "size:why": "npm run build && size-limit --why"
  }
}
```

### Step 3: Add size-limit for Budgets

**Install size-limit:**
```bash
npm install --save-dev @size-limit/preset-app
```

**Create .size-limit.json:**

```json
[
  {
    "name": "Main Bundle (JS)",
    "path": "packages/app/dist/assets/*.js",
    "limit": "400 KB",
    "gzip": true
  },
  {
    "name": "Main Bundle (CSS)",
    "path": "packages/app/dist/assets/*.css",
    "limit": "30 KB",
    "gzip": true
  },
  {
    "name": "Core Library",
    "path": "packages/core/dist/index.js",
    "limit": "30 KB",
    "gzip": true
  }
]
```

### Step 4: Add CI Bundle Size Check

**Create .github/workflows/bundle-size.yml:**

```yaml
name: Bundle Size Check

on:
  pull_request:
    branches: [main, master]
    paths:
      - 'packages/**/*.ts'
      - 'packages/**/*.tsx'
      - 'packages/**/package.json'
      - 'package-lock.json'

jobs:
  size:
    name: Check Bundle Size
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Need full history for comparison
      
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
      
      - name: Check bundle size
        run: npx size-limit
      
      - name: Compare with base branch
        uses: andresz1/size-limit-action@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          skip_step: build
```

### Step 5: Create Bundle Analysis Script

**File: scripts/analyze-bundle.js**

```javascript
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const distPath = path.join(__dirname, '../packages/app/dist');

function getFileSize(filepath) {
  const stats = fs.statSync(filepath);
  return stats.size;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function analyzeBundle() {
  const assetsPath = path.join(distPath, 'assets');
  const files = fs.readdirSync(assetsPath);
  
  let totalJS = 0;
  let totalCSS = 0;
  
  console.log('\n📦 Bundle Size Report\n');
  console.log('=' .repeat(60));
  
  files.forEach(file => {
    const filepath = path.join(assetsPath, file);
    const size = getFileSize(filepath);
    
    if (file.endsWith('.js')) {
      totalJS += size;
      console.log(`📄 ${file}: ${formatBytes(size)}`);
    } else if (file.endsWith('.css')) {
      totalCSS += size;
      console.log(`🎨 ${file}: ${formatBytes(size)}`);
    }
  });
  
  console.log('=' .repeat(60));
  console.log(`\n📊 Total JavaScript: ${formatBytes(totalJS)}`);
  console.log(`🎨 Total CSS: ${formatBytes(totalCSS)}`);
  console.log(`💾 Total: ${formatBytes(totalJS + totalCSS)}\n`);
  
  // Check budgets
  const jsLimit = 400 * 1024; // 400 KB
  const cssLimit = 30 * 1024; // 30 KB
  
  if (totalJS > jsLimit) {
    console.error(`❌ JavaScript bundle exceeds budget by ${formatBytes(totalJS - jsLimit)}!`);
    process.exit(1);
  }
  
  if (totalCSS > cssLimit) {
    console.error(`❌ CSS bundle exceeds budget by ${formatBytes(totalCSS - cssLimit)}!`);
    process.exit(1);
  }
  
  console.log('✅ All bundles within budget limits!\n');
}

if (!fs.existsSync(distPath)) {
  console.error('❌ Build not found. Run `npm run build` first.');
  process.exit(1);
}

analyzeBundle();
```

**Make executable:**
```bash
chmod +x scripts/analyze-bundle.js
```

**Add to package.json:**
```json
{
  "scripts": {
    "analyze": "node scripts/analyze-bundle.js"
  }
}
```

### Step 6: Add Bundle Size Badge

**Update README.md:**

```markdown
# Solitaire Card Game

[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@chayuto/solitaire-core)](https://bundlephobia.com/package/@chayuto/solitaire-core)

<!-- Rest of README -->
```

### Step 7: Create Bundle Optimization Guide

**File: docs/internal/bundle-optimization.md**

```markdown
# Bundle Size Optimization Guide

## Current Size
- **JavaScript:** 357 KB (111 KB gzipped)
- **CSS:** 28 KB (5.6 KB gzipped)
- **Total:** 385 KB (116.6 KB gzipped)

## Budget Targets
- JavaScript: < 400 KB (< 120 KB gzipped)
- CSS: < 30 KB (< 10 KB gzipped)
- Total: < 430 KB (< 130 KB gzipped)

## Analysis Tools

### View Bundle Composition
\`\`\`bash
npm run build:analyze
# Opens dist/stats.html in browser
\`\`\`

### Check Size Limits
\`\`\`bash
npm run size
\`\`\`

### Detailed Analysis
\`\`\`bash
npm run analyze
\`\`\`

## Optimization Opportunities

### 1. Code Splitting (Estimated savings: 50-100 KB)

Split large components:
- WinModal (lazy load)
- ActivityLog (lazy load)
- ReplayControls (lazy load)

\`\`\`typescript
// Before
import WinModal from './components/WinModal';

// After
const WinModal = lazy(() => import('./components/WinModal'));
\`\`\`

### 2. Tree Shaking (Estimated savings: 20-30 KB)

Ensure imports are tree-shakeable:
\`\`\`typescript
// Bad - imports entire library
import { motion } from 'framer-motion';

// Good - tree-shakeable
import { motion } from 'framer-motion/dist/framer-motion';
\`\`\`

### 3. Replace Heavy Dependencies

Consider lighter alternatives:
- framer-motion (60 KB) → CSS animations or react-spring (30 KB)
- @dnd-kit (30 KB) → Consider custom drag-and-drop

### 4. Dynamic Imports

Load features on-demand:
\`\`\`typescript
// Load i18n translations dynamically
const loadTranslations = async (locale) => {
  return await import(\`./locales/\${locale}.json\`);
};
\`\`\`

### 5. Minification

Currently using Vite's default minification.
Consider terser for additional savings:
\`\`\`typescript
build: {
  minify: 'terser',
  terserOptions: {
    compress: {
      drop_console: true, // Remove console.* in production
    }
  }
}
\`\`\`

## Monitoring

- Check bundle size on every PR
- Set up alerts for >10% size increases
- Review large dependencies quarterly
- Profile with Chrome DevTools
\`\`\`
```

---

## Implementation Checklist

- [ ] Install rollup-plugin-visualizer
- [ ] Update vite.config.ts with visualizer
- [ ] Install @size-limit/preset-app
- [ ] Create .size-limit.json with budgets
- [ ] Add build:analyze script
- [ ] Create scripts/analyze-bundle.js
- [ ] Add bundle-size.yml workflow
- [ ] Update README with bundle size badge
- [ ] Create bundle-optimization.md guide
- [ ] Test bundle analysis locally
- [ ] Test CI workflow
- [ ] Document optimization opportunities

---

## Testing Instructions

### Manual Testing

1. **Build and analyze:**
   ```bash
   npm run build
   npm run analyze
   ```
   Expected: Report shows current bundle sizes

2. **Visual analysis:**
   ```bash
   npm run build:analyze
   ```
   Expected: Opens interactive treemap of bundle

3. **Check budgets:**
   ```bash
   npm run size
   ```
   Expected: Passes if within budgets

4. **Simulate budget violation:**
   - Temporarily lower budget in .size-limit.json
   - Run `npm run size`
   - Should fail with error message

### CI Testing

1. Open a PR with code changes
2. Check "Bundle Size Check" workflow runs
3. Verify it reports size comparison
4. Add large dependency and verify it catches size increase

---

## Risk Assessment

**Benefits:**
- ✅ Early warning of bundle bloat
- ✅ Prevents performance degradation
- ✅ Forces conscious decisions about dependencies
- ✅ Improves team awareness of bundle composition
- ✅ Tracks historical size trends
- ✅ Low ongoing maintenance

**Risks:**
- ⚠️ Very low risk
- ⚠️ CI time increases by ~30 seconds
- ⚠️ May need to adjust budgets over time

**Mitigation:**
- Set reasonable initial budgets
- Review and update budgets quarterly
- Document exceptions clearly

---

## Success Criteria

- [ ] Bundle analyzer generates stats.html
- [ ] Size limits enforced in CI
- [ ] PR comments show size comparison
- [ ] analyze-bundle.js script works
- [ ] Documentation complete
- [ ] Team understands how to use tools
- [ ] Baseline budgets set appropriately

---

## Future Enhancements

1. **Automated Optimization:**
   - Auto-suggest optimizations in PRs
   - Performance budgets per route (when adding routing)
   - Automated tree-shaking analysis

2. **Monitoring:**
   - Track bundle size over time (graphs)
   - Alert on >5% size increase
   - Compare with competitors

3. **Advanced Analysis:**
   - Duplicate dependency detection
   - Unused code detection
   - Import cost analysis

---

## Resources

- [Vite Bundle Analyzer](https://github.com/btd/rollup-plugin-visualizer)
- [size-limit](https://github.com/ai/size-limit)
- [Bundle Size Action](https://github.com/andresz1/size-limit-action)
- [Web.dev Performance Budgets](https://web.dev/performance-budgets-101/)
- [Bundlephobia](https://bundlephobia.com/)
