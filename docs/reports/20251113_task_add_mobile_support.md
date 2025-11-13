# Task: Add Mobile Support and Touch Gestures

**Date**: 2025-11-13  
**Difficulty**: Hard  
**Estimated Time**: 4-6 hours  
**Priority**: High  
**Type**: Feature Addition

## Objective

Optimize the game for mobile devices with touch-friendly interactions and responsive design.

## Current State

- Desktop-focused design
- Drag-and-drop may not work well on touch
- Layout not optimized for small screens
- No touch gestures

## Requirements

### Functional Requirements

1. **Touch Interactions**:
   - Tap to select card
   - Tap destination to place
   - Swipe to draw cards
   - Pinch to zoom (optional)
   - Long press for context menu (optional)

2. **Responsive Design**:
   - Portrait and landscape orientation
   - Adjust layout for small screens
   - Larger touch targets (≥44x44px)
   - Readable card sizes

3. **Mobile UI Adjustments**:
   - Compact control panel
   - Bottom action bar for common actions
   - Card preview on tap
   - Simplified animations

### Technical Requirements

1. Touch event handlers
2. CSS media queries for mobile
3. Viewport meta tag configuration
4. Touch-friendly button sizes
5. Prevent default zoom/scroll behaviors

## Implementation Steps

### 1. Configure Viewport

**Update index.html**:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
```

### 2. Create Touch Manager

**Create TouchManager** (`src/utils/touchManager.ts`):
```typescript
export class TouchManager {
  private touchStartX: number = 0;
  private touchStartY: number = 0;
  private touchStartTime: number = 0;

  onTouchStart(e: TouchEvent) {
    const touch = e.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    this.touchStartTime = Date.now();
  }

  onTouchEnd(e: TouchEvent): 'tap' | 'swipe-left' | 'swipe-right' | 'swipe-up' | 'swipe-down' | 'long-press' | null {
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - this.touchStartX;
    const deltaY = touch.clientY - this.touchStartY;
    const deltaTime = Date.now() - this.touchStartTime;

    // Long press
    if (deltaTime > 500 && Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
      return 'long-press';
    }

    // Tap
    if (deltaTime < 300 && Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
      return 'tap';
    }

    // Swipe
    if (Math.abs(deltaX) > 50 || Math.abs(deltaY) > 50) {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        return deltaX > 0 ? 'swipe-right' : 'swipe-left';
      } else {
        return deltaY > 0 ? 'swipe-down' : 'swipe-up';
      }
    }

    return null;
  }

  preventDefaultBehaviors(element: HTMLElement) {
    // Prevent double-tap zoom
    element.addEventListener('touchstart', (e) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    }, { passive: false });

    // Prevent pull-to-refresh
    let startY: number;
    element.addEventListener('touchstart', (e) => {
      startY = e.touches[0].clientY;
    }, { passive: false });

    element.addEventListener('touchmove', (e) => {
      const y = e.touches[0].clientY;
      if (startY <= 0 && y > startY) {
        e.preventDefault();
      }
    }, { passive: false });
  }
}

export const touchManager = new TouchManager();
```

### 3. Responsive Card Component

**Update Card.tsx**:
```typescript
const Card: React.FC<CardProps> = ({ card, onClick, isSelected }) => {
  const [showPreview, setShowPreview] = useState(false);

  const handleTouch = (e: React.TouchEvent) => {
    touchManager.onTouchStart(e.nativeEvent);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const gesture = touchManager.onTouchEnd(e.nativeEvent);
    
    if (gesture === 'tap') {
      onClick?.();
    } else if (gesture === 'long-press') {
      setShowPreview(true);
      setTimeout(() => setShowPreview(false), 2000);
    }
  };

  return (
    <>
      <div
        onTouchStart={handleTouch}
        onTouchEnd={handleTouchEnd}
        onClick={onClick}
        className={`
          card
          ${isMobile ? 'min-w-[60px] min-h-[84px]' : 'w-[100px] h-[140px]'}
          ${isSelected ? 'ring-4 ring-blue-400' : ''}
          touch-manipulation
          active:scale-95
          transition-transform
        `}
      >
        {/* Card content */}
      </div>

      {showPreview && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="w-[200px] h-[280px] scale-150">
            {/* Enlarged card preview */}
          </div>
        </div>
      )}
    </>
  );
};
```

### 4. Mobile Layout

**Create MobileGameBoard** (`src/components/MobileGameBoard.tsx`):
```typescript
const MobileGameBoard: React.FC = () => {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  useEffect(() => {
    const updateOrientation = () => {
      setOrientation(
        window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
      );
    };

    updateOrientation();
    window.addEventListener('resize', updateOrientation);
    return () => window.removeEventListener('resize', updateOrientation);
  }, []);

  if (orientation === 'landscape') {
    return <LandscapeLayout />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-700 to-green-800 p-2">
      {/* Top section: Draw, Discard, Foundations */}
      <div className="mb-4">
        <div className="flex gap-2 mb-2">
          <DrawPile />
          <DiscardPile />
        </div>
        <div className="flex gap-2">
          <FoundationPile suit="hearts" />
          <FoundationPile suit="diamonds" />
          <FoundationPile suit="clubs" />
          <FoundationPile suit="spades" />
        </div>
      </div>

      {/* Tableau - scrollable */}
      <div className="overflow-x-auto pb-20">
        <div className="flex gap-2 min-w-min">
          {[0, 1, 2, 3, 4, 5, 6].map((index) => (
            <TableauColumn key={index} columnIndex={index} />
          ))}
        </div>
      </div>

      {/* Bottom action bar */}
      <MobileActionBar />
    </div>
  );
};
```

### 5. Mobile Action Bar

**Create MobileActionBar** (`src/components/MobileActionBar.tsx`):
```typescript
const MobileActionBar: React.FC = () => {
  const initializeGame = useGameStore(state => state.initializeGame);
  const undo = useGameStore(state => state.undo);
  const drawCard = useGameStore(state => state.drawCard);
  const findHint = useGameStore(state => state.findHint);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-green-900 border-t border-green-700 p-2 safe-area-inset-bottom">
      <div className="flex justify-around items-center max-w-md mx-auto">
        <ActionButton
          icon="🔄"
          label="New"
          onClick={() => {
            if (confirm('Start new game?')) {
              initializeGame();
            }
          }}
        />
        <ActionButton
          icon="↩️"
          label="Undo"
          onClick={undo}
        />
        <ActionButton
          icon="🃏"
          label="Draw"
          onClick={drawCard}
        />
        <ActionButton
          icon="💡"
          label="Hint"
          onClick={findHint}
        />
        <ActionButton
          icon="⋮"
          label="Menu"
          onClick={() => {/* Open menu */}}
        />
      </div>
    </div>
  );
};

