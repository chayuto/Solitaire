# Task 010: Implement Internationalization (i18n)

**Priority:** HIGH  
**Estimated Effort:** 1-2 weeks  
**Risk Level:** MEDIUM  
**Impact:** HIGH - Global market readiness

---

## Problem Statement

The application currently has:
- ~100+ hardcoded English strings throughout components
- No i18n library or framework
- No translation files
- No language selector
- No locale-aware date/number formatting
- Cannot be used by non-English speakers

**Impact:**
- Limited to English-speaking markets only
- Difficult to add languages later (requires code changes)
- No regional customization
- Missed international user base

---

## Objectives

Implement comprehensive internationalization to:
1. Support multiple languages dynamically
2. Extract all UI strings to translation files
3. Add language selector in UI
4. Support locale-aware formatting (dates, numbers)
5. Make it easy to add new languages
6. Prepare for RTL (right-to-left) languages (future)

---

## Technical Approach

### Technology Choice: react-i18next

**Why react-i18next?**
- ✅ Most popular React i18n library (8M+ downloads/week)
- ✅ Excellent TypeScript support
- ✅ Simple API, easy to use
- ✅ Lazy loading of translations
- ✅ Namespace support for organization
- ✅ Interpolation and pluralization
- ✅ Browser language detection
- ✅ Active maintenance

---

## Implementation Steps

### Step 1: Install Dependencies

```bash
cd packages/app
npm install i18next react-i18next i18next-browser-languagedetector
```

**Packages:**
- `i18next` - Core i18n framework
- `react-i18next` - React bindings
- `i18next-browser-languagedetector` - Auto-detect user's language

---

### Step 2: Create Translation Files

**Structure:**
```
packages/app/src/locales/
├── en/
│   ├── common.json       # Common UI strings
│   ├── game.json         # Game-specific strings
│   └── errors.json       # Error messages
├── th/                   # Thai (example)
│   ├── common.json
│   ├── game.json
│   └── errors.json
└── index.ts              # i18n configuration
```

**File:** `packages/app/src/locales/en/common.json`

```json
{
  "app": {
    "title": "Solitaire",
    "loading": "Loading..."
  },
  "actions": {
    "newGame": "New Game",
    "saveGame": "Export Game",
    "loadGame": "Import Game",
    "undo": "Undo",
    "redo": "Redo",
    "close": "Close",
    "cancel": "Cancel",
    "confirm": "Confirm",
    "tryAgain": "Try Again",
    "reloadPage": "Reload Page"
  },
  "settings": {
    "language": "Language",
    "difficulty": "Difficulty",
    "showValidMoves": "Show Valid Moves",
    "godMode": "God Mode",
    "autoPlay": "Auto-play"
  },
  "messages": {
    "gameExported": "Game exported successfully!",
    "gameImported": "Game loaded successfully!",
    "invalidFile": "Invalid game file format!",
    "newGameStarted": "New game started!",
    "copiedToClipboard": "Copied to clipboard!",
    "copyFailed": "Failed to copy to clipboard"
  }
}
```

**File:** `packages/app/src/locales/en/game.json`

```json
{
  "cards": {
    "faceUp": "face up",
    "faceDown": "face down",
    "hearts": "hearts",
    "diamonds": "diamonds",
    "clubs": "clubs",
    "spades": "spades"
  },
  "piles": {
    "draw": "Draw pile",
    "discard": "Discard pile",
    "foundation": "Foundation",
    "tableau": "Tableau",
    "column": "Column {{number}}"
  },
  "difficulty": {
    "veryEasy": "Very Easy",
    "easy": "Easy",
    "normal": "Normal",
    "hard": "Hard",
    "veryHard": "Very Hard",
    "veryEasyDesc": "Minimal shuffle (20% randomization) - Best for beginners",
    "easyDesc": "Partial shuffle (50% randomization) - Casual gameplay",
    "normalDesc": "Full random shuffle - Classic Solitaire experience",
    "hardDesc": "Enhanced shuffle (130% randomization) - Challenging positions",
    "veryHardDesc": "Double shuffle (200% randomization) - Expert level"
  },
  "stats": {
    "moves": "Moves",
    "totalMoves": "Total Moves",
    "difficulty": "Difficulty",
    "perceivedDifficulty": "Perceived Difficulty",
    "completion": "Completion",
    "time": "Time"
  },
  "moves": {
    "drew": "Drew {{card}} from draw pile",
    "tableauToTableau": "Moved {{card}} from column {{from}} to column {{to}}",
    "tableauToFoundation": "Moved {{card}} to {{suit}} foundation",
    "discardToTableau": "Moved {{card}} from discard to column {{to}}",
    "discardToFoundation": "Moved {{card}} from discard to {{suit}} foundation",
    "flipped": "Flipped {{card}} face up in column {{column}}",
    "autoPlayStart": "Auto-play started",
    "autoPlayStop": "Auto-play stopped",
    "autoPlayDeadend": "Auto-play stopped - No valid moves available (deadend)",
    "autoPlayLoop": "Auto-play stopped - Loop detected"
  },
  "win": {
    "title": "Congratulations! You Won!",
    "subtitle": "Game Statistics",
    "playAgain": "Play Again"
  },
  "replay": {
    "title": "Replay Mode",
    "stepBackward": "Step Backward",
    "stepForward": "Step Forward",
    "play": "Play",
    "pause": "Pause",
    "restart": "Restart",
    "stop": "Stop Replay",
    "speed": "Speed"
  }
}
```

