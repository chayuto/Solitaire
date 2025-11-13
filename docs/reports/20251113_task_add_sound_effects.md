# Task: Add Sound Effects

**Date**: 2025-11-13  
**Difficulty**: Easy  
**Estimated Time**: 2-3 hours  
**Priority**: Low  
**Type**: Enhancement

## Objective

Add sound effects for card movements and game events to enhance user experience.

## Current State

- No audio functionality exists
- No sound files in project
- Silent gameplay

## Requirements

### Functional Requirements

1. Sound effects for:
   - Card flip
   - Card placement
   - Card draw
   - Win celebration
   - Invalid move
   - Undo action
2. Mute/unmute toggle button
3. Sound preference persists in localStorage
4. Volume control (optional)

### Technical Requirements

1. Use Web Audio API or HTML5 Audio
2. Preload sounds for instant playback
3. Sounds should not block UI
4. Respect browser autoplay policies
5. Keep audio files small (<50KB each)

## Implementation Steps

1. **Create Sound Files**:
   - Use free sound libraries (freesound.org, zapsplat.com)
   - Or generate simple sounds programmatically
   - Formats: MP3 or OGG (browser compatible)
   - Files needed:
     - `card-flip.mp3`
     - `card-place.mp3`
     - `card-draw.mp3`
     - `card-slide.mp3`
     - `win.mp3`
     - `error.mp3`

2. **Create Sound Manager** (`src/utils/soundManager.ts`):
   ```typescript
   const SOUNDS_ENABLED_KEY = 'solitaire-sounds-enabled';

   class SoundManager {
     private sounds: Map<string, HTMLAudioElement> = new Map();
     private enabled: boolean = true;

     constructor() {
       this.enabled = this.loadSoundPreference();
       this.preloadSounds();
     }

     private preloadSounds() {
       const soundFiles = {
         flip: '/sounds/card-flip.mp3',
         place: '/sounds/card-place.mp3',
         draw: '/sounds/card-draw.mp3',
         slide: '/sounds/card-slide.mp3',
         win: '/sounds/win.mp3',
         error: '/sounds/error.mp3',
       };

       Object.entries(soundFiles).forEach(([key, path]) => {
         const audio = new Audio(path);
         audio.preload = 'auto';
         this.sounds.set(key, audio);
       });
     }

     play(soundName: string, volume: number = 1.0) {
       if (!this.enabled) return;

       const sound = this.sounds.get(soundName);
       if (sound) {
         sound.volume = volume;
         sound.currentTime = 0;
         sound.play().catch(err => {
           console.warn('Could not play sound:', err);
         });
       }
     }

     setEnabled(enabled: boolean) {
       this.enabled = enabled;
       this.saveSoundPreference(enabled);
     }

     isEnabled(): boolean {
       return this.enabled;
     }

     private loadSoundPreference(): boolean {
       const stored = localStorage.getItem(SOUNDS_ENABLED_KEY);
       return stored === null ? true : stored === 'true';
     }

     private saveSoundPreference(enabled: boolean) {
       localStorage.setItem(SOUNDS_ENABLED_KEY, enabled.toString());
     }
   }

   export const soundManager = new SoundManager();
   ```

3. **Generate Simple Sounds Programmatically** (if no audio files):
   ```typescript
   class SynthSoundManager {
     private audioContext: AudioContext;
     private enabled: boolean = true;

     constructor() {
       this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
       this.enabled = this.loadSoundPreference();
     }

     playFlip() {
       if (!this.enabled) return;
       this.playTone(300, 0.1, 'sine');
     }

     playPlace() {
       if (!this.enabled) return;
       this.playTone(400, 0.05, 'square');
     }

     playWin() {
       if (!this.enabled) return;
       // Play chord
       this.playTone(523, 0.3, 'sine'); // C
       setTimeout(() => this.playTone(659, 0.3, 'sine'), 100); // E
       setTimeout(() => this.playTone(784, 0.5, 'sine'), 200); // G
     }

     private playTone(frequency: number, duration: number, type: OscillatorType) {
       const oscillator = this.audioContext.createOscillator();
       const gainNode = this.audioContext.createGain();

       oscillator.connect(gainNode);
       gainNode.connect(this.audioContext.destination);

       oscillator.frequency.value = frequency;
       oscillator.type = type;

       gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
       gainNode.gain.exponentialRampToValueAtTime(
         0.01,
         this.audioContext.currentTime + duration
       );

       oscillator.start(this.audioContext.currentTime);
       oscillator.stop(this.audioContext.currentTime + duration);
     }

     // ... other methods
   }
   ```

