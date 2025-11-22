# Task 001: Add React Error Boundary

**Priority:** HIGH (Quick Win)  
**Estimated Effort:** 2-3 hours  
**Risk Level:** LOW  
**Impact:** HIGH - Prevents white screen crashes

---

## Problem Statement

Currently, if any React component throws an error during render, the entire app crashes and shows a blank white screen. This provides a terrible user experience and causes loss of game state.

**Example scenario:**
- User has a complex game in progress
- A rare edge case triggers a render error
- App shows blank screen
- User loses all progress
- No error message or recovery option

---

## Objective

Implement React Error Boundary to:
1. Catch render errors gracefully
2. Display a user-friendly error UI
3. Provide a "Try Again" button to recover
4. Log errors for debugging
5. Preserve error stack traces in development

---

## Technical Approach

### 1. Create ErrorBoundary Component

**Location:** `packages/app/src/components/ErrorBoundary.tsx`

```typescript
import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by boundary:', error, errorInfo);
    }
    
    this.setState({ error, errorInfo });
    
    // TODO: Send to error tracking service in production (e.g., Sentry)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gradient-to-br from-red-700 via-red-600 to-red-800 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
            <h1 className="text-2xl font-bold text-red-600 mb-4">
              Oops! Something went wrong
            </h1>
            <p className="text-gray-700 mb-4">
              The game encountered an unexpected error. Don't worry, you can try restarting.
            </p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-4 text-sm">
                <summary className="cursor-pointer text-gray-600 hover:text-gray-800 font-medium">
                  Error Details (Development Only)
                </summary>
                <pre className="mt-2 p-3 bg-gray-100 rounded overflow-auto text-xs">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                Reload Page
              </button>
            </div>
            
            <p className="text-xs text-gray-500 mt-4 text-center">
              If this problem persists, try clearing your browser cache
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### 2. Update App.tsx

**Location:** `packages/app/src/App.tsx`

Add ErrorBoundary wrapper:

```typescript
import { ErrorBoundary } from './components/ErrorBoundary';
import GameBoard from './components/GameBoard';
import './App.css';

function App() {
  return (
    <ErrorBoundary>
      <GameBoard />
    </ErrorBoundary>
  );
}

export default App;
```

### 3. Update components/index.ts

**Location:** `packages/app/src/components/index.ts`

Export the new component:

```typescript
export { ErrorBoundary } from './ErrorBoundary';
// ... other exports
```

### 4. Add Tests

**Location:** `packages/app/src/components/ErrorBoundary.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

// Component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  // Suppress console.error for these tests
  const originalError = console.error;
  beforeAll(() => {
    console.error = vi.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('should render error UI when child throws error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText(/Try Again/i)).toBeInTheDocument();
  });

  it('should render custom fallback if provided', () => {
    const fallback = <div>Custom error UI</div>;
    
    render(
      <ErrorBoundary fallback={fallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Custom error UI')).toBeInTheDocument();
  });

  it('should reset error state when Try Again is clicked', async () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    
    const tryAgainButton = screen.getByText(/Try Again/i);
    tryAgainButton.click();
    
    // After reset, re-render with shouldThrow=false
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('No error')).toBeInTheDocument();
  });
});
```

---

## Implementation Checklist

- [ ] Create `ErrorBoundary.tsx` component
- [ ] Add error boundary to `App.tsx`
- [ ] Export from `components/index.ts`
- [ ] Create `ErrorBoundary.test.tsx` with comprehensive tests
- [ ] Run tests: `npm run test:run`
- [ ] Verify error boundary works by intentionally throwing an error
- [ ] Test "Try Again" button functionality
- [ ] Test "Reload Page" button functionality
- [ ] Verify error details shown in development mode
- [ ] Verify clean error UI shown in production build
- [ ] Update documentation if needed

---

## Testing Instructions

### Manual Testing

1. **Intentional Error Test:**
   ```typescript
   // Temporarily add to any component:
   if (Math.random() > 0.5) {
     throw new Error('Test error boundary');
   }
   ```

2. **Verify Error UI:**
   - Error message displayed
   - Try Again button works
   - Reload button works
   - Error details visible in dev mode

3. **Production Build:**
   ```bash
   npm run build
   npm run preview
   ```
   - Verify error details hidden
   - UI remains user-friendly

### Automated Testing

```bash
npm run test -- ErrorBoundary.test.tsx
```

Expected: All tests pass

---

## Risk Assessment

**Benefits:**
- ✅ Prevents total app crashes
- ✅ Improves user experience dramatically
- ✅ Provides recovery options
- ✅ Helps debugging with stack traces
- ✅ Professional error handling

**Risks:**
- ⚠️ Very low risk
- ⚠️ May hide errors if not logged properly
- ⚠️ Could mask underlying issues if overused

**Mitigation:**
- Always log errors in development
- Consider adding error tracking service (Sentry)
- Don't wrap individual components unnecessarily
- Only use at app root level

---

## Future Enhancements

1. **Error Tracking Integration:**
   - Add Sentry or similar service
   - Track error frequency and types
   - Alert on critical errors

2. **Granular Boundaries:**
   - Add boundaries around complex components
   - Different fallback UIs per boundary
   - Preserve partial app state

3. **Error Recovery:**
   - Auto-save game state before crash
   - Restore state after recovery
   - Offer to resume game

4. **User Feedback:**
   - Add "Report Error" button
   - Collect user context
   - Send to support system

---

## References

- [React Error Boundaries Docs](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [Error Handling Best Practices](https://kentcdodds.com/blog/use-react-error-boundary-to-handle-errors-in-react)

---

## Success Criteria

- [ ] Error boundary prevents white screen crashes
- [ ] User-friendly error UI displayed
- [ ] Recovery options work correctly
- [ ] All tests pass
- [ ] Error details shown in development
- [ ] Clean UI in production
- [ ] No regressions in existing functionality
