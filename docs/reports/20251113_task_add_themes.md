# Task: Add Theme System

**Date**: 2025-11-13  
**Difficulty**: Medium  
**Estimated Time**: 3-4 hours  
**Priority**: Low  
**Type**: Feature Addition

## Objective

Allow users to customize the appearance of the game with different themes and color schemes.

## Current State

- Single green felt theme
- No theme customization
- Hard-coded colors

## Requirements

### Functional Requirements

1. Multiple theme options:
   - Classic Green (default)
   - Blue Ocean
   - Royal Purple
   - Dark Mode
   - High Contrast
   - Minimalist
2. Theme selector in settings
3. Persist theme preference in localStorage
4. Smooth theme transitions
5. Apply theme to all components

### Technical Requirements

1. CSS variables for theming
2. Theme context/provider
3. localStorage for persistence
4. Tailwind CSS custom configuration
5. Support for light and dark modes

## Implementation Steps

### 1. Define Theme Interface

**Create theme types** (`src/types/theme.ts`):
```typescript
export interface Theme {
  id: string;
  name: string;
  colors: {
    background: string;
    backgroundGradientFrom: string;
    backgroundGradientTo: string;
    cardBackground: string;
    cardBorder: string;
    cardRed: string;
    cardBlack: string;
    text: string;
    textSecondary: string;
    accent: string;
    button: string;
    buttonHover: string;
  };
}

export const themes: Record<string, Theme> = {
  classic: {
    id: 'classic',
    name: 'Classic Green',
    colors: {
      background: '#0d7c66',
      backgroundGradientFrom: '#15803d',
      backgroundGradientTo: '#166534',
      cardBackground: '#ffffff',
      cardBorder: '#d1d5db',
      cardRed: '#dc2626',
      cardBlack: '#000000',
      text: '#ffffff',
      textSecondary: '#d1d5db',
      accent: '#fbbf24',
      button: '#16a34a',
      buttonHover: '#15803d',
    },
  },
  ocean: {
    id: 'ocean',
    name: 'Blue Ocean',
    colors: {
      background: '#0c4a6e',
      backgroundGradientFrom: '#0369a1',
      backgroundGradientTo: '#075985',
      cardBackground: '#ffffff',
      cardBorder: '#cbd5e1',
      cardRed: '#dc2626',
      cardBlack: '#0f172a',
      text: '#ffffff',
      textSecondary: '#cbd5e1',
      accent: '#38bdf8',
      button: '#0284c7',
      buttonHover: '#0369a1',
    },
  },
  purple: {
    id: 'purple',
    name: 'Royal Purple',
    colors: {
      background: '#581c87',
      backgroundGradientFrom: '#7e22ce',
      backgroundGradientTo: '#6b21a8',
      cardBackground: '#ffffff',
      cardBorder: '#e9d5ff',
      cardRed: '#dc2626',
      cardBlack: '#1e1b4b',
      text: '#ffffff',
      textSecondary: '#e9d5ff',
      accent: '#c084fc',
      button: '#9333ea',
      buttonHover: '#7e22ce',
    },
  },
  dark: {
    id: 'dark',
    name: 'Dark Mode',
    colors: {
      background: '#0f172a',
      backgroundGradientFrom: '#1e293b',
      backgroundGradientTo: '#0f172a',
      cardBackground: '#1e293b',
      cardBorder: '#334155',
      cardRed: '#ef4444',
      cardBlack: '#f1f5f9',
      text: '#f1f5f9',
      textSecondary: '#94a3b8',
      accent: '#3b82f6',
      button: '#1e40af',
      buttonHover: '#1e3a8a',
    },
  },
  highContrast: {
    id: 'highContrast',
    name: 'High Contrast',
    colors: {
      background: '#000000',
      backgroundGradientFrom: '#000000',
      backgroundGradientTo: '#1a1a1a',
      cardBackground: '#ffffff',
      cardBorder: '#000000',
      cardRed: '#ff0000',
      cardBlack: '#000000',
      text: '#ffffff',
      textSecondary: '#ffffff',
      accent: '#ffff00',
      button: '#ffffff',
      buttonHover: '#cccccc',
    },
  },
  minimalist: {
    id: 'minimalist',
    name: 'Minimalist',
    colors: {
      background: '#f5f5f5',
      backgroundGradientFrom: '#ffffff',
      backgroundGradientTo: '#f0f0f0',
      cardBackground: '#ffffff',
      cardBorder: '#e0e0e0',
      cardRed: '#d32f2f',
      cardBlack: '#212121',
      text: '#212121',
      textSecondary: '#757575',
      accent: '#2196f3',
      button: '#eeeeee',
      buttonHover: '#e0e0e0',
    },
  },
};
```

### 2. Create Theme Context