4. **Integrate with Game Store** (`src/store/gameStore.ts`):
   ```typescript
   import { soundManager } from '../utils/soundManager';

   // In moveCardToTableau:
   moveCardToTableau: (targetColumn: number) => {
     // ... existing logic
     soundManager.play('place');
   }

   // In moveCardToFoundation:
   moveCardToFoundation: (suit: Suit) => {
     // ... existing logic
     soundManager.play('place');
   }

   // In drawCard:
   drawCard: () => {
     // ... existing logic
     soundManager.play('draw');
   }

   // In setGameWon:
   setGameWon: () => {
     // ... existing logic
     soundManager.play('win');
   }
   ```

5. **Add Sound Toggle Button** (`src/components/ControlPanel.tsx`):
   ```typescript
   import { soundManager } from '../utils/soundManager';

   const [soundEnabled, setSoundEnabled] = useState(soundManager.isEnabled());

   const toggleSound = () => {
     const newState = !soundEnabled;
     soundManager.setEnabled(newState);
     setSoundEnabled(newState);
   };

   return (
     <div className="...">
       {/* Other buttons */}
       <button
         onClick={toggleSound}
         className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
         title={soundEnabled ? 'Mute' : 'Unmute'}
       >
         {soundEnabled ? '🔊' : '🔇'}
       </button>
     </div>
   );
   ```

6. **Add Sounds Directory**:
   ```
   public/
   └── sounds/
       ├── card-flip.mp3
       ├── card-place.mp3
       ├── card-draw.mp3
       ├── card-slide.mp3
       ├── win.mp3
       └── error.mp3
   ```

## Sound Sources (Free)

1. **freesound.org** - CC0 licensed sounds
2. **zapsplat.com** - Free sound effects
3. **pixabay.com/sound-effects** - Free sounds
4. **sonniss.com** - Game audio bundles
5. **Generate with Web Audio API** - Programmatic sounds

## Testing Requirements

1. Test all sound effects play correctly
2. Test mute/unmute toggle
3. Test sound preference persists
4. Test sounds don't block UI
5. Test volume control (if implemented)
6. Test browser autoplay policy handling
7. Test on different browsers

## Acceptance Criteria

- [ ] Sound effects play for all actions
- [ ] Sounds are clear and appropriate
- [ ] Mute/unmute button works
- [ ] Sound preference persists
- [ ] No audio errors in console
- [ ] Sounds enhance experience
- [ ] Respects browser autoplay
- [ ] Tests pass

## Files to Create

- `src/utils/soundManager.ts` - Sound management
- `public/sounds/` - Audio files directory

## Files to Modify

- `src/store/gameStore.ts` - Add sound calls
- `src/components/ControlPanel.tsx` - Add toggle button

## Dependencies

- None (uses Web Audio API or HTML5 Audio)
- Optional: `howler.js` for better audio control

## Notes

- Keep sounds subtle and non-intrusive
- Consider different sound themes
- Volume should be reasonable (not too loud)
- Consider adding background music (optional)
- Test with headphones and speakers
- Ensure sounds don't overlap badly

## Alternative: Use Howler.js

```bash
npm install howler
```

```typescript
import { Howl } from 'howler';

const flipSound = new Howl({
  src: ['/sounds/card-flip.mp3'],
  volume: 0.5,
});

flipSound.play();
```

## Accessibility Considerations

- Provide visual feedback in addition to sound
- Allow users to disable sounds
- Don't rely on sound alone for feedback
- Consider hearing-impaired users

## Performance

- Preload all sounds on app start
- Use sprite sheets for multiple sounds (optional)
- Keep file sizes small
- Use compressed audio formats

## Success Metrics

- Enhanced user experience
- Positive user feedback
- No audio bugs
- Sounds feel natural and satisfying
