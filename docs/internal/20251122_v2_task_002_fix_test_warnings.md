# Task 002: Fix React act() Warnings in Tests

**Priority:** HIGH (Quick Win)  
**Estimated Effort:** 1-2 hours  
**Risk Level:** LOW  
**Impact:** MEDIUM - Cleaner test output, better test reliability

---

## Problem Statement

The WinModal component tests generate React act() warnings during test execution:

```
stderr | src/components/WinModal.test.tsx > WinModal > should display correct difficulty labels
An update to WinModal inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */
```

**Current Status:**
- All 5 tests in WinModal.test.tsx pass ✅
- But generate 4 act() warnings ⚠️
- Warnings pollute test output
- Indicates improper test setup

---

## Root Cause Analysis

The warnings occur because:
1. Framer Motion animations trigger state updates
2. WinModal has `initial` and `animate` props
3. State updates happen after render but outside `act()`
4. Tests don't wait for animations to complete

**Affected File:** `packages/app/src/components/WinModal.test.tsx`

---

## Solution Approach

### Option 1: Wait for Animations (Recommended)

Use `waitFor` from Testing Library to wait for state updates:

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';

it('should display correct difficulty labels', async () => {
  // Set up state with won game
  useGameStore.setState({
    gameWon: true,
    difficulty: 1,
    perceivedDifficulty: 25,
    moveHistory: [],
  });

  await act(async () => {
    render(<WinModal />);
  });

  // Wait for modal to appear and animations to settle
  await waitFor(() => {
    expect(screen.getByText(/Congratulations/i)).toBeInTheDocument();
  });

  expect(screen.getByText(/Very Easy/i)).toBeInTheDocument();
  expect(screen.getByText(/⭐/)).toBeInTheDocument();
});
```

### Option 2: Disable Animations in Tests

Mock framer-motion in test setup:

```typescript
// packages/app/src/test/setup.ts
import '@testing-library/jest-dom';

// Mock framer-motion to disable animations in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  },
  AnimatePresence: ({ children }: any) => children,
}));
```

### Option 3: Use fakeTimers (If animations are time-based)

```typescript
import { vi } from 'vitest';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

it('test with animations', async () => {
  render(<WinModal />);
  
  // Fast-forward animations
  act(() => {
    vi.runAllTimers();
  });
  
  expect(screen.getByText(/Congratulations/i)).toBeInTheDocument();
});
```

---

## Recommended Implementation

**Use Option 1 (waitFor) + Option 2 (mock for faster tests)**

### Step 1: Update test setup

**File:** `packages/app/src/test/setup.ts`

```typescript
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock framer-motion to disable animations in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  },
  AnimatePresence: ({ children }: any) => children,
  useReducedMotion: () => true,
}));
```

### Step 2: Update WinModal.test.tsx

**File:** `packages/app/src/components/WinModal.test.tsx`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import WinModal from './WinModal';
import { useGameStore } from '../store/gameStore';

describe('WinModal', () => {
  beforeEach(() => {
    // Reset store to clean state
    useGameStore.setState({
      gameWon: false,
      difficulty: 3,
      perceivedDifficulty: undefined,
      moveHistory: [],
    });
  });

  it('should not render when game is not won', async () => {
    await act(async () => {
      render(<WinModal />);
    });
    
    expect(screen.queryByText(/Congratulations/i)).not.toBeInTheDocument();
  });

  it('should render when game is won', async () => {
    await act(async () => {
      useGameStore.setState({ gameWon: true });
    });

    render(<WinModal />);

    await waitFor(() => {
      expect(screen.getByText(/Congratulations/i)).toBeInTheDocument();
    });
  });

  it('should display correct difficulty labels', async () => {
    await act(async () => {
      useGameStore.setState({
        gameWon: true,
        difficulty: 1,
        perceivedDifficulty: 25,
      });
    });

    render(<WinModal />);

    await waitFor(() => {
      expect(screen.getByText(/Very Easy/i)).toBeInTheDocument();
    });
    
    expect(screen.getByText(/⭐/)).toBeInTheDocument();
  });

  it('should show perceived difficulty when available', async () => {
    await act(async () => {
      useGameStore.setState({
        gameWon: true,
        difficulty: 3,
        perceivedDifficulty: 75,
      });
    });

    render(<WinModal />);

    await waitFor(() => {
      expect(screen.getByText(/75/)).toBeInTheDocument();
    });
  });

  it('should display move count', async () => {
    const moves = [
      { type: 'draw_card' as const, timestamp: Date.now(), card: {} as any },
      { type: 'draw_card' as const, timestamp: Date.now(), card: {} as any },
    ];

    await act(async () => {
      useGameStore.setState({
        gameWon: true,
        moveHistory: moves,
      });
    });

    render(<WinModal />);

    await waitFor(() => {
      expect(screen.getByText(/2/)).toBeInTheDocument();
    });
  });
});
```

