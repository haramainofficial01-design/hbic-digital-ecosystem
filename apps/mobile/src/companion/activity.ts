let active = false;
const listeners = new Set<() => void>();
export const getCompanionActive = () => active;
export function setCompanionActive(value: boolean) { if (active !== value) { active = value; listeners.forEach(listener => listener()); } }
export function subscribeCompanionActive(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
