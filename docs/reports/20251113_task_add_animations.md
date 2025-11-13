# Task: Enhance Card Animations

**Date**: 2025-11-13  
**Difficulty**: Medium  
**Estimated Time**: 2-4 hours  
**Priority**: Medium  
**Type**: Enhancement

## Objective

Improve card animations for a more polished, professional feel using Framer Motion.

## Current State

- Framer Motion is already installed
- Basic animations may exist
- Room for smoother, more appealing animations

## Requirements

### Functional Requirements

1. Smooth card flip animation (face-up/face-down)
2. Card slide animation when moved between piles
3. Deal animation on new game
4. Card hover effect for interactivity feedback
5. Subtle bounce when card placed
6. Draw pile card animation

### Technical Requirements

1. Use Framer Motion's `motion` components
2. Keep animations fast (200-300ms)
3. Use spring physics for natural movement
4. Ensure animations don't block gameplay
5. Make animations optional (reduce motion preference)

## Implementation Steps

1. **Card Flip Animation** (`src/components/Card.tsx`):
   ```typescript
   import { motion } from 'framer-motion';

   const Card: React.FC<CardProps> = ({ card, onClick }) => {
     return (
       <motion.div
         animate={{ rotateY: card.faceUp ? 0 : 180 }}
         transition={{ duration: 0.3 }}
         style={{ transformStyle: 'preserve-3d' }}
         className="..."
       >
         {/* Card content */}
       </motion.div>
     );
   };
   ```

2. **Card Movement Animation**:
   ```typescript
   <motion.div
     layout
     transition={{ 
       type: "spring",
       stiffness: 300,
       damping: 30
     }}
   >
     {/* Card */}
   </motion.div>
   ```

3. **Hover Effect**:
   ```typescript
   <motion.div
     whileHover={{ 
       scale: 1.05,
       y: -5,
       transition: { duration: 0.2 }
     }}
     whileTap={{ scale: 0.95 }}
   >
     {/* Card */}
   </motion.div>
   ```

4. **Deal Animation** (`src/components/GameBoard.tsx`):
   ```typescript
   const dealVariants = {
     hidden: { opacity: 0, y: -100 },
     visible: (i: number) => ({
       opacity: 1,
       y: 0,
       transition: {
         delay: i * 0.05,
         duration: 0.3,
       }
     })
   };

   // Apply to tableau columns during initialization
   ```

5. **Bounce on Place**:
   ```typescript
   const bounceVariants = {
     initial: { scale: 0.8 },
     animate: { 
       scale: 1,
       transition: {
         type: "spring",
         stiffness: 500,
         damping: 15
       }
     }
   };
   ```

6. **Respect Reduced Motion**:
   ```typescript
   const shouldReduceMotion = window.matchMedia(
     '(prefers-reduced-motion: reduce)'
   ).matches;

   const transition = shouldReduceMotion 
     ? { duration: 0 }
     : { duration: 0.3 };
   ```

7. **Draw Pile Animation**:
   - Slide out animation when drawing
   - Shuffle animation when recycling discard pile

## Animation Timings

- **Card Flip**: 300ms
- **Card Movement**: 250ms (spring physics)
- **Hover**: 200ms
- **Deal**: 50ms delay between cards
- **Bounce**: 300ms

## Testing Requirements

1. Test all animations complete smoothly
2. Test animations don't interfere with gameplay
3. Test reduced motion preference is respected
4. Test animations work on different devices
5. Test performance with many animated cards
6. Visual regression testing

## Acceptance Criteria

- [ ] Card flip animation smooth and realistic
- [ ] Cards slide smoothly when moved
- [ ] Hover effects provide clear feedback
- [ ] Deal animation on new game
- [ ] Animations respect reduced motion setting
- [ ] No animation jank or stutter
- [ ] Performance remains good
- [ ] Tests pass

## Files to Modify

- `src/components/Card.tsx` - Add card animations
- `src/components/TableauColumn.tsx` - Layout animations
- `src/components/DrawPile.tsx` - Draw animations
- `src/components/DiscardPile.tsx` - Discard animations
- `src/components/FoundationPile.tsx` - Foundation animations
- `src/components/GameBoard.tsx` - Deal animation

## Dependencies

- `framer-motion` (already installed: 12.23.24)

## Notes

- Keep animations subtle and professional
- Avoid overdoing animations (can be distracting)
- Ensure animations feel responsive, not sluggish
- Consider adding sound effects with animations
- Test on lower-end devices for performance
- Use GPU acceleration (transform, opacity)

## Animation Examples

### Card Flip
```typescript
const flipVariants = {
  faceDown: { rotateY: 180 },
  faceUp: { rotateY: 0 }
};
```

### Slide In
```typescript
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 100 : -100,
    opacity: 0
  }),
  center: {
    x: 0,
    opacity: 1
  }
};
```

### Stagger Children
```typescript
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};
```

## Performance Considerations

- Use `transform` and `opacity` only (GPU accelerated)
- Avoid animating `width`, `height`, `top`, `left`
- Use `will-change` sparingly
- Consider `layoutId` for shared element transitions
- Monitor frame rate during animations

## Success Metrics

- Animations feel smooth (60fps)
- Users perceive increased polish
- No negative impact on gameplay
- Positive user feedback
- Professional appearance