const ActionButton: React.FC<{
  icon: string;
  label: string;
  onClick: () => void;
}> = ({ icon, label, onClick }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center min-w-[60px] min-h-[60px] justify-center text-white active:bg-green-800 rounded-lg transition-colors"
  >
    <span className="text-2xl mb-1">{icon}</span>
    <span className="text-xs">{label}</span>
  </button>
);
```

### 6. Detect Mobile Device

**Create useIsMobile Hook** (`src/hooks/useIsMobile.ts`):
```typescript
import { useState, useEffect } from 'react';

export const useIsMobile = (): boolean => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) || window.innerWidth < 768;
      setIsMobile(mobile);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};
```

### 7. Conditional Rendering

**Update App.tsx**:
```typescript
import { useIsMobile } from './hooks/useIsMobile';

function App() {
  const isMobile = useIsMobile();

  return isMobile ? <MobileGameBoard /> : <GameBoard />;
}
```

### 8. Touch-Friendly Styles

**Add to index.css**:
```css
/* Touch-friendly */
.touch-manipulation {
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

/* Safe area for iPhone notch */
.safe-area-inset-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}

/* Prevent text selection on touch */
.no-select {
  -webkit-user-select: none;
  user-select: none;
}

/* Larger touch targets on mobile */
@media (max-width: 768px) {
  button {
    min-width: 44px;
    min-height: 44px;
  }
}
```

### 9. Swipe to Draw

**Update DrawPile.tsx**:
```typescript
const DrawPile: React.FC = () => {
  const drawCard = useGameStore(state => state.drawCard);
  const isMobile = useIsMobile();

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isMobile) {
      const gesture = touchManager.onTouchEnd(e.nativeEvent);
      if (gesture === 'swipe-right' || gesture === 'tap') {
        drawCard();
      }
    }
  };

  return (
    <div
      onTouchStart={(e) => isMobile && touchManager.onTouchStart(e.nativeEvent)}
      onTouchEnd={handleTouchEnd}
      onClick={() => !isMobile && drawCard()}
    >
      {/* Draw pile content */}
    </div>
  );
};
```

## Testing Requirements

1. Test on iOS devices (iPhone, iPad)
2. Test on Android devices
3. Test portrait and landscape orientations
4. Test touch gestures (tap, swipe, long-press)
5. Test responsive layout at different sizes
6. Test on different browsers (Safari, Chrome)
7. Test performance on older devices

## Acceptance Criteria

- [ ] Game playable on mobile devices
- [ ] Touch gestures work smoothly
- [ ] Layout responsive to screen size
- [ ] Buttons meet touch target size requirements
- [ ] Works in portrait and landscape
- [ ] No zoom issues
- [ ] No scroll issues
- [ ] Performance acceptable on mobile
- [ ] Tests pass

## Files to Create

- `src/utils/touchManager.ts` - Touch gesture handling
- `src/components/MobileGameBoard.tsx` - Mobile layout
- `src/components/MobileActionBar.tsx` - Bottom action bar
- `src/hooks/useIsMobile.ts` - Mobile detection hook

## Files to Modify

- `src/App.tsx` - Conditional mobile rendering
- `src/components/Card.tsx` - Touch support
- `src/components/DrawPile.tsx` - Swipe gesture
- `src/index.css` - Mobile styles
- `index.html` - Viewport meta tags

## Dependencies

- None (uses browser touch APIs)

## Notes

- Test thoroughly on real devices, not just emulators
- Consider PWA features (add to home screen)
- Optimize asset sizes for mobile bandwidth
- Consider offline support
- Test battery usage
- Consider haptic feedback (vibration)

## Success Metrics

- Smooth 60fps animations on mobile
- Touch targets ≥44x44px
- No pinch-zoom issues
- Positive mobile user feedback
- High mobile engagement