**File:** `packages/app/src/locales/en/errors.json`

```json
{
  "title": "Oops! Something went wrong",
  "description": "The game encountered an unexpected error. Don't worry, you can try restarting.",
  "detailsLabel": "Error Details (Development Only)",
  "persistMessage": "If this problem persists, try clearing your browser cache"
}
```

---

### Step 3: Configure i18next

**File:** `packages/app/src/locales/index.ts`

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
import enCommon from './en/common.json';
import enGame from './en/game.json';
import enErrors from './en/errors.json';

import thCommon from './th/common.json';
import thGame from './th/game.json';
import thErrors from './th/errors.json';

// Define resources
const resources = {
  en: {
    common: enCommon,
    game: enGame,
    errors: enErrors,
  },
  th: {
    common: thCommon,
    game: thGame,
    errors: thErrors,
  },
};

i18n
  .use(LanguageDetector) // Detect user language
  .use(initReactI18next) // Pass i18n to react-i18next
  .init({
    resources,
    defaultNS: 'common',
    fallbackLng: 'en',
    
    // Language detection options
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },

    interpolation: {
      escapeValue: false, // React already escapes
    },

    // Development options
    debug: process.env.NODE_ENV === 'development',
  });

export default i18n;

// Export supported languages
export const supportedLanguages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  // Add more languages here
] as const;

export type SupportedLanguage = typeof supportedLanguages[number]['code'];
```

---

### Step 4: Initialize in App

**File:** `packages/app/src/main.tsx`

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './locales' // Import i18n configuration

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

---

### Step 5: Create Language Selector Component

**File:** `packages/app/src/components/LanguageSelector.tsx`

```typescript
import { useTranslation } from 'react-i18next';
import { supportedLanguages } from '../locales';

export const LanguageSelector: React.FC = () => {
  const { i18n } = useTranslation();

  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
  };

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="language-select" className="text-sm font-medium text-white">
        {i18n.t('settings.language')}:
      </label>
      <select
        id="language-select"
        value={i18n.language}
        onChange={(e) => handleLanguageChange(e.target.value)}
        className="px-3 py-1 rounded bg-white border border-gray-300 text-sm"
      >
        {supportedLanguages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.nativeName}
          </option>
        ))}
      </select>
    </div>
  );
};
```

---

### Step 6: Update Components to Use Translations

#### ControlPanel.tsx

**Before:**
```typescript
<button onClick={handleNewGame}>
  New Game
</button>
<button onClick={handleExport}>
  Export Game
</button>
```

**After:**
```typescript
import { useTranslation } from 'react-i18next';

const ControlPanel: React.FC = () => {
  const { t } = useTranslation('common');
  
  return (
    <>
      <button onClick={handleNewGame}>
        {t('actions.newGame')}
      </button>
      <button onClick={handleExport}>
        {t('actions.saveGame')}
      </button>
    </>
  );
};
```

#### WinModal.tsx

**Before:**
```typescript
<h1>Congratulations! You Won!</h1>
<h2>Game Statistics</h2>
<div>Total Moves: {moves}</div>
```

**After:**
```typescript
import { useTranslation } from 'react-i18next';

const WinModal: React.FC = () => {
  const { t } = useTranslation('game');
  
  return (
    <>
      <h1>{t('win.title')}</h1>
      <h2>{t('win.subtitle')}</h2>
      <div>{t('stats.totalMoves')}: {moves}</div>
    </>
  );
};
```

#### ActivityLog.tsx

**Before:**
```typescript
`${time} - Drew ${cardStr} from draw pile`
`${time} - Moved ${cardStr} from column ${col1} to column ${col2}`
```

**After:**
```typescript
import { useTranslation } from 'react-i18next';