**Create ThemeContext** (`src/contexts/ThemeContext.tsx`):
```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Theme, themes } from '../types/theme';

interface ThemeContextType {
  theme: Theme;
  setTheme: (themeId: string) => void;
  availableThemes: Theme[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'solitaire-theme';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return saved && themes[saved] ? themes[saved] : themes.classic;
  });

  useEffect(() => {
    // Apply theme CSS variables
    const root = document.documentElement;
    Object.entries(currentTheme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--theme-${key}`, value);
    });
  }, [currentTheme]);

  const setTheme = (themeId: string) => {
    if (themes[themeId]) {
      setCurrentTheme(themes[themeId]);
      localStorage.setItem(THEME_STORAGE_KEY, themeId);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme: currentTheme,
        setTheme,
        availableThemes: Object.values(themes),
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
```

### 3. Update Main App

**Update main.tsx**:
```typescript
import { ThemeProvider } from './contexts/ThemeContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);
```

### 4. Create Theme Selector

**Create ThemeSelector** (`src/components/ThemeSelector.tsx`):
```typescript
import { useTheme } from '../contexts/ThemeContext';

const ThemeSelector: React.FC = () => {
  const { theme, setTheme, availableThemes } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 rounded transition-colors"
        style={{
          backgroundColor: `var(--theme-button)`,
          color: `var(--theme-text)`,
        }}
        aria-label="Select theme"
      >
        🎨 Theme
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-64 rounded-lg shadow-2xl z-50 p-4"
          style={{
            backgroundColor: `var(--theme-cardBackground)`,
            border: `1px solid var(--theme-cardBorder)`,
          }}
        >
          <h3
            className="text-lg font-bold mb-3"
            style={{ color: `var(--theme-text)` }}
          >
            Choose Theme
          </h3>
          
          <div className="grid grid-cols-2 gap-2">
            {availableThemes.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTheme(t.id);
                  setIsOpen(false);
                }}
                className={`
                  p-3 rounded text-left transition-all
                  ${theme.id === t.id ? 'ring-2' : ''}
                `}
                style={{
                  backgroundColor: t.colors.background,
                  color: t.colors.text,
                  ringColor: t.colors.accent,
                }}
              >
                <div className="font-medium text-sm">{t.name}</div>
                <div className="flex gap-1 mt-2">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: t.colors.cardRed }}
                  />
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: t.colors.cardBlack }}
                  />
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsOpen(false)}
            className="w-full mt-3 py-2 rounded transition-colors"
            style={{
              backgroundColor: `var(--theme-button)`,
              color: `var(--theme-text)`,
            }}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};

export default ThemeSelector;
```

### 5. Update Components with Theme

**Update GameBoard.tsx**:
```typescript
const GameBoard: React.FC = () => {
  return (
    <div
      className="min-h-screen p-8 transition-colors duration-300"
      style={{
        background: `linear-gradient(to bottom right, var(--theme-backgroundGradientFrom), var(--theme-backgroundGradientTo))`,
      }}
    >
      <ControlPanel />
      {/* Rest of game board */}
    </div>
  );
};
```

**Update Card.tsx**:
```typescript
const Card: React.FC<CardProps> = ({ card }) => {
  const suitColor = ['hearts', 'diamonds'].includes(card.suit)
    ? 'var(--theme-cardRed)'
    : 'var(--theme-cardBlack)';

  return (
    <div
      className="rounded shadow-lg transition-all"
      style={{
        backgroundColor: 'var(--theme-cardBackground)',
        border: '2px solid var(--theme-cardBorder)',
        color: suitColor,
      }}
    >
      {/* Card content */}
    </div>
  );
};
```

### 6. Update Control Panel

**Update ControlPanel.tsx**:
```typescript
import ThemeSelector from './ThemeSelector';

const ControlPanel: React.FC = () => {
  return (
    <div className="flex justify-between items-center mb-8">
      <div className="flex gap-4">
        {/* Existing buttons */}
      </div>
      <ThemeSelector />
    </div>
  );
};
```

### 7. Update CSS for Theme Variables

**Update index.css**:
```css
:root {
  /* Default theme variables will be set by ThemeContext */
  --theme-background: #0d7c66;
  --theme-backgroundGradientFrom: #15803d;
  --theme-backgroundGradientTo: #166534;
  --theme-cardBackground: #ffffff;
  --theme-cardBorder: #d1d5db;
  --theme-cardRed: #dc2626;
  --theme-cardBlack: #000000;
  --theme-text: #ffffff;
  --theme-textSecondary: #d1d5db;
  --theme-accent: #fbbf24;
  --theme-button: #16a34a;
  --theme-buttonHover: #15803d;
}

.theme-transition {
  transition: background-color 0.3s ease, color 0.3s ease;
}
```

## Testing Requirements

1. Test all themes apply correctly
2. Test theme persists in localStorage
3. Test theme selector UI works
4. Test smooth transitions between themes
5. Test all components respect theme
6. Test accessibility with each theme
7. Test color contrast ratios

## Acceptance Criteria

- [ ] Multiple themes available
- [ ] Theme selector in UI
- [ ] Theme persists across sessions
- [ ] Smooth theme transitions
- [ ] All components use theme colors
- [ ] Themes are visually distinct
- [ ] High contrast theme meets WCAG
- [ ] Tests pass

## Files to Create

- `src/types/theme.ts` - Theme definitions
- `src/contexts/ThemeContext.tsx` - Theme context
- `src/components/ThemeSelector.tsx` - Theme selector UI

## Files to Modify

- `src/main.tsx` - Add ThemeProvider
- `src/components/GameBoard.tsx` - Use theme colors
- `src/components/Card.tsx` - Use theme colors
- `src/components/ControlPanel.tsx` - Add theme selector
- `src/index.css` - Add CSS variables

## Dependencies

- None (uses React Context)

## Notes

- Consider adding custom theme creator
- Consider seasonal themes (Halloween, Christmas)
- Test color contrast for accessibility
- Allow importing/exporting themes
- Consider community theme sharing

## Advanced Features (Optional)

- Custom theme editor
- Theme marketplace
- Animated backgrounds
- Custom card designs
- Seasonal auto-themes

## Success Metrics

- Users customize themes
- Themes enhance experience
- High accessibility scores maintained
- Positive user feedback on themes