### Step 3: Apply same pattern to other test files if needed

Check for similar warnings in:
- `ControlPanel.test.tsx`
- `App.test.tsx`
- Any other component tests with animations

---

## Implementation Checklist

- [ ] Update `packages/app/src/test/setup.ts` with framer-motion mock
- [ ] Update `WinModal.test.tsx` with act() and waitFor()
- [ ] Run tests: `npm run test -- WinModal.test.tsx`
- [ ] Verify no warnings in output
- [ ] Run full test suite: `npm run test:run`
- [ ] Verify all tests still pass (92 tests expected)
- [ ] Check for warnings in other test files
- [ ] Fix any remaining warnings using same pattern

---

## Testing Instructions

### Before Fix
```bash
npm run test -- WinModal.test.tsx
```
Expected: Tests pass but 4 warnings displayed

### After Fix
```bash
npm run test -- WinModal.test.tsx
```
Expected: Tests pass with ZERO warnings ✅

### Full Suite
```bash
npm run test:run
```
Expected: All 92 tests pass with no warnings

---

## Risk Assessment

**Benefits:**
- ✅ Clean test output (easier to spot real issues)
- ✅ More reliable tests (proper async handling)
- ✅ Faster tests (animations disabled)
- ✅ Better test practices
- ✅ Prevents future warnings

**Risks:**
- ⚠️ Very low risk
- ⚠️ Mocking framer-motion may hide animation bugs
  - Mitigation: Add E2E tests for animations

**Trade-offs:**
- Tests won't catch animation-specific bugs
- But unit tests shouldn't test animation libraries anyway
- Animation testing belongs in E2E tests

---

## Alternative Solutions

### If mocking is not desired:

1. **Configure framer-motion for tests:**
   ```typescript
   import { MotionGlobalConfig } from 'framer-motion';
   
   beforeAll(() => {
     MotionGlobalConfig.skipAnimations = true;
   });
   ```

2. **Use data-testid to avoid animation timing:**
   ```typescript
   // In component
   <motion.div data-testid="win-modal">
   
   // In test
   expect(screen.getByTestId('win-modal')).toBeInTheDocument();
   ```

---

## Future Improvements

1. **Add E2E tests for animations:**
   - Use Playwright or Cypress
   - Test actual animation behavior
   - Visual regression tests

2. **Create test utilities:**
   ```typescript
   // packages/app/src/test/utils.ts
   export const renderWithStore = (component, initialState) => {
     act(() => {
       useGameStore.setState(initialState);
     });
     return render(component);
   };
   ```

3. **Add custom matchers:**
   ```typescript
   expect.extend({
     toHaveAnimated(element) {
       // Check if element has animation classes
     }
   });
   ```

---

## References

- [React Testing Library - Async Utilities](https://testing-library.com/docs/dom-testing-library/api-async/)
- [React act() API](https://react.dev/reference/react/act)
- [Framer Motion Testing](https://www.framer.com/motion/guide-accessibility/#testing)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

## Success Criteria

- [ ] Zero act() warnings in WinModal tests
- [ ] All 5 WinModal tests still pass
- [ ] All 92 app tests still pass
- [ ] Test execution time not significantly increased
- [ ] Clean, readable test output
- [ ] Pattern documented for future tests