const ActivityLog: React.FC = () => {
  const { t } = useTranslation('game');
  
  const formatMove = (move: Move): string => {
    const time = formatTime(move.timestamp);
    const cardStr = formatCard(move.card);
    
    switch (move.type) {
      case 'draw_card':
        return `${time} - ${t('moves.drew', { card: cardStr })}`;
      case 'tableau_to_tableau':
        return `${time} - ${t('moves.tableauToTableau', {
          card: cardStr,
          from: (move.from?.columnIndex ?? 0) + 1,
          to: (move.to?.columnIndex ?? 0) + 1,
        })}`;
      // ... more cases
    }
  };
};
```

#### ErrorBoundary.tsx

**Before:**
```typescript
<h1>Oops! Something went wrong</h1>
<p>The game encountered an unexpected error...</p>
<button>Try Again</button>
```

**After:**
```typescript
import { useTranslation } from 'react-i18next';

// Note: Can't use hooks in class component, use withTranslation HOC
import { withTranslation, WithTranslation } from 'react-i18next';

class ErrorBoundaryClass extends Component<Props & WithTranslation, State> {
  render() {
    const { t } = this.props;
    
    return (
      <>
        <h1>{t('errors:title')}</h1>
        <p>{t('errors:description')}</p>
        <button>{t('common:actions.tryAgain')}</button>
      </>
    );
  }
}

export const ErrorBoundary = withTranslation()(ErrorBoundaryClass);
```

---

### Step 7: Add TypeScript Support

**File:** `packages/app/src/types/i18next.d.ts`

```typescript
import 'i18next';
import common from '../locales/en/common.json';
import game from '../locales/en/game.json';
import errors from '../locales/en/errors.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof common;
      game: typeof game;
      errors: typeof errors;
    };
  }
}
```

This provides autocomplete for translation keys! 🎉

---

### Step 8: Add Language Selector to UI

**File:** `packages/app/src/components/ControlPanel.tsx`

```typescript
import { LanguageSelector } from './LanguageSelector';

const ControlPanel: React.FC = () => {
  return (
    <div className="...">
      {/* Existing controls */}
      
      {/* Add language selector */}
      <div className="mt-4 pt-4 border-t border-gray-300">
        <LanguageSelector />
      </div>
    </div>
  );
};
```

---

### Step 9: Add Tests

**File:** `packages/app/src/locales/i18n.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import i18n from './index';

describe('i18n Configuration', () => {
  it('should have English as default language', () => {
    expect(i18n.language).toBe('en');
  });

  it('should have all required namespaces', () => {
    expect(i18n.hasResourceBundle('en', 'common')).toBe(true);
    expect(i18n.hasResourceBundle('en', 'game')).toBe(true);
    expect(i18n.hasResourceBundle('en', 'errors')).toBe(true);
  });

  it('should translate common strings', () => {
    expect(i18n.t('common:actions.newGame')).toBe('New Game');
    expect(i18n.t('common:actions.saveGame')).toBe('Export Game');
  });

  it('should translate with interpolation', () => {
    const result = i18n.t('game:moves.drew', { card: '5♠' });
    expect(result).toContain('5♠');
    expect(result).toContain('draw pile');
  });

  it('should support language switching', async () => {
    await i18n.changeLanguage('th');
    expect(i18n.language).toBe('th');
    
    // Reset to English
    await i18n.changeLanguage('en');
  });
});
```

**File:** `packages/app/src/components/LanguageSelector.test.tsx`

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LanguageSelector } from './LanguageSelector';
import '../locales';

describe('LanguageSelector', () => {
  it('should render language selector', () => {
    render(<LanguageSelector />);
    expect(screen.getByLabelText(/language/i)).toBeInTheDocument();
  });

  it('should show all supported languages', () => {
    render(<LanguageSelector />);
    const select = screen.getByRole('combobox');
    expect(select).toHaveTextContent('English');
    expect(select).toHaveTextContent('ไทย');
  });

  it('should change language when selected', async () => {
    render(<LanguageSelector />);
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    
    fireEvent.change(select, { target: { value: 'th' } });
    
    // Check if language changed
    expect(select.value).toBe('th');
  });
});
```

---

## Implementation Checklist

### Setup & Configuration
- [ ] Install i18next dependencies
- [ ] Create locales folder structure
- [ ] Create English translation files (common, game, errors)
- [ ] Configure i18next in src/locales/index.ts
- [ ] Initialize i18n in main.tsx
- [ ] Add TypeScript definitions for i18next

