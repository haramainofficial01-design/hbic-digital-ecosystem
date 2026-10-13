let lastInteractionAt = 0;
const listeners = new Set<() => void>();
export function noteRatingHomeInteraction(now = Date.now()) {
  lastInteractionAt = now;
  listeners.forEach(listener => listener());
}
export const getRatingHomeInteraction = () => lastInteractionAt;
export function subscribeRatingHomeInteraction(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
