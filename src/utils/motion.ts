/**
 * Safely checks if the user prefers reduced motion
 * Returns false if window.matchMedia is not available (e.g., in tests)
 */
export const shouldReduceMotion = (): boolean => {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};