### Component Updates
- [ ] Update ControlPanel.tsx
- [ ] Update WinModal.tsx
- [ ] Update ActivityLog.tsx
- [ ] Update ErrorBoundary.tsx (use HOC)
- [ ] Update Card.tsx (aria-labels)
- [ ] Update GameBoard.tsx
- [ ] Update ReplayControls.tsx
- [ ] Update all other components with strings

### UI Components
- [ ] Create LanguageSelector component
- [ ] Add LanguageSelector to ControlPanel
- [ ] Style language selector to match theme
- [ ] Test language switching

### Testing
- [ ] Add i18n configuration tests
- [ ] Add LanguageSelector component tests
- [ ] Update existing component tests (mock useTranslation)
- [ ] Test all components in both languages
- [ ] Run full test suite

### Additional Languages
- [ ] Create Thai (th) translation files
- [ ] Add more languages as needed
- [ ] Test RTL language support (future)

### Documentation
- [ ] Update README with i18n info
- [ ] Create CONTRIBUTING guide for translations
- [ ] Document translation keys structure
- [ ] Add comments for translators

---

## Testing Instructions

### Manual Testing

1. **Default Language:**
   - App should load in English (or browser language)
   
2. **Language Switching:**
   - Select Thai from language selector
   - All UI strings should change
   - Selection should persist on refresh
   
3. **Translation Coverage:**
   - Check all screens have translations
   - Test all button labels
   - Test all error messages
   - Test all modals

4. **Edge Cases:**
   - Test with missing translation (should fallback to English)
   - Test with very long text (should not break layout)
   - Test special characters

### Automated Testing

```bash
# Run i18n tests
npm run test -- i18n.test.ts

# Run full test suite with i18n
npm run test:run

# Expected: All tests pass
```

---

## Risk Assessment

**Benefits:**
- ✅ Global market access
- ✅ Better user experience for non-English speakers
- ✅ Professional appearance
- ✅ Easy to add more languages
- ✅ Type-safe translations (with TypeScript)
- ✅ SEO benefits (language-specific URLs possible)

**Risks:**
- ⚠️ Initial development time (1-2 weeks)
- ⚠️ Bundle size increase (~50KB for react-i18next)
- ⚠️ Maintenance: keeping translations in sync
- ⚠️ Quality: machine translations vs. native speakers
- ⚠️ Layout issues with longer text in some languages

**Mitigation:**
- Use lazy loading for translations
- Start with 2-3 languages, expand gradually
- Work with native speakers for quality translations
- Test layouts with longest translations
- Use translation management service (Lokalise, Crowdin)

---

## Adding New Languages

To add a new language (e.g., Spanish):

1. Create translation files:
   ```
   packages/app/src/locales/es/
   ├── common.json
   ├── game.json
   └── errors.json
   ```

2. Import in `locales/index.ts`:
   ```typescript
   import esCommon from './es/common.json';
   import esGame from './es/game.json';
   import esErrors from './es/errors.json';

   const resources = {
     // ... existing
     es: {
       common: esCommon,
       game: esGame,
       errors: esErrors,
     },
   };
   ```

3. Add to supported languages:
   ```typescript
   export const supportedLanguages = [
     // ... existing
     { code: 'es', name: 'Spanish', nativeName: 'Español' },
   ];
   ```

4. Test thoroughly!

---

## Success Criteria

- [ ] All UI strings extracted to translation files
- [ ] Language selector works correctly
- [ ] Translations persist across page reload
- [ ] At least 2 languages fully supported (English + 1 other)
- [ ] All tests pass
- [ ] No hardcoded strings in components
- [ ] TypeScript autocomplete works for translation keys
- [ ] Documentation updated
- [ ] Bundle size impact acceptable (<100KB added)

---

## Future Enhancements

1. **Translation Management:**
   - Use Lokalise or Crowdin for professional translations
   - Community contributions for new languages
   - Translation memory for consistency

2. **Advanced Features:**
   - Pluralization rules
   - Date/number formatting per locale
   - Currency formatting
   - RTL (right-to-left) language support
   - Gender-specific translations

3. **Optimization:**
   - Lazy load translation files
   - Only load selected language
   - Pre-load next likely language

4. **Quality Assurance:**
   - Translation coverage reports
   - Unused translation detection
   - A/B testing for translation quality

---

## Resources

- [react-i18next Documentation](https://react.i18next.com/)
- [i18next Documentation](https://www.i18next.com/)
- [ICU Message Format](https://formatjs.io/docs/core-concepts/icu-syntax/)
- [Unicode CLDR](http://cldr.unicode.org/) - Locale data
- [Lokalise](https://lokalise.com/) - Translation management
- [Crowdin](https://crowdin.com/) - Translation platform
